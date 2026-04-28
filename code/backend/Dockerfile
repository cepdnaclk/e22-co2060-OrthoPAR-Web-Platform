FROM python:3.11-slim

WORKDIR /app

# Install system compilation dependencies required for PostgreSQL and Auth packages
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy precisely the backend dependency ledger
COPY requirements.txt .

# Install dependencies persistently inside the Docker container
RUN pip install --no-cache-dir -r requirements.txt

# Copy all the FastAPI application controllers and machine learning utilities
COPY . .

# Expose Uvicorn API Port
EXPOSE 8000

# Start FastAPI native to the Docker network
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
