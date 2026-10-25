import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL;

const PhotoStripPreview = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const photostrip = location.state?.photostrip || null;
  const frameColor = location.state?.frameColor || "#FFFFFF";

  // Handle both absolute URLs and paths returned by the backend
  const photostripUrl =
    photostrip && /^https?:\/\//i.test(photostrip)
      ? photostrip
      : photostrip && API_URL
        ? `${API_URL}/${photostrip.replace(/^\/+/, "")}`
        : null;

  const handleDownload = () => {
    if (!API_URL) {
      console.error("REACT_APP_API_URL is not configured.");
      return;
    }

    window.open(`${API_URL}/download_photostrip`, "_blank");
  };

  const handleResetCapture = async () => {
    if (!API_URL) {
      console.error("REACT_APP_API_URL is not configured.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/reset_capture`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Reset failed: ${response.status}`);
      }

      navigate("/photobooth", {
        state: {
          frameColor,
          selectedEmotion: location.state?.selectedEmotion || "happy",
        },
      });
    } catch (error) {
      console.error("Error resetting capture:", error);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-white to-pink-200 p-6 pt-20">
      <h1 className="text-3xl font-bold text-gray-900">
        Photo Strip Preview
      </h1>

      <p className="mt-2 text-gray-600 text-center">
        ดาวน์โหลดหรือถ่ายใหม่ เพื่อเก็บช่วงเวลาที่ดีที่สุดของคุณ!
      </p>

      {/* Display the Photo Strip */}
      {photostripUrl ? (
        <div
          className="mt-6 border-4 p-4 rounded-lg shadow-lg bg-white relative flex justify-center"
          style={{ borderColor: frameColor }}
        >
          <img
            src={photostripUrl}
            className="max-w-[350px] max-h-[800px] rounded-md object-contain"
            alt="Captured moments in a strip"
            onError={() =>
              console.error("Failed to load photo strip:", photostripUrl)
            }
          />
        </div>
      ) : (
        <p className="mt-6 text-red-600">
          ไม่พบรูป Photo Strip กรุณาถ่ายรูปใหม่อีกครั้ง
        </p>
      )}

      {/* Buttons */}
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        <button
          type="button"
          onClick={handleDownload}
          className="bg-[#B7B1F2] text-white px-6 py-3 rounded-full font-semibold shadow-md hover:bg-[#A59AE8] transition"
        >
          Download Photo Strip
        </button>

        <button
          type="button"
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
