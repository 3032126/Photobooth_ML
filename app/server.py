from flask import Flask, Response, request, jsonify, send_file
from flask_cors import CORS
import cv2
import os
import time
from PIL import Image, ImageOps

app = Flask(__name__)
CORS(app)

# Ensure directories exist
os.makedirs("static/images", exist_ok=True)
os.makedirs("static/photostrips", exist_ok=True)

# Load OpenCV Face Detector
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Global variables
captured_photos = []
frame_color_selected = "#FFFFFF"  # Default frame color
selected_emotion = "happy"  # Default emotion
countdown_active = False
countdown_start_time = 0
countdown_duration = 3
capture_enabled = True

# Store selected frame color and emotion from frontend
@app.route("/set_photo_strip_settings", methods=["POST"])
def set_photo_strip_settings():
    global frame_color_selected, selected_emotion
    data = request.json
    frame_color_selected = data.get("frame_color", "#FFFFFF")
    selected_emotion = data.get("selected_emotion", "happy")  # Store emotion
    print(f"Frame color set: {frame_color_selected}, Emotion: {selected_emotion}")
    return jsonify({"message": "Settings updated!", "frame_color": frame_color_selected, "selected_emotion": selected_emotion})

# Get captured images
@app.route("/get_captured_images", methods=["GET"])
def get_captured_images():
    return jsonify({"images": captured_photos[-3:]})

# Generate Photo Strip
@app.route("/create_photostrip", methods=["POST"])
def create_photostrip():
    generate_photo_strip()
    return jsonify({
        "message": "Photo strip created successfully!",
        "frame_color": frame_color_selected
    })

# 🔹 STREAM VIDEO WITH COUNTDOWN & AUTO-CAPTURE BASED ON SELECTED EMOTION
def generate_frames():
    global countdown_active, countdown_start_time, captured_photos, capture_enabled
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

        if capture_enabled:
            for (x, y, w, h) in faces:
                face = frame[y:y+h, x:x+w]
                predicted_emotion = selected_emotion  # Simulated emotion detection for now

                cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
                cv2.putText(frame, predicted_emotion, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 0), 2)

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
                        print(f"Image Captured: {filename}")

                        if len(captured_photos) >= 3:
                            generate_photo_strip()
                            capture_enabled = False  # Stop capturing

        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# Generate a photo strip with the selected frame color
def generate_photo_strip():
    global frame_color_selected

    if len(captured_photos) < 3:
        return

    images = [Image.open(photo) for photo in captured_photos[-3:]]
    widths, heights = zip(*(i.size for i in images))

    strip_width = max(widths) + 42
    strip_height = sum(heights) + 500

    # Convert HEX color to RGB
    frame_color_rgb = tuple(int(frame_color_selected.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))

    photostrip = Image.new("RGB", (strip_width, strip_height), frame_color_rgb)
    y_offset = 50

    for img in images:
        bordered_img = ImageOps.expand(img, border=10, fill=frame_color_rgb)
        photostrip.paste(bordered_img, (10, y_offset))
        y_offset += img.height + 70

    photostrip_filename = f"static/photostrips/photostrip_{int(time.time())}.jpg"
    photostrip.save(photostrip_filename)
    print(f"Photo strip generated with color {frame_color_selected}: {photostrip_filename}")

# Get the latest photo strip
@app.route("/get_photostrip", methods=["GET"])
def get_photostrip():
    photostrip_files = sorted(os.listdir("static/photostrips"))
    if photostrip_files:
        return jsonify({
            "photostrip": f"http://127.0.0.1:5000/static/photostrips/{photostrip_files[-1]}",
            "frame_color": frame_color_selected,
            "selected_emotion": selected_emotion
        })
    return jsonify({"error": "No photostrip available"})

# Reset Capture - Deletes all images and photostrips
@app.route("/reset_capture", methods=["POST"])
def reset_capture():
    global captured_photos, capture_enabled, frame_color_selected

    for file in os.listdir("static/images"):
        os.remove(os.path.join("static/images", file))

    for file in os.listdir("static/photostrips"):
        os.remove(os.path.join("static/photostrips", file))

    captured_photos.clear()
    capture_enabled = True
    frame_color_selected = "#FFFFFF"

    print("All images & photostrips deleted. Ready for new capture.")
    return jsonify({"message": "Capture reset successfully!"})

# Download Photo Strip
@app.route("/download_photostrip", methods=["GET"])
def download_photostrip():
    photostrip_files = sorted(os.listdir("static/photostrips"))
    if photostrip_files:
        latest_photostrip = photostrip_files[-1]
        return send_file(f"static/photostrips/{latest_photostrip}", as_attachment=True)
    return jsonify({"error": "No photostrip available"})

if __name__ == "__main__":
    app.run(debug=True, threaded=True)