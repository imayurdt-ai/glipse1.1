import React, { useState, useRef, useEffect } from "react";
import {
  Pen,
  Square,
  Circle,
  ArrowUpRight,
  Type,
  Undo2,
  Trash2,
  RefreshCcw,
  Save,
  Copy,
} from "lucide-react";

const COLORS = [
  { id: "red",    hex: "#EF4444", label: "Red" },
  { id: "yellow", hex: "#EAB308", label: "Yellow" },
  { id: "green",  hex: "#22C55E", label: "Green" },
  { id: "blue",   hex: "#3B82F6", label: "Blue" },
  { id: "white",  hex: "#FFFFFF", label: "White" },
];

const WEIGHTS = [
  { id: "thin",   size: 2,  label: "Thin" },
  { id: "medium", size: 4,  label: "Medium" },
  { id: "thick",  size: 7,  label: "Thick" },
];

const TOOLS = [
  { id: "pen",    icon: Pen,          label: "Pen" },
  { id: "square", icon: Square,       label: "Square" },
  { id: "circle", icon: Circle,       label: "Circle" },
  { id: "arrow",  icon: ArrowUpRight, label: "Arrow" },
  { id: "text",   icon: Type,         label: "Text" },
];

function Divider() {
  return <div className="w-px h-5 bg-[#333333] flex-shrink-0" />;
}

function ContextPopover({ activeColor, activeWeight, onColorChange, onWeightChange, anchorRef }) {
  const [popoverStyle, setPopoverStyle] = useState({});

  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPopoverStyle({
        left: rect.left + rect.width / 2,
        top: rect.top,
      });
    }
  }, [anchorRef]);

  return (
    <div
      className="fixed z-50 pointer-events-auto"
      style={{
        left: popoverStyle.left || "50%",
        top: (popoverStyle.top || 0) - 8,
        transform: "translateX(-50%) translateY(-100%)",
      }}
    >
      <div
        className="flex items-center gap-3 bg-[#1C1C1E] border border-[#2A2A2D] rounded-full px-4 py-2.5"
        style={{
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex items-center gap-2">
          {COLORS.map((color) => {
            const isActive = activeColor === color.id;
            return (
              <button
                key={color.id}
                title={color.label}
                onClick={() => onColorChange(color.id)}
                className="relative flex items-center justify-center w-5 h-5 rounded-full transition-transform hover:scale-110 focus:outline-none"
                style={{ backgroundColor: color.hex }}
              >
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{ outline: "2px solid #FFFFFF", outlineOffset: "2px" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="w-px h-4 bg-[#333333] flex-shrink-0" />

        <div className="flex items-center gap-2.5">
          {WEIGHTS.map((weight) => {
            const isActive = activeWeight === weight.id;
            return (
              <button
                key={weight.id}
                title={weight.label}
                onClick={() => onWeightChange(weight.id)}
                className={`relative flex items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none ${
                  isActive ? "bg-[#F9FAFB]" : "bg-[#4A4A4D]"
                }`}
                style={{
                  width: weight.size * 2 + 8,
                  height: weight.size * 2 + 8,
                  outline: isActive ? "2px solid #FFFFFF" : "none",
                  outlineOffset: "2px",
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex justify-center mt-1">
        <div
          className="w-2 h-2 bg-[#1C1C1E] border-r border-b border-[#2A2A2D] rotate-45"
          style={{ marginTop: "-5px" }}
        />
      </div>
    </div>
  );
}

export default function FloatingActionBar() {
  const [activeTool, setActiveTool]     = useState("arrow");
  const [activeColor, setActiveColor]   = useState("red");
  const [activeWeight, setActiveWeight] = useState("medium");
  const [showPopover, setShowPopover]   = useState(false);

  const toolRefs = useRef({});
  const activeToolRef = useRef(null);

  const handleToolClick = (toolId) => {
    if (activeTool === toolId) {
      setShowPopover((prev) => !prev);
    } else {
      setActiveTool(toolId);
      setShowPopover(true);
    }
  };

  useEffect(() => {
    const handleOutside = (e) => {
      if (showPopover && !e.target.closest("[data-fab]")) {
        setShowPopover(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showPopover]);

  useEffect(() => {
    activeToolRef.current = toolRefs.current[activeTool] || null;
  }, [activeTool]);

  return (
    <>
      {showPopover && (
        <ContextPopover
          activeColor={activeColor}
          activeWeight={activeWeight}
          onColorChange={(c) => setActiveColor(c)}
          onWeightChange={(w) => setActiveWeight(w)}
          anchorRef={{ current: toolRefs.current[activeTool] }}
        />
      )}

      <div
        data-fab
        className="flex items-center gap-0.5 bg-[#1C1C1E] border border-[#2A2A2D] rounded-full px-3 py-2"
        style={{
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.65), 0 6px 20px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.04)",
        }}
      >
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          const activeColorHex = COLORS.find((c) => c.id === activeColor)?.hex;

          return (
            <button
              key={tool.id}
              ref={(el) => { toolRefs.current[tool.id] = el; }}
              title={tool.label}
              onClick={() => handleToolClick(tool.id)}
              className={`relative w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 focus:outline-none group ${
                isActive ? "bg-[#2A2A2D]" : "hover:bg-[#2A2A2D]/60"
              }`}
            >
              <Icon
                size={15}
                style={{ color: isActive ? activeColorHex : "#9CA3AF" }}
                className="transition-colors duration-150"
              />
              {isActive && (
                <span
                  className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: activeColorHex }}
                />
              )}
            </button>
          );
        })}

        <Divider />

        <button
          title="Undo"
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#2A2A2D]/60 transition-all duration-150 focus:outline-none"
        >
          <Undo2 size={15} />
        </button>
        <button
          title="Clear All"
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all duration-150 focus:outline-none"
        >
          <Trash2 size={15} />
        </button>

        <Divider />

        <button
          title="Retake"
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#2A2A2D]/60 transition-all duration-150 focus:outline-none"
        >
          <RefreshCcw size={15} />
        </button>

        <button
          title="Save to Disk"
          className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#F9FAFB] hover:bg-white active:scale-[0.97] text-[#111111] text-xs font-semibold transition-all duration-150 focus:outline-none"
        >
          <Save size={12} />
          Save
        </button>

        <button
          title="Copy to Clipboard"
          className="flex items-center gap-1.5 h-8 px-3 rounded-full border border-[#2A2A2D] hover:bg-[#2A2A2D] text-[#F9FAFB] text-xs font-medium transition-all duration-150 focus:outline-none"
        >
          <Copy size={12} />
          Copy
        </button>
      </div>
    </>
  );
}
