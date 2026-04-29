import boto3
from config import settings
def test_s3_connection():
    print("Testing connection to AWS S3...")
    try:
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        
        # Test 1: Check if the bucket exists and we can access it
        response = s3.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        print(f"✅ SUCCESSFULLY connected to bucket: {settings.S3_BUCKET_NAME}")
        
    except Exception as e:
        print(f"❌ ERROR connecting to bucket: {e}")
if __name__ == "__main__":
    test_s3_connection()