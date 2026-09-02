FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for ping
RUN apt-get update && apt-get install -y iputils-ping procps && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Start Uvicorn server with dynamic PORT
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
