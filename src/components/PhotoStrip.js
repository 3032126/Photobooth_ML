import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const frameColors = [
  { id: 1, name: "Blue", color: "#9DC3E2" },
  { id: 2, name: "Pink", color: "#FFB5CC" },
  { id: 3, name: "Purple", color: "#E2B9DB" },
  { id: 4, name: "Green", color: "#9DD2D8" },
  { id: 5, name: "Yellow", color: "#FFF7CD" },
];

const emotions = ["happy", "sad", "surprise"];

function PhotoStrip() {
  const [selectedFrame, setSelectedFrame] = useState(frameColors[0].color);
  const [selectedEmotion, setSelectedEmotion] = useState("Happy");
  const navigate = useNavigate();

  const handleCreatePhotoStrip = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:5000/set_photo_strip_settings",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frame_color: selectedFrame,
            selected_emotion: selectedEmotion,
          }),
        }
      );

      const data = await response.json();
      console.log("Photo strip settings updated:", data);

      // Navigate to PhotoBooth with selected frame color & emotion
      navigate("/photobooth", {
        state: { frameColor: selectedFrame, selectedEmotion },
      });
    } catch (error) {
      console.error("Error setting photo strip settings:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-pink-200 p-6">
      {/* Title */}
      <h2 className="text-3xl font-bold text-gray-900">Photo Strip Preview</h2>
      <p className="mt-2 text-gray-600">
        เลือกเฟรมที่ใช่และสีหน้าที่คุณต้องการ
      </p>

      {/* Photo Strip Frame */}
      <div
        className="mt-6 p-6 rounded-lg shadow-lg relative w-48 h-[500px] flex flex-col items-center justify-between"
        style={{
          background: selectedFrame,
          padding: "10px",
          borderRadius: "12px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
        }}
      >
        {[1, 2, 3].map((_, index) => (
          <div
            key={index}
            className="relative w-[90%] h-[120px] bg-black rounded-md flex items-center justify-center"
          >
            <span className="text-gray-300"></span>
          </div>
        ))}

        {/* Bottom Logo */}
        <div className="w-full h-[40px] flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Kreamera"
            className="w-20 opacity-100 drop-shadow-lg"
          />
        </div>
      </div>

      {/* Frame Color Selection */}
      <h3 className="mt-4 text-lg font-semibold">Frame Color</h3>
      <div className="mt-2 flex gap-3">
        {frameColors.map((frame) => (
          <button
            key={frame.id}
            onClick={() => setSelectedFrame(frame.color)}
            className={`px-4 py-2 rounded-full border ${
              selectedFrame === frame.color
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-900"
            } hover:bg-gray-200`}
            style={{ backgroundColor: frame.color }}
          >
            {frame.name}
          </button>
        ))}
      </div>

      {/* Emotion Selection */}
      <h3 className="mt-6 text-lg font-semibold">Choose Emotion</h3>
      <div className="mt-2 flex gap-3 flex-wrap justify-center">
        {emotions.map((emotion) => (
          <button
            key={emotion}
            onClick={() => setSelectedEmotion(emotion)}
            className={`px-4 py-2 rounded-full border ${
              selectedEmotion === emotion
                ? "bg-[#B7B1F2] text-white"
                : "bg-white text-[#4B0082]"
            } hover:bg-[#A59AE8]`}
          >
            {emotion}
          </button>
        ))}
      </div>

      {/* Take Photo Button */}
      <div className="mt-6 flex items-center justify-center gap-x-6">
        <button
          className="rounded-md bg-[#B7B1F2] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#A59AE8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7B1F2]"
          type="button"
          onClick={handleCreatePhotoStrip}
        >
          Take Photo
        </button>
      </div>
    </div>
  );
}

export default PhotoStrip;
