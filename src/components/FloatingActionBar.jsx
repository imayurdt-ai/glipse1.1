/**
 * FloatingActionBar.jsx
 * Annotation toolbar. Save/Copy flatten the Konva stage (annotations + image)
 * before exporting — so the saved image includes all drawn shapes.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Pen, Square, Circle, ArrowUpRight, Type,
  Undo2, Trash2, RefreshCcw, Save, Copy, Check,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const COLORS = [
  { id: '#EF4444', label: 'Red' },
  { id: '#EAB308', label: 'Yellow' },
  { id: '#22C55E', label: 'Green' },
  { id: '#3B82F6', label: 'Blue' },
  { id: '#FFFFFF', label: 'White' },
];

const WEIGHTS = [
  { id: 2, size: 2, label: 'Thin' },
  { id: 4, size: 4, label: 'Medium' },
  { id: 8, size: 7, label: 'Thick' },
];

const TOOLS = [
  { id: 'pen',    Icon: Pen,          label: 'Pen' },
  { id: 'square', Icon: Square,       label: 'Square' },
  { id: 'circle', Icon: Circle,       label: 'Circle' },
  { id: 'arrow',  Icon: ArrowUpRight, label: 'Arrow' },
  { id: 'text',   Icon: Type,         label: 'Text' },
];

function Divider() {
  return <div className="w-px h-5 bg-[#333333] flex-shrink-0" />;
}

function ContextPopover({ anchorRef }) {
  const activeColor  = useAppStore((s) => s.activeColor);
  const activeWeight = useAppStore((s) => s.activeWeight);
  const setColor     = useAppStore((s) => s.setColor);
  const setWeight    = useAppStore((s) => s.setWeight);
  const [style, setStyle] = React.useState({});

  useEffect(() => {
    if (anchorRef?.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setStyle({ left: r.left + r.width / 2, top: r.top });
    }
  }, [anchorRef]);

  return (
    <div className="fixed z-50"
      style={{
        left: style.left ?? '50%',
        top: (style.top ?? 0) - 8,
        transform: 'translateX(-50%) translateY(-100%)',
      }}>
      <div className="flex items-center gap-3 bg-[#1C1C1E] border border-[#2A2A2D] rounded-full px-4 py-2.5"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center gap-2">
          {COLORS.map((c) => (
            <button key={c.id} title={c.label} onClick={() => setColor(c.id)}
              className="relative w-5 h-5 rounded-full hover:scale-110 transition-transform focus:outline-none"
              style={{ backgroundColor: c.id }}>
              {activeColor === c.id && (
                <span className="absolute inset-0 rounded-full"
                  style={{ outline: '2px solid #fff', outlineOffset: '2px' }} />
              )}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-[#333333]" />
        <div className="flex items-center gap-2.5">
          {WEIGHTS.map((w) => (
            <button key={w.id} title={w.label} onClick={() => setWeight(w.id)}
              className="rounded-full hover:scale-110 transition-transform focus:outline-none"
              style={{
                width: w.size * 2 + 8, height: w.size * 2 + 8,
                backgroundColor: activeWeight === w.id ? '#F9FAFB' : '#4A4A4D',
                outline: activeWeight === w.id ? '2px solid #fff' : 'none',
                outlineOffset: '2px',
              }} />
          ))}
        </div>
      </div>
      <div className="flex justify-center">
        <div className="w-2 h-2 bg-[#1C1C1E] border-r border-b border-[#2A2A2D] rotate-45"
          style={{ marginTop: '-5px' }} />
      </div>
    </div>
  );
}

// Flatten Konva stage (background image + all annotations) into a single PNG dataUrl
function getFlattenedImage() {
  const stage = window.__glimpseStage;
  if (!stage) {
    console.error('[FAB] __glimpseStage not available');
    return null;
  }
  try {
    return stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
  } catch (e) {
    console.error('[FAB] stage.toDataURL failed:', e);
    return null;
  }
}

export default function FloatingActionBar() {
  const activeTool     = useAppStore((s) => s.activeTool);
  const activeColor    = useAppStore((s) => s.activeColor);
  const showPopover    = useAppStore((s) => s.showColorPopover);
  const setTool        = useAppStore((s) => s.setTool);
  const togglePopover  = useAppStore((s) => s.toggleColorPopover);
  const setShowPopover = useAppStore((s) => s.setShowColorPopover);
  const undo           = useAppStore((s) => s.undo);
  const clearAnnotations = useAppStore((s) => s.clearAnnotations);

  const toolRefs = useRef({});
  const [copied, setCopied]   = useState(false);
  const [saving, setSaving]   = useState(false);

  const handleToolClick = (toolId) => {
    if (activeTool === toolId) togglePopover();
    else { setTool(toolId); setShowPopover(true); }
  };

  useEffect(() => {
    const handleOutside = (e) => {
      if (showPopover && !e.target.closest('[data-fab]')) setShowPopover(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showPopover, setShowPopover]);

  // Save: flatten stage (image + annotations) then write to disk
  const handleSave = async () => {
    const dataUrl = getFlattenedImage();
    if (!dataUrl) return;
    setSaving(true);
    try {
      const result = await window.electron.saveImage(dataUrl, `glimpse-${Date.now()}.png`);
      if (!result.canceled) console.log('[FAB] Saved to:', result.filePath);
    } catch (e) {
      console.error('[FAB] Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  // Copy: flatten stage then write to clipboard
  const handleCopy = async () => {
    const dataUrl = getFlattenedImage();
    if (!dataUrl) return;
    try {
      await window.electron.copyToClipboard(dataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      console.log('[FAB] Copied to clipboard');
    } catch (e) {
      console.error('[FAB] Copy error:', e);
    }
  };

  return (
    <>
      {showPopover && (
        <ContextPopover anchorRef={{ current: toolRefs.current[activeTool] }} />
      )}

      <div data-fab
        className="flex items-center gap-0.5 bg-[#1C1C1E] border border-[#2A2A2D] rounded-full px-3 py-2"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.65), 0 6px 20px rgba(0,0,0,0.4)' }}>

        {/* Tools */}
        {TOOLS.map(({ id, Icon, label }) => {
          const isActive = activeTool === id;
          return (
            <button key={id}
              ref={(el) => { toolRefs.current[id] = el; }}
              title={label}
              onClick={() => handleToolClick(id)}
              className={`relative w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 focus:outline-none ${
                isActive ? 'bg-[#2A2A2D]' : 'hover:bg-[#2A2A2D]/60'
              }`}>
              <Icon size={15} style={{ color: isActive ? activeColor : '#9CA3AF' }} />
              {isActive && (
                <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: activeColor }} />
              )}
            </button>
          );
        })}

        <Divider />

        {/* History */}
        <button title="Undo" onClick={undo}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#2A2A2D]/60 transition-all focus:outline-none">
          <Undo2 size={15} />
        </button>
        <button title="Clear All" onClick={clearAnnotations}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all focus:outline-none">
          <Trash2 size={15} />
        </button>

        <Divider />

        {/* Actions */}
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
