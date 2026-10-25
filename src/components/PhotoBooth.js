import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Strip trailing slash so `${API_URL}/path` never becomes `//path`
const API_URL = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");
const POLL_INTERVAL_MS = 3000;
const REQUIRED_IMAGES = 3;

// Headers sent with every API request.
// "ngrok-skip-browser-warning" stops ngrok's free tier from returning its HTML warning page
// instead of JSON (a common cause of "Unexpected token '<'"). Harmless for other servers.
const API_HEADERS = {
  Accept: "application/json",
  "ngrok-skip-browser-warning": "true",
};

// Fetch JSON and throw a readable error if the server returns HTML or an error status
const fetchJson = async (url, signal) => {
  const response = await fetch(url, { headers: API_HEADERS, signal });

  if (!response.ok) {
    throw new Error(`${url} -> HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const preview = (await response.text()).slice(0, 80);
    throw new Error(
      `${url} returned "${contentType || "unknown"}" instead of JSON. ` +
        `Check REACT_APP_API_URL and the backend route. Response starts with: ${preview}`
    );
  }

  return response.json();
};

// Map getUserMedia errors to a message the user can act on
const cameraErrorMessage = (error) => {
  switch (error?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera permission was denied. Please allow camera access in your browser settings.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No suitable camera was found on this device.";
    case "NotReadableError":
      return "The camera is being used by another app (for example the backend or a video call). Close it and reload.";
    default:
      return error?.message || "Cannot access your camera.";
  }
};

const toAbsoluteUrl = (img) => {
  if (/^(https?:|data:|blob:)/i.test(img)) return img;
  return `${API_URL}/${String(img).replace(/^\/+/, "")}`;
};

const PhotoBooth = () => {
  const [capturedImages, setCapturedImages] = useState([]);
  const [cameraError, setCameraError] = useState("");
  const [apiError, setApiError] = useState(
    API_URL ? "" : "REACT_APP_API_URL is not configured. Add it to .env and restart the dev server."
  );

  const videoRef = useRef(null);
  const isNavigatingRef = useRef(false); // survives effect re-runs, unlike a local variable

  const navigate = useNavigate();
  const location = useLocation();

  const frameColor = location.state?.frameColor || "#FFFFFF";
  const selectedEmotion = location.state?.selectedEmotion || "happy";

  // Open the user's webcam in the browser
  useEffect(() => {
    let stream = null;
    let cancelled = false; // handles unmount (and React StrictMode double-mount) during the await

    const startCamera = async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera access needs HTTPS or http://localhost and a supported browser."
          );
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 800 }, height: { ideal: 600 } },
          audio: false,
        });

        if (cancelled) {
          // Component unmounted while waiting for permission: release the camera immediately
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        stream = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playError) {
            // AbortError happens when srcObject changes or the element unmounts; safe to ignore
            if (playError.name !== "AbortError") throw playError;
          }
        }

        setCameraError("");
      } catch (error) {
        if (cancelled) return;
        console.error("Camera error:", error);
        setCameraError(cameraErrorMessage(error));
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
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
    let inFlight = false; // prevents overlapping requests when the backend is slow
    const controller = new AbortController();

    const fetchImagesAndPhotoStrip = async () => {
      if (inFlight || isNavigatingRef.current) return;
      inFlight = true;

      try {
        const data = await fetchJson(
          `${API_URL}/get_captured_images`,
          controller.signal
        );
        if (!isMounted) return;

        const images = Array.isArray(data.images) ? data.images : [];
        setCapturedImages(images.map(toAbsoluteUrl));
        setApiError("");

        if (images.length >= REQUIRED_IMAGES) {
          const stripData = await fetchJson(
            `${API_URL}/get_photostrip`,
            controller.signal
          );

          if (isMounted && stripData.photostrip && !isNavigatingRef.current) {
            isNavigatingRef.current = true;
            navigate("/photostrip-preview", {
              state: {
                photostrip: toAbsoluteUrl(stripData.photostrip),
                frameColor,
              },
            });
          }
        }
      } catch (error) {
        if (error.name === "AbortError" || !isMounted) return;
        console.error("Error fetching images:", error);
        setApiError(error.message);
      } finally {
        inFlight = false;
      }
    };

    fetchImagesAndPhotoStrip();
    const interval = setInterval(fetchImagesAndPhotoStrip, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
      controller.abort();
    };
  }, [navigate, frameColor]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold text-purple-700">Photobooth</h1>

      <h2 className="mt-6 text-xl font-medium text-gray-700">
        Selected Emotion: {selectedEmotion}
      </h2>

      {/* Browser webcam */}
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
        <p className="mt-3 max-w-[800px] break-words text-center text-sm text-red-600">
          {apiError}
        </p>
      )}

      <p className="mt-3 text-gray-600">
        {capturedImages.length} / {REQUIRED_IMAGES} photos
      </p>

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