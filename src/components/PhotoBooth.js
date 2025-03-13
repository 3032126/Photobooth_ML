import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const PhotoBooth = () => {
  const [capturedImages, setCapturedImages] = useState([]);
  const [photostrip, setPhotostrip] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const frameColor = location.state?.frameColor || "#FFFFFF";
  const selectedEmotion = location.state?.selectedEmotion || "Happy";

  useEffect(() => {
    const fetchImagesAndPhotoStrip = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5000/get_captured_images");
        const data = await response.json();
        setCapturedImages(data.images.map(img => `http://127.0.0.1:5000/${img}`));

        if (data.images.length >= 3) {
          const stripResponse = await fetch("http://127.0.0.1:5000/get_photostrip");
          const stripData = await stripResponse.json();
          if (stripData.photostrip) {
            setPhotostrip(stripData.photostrip);

            // Redirect to PhotoStripPreview when finished
            navigate("/photostrip-preview", {
              state: { photostrip: stripData.photostrip, frameColor }
            });
          }
        }
      } catch (error) {
        console.error("Error fetching images:", error);
      }
    };

    const interval = setInterval(fetchImagesAndPhotoStrip, 3000);
    return () => clearInterval(interval);
  }, [photostrip, navigate, frameColor]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-purple-700">Photobooth</h1>
      <h2 className="text-xl font-medium text-gray-700">Selected Emotion: {selectedEmotion}</h2>

      {/* Live Video Feed */}
      <div className="relative">
        <img src="http://127.0.0.1:5000/video_feed" alt="Live Video" className="w-[800px] h-[600px] border-4" style={{ borderColor: frameColor }} />
      </div>

      {/* Show Captured Images */}
      {capturedImages.length > 0 && (
        <div className="mt-4 flex space-x-2">
          {capturedImages.map((img, index) => (
            <img key={index} src={img} className="w-[200px] h-[150px] border-2" style={{ borderColor: frameColor }} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoBooth;
