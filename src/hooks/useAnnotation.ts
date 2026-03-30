/**
 * @file useAnnotation.ts
 * Konva drawing hook for Glimpse.
 * Manages live in-progress annotation and commits finished shapes to the store.
 */

import { useState } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useAppStore, type Annotation } from '../store/useAppStore';

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function useAnnotation() {
  const activeTool = useAppStore((s) => s.activeTool);
  const activeColor = useAppStore((s) => s.activeColor);
  const activeWeight = useAppStore((s) => s.activeWeight);
  const addAnnotation = useAppStore((s) => s.addAnnotation);
  const [current, setCurrent] = useState<Annotation | null>(null);

  const pt = (e: KonvaEventObject<MouseEvent>) =>
    e.target.getStage()?.getPointerPosition() ?? { x: 0, y: 0 };

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const { x, y } = pt(e);
    const base = { id: uid(), tool: activeTool, color: activeColor, weight: activeWeight };

    if (activeTool === 'text') {
      addAnnotation({ ...base, x, y, text: 'Text' });
      return;
    }
    if (activeTool === 'pen' || activeTool === 'arrow') {
      setCurrent({ ...base, points: [x, y, x, y] });
      return;
    }
    if (activeTool === 'square') {
      setCurrent({ ...base, x, y, width: 0, height: 0 });
      return;
    }
    setCurrent({ ...base, x, y, radius: 0 });
  };

  const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!current) return;
    const { x, y } = pt(e);
    setCurrent((prev) => {
      if (!prev) return prev;
      if (prev.tool === 'pen')
        return { ...prev, points: [...(prev.points ?? []), x, y] };
      if (prev.tool === 'arrow') {
        const p = [...(prev.points ?? [])];
        p[2] = x; p[3] = y;
        return { ...prev, points: p };
      }
      if (prev.tool === 'square')
        return { ...prev, width: x - (prev.x ?? 0), height: y - (prev.y ?? 0) };
      const dx = x - (prev.x ?? 0), dy = y - (prev.y ?? 0);
      return { ...prev, radius: Math.sqrt(dx * dx + dy * dy) };
    });
  };

  const handleStageMouseUp = () => {
    if (current) addAnnotation(current);
    setCurrent(null);
  };

  return { currentAnnotation: current, handleStageMouseDown, handleStageMouseMove, handleStageMouseUp };
}
