import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const gradientBackgrounds = [
  "linear-gradient(to bottom, #9DC3E2, #9DD2D8)", // 1
  "linear-gradient(to bottom, #FADCE4, #FFB5CC)", // 2
  "linear-gradient(to bottom, #E2B9DB, #FADCE4)", // 3
  "linear-gradient(to bottom, #9DD2D8, #FADCE4)", // 4
  "linear-gradient(to bottom, #FFB5CC, #9DC3E2)", // 5
];

const emotions = [ "Happy", "Fear", "Sad"];

function PhotoStrip() {
  const [selectedGradient, setSelectedGradient] = useState(gradientBackgrounds[0]);
  const [selectedEmotion, setSelectedEmotion] = useState("Happy");
  const navigate = useNavigate(); // Initialize navigation

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-pink-200 p-6">
      {/* Title */}
      <h2 className="text-3xl font-bold text-gray-900">Photo Strip Preview</h2>
      <p className="mt-2 text-gray-600">Customize your photo strip background & emotion</p>

       {/* Photo Strip Frame */}
       <div
        className="mt-6 p-4 rounded-lg shadow-lg relative w-48 h-[500px] flex flex-col items-center justify-between"
        style={{
          background: selectedGradient,
          padding: "10px",
          borderRadius: "12px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Image Slots */}
        {[1, 2, 3].map((_, index) => (
          <div key={index} className="relative w-[90%] h-[120px] bg-black rounded-md flex items-center justify-center">
            <span className="text-gray-300">📸</span>
          </div>
        ))}

        {/* Bottom Logo */}
        <div className="w-full h-[40px] flex items-center justify-center">
          <img src="/logo.png" alt="Kreamera" className="w-20 opacity-70" />
        </div>
      </div>


      {/* Frame Color Selection Buttons */}
      <h3 className="mt-4 text-lg font-semibold">Frame Color</h3>
      <div className="mt-2 flex gap-3">
        {gradientBackgrounds.map((gradient, index) => (
          <button
            key={index}
            onClick={() => setSelectedGradient(gradient)}
            className="px-4 py-2 rounded-full border border-gray-400 bg-white text-gray-900 hover:bg-gray-200"
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Emotion Selection Buttons (Now Below Frame Colors) */}
      <h3 className="mt-6 text-lg font-semibold">Choose Emotion</h3>
      <div className="mt-2 flex gap-3 flex-wrap justify-center">
        {emotions.map((emotion) => (
          <button
            key={emotion}
            onClick={() => setSelectedEmotion(emotion)}
            className={`px-4 py-2 rounded-full border border-gray-400 ${
              selectedEmotion === emotion ? "bg-gray-900 text-white" : "bg-white text-gray-900"
            } hover:bg-gray-200`}
          >
            {emotion}
          </button>
        ))}
      </div> 

      {/* Take Photo Button - Navigates to PhotoBooth */}
      <div className="mt-6 flex items-center justify-center gap-x-6">
        <button
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          type="button"
          onClick={() => navigate("/photobooth")} // Navigate to PhotoBooth
        >
          Take Photo
        </button>
      </div>
    </div>
  );
}

export default PhotoStrip;
