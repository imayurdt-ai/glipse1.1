/**
 * @file FloatingActionBar.jsx
 * Hovering a tool button for 400ms shows the color + weight palette above it.
 * Clicking a tool button:
 *   - If already active → toggles palette open/close
 *   - If not active     → activates tool and opens palette
 * Palette closes when mouse leaves both the button and the palette itself.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Pen, Square, Circle, ArrowUpRight, Type,
  Undo2, Trash2, RefreshCcw, Save, Copy, Check,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const COLORS = [
  { id: '#EF4444', label: 'Red'    },
  { id: '#EAB308', label: 'Yellow' },
  { id: '#22C55E', label: 'Green'  },
  { id: '#3B82F6', label: 'Blue'   },
  { id: '#FFFFFF', label: 'White'  },
];

const WEIGHTS = [
  { id: 2, size: 2, label: 'Thin'   },
  { id: 4, size: 4, label: 'Medium' },
  { id: 8, size: 7, label: 'Thick'  },
];

const TOOLS = [
  { id: 'pen',    Icon: Pen,          label: 'Pen'    },
  { id: 'square', Icon: Square,       label: 'Square' },
  { id: 'circle', Icon: Circle,       label: 'Circle' },
  { id: 'arrow',  Icon: ArrowUpRight, label: 'Arrow'  },
  { id: 'text',   Icon: Type,         label: 'Text'   },
];

function Divider() {
  return <div className="w-px h-5 bg-[#333333] flex-shrink-0" />;
}

// Palette rendered at viewport level, anchored above a tool button
function ColorPalette({ anchorEl, onClose }) {
  const activeColor  = useAppStore((s) => s.activeColor);
  const activeWeight = useAppStore((s) => s.activeWeight);
  const setColor     = useAppStore((s) => s.setColor);
  const setWeight    = useAppStore((s) => s.setWeight);
  const paletteRef   = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  // Position above the anchor button
  useEffect(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    setPos({ left: r.left + r.width / 2, top: r.top });
  }, [anchorEl]);

  // Close when mouse leaves both palette and the FAB bar
  const handleMouseLeave = (e) => {
    const related = e.relatedTarget;
    if (
      paletteRef.current?.contains(related) ||
      related?.closest?.('[data-fab]')
    ) return;
    onClose();
  };

  return (
    <div
      ref={paletteRef}
      className="fixed z-[9998]"
      style={{
        left:      pos.left,
        top:       pos.top - 8,
        transform: 'translateX(-50%) translateY(-100%)',
      }}
      onMouseLeave={handleMouseLeave}
    >
      {/* Arrow pointer */}
      <div
        className="flex items-center gap-3 bg-[#1C1C1E] border border-[#2A2A2D] rounded-full px-4 py-2.5"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)' }}
      >
        {/* Colors */}
        <div className="flex items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c.id}
              title={c.label}
              onClick={() => setColor(c.id)}
              className="relative w-5 h-5 rounded-full hover:scale-110 transition-transform focus:outline-none"
              style={{ backgroundColor: c.id }}
            >
              {activeColor === c.id && (
                <span className="absolute inset-0 rounded-full"
                  style={{ outline: '2px solid #fff', outlineOffset: '2px' }} />
              )}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-[#333333]" />

        {/* Weights */}
        <div className="flex items-center gap-2.5">
          {WEIGHTS.map((w) => (
            <button
              key={w.id}
              title={w.label}
              onClick={() => setWeight(w.id)}
              className="rounded-full hover:scale-110 transition-transform focus:outline-none"
              style={{
                width:        w.size * 2 + 8,
                height:       w.size * 2 + 8,
                backgroundColor: activeWeight === w.id ? '#F9FAFB' : '#4A4A4D',
                outline:      activeWeight === w.id ? '2px solid #fff' : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>
      </div>

      {/* Down-caret */}
      <div className="flex justify-center">
        <div className="w-2 h-2 bg-[#1C1C1E] border-r border-b border-[#2A2A2D] rotate-45"
          style={{ marginTop: '-5px' }} />
      </div>
    </div>
  );
}

function getFlattenedImage() {
  const stage = window.__glimpseStage;
  if (!stage) return null;
  try { return stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' }); }
  catch { return null; }
}

export default function FloatingActionBar() {
  const activeTool       = useAppStore((s) => s.activeTool);
  const activeColor      = useAppStore((s) => s.activeColor);
  const setTool          = useAppStore((s) => s.setTool);
  const undo             = useAppStore((s) => s.undo);
  const clearAnnotations = useAppStore((s) => s.clearAnnotations);

  const toolRefs     = useRef({});       // ref map: toolId → DOM button
  const hoverTimer   = useRef(null);     // delay timer for hover-open
  const [paletteFor, setPaletteFor] = useState(null); // toolId | null
  const [copied,  setCopied]  = useState(false);
  const [saving,  setSaving]  = useState(false);

  const openPalette  = (toolId) => { clearTimeout(hoverTimer.current); setPaletteFor(toolId); };
  const closePalette = ()       => { clearTimeout(hoverTimer.current); setPaletteFor(null); };

  // Hover 400ms → open palette
  const handleToolMouseEnter = (toolId) => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => openPalette(toolId), 400);
  };

  // Leave button area — close palette only if not entering the palette itself
  const handleToolMouseLeave = (e) => {
    clearTimeout(hoverTimer.current);
    const related = e.relatedTarget;
    // If moving into the palette or staying inside data-fab, keep it open
    if (related?.closest?.('[data-palette]') || related?.closest?.('[data-fab]')) return;
    closePalette();
  };

  // Click: activate tool, toggle palette
  const handleToolClick = (toolId) => {
    clearTimeout(hoverTimer.current);
    if (activeTool === toolId) {
      setPaletteFor((prev) => prev === toolId ? null : toolId);
    } else {
      setTool(toolId);
      openPalette(toolId);
    }
  };

  // Close palette on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('[data-fab]') && !e.target.closest('[data-palette]')) {
        closePalette();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const handleSave = async () => {
    const dataUrl = getFlattenedImage();
    if (!dataUrl) return;
    setSaving(true);
    try { await window.electron.saveImage(dataUrl, `glimpse-${Date.now()}.png`); }
    finally { setSaving(false); }
  };

  const handleCopy = async () => {
    const dataUrl = getFlattenedImage();
    if (!dataUrl) return;
    await window.electron.copyToClipboard(dataUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Palette rendered outside FAB bar so it can float above freely */}
      {paletteFor && (
        <div data-palette>
          <ColorPalette
            anchorEl={toolRefs.current[paletteFor]}
            onClose={closePalette}
          />
        </div>
      )}

      <div
        data-fab
        className="flex items-center gap-0.5 bg-[#1C1C1E] border border-[#2A2A2D] rounded-full px-3 py-2"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.65), 0 6px 20px rgba(0,0,0,0.4)' }}
      >
        {/* Tool buttons */}
        {TOOLS.map(({ id, Icon, label }) => {
          const isActive = activeTool === id;
          return (
            <button
              key={id}
              ref={(el) => { toolRefs.current[id] = el; }}
              title={label}
              onClick={() => handleToolClick(id)}
              onMouseEnter={() => handleToolMouseEnter(id)}
              onMouseLeave={handleToolMouseLeave}
              className={`relative w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 focus:outline-none ${
                isActive ? 'bg-[#2A2A2D]' : 'hover:bg-[#2A2A2D]/60'
              }`}
            >
              <Icon size={15} style={{ color: isActive ? activeColor : '#9CA3AF' }} />
              {isActive && (
                <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: activeColor }} />
              )}
            </button>
          );
        })}

        <Divider />

        <button title="Undo" onClick={undo}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#2A2A2D]/60 transition-all focus:outline-none">
          <Undo2 size={15} />
        </button>
        <button title="Clear All" onClick={clearAnnotations}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all focus:outline-none">
          <Trash2 size={15} />
        </button>

        <Divider />

        <button title="Retake" onClick={() => window.electron.retakeCapture()}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#2A2A2D]/60 transition-all focus:outline-none">
          <RefreshCcw size={15} />
        </button>

        <button title="Save to Disk" onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#F9FAFB] hover:bg-white active:scale-[0.97] text-[#111111] text-xs font-semibold transition-all focus:outline-none disabled:opacity-50">
          <Save size={12} /> {saving ? 'Saving…' : 'Save'}
        </button>

        <button title="Copy to Clipboard" onClick={handleCopy}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium transition-all focus:outline-none ${
            copied
              ? 'border-[#22C55E] bg-[#22C55E]/10 text-[#22C55E]'
              : 'border-[#2A2A2D] hover:bg-[#2A2A2D] text-[#F9FAFB]'
          }`}>
          {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
    </>
  );
}
