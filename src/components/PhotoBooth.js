import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_URL = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");
const POLL_INTERVAL_MS = 3000;
const REQUIRED_IMAGES = 3;

// ngrok free tier returns an HTML warning page unless this header is sent
const API_HEADERS = {
  Accept: "application/json",
  "ngrok-skip-browser-warning": "true",
};

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

const PhotoBooth = () => {
  const [capturedImages, setCapturedImages] = useState([]);
  const [videoError, setVideoError] = useState("");
  const [apiError, setApiError] = useState(
    API_URL
      ? ""
      : "ไม่พบ REACT_APP_API_URL กรุณาเพิ่มในไฟล์ .env แล้วรัน npm start ใหม่"
  );

  const isNavigatingRef = useRef(false);
  // Stable per-visit value so retaken photos are never served from the browser cache
  const cacheKeyRef = useRef(Date.now());

  const navigate = useNavigate();
  const location = useLocation();

  const frameColor = location.state?.frameColor || "#FFFFFF";
  const selectedEmotion = location.state?.selectedEmotion || "happy";

  const toAbsoluteUrl = (img, bust = false) => {
    const url = /^(https?:|data:|blob:)/i.test(img)
      ? img
      : `${API_URL}/${String(img).replace(/^\/+/, "")}`;
    if (!bust || /^(data:|blob:)/i.test(url)) return url;
    return `${url}${url.includes("?") ? "&" : "?"}v=${cacheKeyRef.current}`;
  };

  // Poll the backend for captured images and the finished photo strip
  useEffect(() => {
    if (!API_URL) return;

    let isMounted = true;
    let inFlight = false;
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
        setCapturedImages(images.map((img) => toAbsoluteUrl(img, true)));
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
                photostrip: toAbsoluteUrl(stripData.photostrip, true),
                frameColor,
                selectedEmotion,
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
    // toAbsoluteUrl only reads a ref and the module-level API_URL, so it is safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, frameColor, selectedEmotion]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold text-purple-700">Photobooth</h1>

      <h2 className="mt-6 text-xl font-medium text-gray-700 capitalize">
        Selected Emotion: {selectedEmotion}
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        แสดงสีหน้า &quot;{selectedEmotion}&quot; ค้างไว้ประมาณ 2 วินาที
        ระบบจะถ่ายให้อัตโนมัติ
      </p>

      {/* Live video stream from the backend camera (OpenCV) */}
      <div className="relative mt-4 w-full max-w-[800px]">
        {API_URL && (
          <img
            src={`${API_URL}/video_feed`}
            alt="Live Video"
            className="w-full border-4"
            style={{ borderColor: frameColor }}
            onLoad={() => setVideoError("")}
            onError={() =>
              setVideoError(
                "เชื่อมต่อกล้องไม่ได้ ตรวจสอบว่า backend ทำงานอยู่ และไม่มีโปรแกรมหรือแท็บอื่นใช้กล้องอยู่"
              )
            }
          />
        )}
        {videoError && (
          <p className="mt-2 text-center text-red-600">{videoError}</p>
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