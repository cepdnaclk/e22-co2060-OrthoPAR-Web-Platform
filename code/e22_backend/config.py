from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/orthoapp"
    AWS_ACCESS_KEY_ID: str = "your_access_key"
    AWS_SECRET_ACCESS_KEY: str = "your_secret_key"
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "orthoapp-scans"

    class Config:
        env_file = ".env"

settings = Settings()
