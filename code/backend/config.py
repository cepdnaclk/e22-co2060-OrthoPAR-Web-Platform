import os

# Secret key for JWT encoding and decoding
# In production, this should be a long, random string stored in an environment variable
SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")

# Algorithm used for JWT token signing
ALGORITHM = "HS256"

# Expiration time for access tokens in minutes
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Database URL
# Default to PostgreSQL
# Format: postgresql://user:password@host:port/dbname
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/runway_app")
