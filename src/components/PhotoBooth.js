import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL;

const PhotoBooth = () => {
  const [capturedImages, setCapturedImages] = useState([]);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  const frameColor = location.state?.frameColor || "#FFFFFF";
  const selectedEmotion = location.state?.selectedEmotion || "happy";

  // Open the user's webcam in the browser
  useEffect(() => {
    let stream;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera access is unavailable. Please use HTTPS and a supported browser."
          );
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 800, height: 600 },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraError("");
      } catch (error) {
        console.error("Camera error:", error);
        setCameraError(
          "Cannot access your camera. Please allow camera permission in your browser."
        );
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Poll the backend for captured images and the completed photo strip
  useEffect(() => {
    if (!API_URL) {
      console.error("REACT_APP_API_URL is not configured.");
      return;
    }

    let isMounted = true;
    let isNavigating = false;

    const fetchImagesAndPhotoStrip = async () => {
      try {
        const response = await fetch(`${API_URL}/get_captured_images`);

        if (!response.ok) {
          throw new Error(`Failed to fetch images: ${response.status}`);
        }

        const data = await response.json();
        const images = data.images || [];

        if (!isMounted) return;

        setCapturedImages(
          images.map((img) => {
            if (/^https?:\/\//i.test(img)) return img;
            return `${API_URL}/${img.replace(/^\/+/, "")}`;
          })
        );

        if (images.length >= 3 && !isNavigating) {
          const stripResponse = await fetch(`${API_URL}/get_photostrip`);

          if (!stripResponse.ok) {
            throw new Error(
              `Failed to fetch photostrip: ${stripResponse.status}`
            );
          }

          const stripData = await stripResponse.json();

          if (isMounted && stripData.photostrip && !isNavigating) {
            isNavigating = true;

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

    fetchImagesAndPhotoStrip();

    const interval = setInterval(fetchImagesAndPhotoStrip, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [navigate, frameColor]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold text-purple-700">
        Photobooth
      </h1>

      <h2 className="mt-6 text-xl font-medium text-gray-700">
        Selected Emotion: {selectedEmotion}
      </h2>

      {/* Browser webcam */}
      <div className="relative mt-4">
        {cameraError ? (
          <p className="max-w-lg text-center text-red-600">
            {cameraError}
          </p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full max-w-[800px] border-4"
            style={{ borderColor: frameColor }}
          />
        )}
      </div>

      {/* Captured images */}
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {capturedImages.map((img, index) => (
          <img
            key={`${img}-${index}`}
            src={img}
            alt={`Captured portrait ${index + 1}`}
            className="h-[150px] w-[200px] border-2 object-cover"
            style={{ borderColor: frameColor }}
          />
        ))}
      </div>
    </div>
  );
};

export default PhotoBooth;