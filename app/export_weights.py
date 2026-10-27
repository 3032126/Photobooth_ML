"""One-off script: convert model/model.h5 (Keras) into model/weights.npz (plain NumPy arrays).

Run it on your own computer, where TensorFlow is installed:
    python export_weights.py
The server then no longer needs TensorFlow at all.
"""
import numpy as np
import tensorflow as tf

model = tf.keras.models.load_model("model/model.h5", compile=False)

arrays = {}
for layer in model.layers:
    weights = layer.get_weights()          # [kernel, bias] for Conv2D / Dense, [] for the rest
    if weights:
        arrays[f"{layer.name}/kernel"] = weights[0].astype(np.float32)
        arrays[f"{layer.name}/bias"] = weights[1].astype(np.float32)

np.savez_compressed("model/weights.npz", **arrays)
print("Saved model/weights.npz with:", {k: v.shape for k, v in arrays.items()})
