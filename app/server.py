from flask import Flask, Response, request, jsonify, send_file
from flask_cors import CORS
import cv2
import os
import time
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
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
last_debug_log = 0

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


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


def open_camera():
    # CAP_DSHOW opens much more reliably on Windows
    backend = cv2.CAP_DSHOW if os.name == "nt" else cv2.CAP_ANY
    cap = cv2.VideoCapture(0, backend)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 800)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 600)
    return cap


def generate_frames():
    """Capture 3 images only when the detected emotion matches the selected emotion."""
    global countdown_active, countdown_start_time, captured_photos, capture_enabled
    global last_debug_log

    cap = open_camera()
    if not cap.isOpened():
        print("❌ Cannot open camera. Close other apps using it, or try VideoCapture(1).")
        return

    try:
        while True:
            success, frame = cap.read()
            if not success:
                break

            frame = cv2.flip(frame, 1)
            raw_frame = frame.copy()  # keep a clean copy for saving
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48))

            if len(faces) == 0:
                countdown_active = False  # face lost: cancel the countdown

            if len(captured_photos) < photo_limit and capture_enabled:
                for (x, y, w, h) in faces:
                    face = frame[y:y+h, x:x+w]
                    predicted_emotion = str(predict_emotion(face)).lower()  # compare case-insensitively
                    wanted_emotion = str(selected_emotion).lower()
                    matches = predicted_emotion == wanted_emotion

                    # print what the model sees once per second (helps debugging)
                    if time.time() - last_debug_log > 1:
                        print(f"Detected: {predicted_emotion} | wanted: {wanted_emotion}")
                        last_debug_log = time.time()

                    if matches and not countdown_active:
                        countdown_active = True
                        countdown_start_time = time.time()
                    elif countdown_active and not matches:
                        countdown_active = False  # expression changed: cancel

                    if countdown_active and time.time() - countdown_start_time >= countdown_duration:
                        filename = f"static/images/captured_{int(time.time() * 1000)}.jpg"
                        cv2.imwrite(filename, raw_frame)
                        captured_photos.append(filename)
                        countdown_active = False
                        print(f"✅ Image Captured: {filename}")

                        if len(captured_photos) >= photo_limit:
                            generate_photo_strip()
                            capture_enabled = False  # Stop capturing
                            print("✅ Capture complete: 3 images taken.")
                        break  # one capture per frame

            ret, buffer = cv2.imencode(".jpg", frame)
            if not ret:
                continue
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n\r\n")
    finally:
        # runs when the browser leaves the page, so the camera is released for the next visit
        cap.release()
        print("Camera released.")


@app.route("/video_feed")
def video_feed():
    return Response(generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame")


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
    app.run(debug=True, threaded=True)