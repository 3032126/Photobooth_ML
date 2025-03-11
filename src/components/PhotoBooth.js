import React, { useState, useEffect } from "react";

const PhotoBooth = () => {
  const [capturedImages, setCapturedImages] = useState([]);
  const [photostrip, setPhotostrip] = useState(null);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch("http://127.0.0.1:5000/get_captured_images");
      const data = await response.json();
      setCapturedImages(data.images.map(img => `http://127.0.0.1:5000/${img}`));

      // Check if photostrip is available
      const stripResponse = await fetch("http://127.0.0.1:5000/get_photostrip");
      const stripData = await stripResponse.json();
      if (stripData.photostrip) {
        setPhotostrip(`http://127.0.0.1:5000/${stripData.photostrip}`);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-purple-700">Photo Booth</h1>

      {/* Live Video Feed */}
      <div className="relative">
        <img src="http://127.0.0.1:5000/video_feed" alt="Live Video" className="w-[800px] h-[600px] border-4 border-purple-400" />
        
        {/* Countdown Display */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <span className="text-6xl font-bold text-white">{countdown}</span>
          </div>
        )}
      </div>

      {/* Show Captured Images */}
      {capturedImages.length === 4 && (
        <div className="mt-4 flex space-x-2">
          {capturedImages.map((img, index) => (
            <img key={index} src={img} className="w-[200px] h-[150px] border-2 border-purple-400" />
          ))}
        </div>
      )}

      {/* Display PhotoStrip & Download Button */}
      {photostrip && (
        <div className="mt-4">
          <h2 className="text-xl font-bold text-purple-600">PhotoStrip</h2>
          <img src={photostrip} className="w-[600px] h-auto border-2 border-blue-400" />
          <button onClick={() => window.location.href = "http://127.0.0.1:5000/download_photostrip"} className="bg-green-500 text-white px-6 py-2 rounded-full mt-2">
            Download PhotoStrip
          </button>
        </div>
      )}
    </div>
  );
};

export default PhotoBooth;
