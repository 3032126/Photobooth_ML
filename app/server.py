from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import cv2
import numpy as np
import os
import time
import threading
from PIL import Image, ImageOps
from utils.emotion_predictor import predict_emotion  # Import emotion prediction model

app = Flask(__name__)
CORS(app)

# Ensure directories exist
os.makedirs("static/images", exist_ok=True)
os.makedirs("static/photostrips", exist_ok=True)

captured_photos = []
current_photostrip = None  # path of the finished strip for the current session
frame_color_selected = "#FFFFFF"
selected_emotion = "happy"  # Default selected emotion
capture_enabled = True
countdown_active = False
countdown_start_time = 0
countdown_duration = 2  # seconds the emotion must be held before capturing
photo_limit = 3  # Set capture limit to exactly 3 photos

# Only one frame is analysed at a time; extra uploads are skipped instead of queuing up
analysis_lock = threading.Lock()

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


@app.route("/")
def health():
    """Open this URL in the browser to wake the Render server up."""
    return jsonify({"status": "ok"})


@app.route("/set_photo_strip_settings", methods=["POST"])
def set_photo_strip_settings():
    """Store selected frame color and emotion from the frontend."""
    global frame_color_selected, selected_emotion, captured_photos
    global capture_enabled, countdown_active, current_photostrip
    data = request.json or {}
    frame_color_selected = data.get("frame_color", "#FFFFFF")
    selected_emotion = data.get("selected_emotion", "happy")
    captured_photos = []  # Reset captured photos for a new session
    current_photostrip = None
    countdown_active = False
    capture_enabled = True  # Enable capture when a new session starts
    print(f"Frame color set: {frame_color_selected}, Emotion: {selected_emotion}")
    return jsonify({"message": "Settings updated!", "frame_color": frame_color_selected, "selected_emotion": selected_emotion})


@app.route("/upload_frame", methods=["POST"])
def upload_frame():
    """Receive one webcam frame from the browser and capture it when the emotion matches."""
    global countdown_active, countdown_start_time, capture_enabled

    file = request.files.get("frame")
    if file is None:
        return jsonify({"error": "missing frame"}), 400

    if not capture_enabled or len(captured_photos) >= photo_limit:
        return jsonify({"captured": False, "done": True, "count": len(captured_photos)})

    if not analysis_lock.acquire(blocking=False):
        return jsonify({"captured": False, "busy": True, "count": len(captured_photos)})

    try:
        data = np.frombuffer(file.read(), np.uint8)
        frame = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({"error": "invalid image"}), 400

        frame = cv2.flip(frame, 1)  # mirror, same as the old OpenCV version
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48))

        wanted_emotion = str(request.form.get("emotion") or selected_emotion).lower()

        if len(faces) == 0:
            countdown_active = False  # face lost: cancel the countdown
            return jsonify({"captured": False, "detected": None, "counting": False, "count": len(captured_photos)})

        # use the biggest face in the frame
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        face = frame[y:y + h, x:x + w]
        predicted_emotion = str(predict_emotion(face)).lower()
        matches = predicted_emotion == wanted_emotion
        print(f"Detected: {predicted_emotion} | wanted: {wanted_emotion}")

        if matches and not countdown_active:
            countdown_active = True
            countdown_start_time = time.time()
        elif countdown_active and not matches:
            countdown_active = False  # expression changed: cancel

        captured = False
        if countdown_active and time.time() - countdown_start_time >= countdown_duration:
            filename = f"static/images/captured_{int(time.time() * 1000)}.jpg"
            cv2.imwrite(filename, frame)
            captured_photos.append(filename)
            countdown_active = False
            captured = True
            print(f"✅ Image Captured: {filename}")

            if len(captured_photos) >= photo_limit:
                generate_photo_strip()
                capture_enabled = False  # Stop capturing
                print("✅ Capture complete: 3 images taken.")

        return jsonify({
            "captured": captured,
            "detected": predicted_emotion,
            "counting": countdown_active,
            "count": len(captured_photos),
        })
    finally:
        analysis_lock.release()


@app.route("/get_captured_images", methods=["GET"])
def get_captured_images():
    """Returns the last 3 captured images"""
    return jsonify({"images": captured_photos[-3:]})


@app.route("/create_photostrip", methods=["POST"])
def create_photostrip():
    """Generates a photo strip using the selected frame color."""
    generate_photo_strip()

    return jsonify({
        "message": "Photo strip created successfully!",
        "frame_color": frame_color_selected
    })


def add_logo(photostrip):
    """Place the logo at the bottom center of the strip. Returns an RGB image."""
    logo_path = "static/logo.png"
    if not os.path.exists(logo_path):
        return photostrip.convert("RGB")

    try:
        photostrip = photostrip.convert("RGBA")
        logo = Image.open(logo_path).convert("RGBA")

        logo_scale = 2
        logo_width = photostrip.width // logo_scale
        logo_aspect_ratio = logo.width / logo.height
        logo_height = int(logo_width / logo_aspect_ratio)
        logo = logo.resize((logo_width, logo_height), Image.LANCZOS)

        logo_x = (photostrip.width - logo_width) // 2
        logo_y = photostrip.height - logo_height - 50

        combined = Image.new("RGBA", photostrip.size, (255, 255, 255, 255))
        combined.paste(photostrip, (0, 0))
        combined.paste(logo, (logo_x, logo_y), mask=logo)
        return combined.convert("RGB")
    except Exception as e:
        print(f"❌ Error adding logo: {str(e)}")
        return photostrip.convert("RGB")


def generate_photo_strip():
    """Generate a photo strip (with logo) after capturing 3 images."""
    global current_photostrip

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

    photostrip = add_logo(photostrip)

    photostrip_filename = f"static/photostrips/photostrip_{int(time.time() * 1000)}.jpg"
    photostrip.save(photostrip_filename, "JPEG", quality=95)
    current_photostrip = photostrip_filename
    print(f"✅ Photo strip generated with color {frame_color_selected}: {photostrip_filename}")


@app.route("/get_photostrip", methods=["GET"])
def get_photostrip():
    # Only return the strip made in THIS session (never an old one, never stack the logo twice)
    if current_photostrip and os.path.exists(current_photostrip):
        return jsonify({
            "photostrip": current_photostrip,  # relative path, the frontend adds the API URL
            "frame_color": frame_color_selected,
            "selected_emotion": selected_emotion
        })

    return jsonify({"photostrip": None})


@app.route("/reset_capture", methods=["POST"])
def reset_capture():
    """Reset and delete all captured images and photostrips."""
    global captured_photos, capture_enabled, countdown_active, current_photostrip

    for folder in ("static/images", "static/photostrips"):
        for file in os.listdir(folder):
            try:
                os.remove(os.path.join(folder, file))
            except OSError as e:
                print(f"Could not delete {file}: {e}")

    captured_photos = []
    current_photostrip = None
    countdown_active = False
    capture_enabled = True
    # frame color and emotion are kept so "Take New Photos" uses the same settings

    print("✅ All images & photostrips deleted. Ready for new capture.")
    return jsonify({"message": "Capture reset successfully!"})


@app.route("/download_photostrip", methods=["GET"])
def download_photostrip():
    """Allow users to download the latest generated photostrip"""
    if current_photostrip and os.path.exists(current_photostrip):
        return send_file(current_photostrip, as_attachment=True, download_name="photostrip.jpg")
    return jsonify({"error": "No photostrip available"}), 404


if __name__ == "__main__":
    # Local testing only. On Render the app is started by gunicorn (see start command).
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False, threaded=True)