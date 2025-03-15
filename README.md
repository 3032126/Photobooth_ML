Photo Booth with Emotion-Based Auto-Capture
เกี่ยวกับโปรเจกต์
โปรเจกต์นี้เป็น Photo Booth ที่สามารถถ่ายรูปโดยอัตโนมัติเมื่อ AI ตรวจจับอารมณ์ที่ผู้ใช้เลือก (Happy, Sad, Fear, etc.) และสร้าง Photo Strip ออกมาให้ดาวน์โหลดได้ 📷✨
Live Camera Feed พร้อมตรวจจับใบหน้า
Emotion-Based Auto-Capture: ถ่ายภาพเมื่ออารมณ์ที่เลือกตรงกับ AI
Custom Frame Color: ผู้ใช้สามารถเลือกสีของกรอบได้
Photo Strip Generation: รวมภาพ 3 รูปเป็นแถบภาพที่มีสีกรอบที่เลือก
Download Photo Strip ได้ง่ายๆ
<br >การติดตั้ง & การใช้งาน </br>

Clone Repo
git clone https://github.com/your-repo/photo-booth.git

cd photo-booth
รัน Backend
python server.py

ติดตั้ง Frontend
cd frontend
npm install

รัน Frontend
npm start

การทำงานของโปรเจกต์
1. เริ่มต้นใช้งาน
   ![Screenshot 2025-03-15 171928](https://github.com/user-attachments/assets/82e759ff-e113-4bac-b783-56a623ea5c3c)

2. เลือก สีของกรอบรูป เลือก อารมณ์ที่ต้องการให้กล้องจับภาพ
  ![Screenshot 2025-03-15 171944](https://github.com/user-attachments/assets/35d75f62-6bdc-4035-bfae-6bb1d6974b12)
3. Live Camera & Auto Capture
เมื่อกล้องตรวจจับใบหน้าและตรงกับอารมณ์ที่เลือก → จะเริ่มนับถอยหลังแล้วถ่ายอัตโนมัติ
ถ่ายครบ 3 รูป → หยุดการถ่าย และสร้าง Photo Strip
   ![Screenshot 2025-03-15 172953](https://github.com/user-attachments/assets/57ef5f51-9c3f-406a-a766-b6ce3b0a5ac7)
5. Photo Strip Preview
แสดงแถบภาพที่สร้างขึ้น
สามารถ Download Photo Strip หรือ ถ่ายใหม่ได้
  ![Screenshot 2025-03-15 172335](https://github.com/user-attachments/assets/e1b44fb4-366d-4a6f-94ce-36f0ec7adbd0)
Frontend
-React
-TailwindCSS
-React Router
Backend
-Flask
-OpenCV 
-Machine Learning Model 

