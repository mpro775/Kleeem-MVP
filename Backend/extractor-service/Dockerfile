FROM python:3.11-slim

WORKDIR /app

# 1) تثبيت المكتبات التي يحتاجها Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libx11-6 \
    libxkbfile1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libasound2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0 \
    libpci3 \
    libdrm2 \
    libxshmfence1 \
    libsecret-1-0 \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# 2) تثبيت متطلبات بايثون
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3) تثبيت Playwright وبراوزر Chromium
RUN playwright install chromium

# 4) نسخ الكود
COPY app/ .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
