import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/+$/, "");

const PhotoBooth = () => {
  const [capturedImages, setCapturedImages] = useState([]);
  const [cameraError, setCameraError] = useState("");
  const [apiError, setApiError] = useState("");
  const videoRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  const frameColor = location.state?.frameColor || "#FFFFFF";
  const selectedEmotion = location.state?.selectedEmotion || "happy";

  // Start browser webcam
  useEffect(() => {
    let stream;
    let cancelled = false;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Browser camera API is unavailable.");
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 800, height: 600 },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraError("");
      } catch (error) {
        console.error("Camera error:", error);
        setCameraError(
          "เปิดกล้องไม่ได้ กรุณาอนุญาต Camera Permission ในเบราว์เซอร์"
        );
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Poll backend for captured images and photo strip
  useEffect(() => {
    if (!API_URL) {
      setApiError("ไม่พบ REACT_APP_API_URL กรุณาตรวจสอบการตั้งค่า");
      return;
    }

    let isMounted = true;
    let isNavigating = false;

    const getImageUrl = (path) => {
      if (/^https?:\/\//i.test(path)) {
        return path;
      }

      return `${API_URL}/${String(path).replace(/^\/+/, "")}`;
    };

    const fetchImagesAndPhotoStrip = async () => {
      try {
        const response = await fetch(
          `${API_URL}/get_captured_images`
        );

        if (!response.ok) {
          throw new Error(
            `/get_captured_images returned HTTP ${response.status}`
          );
        }

        const data = await response.json();
        const images = Array.isArray(data.images) ? data.images : [];

        if (!isMounted) return;

        setApiError("");
        setCapturedImages(images.map(getImageUrl));

        if (images.length >= 3 && !isNavigating) {
          const stripResponse = await fetch(
            `${API_URL}/get_photostrip`
          );

          if (!stripResponse.ok) {
            throw new Error(
              `/get_photostrip returned HTTP ${stripResponse.status}`
            );
          }

          const stripData = await stripResponse.json();

          if (isMounted && stripData.photostrip && !isNavigating) {
            isNavigating = true;

            navigate("/photostrip-preview", {
              state: {
                photostrip: getImageUrl(stripData.photostrip),
                frameColor,
                selectedEmotion,
              },
            });
          }
        }
      } catch (error) {
        console.error("PhotoBooth API error:", error);

        if (isMounted) {
          setApiError(error.message);
        }
      }
    };

    fetchImagesAndPhotoStrip();

    const interval = setInterval(fetchImagesAndPhotoStrip, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [navigate, frameColor, selectedEmotion]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold text-purple-700">
        Photobooth
      </h1>

      <h2 className="mt-6 text-xl font-medium text-gray-700">
        Selected Emotion: {selectedEmotion}
      </h2>

      <div className="relative mt-4 w-full max-w-[800px]">
        {cameraError ? (
          <p className="text-center text-red-600">{cameraError}</p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full border-4"
            style={{ borderColor: frameColor }}
          />
        )}
      </div>

      {apiError && (
        <p className="mt-4 max-w-xl break-words text-center text-red-600">
          ไม่สามารถโหลดข้อมูลจาก Backend ได้: {apiError}
        </p>
      )}

      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {capturedImages.map((img, index) => (
          <img
            key={`${img}-${index}`}
            src={img}
            alt={`Captured portrait ${index + 1}`}
            className="h-[150px] w-[200px] border-2 object-cover"
            style={{ borderColor: frameColor }}
            onError={() =>
              console.error("Failed to load captured image:", img)
            }
          />
        ))}
      </div>
    </div>
  );
};

export default PhotoBooth;