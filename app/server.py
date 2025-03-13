from flask import Flask, Response, request, jsonify, send_file
from flask_cors import CORS
import cv2
import os
import time
from PIL import Image, ImageOps , ImageFilter, ImageEnhance
from utils.emotion_predictor import predict_emotion  # Import emotion prediction model

app = Flask(__name__)
CORS(app)

# Ensure directories exist
os.makedirs("static/images", exist_ok=True)
os.makedirs("static/photostrips", exist_ok=True)

captured_photos = []
frame_color_selected = "#FFFFFF"
selected_emotion = "happy"  # Default selected emotion
capture_enabled = True
countdown_active = False
countdown_start_time = 0
countdown_duration = 1
photo_limit = 3  # Set capture limit to exactly 3 photos

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

@app.route("/set_photo_strip_settings", methods=["POST"])
def set_photo_strip_settings():
    """Store selected frame color and emotion from the frontend."""
    global frame_color_selected, selected_emotion, captured_photos, capture_enabled
    data = request.json
    frame_color_selected = data.get("frame_color", "#FFFFFF")
    selected_emotion = data.get("selected_emotion", "happy")
    captured_photos = []  # Reset captured photos for a new session
    capture_enabled = True  # Enable capture when a new session starts
    print(f"Frame color set: {frame_color_selected}, Emotion: {selected_emotion}")
    return jsonify({"message": "Settings updated!", "frame_color": frame_color_selected, "selected_emotion": selected_emotion})

@app.route("/get_captured_images", methods=["GET"])
def get_captured_images():
    """Returns the last 3 captured images"""
    return jsonify({"images": captured_photos[-3:]})

@app.route("/create_photostrip", methods=["POST"])
def create_photostrip():
    """Generates a photo strip using the selected frame color."""
    global frame_color_selected
    generate_photo_strip()
    
    return jsonify({
        "message": "Photo strip created successfully!",
        "frame_color": frame_color_selected
    })

def generate_frames():
    """Capture 3 images only when the detected emotion matches the selected emotion."""
    global countdown_active, countdown_start_time, captured_photos, capture_enabled, selected_emotion

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 800)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 600)

    while True:
        success, frame = cap.read()
        if not success:
            break

        frame = cv2.flip(frame, 1)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48))

        for (x, y, w, h) in faces:
            face = frame[y:y+h, x:x+w]
            predicted_emotion = predict_emotion(face)  # Predict emotion

            # กรอบแสดงอารมณ์
            # cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
            # cv2.putText(frame, predicted_emotion, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 0), 2)

            if len(captured_photos) < photo_limit and capture_enabled:
                if predicted_emotion == selected_emotion and not countdown_active:
                    countdown_active = True
                    countdown_start_time = time.time()

                if countdown_active:
                    elapsed_time = time.time() - countdown_start_time
                    remaining_time = int(countdown_duration - elapsed_time)

                    if remaining_time < 0:
                        filename = f"static/images/captured_{int(time.time())}.jpg"
                        cv2.imwrite(filename, frame)
                        captured_photos.append(filename)
                        countdown_active = False
                        print(f"✅ Image Captured: {filename}")

                        if len(captured_photos) >= photo_limit:
                            generate_photo_strip()
                            capture_enabled = False  # Stop capturing
                            print("✅ Capture complete: 3 images taken.")

        ret, buffer = cv2.imencode(".jpg", frame)
        frame = buffer.tobytes()
        yield (b"--frame\r\n"
               b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n\r\n")

@app.route("/video_feed")
def video_feed():
    return Response(generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame")

def generate_photo_strip():
    """Generate a photo strip after capturing 3 images."""
    global frame_color_selected

    if len(captured_photos) < photo_limit:
        return

    images = [Image.open(photo) for photo in captured_photos[-photo_limit:]]
    widths, heights = zip(*(i.size for i in images))
    strip_width = max(widths) + 42
    strip_height = sum(heights) + 500

    frame_color_rgb = tuple(int(frame_color_selected.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
    photostrip = Image.new("RGB", (strip_width, strip_height), frame_color_rgb)

    y_offset = 50
    for img in images:
        bordered_img = ImageOps.expand(img, border=10, fill=frame_color_rgb)
        photostrip.paste(bordered_img, (10, y_offset))
        y_offset += img.height + 70

    photostrip_filename = f"static/photostrips/photostrip_{int(time.time())}.jpg"
    photostrip.save(photostrip_filename)
    print(f"✅ Photo strip generated with color {frame_color_selected}: {photostrip_filename}")

@app.route("/get_photostrip", methods=["GET"])
def get_photostrip():
    photostrip_files = sorted(os.listdir("static/photostrips"))
    
    if photostrip_files:
        latest_photostrip = os.path.join("static/photostrips", photostrip_files[-1])
        logo_path = "static/logo.png"

        # ตรวจสอบว่าโลโก้มีอยู่จริง
        if os.path.exists(logo_path):
            try:
                photostrip = Image.open(latest_photostrip).convert("RGBA")
                logo = Image.open(logo_path).convert("RGBA")

                # ปรับขนาดโลโก้ให้ใหญ่ขึ้น
                logo_scale = 2
                logo_width = photostrip.width // logo_scale  
                logo_aspect_ratio = logo.width / logo.height
                logo_height = int(logo_width / logo_aspect_ratio)
                logo = logo.resize((logo_width, logo_height), Image.LANCZOS)

                # สร้างเงาให้โลโก้
                shadow_offset = 4  # ขนาดการเลื่อนเงา
                shadow_blur_radius = 10  # ปรับค่าความเบลอของเงา
                shadow = logo.copy().convert("RGBA")  
                shadow = shadow.filter(ImageFilter.GaussianBlur(shadow_blur_radius))  # ทำให้เงาฟุ้ง

                # ลดความสว่างของเงาให้ดูเข้มขึ้น
                enhancer = ImageEnhance.Brightness(shadow)
                shadow = enhancer.enhance(0.5)  

                # สร้างภาพใหม่ที่มีเงาและโลโก้รวมกัน
                logo_with_shadow = Image.new("RGBA", (logo_width + shadow_offset, logo_height + shadow_offset), (0, 0, 0, 0))
                logo_with_shadow.paste(shadow, (shadow_offset, shadow_offset), mask=shadow)
                logo_with_shadow.paste(logo, (0, 0), mask=logo)


                # คำนวณตำแหน่งโลโก้ (ตรงกลางด้านล่าง)
                logo_x = (photostrip.width - logo_width) // 2
                logo_y = photostrip.height - logo_height - 50  

                print(f"✅ Adding logo at: x={logo_x}, y={logo_y}, size={logo_width}x{logo_height}")

                # รวมภาพโลโก้เข้ากับ Photo Strip
                combined = Image.new("RGBA", photostrip.size, (255, 255, 255, 255))
                combined.paste(photostrip, (0, 0))
                combined.paste(logo, (logo_x, logo_y), mask=logo)

                # บันทึกภาพใหม่ที่มีโลโก้
                updated_photostrip = latest_photostrip.replace(".jpg", "_with_logo.jpg")
                combined.convert("RGB").save(updated_photostrip, "JPEG", quality=95)

                return jsonify({
                    "photostrip": f"http://127.0.0.1:5000/{updated_photostrip}",
                    "frame_color": frame_color_selected,
                    "selected_emotion": selected_emotion
                })
            except Exception as e:
                print(f"❌ Error adding logo: {str(e)}")
                return jsonify({"error": f"Failed to add logo: {str(e)}"}), 500

        return jsonify({
            "photostrip": f"http://127.0.0.1:5000/static/photostrips/{photostrip_files[-1]}",
            "frame_color": frame_color_selected,
            "selected_emotion": selected_emotion
        })

    return jsonify({"error": "No photostrip available"})

@app.route("/reset_capture", methods=["POST"])
def reset_capture():
    """Reset and delete all captured images and photostrips."""
    global captured_photos, capture_enabled, frame_color_selected

    for file in os.listdir("static/images"):
        os.remove(os.path.join("static/images", file))

    for file in os.listdir("static/photostrips"):
        os.remove(os.path.join("static/photostrips", file))

    captured_photos.clear()
    capture_enabled = True
    frame_color_selected = "#FFFFFF"

    print("✅ All images & photostrips deleted. Ready for new capture.")
    return jsonify({"message": "Capture reset successfully!"})
@app.route("/download_photostrip", methods=["GET"])
def download_photostrip():
    """Allow users to download the latest generated photostrip"""
    photostrip_files = sorted(os.listdir("static/photostrips"))
    if photostrip_files:
        latest_photostrip = os.path.join("static/photostrips", photostrip_files[-1])
        return send_file(latest_photostrip, as_attachment=True)
    return jsonify({"error": "No photostrip available"}), 404

if __name__ == "__main__":
    app.run(debug=True, threaded=True)
