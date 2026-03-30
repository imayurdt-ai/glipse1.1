/**
 * @file Overlay.tsx
 * Phase A — crosshair region selection (region mode only).
 * Phase B — Konva annotation canvas + FloatingActionBar.
 *
 * Text tool: a native <input> floats over the Konva stage at the click
 * position, lets the user type, then commits on Enter or blur.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import Konva from 'konva';
import {
  Arrow, Circle, Image as KonvaImage,
  Layer, Line, Rect, Stage, Text,
} from 'react-konva';
import useImage from 'use-image';
import FloatingActionBar from '../../components/FloatingActionBar';
import { useAnnotation } from '../../hooks/useAnnotation';
import { useAppStore, type Annotation } from '../../store/useAppStore';

// ─ Shape ─────────────────────────────────────────────────────────────────────────

function Shape({ a }: { a: Annotation }) {
  const common = { stroke: a.color, strokeWidth: a.weight, listening: false };
  if (a.tool === 'pen')    return <Line points={a.points ?? []} {...common} lineCap="round" lineJoin="round" />;
  if (a.tool === 'arrow')  return <Arrow points={a.points ?? []} {...common} fill={a.color} pointerLength={12} pointerWidth={10} />;
  if (a.tool === 'square') return <Rect x={a.x} y={a.y} width={a.width} height={a.height} {...common} />;
  if (a.tool === 'circle') return <Circle x={a.x} y={a.y} radius={a.radius} {...common} />;
  return <Text x={a.x} y={a.y} text={a.text ?? ''} fill={a.color} fontSize={18} fontStyle="bold" listening={false} />;
}

// ─ Crop ──────────────────────────────────────────────────────────────────────────

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

// ─ Phase A: Selection ───────────────────────────────────────────────────────────

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

// ─ Phase B: Annotation ──────────────────────────────────────────────────────────

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
    commitText,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
  } = useAnnotation();
  const [bgImage] = useImage(croppedImage);
  const stageRef  = useRef<Konva.Stage>(null);

  useEffect(() => { setTool('arrow'); }, [setTool]);
  useEffect(() => {
    (window as any).__glimpseStage = stageRef.current;
    return () => { delete (window as any).__glimpseStage; };
  }, [stageRef.current]);

  return (
    <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.45)' }}>
      {/* Konva canvas */}
      <div className="absolute" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}>
        <Stage ref={stageRef} width={rect.w} height={rect.h}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          style={{ cursor: 'crosshair', display: 'block' }}>
          <Layer>
            {bgImage && <KonvaImage image={bgImage} width={rect.w} height={rect.h} />}
            {annotations.map((a) => <Shape key={a.id} a={a} />)}
            {currentAnnotation && <Shape a={currentAnnotation} />}
          </Layer>
        </Stage>

        {/* Floating text input — appears at click position when text tool is active */}
        {textEditor && (
          <input
            autoFocus
            value={textEditor.value}
            onChange={(e) => {
              const val = e.target.value;
              // Keep the editor open with updated value (no store write yet)
              // We rely on commitText for final write
              textEditor.value = val;
              // Force re-render by spreading
              // Since textEditor is state in useAnnotation, update via a local trick:
              e.target.setAttribute('data-value', val);
            }}
            onInput={(e) => {
              // Update the live value in textEditor ref
              const val = (e.target as HTMLInputElement).value;
              textEditor.value = val;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitText({ ...textEditor, value: (e.target as HTMLInputElement).value }); }
              if (e.key === 'Escape') { commitText({ ...textEditor, value: '' }); }
            }}
            onBlur={(e) => commitText({ ...textEditor, value: e.target.value })}
            style={{
              position: 'absolute',
              left: textEditor.x,
              top: textEditor.y - 2,
              minWidth: 120,
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${textEditor.color}`,
              color: textEditor.color,
              fontSize: 18,
              fontWeight: 'bold',
              fontFamily: 'inherit',
              outline: 'none',
              caretColor: textEditor.color,
              zIndex: 10,
              padding: '0 2px',
            }}
          />
        )}
      </div>

      {/* FAB */}
      <div className="absolute" style={{
        left: rect.x + rect.w / 2,
        top: Math.min(rect.y + rect.h + 20, window.innerHeight - 72),
        transform: 'translateX(-50%)',
      }}>
        <FloatingActionBar />
      </div>
    </div>
  );
}

// ─ Root ─────────────────────────────────────────────────────────────────────────────

export default function Overlay() {
  const sourceImage      = useAppStore((s) => s.sourceImage);
  const capturedImage    = useAppStore((s) => s.capturedImage);
  const selectionRect    = useAppStore((s) => s.selectionRect);
  const setSourceImage   = useAppStore((s) => s.setSourceImage);
  const setCapturedImage = useAppStore((s) => s.setCapturedImage);
  const setSelectionRect = useAppStore((s) => s.setSelectionRect);
  const reset            = useAppStore((s) => s.reset);

  useEffect(() => {
    if (!window.electron) { console.error('[Overlay] window.electron UNDEFINED'); return; }

    const offCapture = window.electron.onCaptureImage((img) => {
      console.log('[Overlay] onCaptureImage, length:', img.length);
      setSourceImage(img);
    });
    const offReset = window.electron.onResetOverlay(() => {
      console.log('[Overlay] reset'); reset();
    });
    const offFullscreen = window.electron.onFullscreenMode(({ width, height }) => {
      console.log('[Overlay] fullscreen-mode, size:', width, 'x', height);
      setSelectionRect({ x: 0, y: 0, w: width, h: height });
    });

    window.electron.rendererReady();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.electron.closeOverlay();
    };
    window.addEventListener('keydown', onKey);
    return () => { offCapture(); offReset(); offFullscreen(); window.removeEventListener('keydown', onKey); };
  }, [reset, setSourceImage, setCapturedImage, setSelectionRect]);

  // Fullscreen: selectionRect set + sourceImage arrived → skip Phase A
  useEffect(() => {
    if (!sourceImage || capturedImage || !selectionRect) return;
    const isFullscreen = selectionRect.x === 0 && selectionRect.y === 0
      && selectionRect.w >= window.screen.width * 0.9;
    if (isFullscreen) {
      console.log('[Overlay] fullscreen — skipping Phase A');
      setCapturedImage(sourceImage);
    }
  }, [sourceImage, capturedImage, selectionRect, setCapturedImage]);

  if (!sourceImage)                     return <div className="fixed inset-0" style={{ background: 'transparent' }} />;
  if (!capturedImage || !selectionRect) return <SelectionPhase sourceImage={sourceImage} />;
  return <AnnotationPhase croppedImage={capturedImage} rect={selectionRect} />;
}
