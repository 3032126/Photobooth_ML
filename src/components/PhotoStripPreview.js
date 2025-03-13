import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const PhotoStripPreview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const photostrip = location.state?.photostrip || null;
  const frameColor = location.state?.frameColor || "#FFFFFF";

  const handleResetCapture = async () => {
    await fetch("http://127.0.0.1:5000/reset_capture", { method: "POST" });
    navigate("/photostrip");
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-white to-pink-200 p-6 pt-20">
      <h1 className="text-3xl font-bold text-gray-900">Photo Strip Preview</h1>
      <p className="mt-2 text-gray-600">ดาวน์โหลดหรือถ่ายใหม่ เพื่อเก็บช่วงเวลาที่ดีที่สุดของคุณ!</p>

      {/* Display the Photo Strip */}
      {photostrip && (
        <div
          className="mt-6 border-4 p-4 rounded-lg shadow-lg bg-white relative"
          style={{ borderColor: frameColor }}
        >
          {/* Photo Strip Image */}
          <img
            src={photostrip}
            className="w-[600px] h-auto rounded-md"
            alt="Photo Strip"
          />
        </div>
      )}

      {/* Buttons */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={() =>
            window.open("http://127.0.0.1:5000/download_photostrip", "_blank")
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
