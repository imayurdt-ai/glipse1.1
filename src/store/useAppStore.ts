/**
 * @file useAppStore.ts
 * Global Zustand store for Glimpse.
 * Holds capture state, tool preferences (persisted), and annotation history.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Tool = 'pen' | 'square' | 'circle' | 'arrow' | 'text';
export type Weight = 2 | 4 | 8;

export interface Annotation {
  id: string;
  tool: Tool;
  color: string;
  weight: Weight;
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
}

export interface SelectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface AppState {
  capturedImage: string | null;
  sourceImage: string | null;
  selectionRect: SelectionRect | null;
  isSelecting: boolean;
  activeTool: Tool;
  activeColor: string;
  activeWeight: Weight;
  showColorPopover: boolean;
  annotations: Annotation[];

  setCapturedImage: (img: string | null) => void;
  setSourceImage: (img: string | null) => void;
  setSelectionRect: (rect: SelectionRect | null) => void;
  setIsSelecting: (v: boolean) => void;
  setTool: (t: Tool) => void;
  setColor: (c: string) => void;
  setWeight: (w: Weight) => void;
  toggleColorPopover: () => void;
  setShowColorPopover: (v: boolean) => void;
  addAnnotation: (a: Annotation) => void;
  undo: () => void;
  clearAnnotations: () => void;
  reset: () => void;
}

const runtimeDefaults = {
  capturedImage: null,
  sourceImage: null,
  selectionRect: null,
  isSelecting: false,
  showColorPopover: false,
  annotations: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...runtimeDefaults,
      activeTool: 'arrow' as Tool,
      activeColor: '#EF4444',
      activeWeight: 4 as Weight,

      setCapturedImage: (img) => set({ capturedImage: img }),
      setSourceImage: (img) => set({ sourceImage: img }),
      setSelectionRect: (rect) => set({ selectionRect: rect }),
      setIsSelecting: (v) => set({ isSelecting: v }),
      setTool: (t) => set({ activeTool: t }),
      setColor: (c) => set({ activeColor: c }),
      setWeight: (w) => set({ activeWeight: w }),
      toggleColorPopover: () => set((s) => ({ showColorPopover: !s.showColorPopover })),
      setShowColorPopover: (v) => set({ showColorPopover: v }),
      addAnnotation: (a) => set((s) => ({ annotations: [...s.annotations, a] })),
      undo: () => set((s) => ({ annotations: s.annotations.slice(0, -1) })),
      clearAnnotations: () => set({ annotations: [] }),
      reset: () =>
        set((s) => ({
          ...runtimeDefaults,
          activeTool: s.activeTool,
          activeColor: s.activeColor,
          activeWeight: s.activeWeight,
        })),
    }),
    {
      name: 'glimpse-preferences',
      partialize: (s) => ({
        activeTool: s.activeTool,
        activeColor: s.activeColor,
        activeWeight: s.activeWeight,
      }),
    }
  )
);
