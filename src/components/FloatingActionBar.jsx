/**
 * @file FloatingActionBar.jsx
 * Hovering a tool button for 400ms shows the color + weight palette above it.
 * Clicking a tool button:
 *   - If already active → toggles palette open/close
 *   - If not active     → activates tool and opens palette
 */

import React, { useEffect, useRef, useState } from 'react';
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

// Fixed pixel sizes so the 3 dots are visually clearly small / medium / large
const WEIGHTS = [
  { id: 2, px: 10, label: 'Thin'   },
  { id: 4, px: 16, label: 'Medium' },
  { id: 8, px: 22, label: 'Thick'  },
];

const TOOLS = [
  { id: 'pen',    Icon: Pen,          label: 'Pen'    },
  { id: 'square', Icon: Square,       label: 'Square' },
  { id: 'circle', Icon: Circle,       label: 'Circle' },
  { id: 'arrow',  Icon: ArrowUpRight, label: 'Arrow'  },
  { id: 'text',   Icon: Type,         label: 'Text'   },
];

function Divider() {
  return <div className="w-px h-5 bg-[#3A3A3D] flex-shrink-0" />;
}

function ColorPalette({ anchorEl, onClose }) {
  const activeColor  = useAppStore((s) => s.activeColor);
  const activeWeight = useAppStore((s) => s.activeWeight);
  const setColor     = useAppStore((s) => s.setColor);
  const setWeight    = useAppStore((s) => s.setWeight);
  const paletteRef   = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    setPos({ left: r.left + r.width / 2, top: r.top });
  }, [anchorEl]);

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
      <div
        className="flex items-center gap-3 bg-[#1C1C1E] border border-[#2A2A2D] rounded-full px-4 py-3"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5)' }}
      >
        {/* ── Color swatches ── */}
        <div className="flex items-center gap-2">
          {COLORS.map((c) => {
            const isActive = activeColor === c.id;
            return (
              <button
                key={c.id}
                title={c.label}
                onClick={() => setColor(c.id)}
                className="relative flex-shrink-0 rounded-full transition-transform hover:scale-110 focus:outline-none"
                style={{
                  width:  24,
                  height: 24,
                  backgroundColor: c.id,
                  // active ring: white border offset from the swatch
                  boxShadow: isActive
                    ? `0 0 0 2px #1C1C1E, 0 0 0 4px #ffffff`
                    : 'none',
                  transform: isActive ? 'scale(1.15)' : undefined,
                }}
              />
            );
          })}
        </div>

        {/* divider */}
        <div className="w-px self-stretch bg-[#3A3A3D]" />

        {/* ── Weight dots ── */}
        <div className="flex items-center gap-3">
          {WEIGHTS.map((w) => {
            const isActive = activeWeight === w.id;
            return (
              <button
                key={w.id}
                title={w.label}
                onClick={() => setWeight(w.id)}
                className="flex-shrink-0 rounded-full transition-transform hover:scale-110 focus:outline-none"
                style={{
                  width:  w.px,
                  height: w.px,
                  // selected: bright white fill + white outer ring
                  // unselected: medium dark grey fill, no ring
                  backgroundColor: isActive ? '#FFFFFF' : '#555558',
                  boxShadow: isActive
                    ? `0 0 0 2px #1C1C1E, 0 0 0 4px #ffffff`
                    : 'none',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Down caret */}
      <div className="flex justify-center" style={{ marginTop: -5 }}>
        <div
          className="w-2.5 h-2.5 bg-[#1C1C1E] border-r border-b border-[#2A2A2D] rotate-45"
        />
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

  const toolRefs   = useRef({});
  const hoverTimer = useRef(null);
  const [paletteFor, setPaletteFor] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const openPalette  = (id) => { clearTimeout(hoverTimer.current); setPaletteFor(id); };
  const closePalette = ()   => { clearTimeout(hoverTimer.current); setPaletteFor(null); };

  const handleToolMouseEnter = (id) => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => openPalette(id), 400);
  };

  const handleToolMouseLeave = (e) => {
    clearTimeout(hoverTimer.current);
    const rel = e.relatedTarget;
    if (rel?.closest?.('[data-palette]') || rel?.closest?.('[data-fab]')) return;
    closePalette();
  };

  const handleToolClick = (id) => {
    clearTimeout(hoverTimer.current);
    if (activeTool === id) {
      setPaletteFor((prev) => prev === id ? null : id);
    } else {
      setTool(id);
      openPalette(id);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('[data-fab]') && !e.target.closest('[data-palette]'))
        closePalette();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
                <span
                  className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: activeColor }}
                />
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
          <Save size={12} />{saving ? 'Saving…' : 'Save'}
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
