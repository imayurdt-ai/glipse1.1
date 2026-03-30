import React, { useState, useRef, useEffect, useCallback } from "react";

const INITIAL_SELECTION = { x: 300, y: 200, w: 800, h: 500 };

export default function CaptureOverlay() {
  const [selection, setSelection] = useState(INITIAL_SELECTION);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef(null);
  const overlayRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    if (e.target !== overlayRef.current) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    setSelection({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !dragStart.current) return;
      const x = Math.min(e.clientX, dragStart.current.x);
      const y = Math.min(e.clientY, dragStart.current.y);
      const w = Math.abs(e.clientX - dragStart.current.x);
      const h = Math.abs(e.clientY - dragStart.current.y);
      setSelection({ x, y, w, h });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const { x, y, w, h } = selection;
  const hasSelection = w > 10 && h > 10;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      className="fixed inset-0 z-50 cursor-crosshair select-none"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}
    >
      {!hasSelection && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-[#9CA3AF] text-sm font-medium tracking-wide">
            Click and drag to select a region
          </p>
        </div>
      )}

      {hasSelection && (
        <>
          <div
            className="absolute"
            style={{
              left: x,
              top: y,
              width: w,
              height: h,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.50)",
              outline: "1.5px solid rgba(255, 255, 255, 0.85)",
              outlineOffset: "0px",
              cursor: isDragging ? "crosshair" : "move",
            }}
          >
            {[
              "top-0 left-0 -translate-x-1/2 -translate-y-1/2",
              "top-0 right-0 translate-x-1/2 -translate-y-1/2",
              "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
              "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
            ].map((pos, i) => (
              <div
                key={i}
                className={`absolute w-2.5 h-2.5 bg-white rounded-sm ${pos}`}
              />
            ))}
          </div>

          <div
            className="absolute flex items-center gap-1 bg-[#1C1C1E]/90 backdrop-blur-sm border border-[#2A2A2D] rounded-full px-2.5 py-1 pointer-events-none"
            style={{
              left: x + w / 2,
              top: y - 32,
              transform: "translateX(-50%)",
            }}
          >
            <span className="text-[#F9FAFB] text-xs font-mono font-medium tabular-nums">
              {Math.round(w)}
            </span>
            <span className="text-[#4A4A4D] text-xs">×</span>
            <span className="text-[#F9FAFB] text-xs font-mono font-medium tabular-nums">
              {Math.round(h)}
            </span>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
            <p className="text-[#9CA3AF] text-xs font-medium">
              Press{" "}
              <kbd className="px-1.5 py-0.5 bg-[#2A2A2D] rounded text-[#F9FAFB] font-mono text-xs">
                Esc
              </kbd>{" "}
              to cancel
            </p>
          </div>
        </>
      )}
    </div>
  );
}
