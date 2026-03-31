/**
 * @file useAppStore.ts
 * Global Zustand store for Glimpse.
 * Added updateAnnotation action so hovering an annotation and changing
 * color/weight patches it in-place immediately.
 */

import { create } from 'zustand';

export type Tool   = 'pen' | 'square' | 'circle' | 'arrow' | 'text';
export type Weight = 2 | 4 | 8;

export interface Annotation {
  id:      string;
  tool:    Tool;
  color:   string;
  weight:  Weight;
  points?: number[];
  x?:      number;
  y?:      number;
  width?:  number;
  height?: number;
  radius?: number;
  text?:   string;
}

export interface SelectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface AppState {
  capturedImage:  string | null;
  sourceImage:    string | null;
  selectionRect:  SelectionRect | null;
  isSelecting:    boolean;
  activeTool:     Tool;
  activeColor:    string;
  activeWeight:   Weight;
  showColorPopover: boolean;
  annotations:    Annotation[];

  setCapturedImage:    (img: string | null)         => void;
  setSourceImage:      (img: string | null)         => void;
  setSelectionRect:    (rect: SelectionRect | null) => void;
  setIsSelecting:      (v: boolean)                 => void;
  setTool:             (t: Tool)                    => void;
  setColor:            (c: string)                  => void;
  setWeight:           (w: Weight)                  => void;
  toggleColorPopover:  ()                           => void;
  setShowColorPopover: (v: boolean)                 => void;
  addAnnotation:       (a: Annotation)              => void;
  updateAnnotation:    (id: string, patch: Partial<Annotation>) => void;
  undo:                ()                           => void;
  clearAnnotations:    ()                           => void;
  reset:               ()                           => void;
  initFromSettings:    (s: { defaultTool: string; defaultColor: string; defaultWeight: number }) => void;
}

const runtimeDefaults = {
  capturedImage:    null,
  sourceImage:      null,
  selectionRect:    null,
  isSelecting:      false,
  showColorPopover: false,
  annotations:      [],
};

export const useAppStore = create<AppState>()((set) => ({
  ...runtimeDefaults,
  activeTool:   'arrow' as Tool,
  activeColor:  '#EF4444',
  activeWeight: 4 as Weight,

  setCapturedImage:    (img)  => set({ capturedImage: img }),
  setSourceImage:      (img)  => set({ sourceImage: img }),
  setSelectionRect:    (rect) => set({ selectionRect: rect }),
  setIsSelecting:      (v)    => set({ isSelecting: v }),
  setTool:             (t)    => set({ activeTool: t }),
  setColor:            (c)    => set({ activeColor: c }),
  setWeight:           (w)    => set({ activeWeight: w }),
  toggleColorPopover:  ()     => set((s) => ({ showColorPopover: !s.showColorPopover })),
  setShowColorPopover: (v)    => set({ showColorPopover: v }),
  addAnnotation:       (a)    => set((s) => ({ annotations: [...s.annotations, a] })),

  // Patch a single committed annotation by id (used by hover palette)
  updateAnnotation: (id, patch) =>
    set((s) => ({
      annotations: s.annotations.map((a) => a.id === id ? { ...a, ...patch } : a),
    })),

  undo:             () => set((s) => ({ annotations: s.annotations.slice(0, -1) })),
  clearAnnotations: () => set({ annotations: [] }),

  reset: () =>
    set((s) => ({
      ...runtimeDefaults,
      activeTool:   s.activeTool,
      activeColor:  s.activeColor,
      activeWeight: s.activeWeight,
    })),

  initFromSettings: (s) =>
    set({
      activeTool:   (s.defaultTool   as Tool)  || 'arrow',
      activeColor:  s.defaultColor              || '#EF4444',
      activeWeight: (s.defaultWeight as Weight) || 4,
    }),
}));
