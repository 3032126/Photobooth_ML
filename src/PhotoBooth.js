import React, { useRef, useState, useEffect } from "react";

const PhotoBooth = () => {
  const videoRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [timer, setTimer] = useState(3);
  const [isCounting, setIsCounting] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [emotion, setEmotion] = useState("😐");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { width: 800, height: 600 } })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((error) => console.error("Error accessing webcam:", error));
  }, []);

  const capturePhoto = () => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 800;
    canvas.height = 600;

    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL("image/png");
    setCountdown(null);
    setPhotos((prevPhotos) => [...prevPhotos, dataURL]);
  };

  const startCountdown = () => {
    if (timer > 0) {
      setIsCounting(true);
      setCountdown(timer);
      let count = timer;
      const interval = setInterval(() => {
        setCountdown(count);
        if (count <= 1) {
          clearInterval(interval);
          setIsCounting(false);
          capturePhoto();
        }
        count--;
      }, 1000);
    } else {
      capturePhoto();
    }
  };

  const predictEmotion = async () => {
    if (isProcessing || !videoRef.current) return;
    setIsProcessing(true);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 800;
    canvas.height = 600;

    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL("image/png");

    try {
      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataURL }),
      });

      const result = await response.json();
      if (result.emotion) {
        setEmotion(result.emotion); // Update the displayed emotion
      }
    } catch (error) {
      console.error("Error predicting emotion:", error);
    }

    setIsProcessing(false);
  };

  // Continuously predict emotion every 2 seconds, without capturing
  useEffect(() => {
    const interval = setInterval(() => {
      predictEmotion();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative bg-pink-100">
      <h1 className="text-4xl font-bold text-purple-700 shadow-text mb-4">PHOTO BOOTH</h1>

      {/* Video Preview - Fixed to 800x600 */}
      <div className="relative border-4 border-purple-400 w-[800px] h-[600px] bg-white shadow-lg rounded-lg">
        <video ref={videoRef} autoPlay className="w-full h-full object-cover rounded-lg" />

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <span className="text-6xl font-bold text-white animate-pop">{countdown}</span>
          </div>
        )}

        {/* Emotion Overlay (Shows only prediction, doesn't capture automatically) */}
        <div className="absolute top-5 right-5 bg-purple-700 px-4 py-2 rounded-md text-white text-lg">
          {emotion}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-4 mt-4">
        <input
          type="number"
          min="1"
          value={timer}
          onChange={(e) => setTimer(Number(e.target.value))}
          disabled={isCounting}
          className="px-6 py-3 bg-purple-300 text-white text-center rounded-full shadow-md w-24 font-bold"
        />

        <button className="px-6 py-3 bg-purple-300 text-white rounded-full font-bold">
          Time {countdown !== null ? countdown : timer} S
        </button>

        <button
          onClick={startCountdown}
          disabled={isCounting}
          className={`px-6 py-2 text-lg font-semibold text-white bg-purple-500 rounded-full shadow-md transition ${
            isCounting ? "bg-gray-400 cursor-not-allowed" : "hover:bg-purple-600"
          }`}
        >
          {isCounting ? "Capturing..." : "Capture"}
        </button>
      </div>

      {/* Polaroid Display */}
      <div className="mt-6">
        <h2 className="text-xl font-bold text-purple-600 mb-2">Polaroid</h2>
        <div className="flex flex-wrap justify-center space-x-4">
          {photos.map((photo, index) => (
            <div key={index} className="relative p-4 bg-white border-4 border-purple-400 rounded-lg shadow-lg">
              <img src={photo} alt={`Captured ${index}`} className="w-40 h-30 object-cover rounded-md" />
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = photo;
                  a.download = `photo-${index + 1}.png`;
                  a.click();
                }}
                className="mt-2 px-5 py-1 text-white bg-purple-500 rounded-full hover:bg-purple-600"
              >
                Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PhotoBooth;
