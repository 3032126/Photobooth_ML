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
        <header className="absolute inset-x-0 top-0 z-50 bg-[#FBF3B9] shadow-md">
          <nav
            aria-label="Global"
            className="flex items-center justify-between p-4 lg:px-8"
          >
            <div className="flex lg:flex-1">
              <Link to="/" className="-m-1.5 p-1.5">
                <img alt="Logo" src="/logo.png" className="h-9 w-auto" />
              </Link>
            </div>
            <div className="hidden lg:flex lg:gap-x-12">
              <Link to="/" className="text-sm font-semibold text-[#B7B1F2]">
                Home
              </Link>
              <Link
                to="/photostrip"
                className="text-sm font-semibold text-[#B7B1F2]"
              >
                Photo Strip
              </Link>
              <Link
                to="/about"
                className="text-sm font-semibold text-[#B7B1F2]"
              >
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
                    <img
                      src="/logo.png"
                      alt="PhotoBooth Logo"
                      className="mx-auto h-30 w-auto"
                    />
                    <p className="mt-10 text-pretty text-lg font-medium text-gray-500 sm:text-xl/8">
                      Auto Snap Camera with Facial Expression Detection <br />
                      แค่ยิ้ม! หรือแสดงสีหน้าตามโหมดที่ต้องการ กล้องจะจับจังหวะที่ใช่ แล้วถ่ายอัตโนมัติ <br />
                      เลือกเฟรมที่ใช่และสีหน้าที่คุณต้องการ <br />
                      แล้วให้ Kreamera บันทึกช่วงเวลาที่เป็นธรรมชาติที่สุดของคุณ!
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                      <Link to="/photostrip">
                        <button
                          className="rounded-md bg-[#B7B1F2] px-6 py-3 text-lg font-semibold text-white shadow-lg hover:bg-[#A59AE8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7B1F2]"
                          type="button"
                        >
                          start
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
