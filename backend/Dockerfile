FROM python:3.11-slim

# Install system dependencies including CA certificates
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates tzdata && \
    update-ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Set timezone (Optional but recommended)
ENV TZ=Asia/Seoul

WORKDIR /app

COPY requirements.txt .

# Upgrade pip and certifi explicitly with trusted hosts to bypass SSL errors during build
RUN pip install --no-cache-dir --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org --upgrade pip certifi && \
    pip install --no-cache-dir --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org -r requirements.txt

# Source code will be mounted via volume
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
