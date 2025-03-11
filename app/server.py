from flask import Flask, Response, jsonify, send_file
from flask_cors import CORS
import cv2
import os
import time
from PIL import Image
from utils.emotion_predictor import predict_emotion

app = Flask(__name__)
CORS(app)

if not os.path.exists("static/images"):
    os.makedirs("static/images")
if not os.path.exists("static/photostrips"):
    os.makedirs("static/photostrips")

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

captured_photos = []
countdown_active = False
countdown_start_time = 0
countdown_duration = 3  # Countdown in seconds
capture_enabled = True  # Stop capturing after 4 pictures

# 🔹 STREAM VIDEO WITH COUNTDOWN & AUTO-CAPTURE
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
                emotion = predict_emotion(face)

                cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
                cv2.putText(frame, emotion, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 0), 2)

                # Start countdown if "happy" is detected
                if emotion == "happy" and not countdown_active:
                    countdown_active = True
                    countdown_start_time = time.time()

                # Handle countdown
                if countdown_active:
                    elapsed_time = time.time() - countdown_start_time
                    remaining_time = int(countdown_duration - elapsed_time)

                    if remaining_time > 0:
                        cv2.putText(frame, f"Capturing in {remaining_time}s", (x, y-40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                    else:
                        filename = f"static/images/happy_{int(time.time())}.jpg"
                        cv2.imwrite(filename, frame)
                        captured_photos.append(filename)
                        countdown_active = False
                        print(f"Image Captured: {filename}")

                        # Stop capturing after 4 images
                        if len(captured_photos) >= 4:
                            generate_photo_strip()
                            capture_enabled = False  # Stop capturing

        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route("/get_captured_images", methods=["GET"])
def get_captured_images():
    return jsonify({"images": captured_photos[-4:]})  # Send only last 4 images

@app.route("/reset_capture", methods=["POST"])
def reset_capture():
    global captured_photos, capture_enabled
    captured_photos.clear()
    capture_enabled = True  # Re-enable capturing
    return jsonify({"message": "Capture reset successfully!"})

# 🔹 GENERATE PHOTO STRIP
def generate_photo_strip():
    if len(captured_photos) < 4:
        return

    images = [Image.open(photo) for photo in captured_photos[-4:]]  # Use last 4 images
    widths, heights = zip(*(i.size for i in images))

    strip_width = max(widths)
    strip_height = sum(heights)

    photostrip = Image.new("RGB", (strip_width, strip_height))
    y_offset = 0
    for img in images:
        photostrip.paste(img, (0, y_offset))
        y_offset += img.height

    photostrip_filename = f"static/photostrips/photostrip_{int(time.time())}.jpg"
    photostrip.save(photostrip_filename)
    print(f"Photo strip generated: {photostrip_filename}")

@app.route("/get_photostrip", methods=["GET"])
def get_photostrip():
    photostrip_files = sorted(os.listdir("static/photostrips"))
    if photostrip_files:
        return jsonify({"photostrip": f"static/photostrips/{photostrip_files[-1]}"})
    return jsonify({"error": "No photostrip available"})

@app.route("/download_photostrip", methods=["GET"])
def download_photostrip():
    photostrip_files = sorted(os.listdir("static/photostrips"))
    if photostrip_files:
        latest_photostrip = photostrip_files[-1]
        return send_file(f"static/photostrips/{latest_photostrip}", as_attachment=True)
    return jsonify({"error": "No photostrip available"})

if __name__ == "__main__":
    app.run(debug=True, threaded=True)
