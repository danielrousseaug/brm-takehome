FROM python:3.11-slim

# Install system dependencies for OCR
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       tesseract-ocr \
       libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]