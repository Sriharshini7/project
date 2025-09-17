from flask import Flask, render_template, request, jsonify
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import numpy as np
import os
import json

# Initialize Flask app
app = Flask(__name__)

# Load trained model
# Ensure this file exists in your project root
model = load_model("cultural_site_model.h5")

# Load site info from JSON
with open("site_info.json", "r", encoding="utf-8") as f:
    site_info = json.load(f)

# Load class names from a dedicated file if available; fall back to site_info keys
try:
    with open("class_names.json", "r", encoding="utf-8") as f:
        class_names = json.load(f)
        if not isinstance(class_names, list):
            raise ValueError("class_names.json must contain a JSON array of class labels")
except Exception:
    class_names = list(site_info.keys())

# --- Confidence/margin thresholds ---
# Require high confidence and a margin over the second-best class
CONFIDENCE_THRESHOLD = 0.85
MARGIN_THRESHOLD = 0.10


# ---------- ROUTES ---------- #

@app.route("/")
def home():
    """Landing page"""
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    """Handles image upload & prediction"""
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"})

    file = request.files['file']

    # Save temporarily in static
    if not os.path.exists('static'):
        os.makedirs('static')
    img_path = os.path.join("static", "temp.jpg")
    file.save(img_path)

    # Preprocess image
    img = image.load_img(img_path, target_size=(224, 224))
    x = image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = x / 255.0  # normalize

    # Predict
    predictions = model.predict(x)
    probs = predictions.flatten().astype(float)
    top_indices = probs.argsort()[::-1]
    top1_idx, top2_idx = int(top_indices[0]), (int(top_indices[1]) if len(probs) > 1 else None)
    top1_conf = float(probs[top1_idx])
    top2_conf = float(probs[top2_idx]) if top2_idx is not None else 0.0
    margin = top1_conf - top2_conf
    pred_class = class_names[top1_idx] if top1_idx < len(class_names) else None

    # Clean temp file
    if os.path.exists(img_path):
        os.remove(img_path)

    # Decision: confident and distinct enough, and has info
    if pred_class and top1_conf >= CONFIDENCE_THRESHOLD and margin >= MARGIN_THRESHOLD:
        # Ensure we have site info for this class (case-insensitive fallback)
        info_key = pred_class if pred_class in site_info else None
        if not info_key:
            lower_map = {k.lower(): k for k in site_info.keys()}
            info_key = lower_map.get(pred_class.lower()) if isinstance(pred_class, str) else None
        if info_key:
            return render_template("ar.html", site_name=info_key)

    return render_template("not_found.html")


@app.route("/site/<site_name>")
def site_details(site_name):
    """Return site info in JSON (for AR page fetch)"""
    info = site_info.get(site_name, None)
    if info:
        return jsonify(info)
    else:
        return jsonify({"error": "Site info not found"})


# Run app
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
