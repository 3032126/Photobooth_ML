import cv2
import numpy as np

# ฟังก์ชันสำหรับเตรียมภาพ
def prepare_image(img):
    img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)  # แปลงเป็น Grayscale
    img = cv2.resize(img, (48, 48))  # ปรับขนาดภาพให้ตรงกับโมเดล
    img = np.expand_dims(img, axis=-1)  # เพิ่มมิติของสี (1 ช่องสำหรับ grayscale)
    img = np.expand_dims(img, axis=0)  # เพิ่มมิติ batch ให้เป็น (1, 48, 48, 1)
    img = img / 255.0  # Normalization
    return img
