from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
from io import BytesIO
from PIL import Image
from utils.emotion_predictor import predict_emotion  # Import emotion predictor

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Helper function to decode base64 image
def decode_image(base64_string):
    image_data = base64.b64decode(base64_string.split(",")[1])
    img = Image.open(BytesIO(image_data)).convert("RGB")
    img = np.array(img)
    return img

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        image_data = data.get("image")

        # Convert base64 image to OpenCV format
        image = decode_image(image_data)

        # Predict emotion
        predicted_emotion = predict_emotion(image)

        return jsonify({"emotion": predicted_emotion})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
