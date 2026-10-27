"""Emotion predictor that runs the trained CNN with plain NumPy (no TensorFlow).

TensorFlow needs ~550 MB of RAM, which does not fit on a 512 MB Render instance.
The model is a small CNN (3x Conv+MaxPool, then 2 Dense layers), so its forward pass is
reimplemented here. The weights come from model/weights.npz, which is produced from
model/model.h5 by export_weights.py.
"""
import os

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

from .image_utils import prepare_image

# แปลงหมายเลขคลาสเป็นชื่ออารมณ์
emotion_labels = {
    0: 'happy',
    1: 'sad',
    2: 'surprise'
}

_WEIGHTS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "model", "weights.npz")

# โหลดน้ำหนักของโมเดลที่เคยเทรนด์ไว้ (ใช้เวลาไม่ถึงวินาที)
_w = np.load(_WEIGHTS_PATH)
_LAYERS = {name: (_w[f"{name}/kernel"], _w[f"{name}/bias"])
           for name in ("conv2d", "conv2d_1", "conv2d_2", "dense", "dense_1")}


def _conv2d_relu(x, kernel, bias):
    """'valid' 3x3 convolution + ReLU. x: (N, H, W, C), kernel: (kh, kw, C, F)."""
    kh, kw, cin, cout = kernel.shape
    windows = sliding_window_view(x, (kh, kw), axis=(1, 2))        # (N, H', W', C, kh, kw)
    windows = windows.transpose(0, 1, 2, 4, 5, 3)                  # (N, H', W', kh, kw, C)
    n, h, w = windows.shape[:3]
    out = windows.reshape(n, h, w, kh * kw * cin) @ kernel.reshape(kh * kw * cin, cout) + bias
    return np.maximum(out, 0.0)


def _max_pool_2x2(x):
    """2x2 max pooling, stride 2, 'valid' (odd edge rows/columns are dropped, like Keras)."""
    n, h, w, c = x.shape
    h2, w2 = h // 2, w // 2
    return x[:, :h2 * 2, :w2 * 2, :].reshape(n, h2, 2, w2, 2, c).max(axis=(2, 4))


def _forward(x):
    for name in ("conv2d", "conv2d_1", "conv2d_2"):
        kernel, bias = _LAYERS[name]
        x = _max_pool_2x2(_conv2d_relu(x, kernel, bias))
    x = x.reshape(x.shape[0], -1)                                  # Flatten (H, W, C order)
    kernel, bias = _LAYERS["dense"]
    x = np.maximum(x @ kernel + bias, 0.0)
    kernel, bias = _LAYERS["dense_1"]
    logits = x @ kernel + bias
    logits -= logits.max(axis=1, keepdims=True)                    # softmax (numerically stable)
    exp = np.exp(logits)
    return exp / exp.sum(axis=1, keepdims=True)


# ฟังก์ชันทำนายอารมณ์
def predict_emotion(face):
    img = prepare_image(face).astype(np.float32)
    predictions = _forward(img)
    predicted_class = int(np.argmax(predictions))
    return emotion_labels[predicted_class]
