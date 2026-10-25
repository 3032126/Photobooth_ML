import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_URL = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

const API_HEADERS = {
  Accept: "application/json",
  "ngrok-skip-browser-warning": "true",
};

const toAbsoluteUrl = (path) => {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  if (!API_URL) return null;
  return `${API_URL}/${String(path).replace(/^\/+/, "")}`;
};

const PhotoStripPreview = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const frameColor = location.state?.frameColor || "#FFFFFF";
  const selectedEmotion = location.state?.selectedEmotion || "happy";

  const [photostripUrl, setPhotostripUrl] = useState(
    toAbsoluteUrl(location.state?.photostrip)
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // If the page was refreshed the router state is gone, so ask the backend again
  useEffect(() => {
    if (photostripUrl || !API_URL) return;

    let cancelled = false;

    const loadPhotostrip = async () => {
      try {
        const response = await fetch(`${API_URL}/get_photostrip`, {
          headers: API_HEADERS,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!cancelled && data.photostrip) {
          setPhotostripUrl(
            `${toAbsoluteUrl(data.photostrip)}?v=${Date.now()}`
          );
        }
      } catch (err) {
        console.error("Error loading photo strip:", err);
      }
    };

    loadPhotostrip();
    return () => {
      cancelled = true;
    };
  }, [photostripUrl]);

  const handleDownload = async () => {
    if (!API_URL) {
      setError("ไม่พบ REACT_APP_API_URL");
      return;
    }

    setError("");
    setBusy(true);

    try {
      // fetch as a blob so the ngrok header can be sent and popup blockers are avoided
      const response = await fetch(`${API_URL}/download_photostrip`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "photostrip.jpg";
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Error downloading photo strip:", err);
      setError("ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  const handleResetCapture = async () => {
    if (!API_URL) {
      setError("ไม่พบ REACT_APP_API_URL");
      return;
    }

    setError("");
    setBusy(true);

    try {
      const response = await fetch(`${API_URL}/reset_capture`, {
        method: "POST",
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (!response.ok) throw new Error(`Reset failed: ${response.status}`);

      navigate("/photobooth", {
        state: { frameColor, selectedEmotion },
      });
    } catch (err) {
      console.error("Error resetting capture:", err);
      setError("ไม่สามารถเริ่มถ่ายใหม่ได้ กรุณาลองใหม่อีกครั้ง");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-white to-pink-200 p-6 pt-20">
      <h1 className="text-3xl font-bold text-gray-900">Photo Strip Preview</h1>

      <p className="mt-2 text-gray-600 text-center">
        ดาวน์โหลดหรือถ่ายใหม่ เพื่อเก็บช่วงเวลาที่ดีที่สุดของคุณ!
      </p>

      {photostripUrl ? (
        <div
          className="mt-6 border-4 p-4 rounded-lg shadow-lg bg-white relative flex justify-center"
          style={{ borderColor: frameColor }}
        >
          <img
            src={photostripUrl}
            className="max-w-[350px] max-h-[800px] rounded-md object-contain"
            alt="Captured moments in a strip"
            onError={() => setError("โหลดรูป Photo Strip ไม่สำเร็จ")}
          />
        </div>
      ) : (
        <p className="mt-6 text-red-600">
          ไม่พบรูป Photo Strip กรุณาถ่ายรูปใหม่อีกครั้ง
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-center text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-4">
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy || !photostripUrl}
          className="bg-[#B7B1F2] text-white px-6 py-3 rounded-full font-semibold shadow-md hover:bg-[#A59AE8] transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          Download Photo Strip
        </button>

        <button
          type="button"
          onClick={handleResetCapture}
          disabled={busy}
          className="bg-[#FF6B6B] text-white px-6 py-3 rounded-full font-semibold shadow-md hover:bg-[#E05757] transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          Take New Photos
        </button>
      </div>
    </div>
  );
};

export default PhotoStripPreview;
