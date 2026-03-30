/**
 * @file useCapture.ts
 * Mouse-driven region selection hook for the capture overlay.
 * Tracks drag start/end and commits the selection rect to the Zustand store.
 */

import { useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useCapture() {
  const selectionRect = useAppStore((s) => s.selectionRect);
  const isSelecting = useAppStore((s) => s.isSelecting);
  const setSelectionRect = useAppStore((s) => s.setSelectionRect);
  const setIsSelecting = useAppStore((s) => s.setIsSelecting);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const pt = { x: e.clientX, y: e.clientY };
    startRef.current = pt;
    setIsSelecting(true);
    setSelectionRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !startRef.current) return;
    const x = Math.min(startRef.current.x, e.clientX);
    const y = Math.min(startRef.current.y, e.clientY);
    const w = Math.abs(e.clientX - startRef.current.x);
    const h = Math.abs(e.clientY - startRef.current.y);
    setSelectionRect({ x, y, w, h });
  };

  const onMouseUp = () => {
    setIsSelecting(false);
    if (selectionRect && (selectionRect.w < 5 || selectionRect.h < 5)) {
      setSelectionRect(null);
    }
    startRef.current = null;
  };

  return { selectionRect, isSelecting, onMouseDown, onMouseMove, onMouseUp };
}
