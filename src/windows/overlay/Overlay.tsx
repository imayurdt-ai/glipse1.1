/**
 * @file Overlay.tsx
 * Fullscreen overlay window root for Glimpse.
 * Phase A: region selection via mouse drag.
 * Phase B: Konva annotation canvas over the cropped screenshot.
 */

import { useEffect, useMemo } from 'react';
import {
  Arrow, Circle, Image as KonvaImage,
  Layer, Line, Rect, Stage, Text,
} from 'react-konva';
import useImage from 'use-image';
import FloatingActionBar from '../../components/FloatingActionBar';
import { useCapture } from '../../hooks/useCapture';
import { useAnnotation } from '../../hooks/useAnnotation';
import { useAppStore, type Annotation } from '../../store/useAppStore';

// ── Annotation renderer ───────────────────────────────────────────────────────

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

// ── Crop helper ───────────────────────────────────────────────────────────────

async function crop(
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

// ── Phase A: Selection ────────────────────────────────────────────────────────

function SelectionPhase({ sourceImage }: { sourceImage: string }) {
  const { selectionRect: liveRect, onMouseDown, onMouseMove, onMouseUp } = useCapture();
  const setCapturedImage = useAppStore((s) => s.setCapturedImage);
  const setSelectionRect = useAppStore((s) => s.setSelectionRect);

  const label = useMemo(() => {
    if (!liveRect) return '';
    return `${Math.round(liveRect.w)} × ${Math.round(liveRect.h)}`;
  }, [liveRect]);

  const handleMouseUp = async () => {
    onMouseUp();
    if (!liveRect || liveRect.w < 5 || liveRect.h < 5) return;
    const cropped = await crop(sourceImage, liveRect);
    setSelectionRect(liveRect);
    setCapturedImage(cropped);
  };

  return (
    <div
      className="fixed inset-0 cursor-crosshair select-none bg-black/50"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={handleMouseUp}
    >
      {!liveRect && (
        <p className="absolute inset-0 flex items-center justify-center text-[#9CA3AF] text-sm font-medium pointer-events-none">
          Click and drag to select a region
        </p>
      )}

      {liveRect && liveRect.w > 0 && (
        <>
          <div
            className="absolute pointer-events-none"
            style={{
              left: liveRect.x, top: liveRect.y,
              width: liveRect.w, height: liveRect.h,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              outline: '1.5px solid rgba(255,255,255,0.85)',
            }}
          />
          <div
            className="absolute pointer-events-none rounded-full bg-[#1C1C1E]/90 border border-[#2A2A2D] px-2.5 py-1 text-xs font-mono text-[#F9FAFB]"
            style={{ left: liveRect.x, top: Math.max(8, liveRect.y - 34) }}
          >
            {label}
          </div>
        </>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
        <p className="text-[#9CA3AF] text-xs">
          Press{' '}
          <kbd className="px-1.5 py-0.5 bg-[#2A2A2D] rounded font-mono text-[#F9FAFB]">Esc</kbd>
          {' '}to cancel
        </p>
      </div>
    </div>
  );
}

// ── Phase B: Annotation ───────────────────────────────────────────────────────

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
    <div className="fixed inset-0 bg-black/60">
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
          style={{ cursor: 'crosshair' }}
        >
          <Layer>
            {bgImage && <KonvaImage image={bgImage} width={rect.w} height={rect.h} />}
            {annotations.map((a) => <Shape key={a.id} a={a} />)}
            {currentAnnotation && <Shape a={currentAnnotation} />}
          </Layer>
        </Stage>
      </div>

      <div
        className="absolute"
        style={{
          left: rect.x + rect.w / 2,
          top: rect.y + rect.h + 20,
          transform: 'translateX(-50%)',
        }}
      >
        <FloatingActionBar />
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function Overlay() {
  const sourceImage = useAppStore((s) => s.sourceImage);
  const capturedImage = useAppStore((s) => s.capturedImage);
  const selectionRect = useAppStore((s) => s.selectionRect);
  const setSourceImage = useAppStore((s) => s.setSourceImage);
  const reset = useAppStore((s) => s.reset);

  useEffect(() => {
    const offCapture = window.electron.onCaptureImage((img) => {
      reset();
      setSourceImage(img);
    });
    const offReset = window.electron.onResetOverlay(() => reset());
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

  if (!sourceImage) return <div className="fixed inset-0 bg-transparent" />;

  if (!capturedImage || !selectionRect) {
    return <SelectionPhase sourceImage={sourceImage} />;
  }

  return <AnnotationPhase croppedImage={capturedImage} rect={selectionRect} />;
}
