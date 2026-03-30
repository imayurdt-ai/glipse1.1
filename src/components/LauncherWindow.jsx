/**
 * LauncherWindow.jsx
 * Main app window for Glimpse. Triggers screenshot capture via Electron IPC.
 */

import React, { useState } from 'react';
import { Settings, X, Camera, Video, Globe, Monitor } from 'lucide-react';

export default function LauncherWindow() {
  const [activeMode, setActiveMode] = useState('screenshot');
  const [captureType, setCaptureType] = useState('region');

  const handleCapture = () => {
    // In Electron context, trigger via IPC. In browser preview, no-op.
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.retakeCapture();
    }
  };

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
          <span className="text-[#F9FAFB] text-sm font-semibold tracking-tight">Glimpse</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#2A2A2D] transition-colors">
            <Settings size={15} />
          </button>
          <button
            onClick={() => window.electron?.closeOverlay()}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#2A2A2D] transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-5 px-4 py-5">
        {/* Mode Toggle */}
        <div className="flex items-center bg-[#111111] rounded-xl p-1 gap-1">
          {[['screenshot', Camera, 'Screenshot'], ['recording', Video, 'Recording']].map(([mode, Icon, label]) => (
            <button key={mode} onClick={() => setActiveMode(mode)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeMode === mode ? 'bg-[#2A2A2D] text-[#F9FAFB] shadow-sm' : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
              }`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {/* Capture Type */}
        <div className="flex flex-col gap-2">
          <p className="text-[#9CA3AF] text-xs font-medium uppercase tracking-widest px-1">Capture Area</p>
          {[
            ['region', Globe, 'Region', 'Draw a selection on screen'],
            ['fullscreen', Monitor, 'Full Screen', 'Capture entire display'],
          ].map(([val, Icon, title, desc]) => (
            <label key={val}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                captureType === val ? 'border-[#3B82F6] bg-[#3B82F6]/10' : 'border-[#2A2A2D] hover:border-[#3A3A3D]'
              }`}>
              <input type="radio" name="captureType" value={val}
                checked={captureType === val} onChange={() => setCaptureType(val)}
                className="sr-only" />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                captureType === val ? 'border-[#3B82F6]' : 'border-[#4A4A4D]'
              }`}>
                {captureType === val && <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />}
              </div>
              <div className="flex flex-col">
                <span className="text-[#F9FAFB] text-sm font-medium">{title}</span>
                <span className="text-[#9CA3AF] text-xs">{desc}</span>
              </div>
              <Icon size={14} className="ml-auto text-[#9CA3AF]" />
            </label>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-4 pb-4">
        <button
          onClick={handleCapture}
          className="w-full bg-[#F9FAFB] hover:bg-white active:scale-[0.98] text-[#111111] font-semibold text-sm py-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-2">
          <Camera size={15} />
          New Capture
          <span className="ml-1 text-[#9CA3AF] text-xs font-normal">⌘⇧5</span>
        </button>
      </div>
    </div>
  );
}
