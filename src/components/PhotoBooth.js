import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const PhotoBooth = () => {
  const [capturedImages, setCapturedImages] = useState([]);
  const [photostrip, setPhotostrip] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const frameColor = location.state?.frameColor || "#FFFFFF";
  const selectedEmotion = location.state?.selectedEmotion || "Happy";
  const API_URL = process.env.REACT_APP_API_URL;


  useEffect(() => {
    const fetchImagesAndPhotoStrip = async () => {
      try {
        const response = await fetch(`${API_URL}/get_captured_images`);

        if (!response.ok) {
          throw new Error(`Failed to fetch images: ${response.status}`);
        }

        const data = await response.json();

        setCapturedImages(
          data.images.map(
            (img) => `${API_URL}/${img.replace(/^\/+/, "")}`
          )
        );

        if (data.images.length >= 3) {
          const stripResponse = await fetch(`${API_URL}/get_photostrip`);

          if (!stripResponse.ok) {
            throw new Error(`Failed to fetch photostrip: ${stripResponse.status}`);
          }

          const stripData = await stripResponse.json();

          if (stripData.photostrip) {
            setPhotostrip(stripData.photostrip);

            navigate("/photostrip-preview", {
              state: {
                photostrip: stripData.photostrip,
                frameColor,
              },
            });
          }
        }
      } catch (error) {
        console.error("Error fetching images:", error);
      }
    };

    const interval = setInterval(fetchImagesAndPhotoStrip, 3000);

    fetchImagesAndPhotoStrip();

    return () => clearInterval(interval);
  }, [API_URL, navigate, frameColor]);


  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-purple-700">Photobooth</h1>
      <h2 className="mt-6 text-xl font-medium text-gray-700">Selected Emotion: {selectedEmotion}</h2>


      {/* Live Video Feed */}
      <div className="relative">
        <img
          src={`${API_URL}/video_feed`}
          alt="Live Video"
          className="w-[800px] h-[600px] border-4"
          style={{ borderColor: frameColor }}
        />
      </div>

      {/* Show Captured Images */}

      {capturedImages.map((img, index) => (
        <img
          key={index}
          src={img}
          alt={`Captured portrait ${index + 1}`}
          className="w-[200px] h-[150px] border-2"
          style={{ borderColor: frameColor }}
        />
      ))}

    </div>
  );
};

export default PhotoBooth;