import os
import aiofiles
from fastapi import UploadFile, HTTPException
import uuid

class LocalStorage:
    """
    Modular storage class for local file system operations.
    Can be later extended or switched to AWS S3.
    """
    def __init__(self, base_upload_dir: str = "uploads"):
        self.base_upload_dir = base_upload_dir

    async def save_file(self, file: UploadFile, user_id: int) -> tuple[str, str]:
        """
        Saves a file to /uploads/{user_id}/{model_id}_{original_file_name}
        Returns the model_id and the full local path.
        """
        model_id = str(uuid.uuid4())
        user_dir = os.path.join(self.base_upload_dir, str(user_id))
        
        # Ensure user directory exists
        os.makedirs(user_dir, exist_ok=True)

        file_path = os.path.join(user_dir, f"{model_id}_{file.filename}")

        try:
            async with aiofiles.open(file_path, 'wb') as out_file:
                while content := await file.read(1024 * 1024):  # Read in 1MB chunks
                    await out_file.write(content)
        except Exception as e:
            # Clean up if partially written
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

        return model_id, file_path

storage_manager = LocalStorage()
