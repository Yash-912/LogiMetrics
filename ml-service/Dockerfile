# LogiMetrics ML Service Dockerfile
# Multi-stage build for optimized production image

# ==============================================================================
# Stage 1: Builder
# ==============================================================================
FROM python:3.10-slim as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ==============================================================================
# Stage 2: Production
# ==============================================================================
FROM python:3.10-slim as production

# Labels
LABEL maintainer="LogiMetrics Team" \
      version="1.0.0" \
      description="LogiMetrics ML Service - ML predictions and optimizations"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    ML_ENV=production \
    ML_HOST=0.0.0.0 \
    ML_PORT=5001 \
    PATH="/opt/venv/bin:$PATH"

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN groupadd --gid 1000 mlservice && \
    useradd --uid 1000 --gid mlservice --shell /bin/bash --create-home mlservice

# Set working directory
WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY --chown=mlservice:mlservice . .

# Create necessary directories
RUN mkdir -p logs models data/training data/test && \
    chown -R mlservice:mlservice /app

# Switch to non-root user
USER mlservice

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5001/health || exit 1

# Default command - use gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "4", "--threads", "2", \
     "--worker-class", "gthread", "--worker-tmp-dir", "/dev/shm", \
     "--access-logfile", "-", "--error-logfile", "-", \
     "--capture-output", "--enable-stdio-inheritance", \
     "app:get_app()"]

# ==============================================================================
# Stage 3: Development
# ==============================================================================
FROM production as development

# Switch to root to install dev dependencies
USER root

# Install development dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    vim \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set development environment
ENV ML_ENV=development \
    FLASK_ENV=development \
    FLASK_DEBUG=1

# Switch back to non-root user
USER mlservice

# Development command - use Flask development server
CMD ["python", "app.py"]

# ==============================================================================
# Stage 4: Testing
# ==============================================================================
FROM production as testing

# Switch to root to install test dependencies
USER root

# Set testing environment
ENV ML_ENV=testing \
    FLASK_ENV=testing

# Install testing dependencies
RUN pip install pytest pytest-cov pytest-asyncio responses faker

# Switch back to non-root user
USER mlservice

# Test command
CMD ["pytest", "-v", "--cov=services", "--cov=utils", "--cov-report=term-missing", "tests/"]
