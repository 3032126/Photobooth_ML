import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_URL = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");
const POLL_INTERVAL_MS = 3000;
const UPLOAD_INTERVAL_MS = 700;
const REQUIRED_IMAGES = 3;

// ngrok free tier returns an HTML warning page unless this header is sent (harmless on Render)
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

const cameraErrorMessage = (error) => {
  switch (error?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณาอนุญาตในการตั้งค่าเบราว์เซอร์";
    case "NotFoundError":
    case "OverconstrainedError":
      return "ไม่พบกล้องในอุปกรณ์นี้";
    case "NotReadableError":
      return "กล้องกำลังถูกใช้โดยโปรแกรมอื่น กรุณาปิดแล้วรีโหลดหน้านี้";
    default:
      return error?.message || "ไม่สามารถเปิดกล้องได้";
  }
};

const PhotoBooth = () => {
  const [capturedImages, setCapturedImages] = useState([]);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [detected, setDetected] = useState(null);
  const [counting, setCounting] = useState(false);
  const [apiError, setApiError] = useState(
    API_URL
      ? ""
      : "ไม่พบ REACT_APP_API_URL กรุณาเพิ่มในไฟล์ .env แล้วรัน npm start ใหม่"
  );

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
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

  // 1) Open the webcam in the browser
  useEffect(() => {
    let stream = null;
    let cancelled = false;
    const videoElement = videoRef.current;

    const startCamera = async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "ต้องเปิดผ่าน HTTPS หรือ http://localhost เพื่อใช้กล้องได้"
          );
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 800 }, height: { ideal: 600 } },
          audio: false,
        });

        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        stream = mediaStream;

        if (videoElement) {
          videoElement.srcObject = stream;
          try {
            await videoElement.play();
          } catch (playError) {
            if (playError.name !== "AbortError") throw playError;
          }
        }

        setCameraError("");
        setCameraReady(true);
      } catch (error) {
        if (cancelled) return;
        console.error("Camera error:", error);
        setCameraError(cameraErrorMessage(error));
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (videoElement) videoElement.srcObject = null;
    };
  }, []);

  // 2) Send frames to the backend so it can detect the emotion and capture
  useEffect(() => {
    if (!API_URL || !cameraReady) return;

    let stopped = false;
    let timer;
    const controller = new AbortController();

    const sendFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.videoWidth && !isNavigatingRef.current) {
        try {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext("2d").drawImage(video, 0, 0);

          const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", 0.8)
          );

          if (blob && !stopped) {
            const form = new FormData();
            form.append("frame", blob, "frame.jpg");
            form.append("emotion", selectedEmotion);

            const response = await fetch(`${API_URL}/upload_frame`, {
              method: "POST",
              headers: { "ngrok-skip-browser-warning": "true" },
              body: form,
              signal: controller.signal,
            });

            if (!response.ok) {
              throw new Error(`upload_frame -> HTTP ${response.status}`);
            }

            const result = await response.json();
            if (!stopped) {
              setServerReady(true);
              setApiError(
                result.model_error
                  ? `โหลดโมเดลบนเซิร์ฟเวอร์ไม่สำเร็จ: ${result.model_error}`
                  : ""
              );
              setModelLoading(Boolean(result.loading));
              if (!result.busy && !result.loading) {
                setDetected(result.detected ?? null);
                setCounting(Boolean(result.counting));
              }
            }
          }
        } catch (error) {
          if (error.name !== "AbortError" && !stopped) {
            console.error("Upload frame failed:", error);
            setApiError(`ส่งภาพไปยังระบบไม่สำเร็จ: ${error.message}`);
          }
        }
      }

      // Wait for this request to finish before scheduling the next one
      if (!stopped) timer = setTimeout(sendFrame, UPLOAD_INTERVAL_MS);
    };

    sendFrame();

    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [cameraReady, selectedEmotion]);

  // 3) Poll for captured images and the finished photo strip
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

      {/* Browser webcam (mirrored like a real mirror) */}
      <div className="relative mt-4 w-full max-w-[800px]">
        {cameraError ? (
          <p className="text-center text-red-600">{cameraError}</p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full border-4 -scale-x-100"
            style={{ borderColor: frameColor }}
          />
        )}
      </div>

      {/* Hidden canvas used to grab frames from the video */}
      <canvas ref={canvasRef} className="hidden" />

      {cameraReady && !serverReady && !apiError && (
        <p className="mt-3 max-w-[800px] text-center text-sm text-gray-600">
          กำลังเชื่อมต่อเซิร์ฟเวอร์... ครั้งแรกอาจใช้เวลาประมาณ 1 นาที
          เพราะเซิร์ฟเวอร์ต้องตื่นจากโหมดพัก
        </p>
      )}

      {serverReady && modelLoading && (
        <p className="mt-3 max-w-[800px] text-center text-sm text-gray-600">
          กำลังโหลดโมเดลตรวจสีหน้า... ครั้งแรกอาจใช้เวลาประมาณ 1 นาที
        </p>
      )}

      {serverReady && !modelLoading && (
        <p className="mt-3 text-sm text-gray-600">
          {detected ? `ตรวจพบสีหน้า: ${detected}` : "ไม่พบใบหน้า"}
          {counting ? " — ค้างไว้! กำลังจะถ่าย" : ""}
        </p>
      )}

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