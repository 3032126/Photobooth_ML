import tensorflow as tf
import numpy as np
from .image_utils import prepare_image

# แปลงหมายเลขคลาสเป็นชื่ออารมณ์
emotion_labels = {
    0: 'happy',
    1: 'sad',
    2: 'surprise'
}

# โหลดโมเดลที่เคยเทรนด์ไว้
model = tf.keras.models.load_model('model/model.h5', compile=False)

# ฟังก์ชันทำนายอารมณ์
def predict_emotion(face):
    img = prepare_image(face)
    predictions = model.predict(img)
    predicted_class = np.argmax(predictions)
    predicted_emotion = emotion_labels[predicted_class]
    return predicted_emotion
