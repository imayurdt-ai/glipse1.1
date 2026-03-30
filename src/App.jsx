import React, { useState } from "react";
import LauncherWindow from "./components/LauncherWindow";
import CaptureOverlay from "./components/CaptureOverlay";
import FloatingActionBar from "./components/FloatingActionBar";

export default function App() {
  const [view, setView] = useState("launcher");

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center gap-8 p-8">
      {/* Preview toggle */}
      <div className="flex gap-2 fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-[#1C1C1E] border border-[#2A2A2D] rounded-full p-1">
        {["launcher", "overlay", "fab"].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
              view === v
                ? "bg-[#2A2A2D] text-[#F9FAFB]"
                : "text-[#9CA3AF] hover:text-[#F9FAFB]"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "launcher" && <LauncherWindow />}
      {view === "overlay" && <CaptureOverlay />}
      {view === "fab" && (
        <div className="flex flex-col items-center justify-center h-screen gap-12">
          <p className="text-[#9CA3AF] text-sm">
            Click any drawing tool to open the color/weight picker ↓
          </p>
          <FloatingActionBar />
        </div>
      )}
    </div>
  );
}
