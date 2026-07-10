import os
import io
import uuid
import tempfile
import aiofiles
import boto3
from abc import ABC, abstractmethod
from fastapi import UploadFile, HTTPException
from botocore.exceptions import NoCredentialsError, ClientError

from config import settings


class StorageBase(ABC):
    """Abstract base class defining the storage interface."""

    @abstractmethod
    async def save_file(self, file_content: bytes, filename: str, user_folder: str) -> str:
        """
        Save file bytes and return the storage key (S3 object key or local path).
        - file_content: raw bytes of the file
        - filename: original filename
        - user_folder: subfolder to namespace files (e.g. patient_id or user_id)
        """
        ...

    @abstractmethod
    async def save_temp_file(self, file_content: bytes, filename: str, visit_id: str) -> str:
        """
        Save file to a temporary local location. Returns the temp object key.
        """
        ...

    @abstractmethod
    async def persist_file(self, temp_object_key: str, filename: str, user_folder: str) -> str:
        """
        Move a temp file to permanent storage. Returns the new object key.
        """
        ...

    @abstractmethod
    def get_file(self, object_key: str) -> tuple:
        """
        Retrieve a file by its storage key.
        Returns (stream_or_path, is_stream).
        - For S3: returns (StreamingBody, True)
        - For local: returns (absolute_file_path, False)
        """
        ...

    @abstractmethod
    def delete_file(self, object_key: str) -> bool:
        """Delete a file by its storage key. Returns True on success."""
        ...

    @staticmethod
    def is_s3_key(object_key: str) -> bool:
        """Check whether an object_key refers to an S3 object (vs a local path)."""
        return object_key.startswith("scans/")

    def download_to_temp(self, object_key: str) -> str:
        """
        Download a file to a local temp path (useful for ML inference).
        Returns the temp file path. Caller is responsible for cleanup.
        """
        raise NotImplementedError("Subclass must implement download_to_temp for S3 keys")


class LocalStorage(StorageBase):
    """
    Stores files on the local filesystem under a base upload directory.
    """
    def __init__(self, base_upload_dir: str = "uploads"):
        self.base_upload_dir = base_upload_dir

    async def save_file(self, file_content: bytes, filename: str, user_folder: str) -> str:
        """Save file to /uploads/{user_folder}/{filename}. Returns the local path."""
        target_dir = os.path.join(self.base_upload_dir, user_folder)
        os.makedirs(target_dir, exist_ok=True)

        file_path = os.path.join(target_dir, filename)

        try:
            async with aiofiles.open(file_path, 'wb') as out_file:
                await out_file.write(file_content)
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=500, detail=f"Failed to save file locally: {str(e)}")

        return file_path

    async def save_temp_file(self, file_content: bytes, filename: str, visit_id: str) -> str:
        return await self.save_file(file_content, filename, f"temp/{visit_id}")

    async def persist_file(self, temp_object_key: str, filename: str, user_folder: str) -> str:
        file_path, _ = self.get_file(temp_object_key)
        with open(file_path, 'rb') as f:
            file_content = f.read()
        new_key = await self.save_file(file_content, filename, user_folder)
        self.delete_file(temp_object_key)
        return new_key

    def get_file(self, object_key: str) -> tuple:
        """Returns (absolute_path, False) for local files."""
        file_path = object_key
        if not os.path.isabs(file_path):
            file_path = os.path.join(os.getcwd(), file_path)

        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on local disk")

        return file_path, False

    def delete_file(self, object_key: str) -> bool:
        """Delete a local file."""
        file_path = object_key
        if not os.path.isabs(file_path):
            file_path = os.path.join(os.getcwd(), file_path)

        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False

    def download_to_temp(self, object_key: str) -> str:
        """For local files, just return the path directly — no download needed."""
        file_path = object_key
        if not os.path.isabs(file_path):
            file_path = os.path.join(os.getcwd(), file_path)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Local file not found: {file_path}")
        return file_path


class S3Storage(StorageBase):
    """
    Stores files in an AWS S3 bucket. Falls back to local storage
    on credential/connectivity errors when used through the factory.
    """
    def __init__(self):
        self._client = None
        self.bucket_name = settings.AWS_S3_BUCKET_NAME
        self.region = settings.AWS_REGION

    @property
    def client(self):
        """Lazy-initialize the S3 client to avoid import-time crashes."""
        if self._client is None:
            self._client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=self.region
            )
        return self._client

    async def save_file(self, file_content: bytes, filename: str, user_folder: str) -> str:
        """Upload file to S3 under scans/{user_folder}/{filename}. Returns the S3 object key."""
        s3_key = f"scans/{user_folder}/{filename}"

        try:
            self.client.upload_fileobj(
                io.BytesIO(file_content),
                self.bucket_name,
                s3_key,
                ExtraArgs={"ContentType": "application/octet-stream"}
            )
        except NoCredentialsError:
            raise HTTPException(
                status_code=500,
                detail="AWS credentials are not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY."
            )
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            raise HTTPException(status_code=500, detail=f"S3 upload failed: {error_code}")

        return s3_key

    async def save_temp_file(self, file_content: bytes, filename: str, visit_id: str) -> str:
        raise NotImplementedError("S3Storage should not be used directly for temp files")

    async def persist_file(self, temp_object_key: str, filename: str, user_folder: str) -> str:
        raise NotImplementedError("S3Storage should not be used directly for temp files")

    def get_file(self, object_key: str) -> tuple:
        """Returns (S3 StreamingBody, True) for S3 objects."""
        try:
            s3_response = self.client.get_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            return s3_response["Body"], True
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "NoSuchKey":
                raise HTTPException(status_code=404, detail="File not found in S3")
            raise HTTPException(status_code=500, detail=f"S3 error: {error_code}")
        except NoCredentialsError:
            raise HTTPException(status_code=500, detail="AWS credentials not configured")

    def delete_file(self, object_key: str) -> bool:
        """Delete an object from S3."""
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=object_key)
            return True
        except Exception:
            return False

    def generate_presigned_url(self, object_key: str, expiration: int = 3600) -> str:
        """Generate a presigned URL for direct browser access (optional)."""
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": object_key},
            ExpiresIn=expiration
        )

    def download_to_temp(self, object_key: str) -> str:
        """Download an S3 object to a local temp file. Returns the temp file path."""
        try:
            s3_response = self.client.get_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            suffix = os.path.splitext(object_key)[1] or ".stl"
            tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            tmp_file.write(s3_response["Body"].read())
            tmp_file.close()
            return tmp_file.name
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            raise FileNotFoundError(f"Failed to download from S3: {error_code}")
        except NoCredentialsError:
            raise FileNotFoundError("AWS credentials not configured — cannot download scan for ML inference")


class HybridStorage(StorageBase):
    """
    Routes operations to S3 or Local storage based on the object_key prefix.
    New uploads go to the configured primary backend.
    Reads are auto-routed: S3 keys (scans/...) → S3, everything else → local.
    """
    def __init__(self):
        self.s3 = S3Storage()
        self.local = LocalStorage()
        self.primary = settings.STORAGE_BACKEND  # "s3" or "local"

    async def save_file(self, file_content: bytes, filename: str, user_folder: str) -> str:
        """Try S3 first; if it fails for any reason, fallback to local storage."""
        if self.primary == "s3":
            try:
                key = await self.s3.save_file(file_content, filename, user_folder)
                print(f"[Storage] Saved to S3: {key}")
                return key
            except Exception as e:
                print(f"[Storage] S3 upload failed ({e}), falling back to local storage")
                key = await self.local.save_file(file_content, filename, user_folder)
                print(f"[Storage] Saved locally: {key}")
                return key
        return await self.local.save_file(file_content, filename, user_folder)

    async def save_temp_file(self, file_content: bytes, filename: str, visit_id: str) -> str:
        """Save scan — try S3 first, fallback to local."""
        return await self.save_file(file_content, filename, f"temp/{visit_id}")

    async def persist_file(self, temp_object_key: str, filename: str, user_folder: str) -> str:
        """Move temp file to permanent storage (S3 or local). Returns new object key."""
        file_path, _ = self.local.get_file(temp_object_key)
        with open(file_path, 'rb') as f:
            file_content = f.read()
            
        new_key = await self.save_file(file_content, filename, user_folder)
        self.local.delete_file(temp_object_key)
        return new_key

    def get_file(self, object_key: str) -> tuple:
        """Auto-route based on key prefix."""
        if self.is_s3_key(object_key):
            return self.s3.get_file(object_key)
        return self.local.get_file(object_key)

    def delete_file(self, object_key: str) -> bool:
        """Auto-route based on key prefix."""
        if self.is_s3_key(object_key):
            return self.s3.delete_file(object_key)
        return self.local.delete_file(object_key)

    def download_to_temp(self, object_key: str) -> str:
        """Auto-route: S3 keys get downloaded, local keys return path directly."""
        if self.is_s3_key(object_key):
            return self.s3.download_to_temp(object_key)
        return self.local.download_to_temp(object_key)


def get_storage_manager() -> StorageBase:
    """Factory function — returns the appropriate storage manager."""
    return HybridStorage()


# Module-level singleton used throughout the application
storage_manager = get_storage_manager()
