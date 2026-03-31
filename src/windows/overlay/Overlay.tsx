/**
 * @file Overlay.tsx
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import {
  Arrow, Circle, Image as KonvaImage,
  Layer, Line, Rect, Stage, Text,
} from 'react-konva';
import useImage from 'use-image';
import FloatingActionBar from '../../components/FloatingActionBar';
import { useAnnotation } from '../../hooks/useAnnotation';
import { useAppStore, type Annotation } from '../../store/useAppStore';

// ── Colour palette (shown when hovering an existing annotation) ──────────

const HOVER_COLORS  = [
  { id: '#EF4444', label: 'Red'    },
  { id: '#EAB308', label: 'Yellow' },
  { id: '#22C55E', label: 'Green'  },
  { id: '#3B82F6', label: 'Blue'   },
  { id: '#FFFFFF', label: 'White'  },
];
const HOVER_WEIGHTS = [
  { id: 2, px: 10, label: 'Thin'   },
  { id: 4, px: 16, label: 'Medium' },
  { id: 8, px: 22, label: 'Thick'  },
];

interface AnnotationPalette {
  annotationId: string;
  screenX: number;   // viewport x – centre of palette
  screenY: number;   // viewport y – top of palette (it renders upward)
}

function HoverPalette({
  info, stageRect,
}: {
  info: AnnotationPalette;
  stageRect: { x: number; y: number; w: number; h: number };
}) {
  const activeColor  = useAppStore((s) => s.activeColor);
  const activeWeight = useAppStore((s) => s.activeWeight);
  const setColor     = useAppStore((s) => s.setColor);
  const setWeight    = useAppStore((s) => s.setWeight);
  const annotations  = useAppStore((s) => s.annotations);
  const updateAnnotation = useAppStore((s) => s.updateAnnotation);

  // Change the color/weight of the hovered annotation in place
  const applyColor = (c: string) => {
    setColor(c);
    updateAnnotation(info.annotationId, { color: c });
  };
  const applyWeight = (w: number) => {
    setWeight(w as 2 | 4 | 8);
    updateAnnotation(info.annotationId, { weight: w as 2 | 4 | 8 });
  };

  // Current values for this specific annotation (for ring display)
  const ann    = annotations.find((a) => a.id === info.annotationId);
  const annColor  = ann?.color  ?? activeColor;
  const annWeight = ann?.weight ?? activeWeight;

  const left = Math.max(80, Math.min(info.screenX, window.innerWidth - 80));
  const top  = info.screenY - 8;

  return (
    <div
      data-hover-palette
      className="fixed z-[9997] pointer-events-auto"
      style={{ left, top, transform: 'translateX(-50%) translateY(-100%)' }}
    >
      <div
        className="flex items-center gap-3 bg-[#1C1C1E] border border-[#2A2A2D] rounded-full px-4 py-3"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5)' }}
      >
        {/* Colors */}
        <div className="flex items-center gap-2">
          {HOVER_COLORS.map((c) => {
            const isActive = annColor === c.id;
            return (
              <button
                key={c.id}
                title={c.label}
                onClick={() => applyColor(c.id)}
                className="flex-shrink-0 rounded-full transition-transform hover:scale-110 focus:outline-none"
                style={{
                  width: 24, height: 24,
                  backgroundColor: c.id,
                  boxShadow: isActive ? '0 0 0 2px #1C1C1E, 0 0 0 4px #fff' : 'none',
                  transform: isActive ? 'scale(1.15)' : undefined,
                }}
              />
            );
          })}
        </div>

        <div className="w-px self-stretch bg-[#3A3A3D]" />

        {/* Weights */}
        <div className="flex items-center gap-3">
          {HOVER_WEIGHTS.map((w) => {
            const isActive = annWeight === w.id;
            return (
              <button
                key={w.id}
                title={w.label}
                onClick={() => applyWeight(w.id)}
                className="flex-shrink-0 rounded-full transition-transform hover:scale-110 focus:outline-none"
                style={{
                  width: w.px, height: w.px,
                  backgroundColor: isActive ? '#FFFFFF' : '#555558',
                  boxShadow: isActive ? '0 0 0 2px #1C1C1E, 0 0 0 4px #fff' : 'none',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Caret */}
      <div className="flex justify-center" style={{ marginTop: -5 }}>
        <div className="w-2.5 h-2.5 bg-[#1C1C1E] border-r border-b border-[#2A2A2D] rotate-45" />
      </div>
    </div>
  );
}

// ── Shape ─────────────────────────────────────────────────────────────────

function Shape({
  a,
  onEnter,
  onLeave,
  isInProgress,
}: {
  a: Annotation;
  onEnter?: (id: string, x: number, y: number) => void;
  onLeave?: () => void;
  isInProgress?: boolean;
}) {
  const common = {
    stroke: a.color,
    strokeWidth: a.weight,
    // In-progress shapes never receive mouse events (avoids interfering with drawing)
    listening: !isInProgress,
  };

  const handlers = isInProgress ? {} : {
    onMouseEnter: (e: any) => {
      const stage = e.target.getStage();
      const ptr   = stage?.getPointerPosition();
      if (ptr && onEnter) onEnter(a.id, ptr.x, ptr.y);
      const container = stage?.container();
      if (container) container.style.cursor = 'pointer';
    },
    onMouseLeave: (e: any) => {
      onLeave?.();
      const container = e.target.getStage()?.container();
      if (container) container.style.cursor = 'crosshair';
    },
  };

  if (a.tool === 'pen')    return <Line    points={a.points ?? []}                       {...common} {...handlers} lineCap="round" lineJoin="round" />;
  if (a.tool === 'arrow')  return <Arrow   points={a.points ?? []}                       {...common} {...handlers} fill={a.color} pointerLength={12} pointerWidth={10} />;
  if (a.tool === 'square') return <Rect    x={a.x} y={a.y} width={a.width} height={a.height} {...common} {...handlers} />;
  if (a.tool === 'circle') return <Circle  x={a.x} y={a.y} radius={a.radius}             {...common} {...handlers} />;
  return <Text x={a.x} y={a.y} text={a.text ?? ''} fill={a.color} fontSize={18} fontStyle="bold" {...handlers} listening={!isInProgress} />;
}

// ── Crop ──────────────────────────────────────────────────────────────────

function cropImage(src: string, rect: { x: number; y: number; w: number; h: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = rect.w; c.height = rect.h;
      const ctx = c.getContext('2d');
      if (!ctx) { reject(new Error('no ctx')); return; }
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
}

// ── Phase A ───────────────────────────────────────────────────────────────

function SelectionPhase({ sourceImage }: { sourceImage: string }) {
  const setCapturedImage = useAppStore((s) => s.setCapturedImage);
  const setSelectionRect = useAppStore((s) => s.setSelectionRect);
  const startRef   = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const [liveRect, setLiveRect] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const label = useMemo(() => liveRect ? `${Math.round(liveRect.w)} × ${Math.round(liveRect.h)}` : '', [liveRect]);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    isDragging.current = true;
    setLiveRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !startRef.current) return;
    setLiveRect({
      x: Math.min(startRef.current.x, e.clientX),
      y: Math.min(startRef.current.y, e.clientY),
      w: Math.abs(e.clientX - startRef.current.x),
      h: Math.abs(e.clientY - startRef.current.y),
    });
  };
  const onMouseUp = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !startRef.current) return;
    isDragging.current = false;
    const x = Math.min(startRef.current.x, e.clientX);
    const y = Math.min(startRef.current.y, e.clientY);
    const w = Math.abs(e.clientX - startRef.current.x);
    const h = Math.abs(e.clientY - startRef.current.y);
    startRef.current = null;
    if (w < 8 || h < 8) { setLiveRect(null); return; }
    const cropped = await cropImage(sourceImage, { x, y, w, h });
    setSelectionRect({ x, y, w, h });
    setCapturedImage(cropped);
  };

  return (
    <div className="fixed inset-0 select-none"
      style={{ cursor: 'crosshair', background: 'rgba(0,0,0,0.55)' }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      {!liveRect && (
        <p className="absolute inset-0 flex items-center justify-center text-white/60 text-sm font-medium pointer-events-none">
          Click and drag to select a region —{' '}
          <kbd className="ml-1 px-1.5 py-0.5 bg-white/10 rounded font-mono text-white text-xs">Esc</kbd>
        </p>
      )}
      {liveRect && liveRect.w > 0 && (
        <>
          <div className="absolute pointer-events-none" style={{
            left: liveRect.x, top: liveRect.y, width: liveRect.w, height: liveRect.h,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            outline: '2px solid rgba(255,255,255,0.9)',
            background: 'transparent',
          }} />
          <div className="absolute pointer-events-none bg-[#1C1C1E]/90 border border-[#3A3A3D] rounded-full px-2.5 py-0.5 text-xs font-mono text-white"
            style={{ left: liveRect.x, top: Math.max(8, liveRect.y - 30) }}>
            {label}
          </div>
        </>
      )}
    </div>
  );
}

// ── Phase B ───────────────────────────────────────────────────────────────

function AnnotationPhase({
  croppedImage, rect,
}: {
  croppedImage: string;
  rect: { x: number; y: number; w: number; h: number };
}) {
  const annotations = useAppStore((s) => s.annotations);
  const setTool     = useAppStore((s) => s.setTool);
  const {
    currentAnnotation,
    textEditor,
    textValue,
    setTextValue,
    commitText,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
  } = useAnnotation();

  const [bgImage]  = useImage(croppedImage);
  const stageRef   = useRef<Konva.Stage>(null);
  const justOpened = useRef(false);

  // Hover palette state: which annotation + where to show it
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoverPalette, setHoverPalette] = useState<AnnotationPalette | null>(null);

  const handleAnnotationEnter = (id: string, canvasX: number, canvasY: number) => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
    // Convert canvas coords → viewport coords
    setHoverPalette({
      annotationId: id,
      screenX: rect.x + canvasX,
      screenY: rect.y + canvasY,
    });
  };

  // Small delay before closing so the user can reach the palette
  const handleAnnotationLeave = () => {
    leaveTimer.current = setTimeout(() => setHoverPalette(null), 200);
  };

  // Keep palette open when mouse is inside the HoverPalette div
  const cancelLeave = () => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
  };

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);

  useEffect(() => { setTool('arrow'); }, [setTool]);

  useEffect(() => {
    (window as any).__glimpseStage = stageRef.current;
    return () => { delete (window as any).__glimpseStage; };
  }, [stageRef.current]);

  useEffect(() => {
    if (textEditor) {
      justOpened.current = true;
      const t = setTimeout(() => { justOpened.current = false; }, 100);
      return () => clearTimeout(t);
    }
  }, [textEditor?.id]);

  const textareaStyle: React.CSSProperties | undefined = textEditor ? {
    position: 'fixed',
    left:  rect.x + textEditor.x,
    top:   rect.y + textEditor.y,
    minWidth: 160,
    maxWidth: (rect.w - textEditor.x - 8),
    minHeight: 28,
    background: 'rgba(10,10,10,0.75)',
    border: `2px solid ${textEditor.color}`,
    borderRadius: 4,
    color: textEditor.color,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    caretColor: textEditor.color,
    zIndex: 9999,
    padding: '3px 8px',
    resize: 'none',
    overflow: 'hidden',
    lineHeight: '1.4',
    boxShadow: `0 0 0 1px ${textEditor.color}33`,
    whiteSpace: 'pre',
  } : undefined;

  return (
    <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.45)' }}>

      {/* Konva stage */}
      <div
        className="absolute"
        style={{
          left: rect.x, top: rect.y,
          width: rect.w, height: rect.h,
          pointerEvents: textEditor ? 'none' : 'auto',
        }}
      >
        <Stage
          ref={stageRef}
          width={rect.w}
          height={rect.h}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          style={{ cursor: textEditor ? 'text' : 'crosshair', display: 'block' }}
        >
          <Layer>
            {bgImage && <KonvaImage image={bgImage} width={rect.w} height={rect.h} />}

            {/* Committed annotations — listening ON so hover events fire */}
            {annotations.map((a) => (
              <Shape
                key={a.id}
                a={a}
                onEnter={handleAnnotationEnter}
                onLeave={handleAnnotationLeave}
              />
            ))}

            {/* In-progress shape — listening OFF to avoid interfering */}
            {currentAnnotation && (
              <Shape a={currentAnnotation} isInProgress />
            )}

            {textEditor && textValue.trim() && (
              <Text
                x={textEditor.x}
                y={textEditor.y}
                text={textValue}
                fill={textEditor.color}
                fontSize={18}
                fontStyle="bold"
                listening={false}
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* Hover palette — wraps in a div that keeps it alive while hovered */}
      {hoverPalette && (
        <div
          onMouseEnter={cancelLeave}
          onMouseLeave={handleAnnotationLeave}
          style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 9997 }}
        >
          <HoverPalette info={hoverPalette} stageRect={rect} />
        </div>
      )}

      {/* Floating text editor */}
      {textEditor && textareaStyle && (
        <textarea
          autoFocus
          rows={1}
          value={textValue}
          placeholder="Type and press Enter"
          onChange={(e) => {
            setTextValue(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(textValue, textEditor); }
            if (e.key === 'Escape') { e.preventDefault(); commitText('', textEditor); }
          }}
          onBlur={() => { if (justOpened.current) return; commitText(textValue, textEditor); }}
          style={textareaStyle}
        />
      )}

      {/* FAB */}
      <div
        className="absolute"
        style={{
          left: rect.x + rect.w / 2,
          top: Math.min(rect.y + rect.h + 20, window.innerHeight - 72),
          transform: 'translateX(-50%)',
        }}
      >
        <FloatingActionBar />
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────

export default function Overlay() {
  const sourceImage      = useAppStore((s) => s.sourceImage);
  const capturedImage    = useAppStore((s) => s.capturedImage);
  const selectionRect    = useAppStore((s) => s.selectionRect);
  const setSourceImage   = useAppStore((s) => s.setSourceImage);
  const setCapturedImage = useAppStore((s) => s.setCapturedImage);
  const setSelectionRect = useAppStore((s) => s.setSelectionRect);
  const reset            = useAppStore((s) => s.reset);

  useEffect(() => {
    if (!window.electron) return;
    const offCapture    = window.electron.onCaptureImage((img) => { setSourceImage(img); });
    const offReset      = window.electron.onResetOverlay(() => { reset(); });
    const offFullscreen = window.electron.onFullscreenMode(({ width, height }) => {
      setSelectionRect({ x: 0, y: 0, w: width, h: height });
    });
    window.electron.rendererReady();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') window.electron.closeOverlay(); };
    window.addEventListener('keydown', onKey);
    return () => { offCapture(); offReset(); offFullscreen(); window.removeEventListener('keydown', onKey); };
  }, [reset, setSourceImage, setCapturedImage, setSelectionRect]);

  useEffect(() => {
    if (!sourceImage || capturedImage || !selectionRect) return;
    const isFullscreen = selectionRect.x === 0 && selectionRect.y === 0
      && selectionRect.w >= window.screen.width * 0.9;
    if (isFullscreen) setCapturedImage(sourceImage);
  }, [sourceImage, capturedImage, selectionRect, setCapturedImage]);

  if (!sourceImage)                     return <div className="fixed inset-0" style={{ background: 'transparent' }} />;
  if (!capturedImage || !selectionRect) return <SelectionPhase sourceImage={sourceImage} />;
  return <AnnotationPhase croppedImage={capturedImage} rect={selectionRect} />;
}
