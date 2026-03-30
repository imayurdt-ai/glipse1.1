/**
 * @file useAnnotation.ts
 */

import { useState, useCallback } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useAppStore, type Annotation } from '../store/useAppStore';

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export interface TextEditor {
  id: string;
  x: number;
  y: number;
  color: string;
}

export function useAnnotation() {
  const activeTool    = useAppStore((s) => s.activeTool);
  const activeColor   = useAppStore((s) => s.activeColor);
  const activeWeight  = useAppStore((s) => s.activeWeight);
  const addAnnotation = useAppStore((s) => s.addAnnotation);

  const [current,    setCurrent]    = useState<Annotation | null>(null);
  const [textEditor, setTextEditor] = useState<TextEditor | null>(null);
  // Separate state for the live typed value so React re-renders on every keystroke
  const [textValue,  setTextValue]  = useState<string>('');

  const pt = (e: KonvaEventObject<MouseEvent>) =>
    e.target.getStage()?.getPointerPosition() ?? { x: 0, y: 0 };

  const commitText = useCallback((value: string, editor: TextEditor) => {
    if (value.trim()) {
      addAnnotation({
        id: editor.id,
        tool: 'text',
        color: editor.color,
        weight: 2,
        x: editor.x,
        y: editor.y,
        text: value.trim(),
      });
    }
    setTextEditor(null);
    setTextValue('');
  }, [addAnnotation]);

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const { x, y } = pt(e);
    const base = { id: uid(), tool: activeTool, color: activeColor, weight: activeWeight };

    // Clicking elsewhere while text editor is open commits it
    if (textEditor) {
      commitText(textValue, textEditor);
      return;
    }

    if (activeTool === 'text') {
      setTextEditor({ id: uid(), x, y, color: activeColor });
      setTextValue('');
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
        const p = [...(prev.points ?? [])]; p[2] = x; p[3] = y;
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

  return {
    currentAnnotation: current,
    textEditor,
    textValue,
    setTextValue,
    commitText,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
  };
}
