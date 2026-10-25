import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL;

const frameColors = [
  { id: 1, name: "Blue", color: "#9DC3E2" },
  { id: 2, name: "Pink", color: "#FFB5CC" },
  { id: 3, name: "Purple", color: "#E2B9DB" },
  { id: 4, name: "Green", color: "#9DD2D8" },
  { id: 5, name: "Yellow", color: "#FFF7CD" },
];

const emotions = ["happy", "sad", "surprise"];

function PhotoStrip() {
  const [selectedFrame, setSelectedFrame] = useState(
    frameColors[0].color
  );
  const [selectedEmotion, setSelectedEmotion] = useState("happy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleCreatePhotoStrip = async () => {
    if (loading) return;

    setError("");

    if (!API_URL) {
      setError("ไม่พบการตั้งค่า API URL กรุณาตรวจสอบ Environment Variables");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/set_photo_strip_settings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            frame_color: selectedFrame,
            selected_emotion: selectedEmotion,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("Photo strip settings updated:", data);

      navigate("/photobooth", {
        state: {
          frameColor: selectedFrame,
          selectedEmotion,
        },
      });
    } catch (err) {
      console.error("Error setting photo strip settings:", err);
      setError(
        "ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-pink-200 p-6">
      <h2 className="text-3xl font-bold text-gray-900">
        Photo Strip Preview
      </h2>

      <p className="mt-2 text-gray-600 text-center">
        เลือกเฟรมที่ใช่และสีหน้าที่คุณต้องการ
      </p>

      {/* Photo Strip Frame Preview */}
      <div
        className="mt-6 w-48 h-[500px] p-3 rounded-xl shadow-lg flex flex-col items-center justify-between"
        style={{ backgroundColor: selectedFrame }}
      >
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="w-[90%] h-[120px] bg-black rounded-md flex items-center justify-center"
          >
            <span className="text-gray-400 text-sm">
              Photo {item}
            </span>
          </div>
        ))}

        <div className="w-full h-[40px] flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Kreamera"
            className="w-20 object-contain drop-shadow-lg"
          />
        </div>
      </div>

      {/* Frame Color Selection */}
      <h3 className="mt-5 text-lg font-semibold text-gray-900">
        Frame Color
      </h3>

      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {frameColors.map((frame) => (
          <button
            key={frame.id}
            type="button"
            onClick={() => setSelectedFrame(frame.color)}
            aria-pressed={selectedFrame === frame.color}
            className={`px-4 py-2 rounded-full border-2 transition ${
              selectedFrame === frame.color
                ? "border-gray-900 font-bold shadow-md"
                : "border-white hover:border-gray-400"
            } text-gray-900`}
            style={{ backgroundColor: frame.color }}
          >
            {frame.name}
          </button>
        ))}
      </div>

      {/* Emotion Selection */}
      <h3 className="mt-6 text-lg font-semibold text-gray-900">
        Choose Emotion
      </h3>

      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {emotions.map((emotion) => (
          <button
            key={emotion}
            type="button"
            onClick={() => setSelectedEmotion(emotion)}
            aria-pressed={selectedEmotion === emotion}
            className={`px-4 py-2 rounded-full border transition capitalize ${
              selectedEmotion === emotion
                ? "bg-[#8B7FE8] text-white border-[#8B7FE8] font-semibold"
                : "bg-white text-[#4B0082] border-purple-200 hover:bg-purple-100"
            }`}
          >
            {emotion}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <p
          role="alert"
          className="mt-4 text-center text-red-600"
        >
          {error}
        </p>
      )}

      {/* Take Photo Button */}
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={handleCreatePhotoStrip}
          disabled={loading}
          className="rounded-full bg-[#B7B1F2] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#A59AE8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Connecting..." : "Take Photo"}
        </button>
      </div>
    </div>
  );
}

export default PhotoStrip;