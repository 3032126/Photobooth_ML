# ใช้ Node.js สำหรับ frontend
FROM node:20-alpine3.17 AS frontend

# ตั้งค่า directory สำหรับ frontend
WORKDIR /Photobooth_ML/

# คัดลอกไฟล์ package.json และติดตั้ง dependencies
COPY package.json package-lock.json ./
RUN npm install

# คัดลอกไฟล์ทั้งหมดของ frontend
COPY . .

# สร้างไฟล์ build ของ React
RUN npm run build

# ใช้ Python สำหรับ backend
FROM python:3.10-slim AS backend

# ติดตั้ง dependencies ที่จำเป็นสำหรับ Supervisor
RUN apt-get update && apt-get install -y --no-install-recommends supervisor && rm -rf /var/lib/apt/lists/*

# ตั้งค่า directory สำหรับ backend
WORKDIR /Photobooth_ML/app

# คัดลอกไฟล์ทั้งหมด รวมถึง backend
COPY --from=frontend /Photobooth_ML/build ./frontend
COPY server.py requirements.txt ./ 

# ติดตั้ง Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# คัดลอกไฟล์ config ของ Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# เปิดพอร์ตของ frontend และ backend
EXPOSE 3000 5000

# รัน Supervisor
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
