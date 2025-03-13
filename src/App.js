import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import PhotoBooth from "./components/PhotoBooth";
import AboutUs from "./components/AboutUs";
import PhotoStrip from "./components/PhotoStrip";
import PhotoStripPreview from "./components/PhotoStripPreview";

import "./index.css";

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-pink-200 p-6">
        {/* Header Section */}
        <header className="absolute inset-x-0 top-0 z-50">
          <nav aria-label="Global" className="flex items-center justify-between p-6 lg:px-8">
            <div className="flex lg:flex-1">
              <Link to="/" className="-m-1.5 p-1.5">
                <img alt="Logo" src="/logo.png" className="h-8 w-auto" />
              </Link>
            </div>
            <div className="hidden lg:flex lg:gap-x-12">
              <Link to="/" className="text-sm font-semibold text-gray-900">  {/* Fixed Home Link */}
                Home
              </Link>
              <Link to="/photostrip" className="text-sm font-semibold text-gray-900">
                Photo Strip
              </Link>
              <Link to="/about" className="text-sm font-semibold text-gray-900">
                About us
              </Link>
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <Routes>
          <Route
            path="/"
            element={
              <div className="relative isolate px-6 pt-14 lg:px-8">
                <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
                  <div className="text-center">
                    <h1 className="text-balance text-5xl font-semibold tracking-tight text-gray-900 sm:text-7xl">
                      PhotoBooth
                    </h1>
                    <p className="mt-10 text-pretty text-lg font-medium text-gray-500 sm:text-xl/8">
                      พัฒนาโมเดล Deep Learning สำหรับตรวจจับรอยยิ้มแบบเรียลไทม์ นำไปใช้งานร่วมกับ Smart Camera & Selfie Booth
                      เพื่อสามารถถ่ายภาพอัตโนมัติ
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                      <Link to="/photostrip">
                        <button
                          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                          type="button"
                        >
                          Get started
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            }
          />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/photostrip" element={<PhotoStrip />} />
          <Route path="/photobooth" element={<PhotoBooth />} />
          <Route path="/photostrip-preview" element={<PhotoStripPreview />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
