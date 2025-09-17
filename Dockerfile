FROM python:3.10-slim

# System deps for TensorFlow
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency list first for better caching
COPY requirements.txt ./

# Avoid TensorFlow building from source
ENV PIP_NO_CACHE_DIR=1 \
    TF_ENABLE_ONEDNN_OPTS=0

RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy application code
COPY . .

# Ensure model and json files are present
RUN test -f cultural_site_model.h5 && test -f site_info.json

# Expose port
EXPOSE 8000

# Use gunicorn in production
CMD ["gunicorn", "-w", "1", "-b", "0.0.0.0:8000", "app:app"]


