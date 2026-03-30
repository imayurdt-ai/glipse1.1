/**
 * @file Overlay.tsx
 * Fullscreen overlay window root for Glimpse.
 * Phase A — crosshair region selection.
 * Phase B — Konva annotation canvas + FloatingActionBar.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  Arrow, Circle, Image as KonvaImage,
  Layer, Line, Rect, Stage, Text,
} from 'react-konva';
import useImage from 'use-image';
import FloatingActionBar from '../../components/FloatingActionBar';
import { useAnnotation } from '../../hooks/useAnnotation';
import { useAppStore, type Annotation } from '../../store/useAppStore';

// ── Annotation shape renderer ─────────────────────────────────────────────────────

function Shape({ a }: { a: Annotation }) {
  const common = { stroke: a.color, strokeWidth: a.weight, listening: false };
  if (a.tool === 'pen')
    return <Line points={a.points ?? []} {...common} lineCap="round" lineJoin="round" />;
  if (a.tool === 'arrow')
    return <Arrow points={a.points ?? []} {...common} fill={a.color} pointerLength={10} pointerWidth={8} />;
  if (a.tool === 'square')
    return <Rect x={a.x} y={a.y} width={a.width} height={a.height} {...common} />;
  if (a.tool === 'circle')
    return <Circle x={a.x} y={a.y} radius={a.radius} {...common} />;
  return <Text x={a.x} y={a.y} text={a.text ?? ''} fill={a.color} fontSize={18} listening={false} />;
}

// ── Canvas crop helper ───────────────────────────────────────────────────────────

function cropImage(
  src: string,
  rect: { x: number; y: number; w: number; h: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = rect.w;
      c.height = rect.h;
      const ctx = c.getContext('2d');
      if (!ctx) { reject(new Error('no ctx')); return; }
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
}

// ── Phase A: Selection ─────────────────────────────────────────────────────────

function SelectionPhase({ sourceImage }: { sourceImage: string }) {
  const setCapturedImage = useAppStore((s) => s.setCapturedImage);
  const setSelectionRect  = useAppStore((s) => s.setSelectionRect);

  // Use refs for drag state — avoids stale closure bugs in mouse handlers
  const startRef  = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const [liveRect, setLiveRect] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const label = useMemo(() => {
    if (!liveRect) return '';
    return `${Math.round(liveRect.w)} × ${Math.round(liveRect.h)}`;
  }, [liveRect]);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore right-click
    if (e.button !== 0) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    isDragging.current = true;
    setLiveRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !startRef.current) return;
    const x = Math.min(startRef.current.x, e.clientX);
    const y = Math.min(startRef.current.y, e.clientY);
    const w = Math.abs(e.clientX - startRef.current.x);
    const h = Math.abs(e.clientY - startRef.current.y);
    setLiveRect({ x, y, w, h });
  };

  const onMouseUp = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !startRef.current) return;
    isDragging.current = false;

    const x = Math.min(startRef.current.x, e.clientX);
    const y = Math.min(startRef.current.y, e.clientY);
    const w = Math.abs(e.clientX - startRef.current.x);
    const h = Math.abs(e.clientY - startRef.current.y);
    startRef.current = null;

    // Ignore tiny accidental clicks
    if (w < 8 || h < 8) {
      setLiveRect(null);
      return;
    }

    const rect = { x, y, w, h };
    const cropped = await cropImage(sourceImage, rect);
    setSelectionRect(rect);
    setCapturedImage(cropped);
  };

  return (
    <div
      className="fixed inset-0 select-none"
      style={{ cursor: 'crosshair', background: 'rgba(0,0,0,0.45)' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {/* Hint */}
      {!liveRect && (
        <p className="absolute inset-0 flex items-center justify-center text-[#9CA3AF] text-sm font-medium pointer-events-none">
          Click and drag to select a region
        </p>
      )}

      {/* Live selection rect */}
      {liveRect && liveRect.w > 0 && (
        <>
          {/* Bright cutout + outline */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: liveRect.x,
              top: liveRect.y,
              width: liveRect.w,
              height: liveRect.h,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              outline: '1.5px solid rgba(255,255,255,0.9)',
              background: 'transparent',
            }}
          />
          {/* Size label */}
          <div
            className="absolute pointer-events-none bg-[#1C1C1E]/90 border border-[#2A2A2D] rounded-full px-2.5 py-0.5 text-xs font-mono text-[#F9FAFB]"
            style={{
              left: liveRect.x,
              top: Math.max(8, liveRect.y - 30),
            }}
          >
            {label}
          </div>
        </>
      )}

      {/* ESC hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
        <p className="text-[#9CA3AF] text-xs">
          Press{' '}
          <kbd className="px-1.5 py-0.5 bg-[#2A2A2D] rounded font-mono text-[#F9FAFB] text-xs">Esc</kbd>
          {' '}to cancel
        </p>
      </div>
    </div>
  );
}

// ── Phase B: Annotation ────────────────────────────────────────────────────────

function AnnotationPhase({
  croppedImage,
  rect,
}: {
  croppedImage: string;
  rect: { x: number; y: number; w: number; h: number };
}) {
  const annotations = useAppStore((s) => s.annotations);
  const { currentAnnotation, handleStageMouseDown, handleStageMouseMove, handleStageMouseUp } =
    useAnnotation();
  const [bgImage] = useImage(croppedImage);

  return (
    <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.6)' }}>
      {/* Annotation canvas positioned over the selected region */}
      <div
        className="absolute"
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      >
        <Stage
          width={rect.w}
          height={rect.h}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          style={{ cursor: 'crosshair', display: 'block' }}
        >
          <Layer>
            {bgImage && <KonvaImage image={bgImage} width={rect.w} height={rect.h} />}
            {annotations.map((a) => <Shape key={a.id} a={a} />)}
            {currentAnnotation && <Shape a={currentAnnotation} />}
          </Layer>
        </Stage>
      </div>

      {/* FloatingActionBar centered below the selected region */}
      <div
        className="absolute"
        style={{
          left: rect.x + rect.w / 2,
          top: Math.min(rect.y + rect.h + 20, window.innerHeight - 80),
          transform: 'translateX(-50%)',
        }}
      >
        <FloatingActionBar />
      </div>
    </div>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────────

export default function Overlay() {
  const sourceImage   = useAppStore((s) => s.sourceImage);
  const capturedImage = useAppStore((s) => s.capturedImage);
  const selectionRect = useAppStore((s) => s.selectionRect);
  const setSourceImage = useAppStore((s) => s.setSourceImage);
  const reset          = useAppStore((s) => s.reset);

  useEffect(() => {
    // Guard: window.electron may not be available in pure browser preview
    if (!window.electron) return;

    const offCapture = window.electron.onCaptureImage((img) => {
      reset();
      setSourceImage(img);
    });

    const offReset = window.electron.onResetOverlay(() => {
      reset();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.electron.closeOverlay();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      offCapture();
      offReset();
      window.removeEventListener('keydown', onKey);
    };
  }, [reset, setSourceImage]);

  // Waiting for IPC image — render transparent placeholder
  if (!sourceImage) {
    return <div className="fixed inset-0" style={{ background: 'transparent' }} />;
  }

  // Phase A: user hasn't selected a region yet
  if (!capturedImage || !selectionRect) {
    return <SelectionPhase sourceImage={sourceImage} />;
  }

  // Phase B: region selected, show annotation canvas
  return <AnnotationPhase croppedImage={capturedImage} rect={selectionRect} />;
}
