import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const PhotoStripPreview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const photostrip = location.state?.photostrip || null;
  const frameColor = location.state?.frameColor || "#FFFFFF";
  const API_URL = process.env.REACT_APP_API_URL;

  const handleResetCapture = async () => {
    try {
      const response = await fetch(`${API_URL}/reset_capture`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Reset failed: ${response.status}`);
      }

      navigate("/photobooth");
    } catch (error) {
      console.error("Error resetting capture:", error);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-white to-pink-200 p-6 pt-20">
      <h1 className="text-3xl font-bold text-gray-900">Photo Strip Preview</h1>
      <p className="mt-2 text-gray-600">
        ดาวน์โหลดหรือถ่ายใหม่ เพื่อเก็บช่วงเวลาที่ดีที่สุดของคุณ!
      </p>

      {/* Display the Photo Strip */}
      {photostrip && (
        <div
          className="mt-6 border-4 p-4 rounded-lg shadow-lg bg-white relative flex justify-center"
          style={{ borderColor: frameColor }}
        >
          {/* ปรับขนาดของ Photo Strip */}
          <img
            src={photostrip}
            className="max-w-[350px] max-h-[800px] rounded-md object-contain"
            alt="Captured moments in a strip"
          />
        </div>
      )}

      {/* Buttons */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={() =>
            window.open(`${API_URL}/download_photostrip`, "_blank")
          }
          className="bg-[#B7B1F2] text-white px-6 py-3 rounded-full font-semibold shadow-md hover:bg-[#A59AE8] transition"
        >
          Download Photo Strip
        </button>

        <button
          onClick={handleResetCapture}
          className="bg-[#FF6B6B] text-white px-6 py-3 rounded-full font-semibold shadow-md hover:bg-[#E05757] transition"
        >
          Take New Photos
        </button>
      </div>
    </div>
  );
};

export default PhotoStripPreview;
