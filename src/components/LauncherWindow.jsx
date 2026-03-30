import React, { useState } from "react";
import { Settings, X, Camera, Video, Globe, Monitor } from "lucide-react";

export default function LauncherWindow() {
  const [activeMode, setActiveMode] = useState("screenshot");
  const [captureType, setCaptureType] = useState("region");

  return (
    <div
      className="w-[320px] bg-[#1C1C1E] rounded-xl border border-[#2A2A2D] flex flex-col overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2D]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#F9FAFB] flex items-center justify-center">
            <Camera size={13} className="text-[#111111]" />
          </div>
          <span className="text-[#F9FAFB] text-sm font-semibold tracking-tight">
            Glimpse
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#2A2A2D] transition-colors">
            <Settings size={15} />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#2A2A2D] transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-5 px-4 py-5">
        {/* Segment Control */}
        <div className="flex items-center bg-[#111111] rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveMode("screenshot")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeMode === "screenshot"
                ? "bg-[#2A2A2D] text-[#F9FAFB] shadow-sm"
                : "text-[#9CA3AF] hover:text-[#F9FAFB]"
            }`}
          >
            <Camera size={14} />
            Screenshot
          </button>
          <button
            onClick={() => setActiveMode("recording")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeMode === "recording"
                ? "bg-[#2A2A2D] text-[#F9FAFB] shadow-sm"
                : "text-[#9CA3AF] hover:text-[#F9FAFB]"
            }`}
          >
            <Video size={14} />
            Recording
          </button>
        </div>

        {/* Capture Type */}
        <div className="flex flex-col gap-2">
          <p className="text-[#9CA3AF] text-xs font-medium uppercase tracking-widest px-1">
            Capture Area
          </p>

          <label
            className={`flex items-center gap-3 px-3 py-3 rounded-xl border cursor-pointer transition-all duration-150 ${
              captureType === "region"
                ? "border-[#3B82F6] bg-[#3B82F6]/10"
                : "border-[#2A2A2D] hover:border-[#3A3A3D]"
            }`}
          >
            <input
              type="radio"
              name="captureType"
              value="region"
              checked={captureType === "region"}
              onChange={() => setCaptureType("region")}
              className="sr-only"
            />
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                captureType === "region" ? "border-[#3B82F6]" : "border-[#4A4A4D]"
              }`}
            >
              {captureType === "region" && (
                <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[#F9FAFB] text-sm font-medium">Region</span>
              <span className="text-[#9CA3AF] text-xs">Draw a selection on screen</span>
            </div>
            <Globe size={14} className="ml-auto text-[#9CA3AF]" />
          </label>

          <label
            className={`flex items-center gap-3 px-3 py-3 rounded-xl border cursor-pointer transition-all duration-150 ${
              captureType === "fullscreen"
                ? "border-[#3B82F6] bg-[#3B82F6]/10"
                : "border-[#2A2A2D] hover:border-[#3A3A3D]"
            }`}
          >
            <input
              type="radio"
              name="captureType"
              value="fullscreen"
              checked={captureType === "fullscreen"}
              onChange={() => setCaptureType("fullscreen")}
              className="sr-only"
            />
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                captureType === "fullscreen" ? "border-[#3B82F6]" : "border-[#4A4A4D]"
              }`}
            >
              {captureType === "fullscreen" && (
                <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[#F9FAFB] text-sm font-medium">Full Screen</span>
              <span className="text-[#9CA3AF] text-xs">Capture entire display</span>
            </div>
            <Monitor size={14} className="ml-auto text-[#9CA3AF]" />
          </label>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-4 pb-4">
        <button className="w-full bg-[#F9FAFB] hover:bg-white active:scale-[0.98] text-[#111111] font-semibold text-sm py-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-2">
          <Camera size={15} />
          New Capture
          <span className="ml-1 text-[#9CA3AF] text-xs font-normal">⌘D</span>
        </button>
      </div>
    </div>
  );
}
