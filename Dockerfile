FROM python:3.13-slim

RUN apt-get update && apt-get install -y \
  build-essential \
  python3-dev \
  python3-pip \
  python3-cffi \
  python3-brotli \
  libpango-1.0-0 \
  libpangoft2-1.0-0 \
  libharfbuzz-subset0 \
  libjpeg-dev \
  libopenjp2-7-dev \
  libffi-dev \
  shared-mime-info \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN SECRET_KEY=dummy-value-for-build python manage.py collectstatic --noinput

CMD ["sh", "-c", "python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000}"]