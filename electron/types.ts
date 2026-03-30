/**
 * @file types.ts
 * Shared types used by both main-process files (ESM) and preload (CJS).
 * Import from here instead of from preload.ts.
 */

export type Tool = 'pen' | 'square' | 'circle' | 'arrow' | 'text';

export interface AppSettings {
  defaultTool: Tool;
  defaultColor: string;
  defaultWeight: 2 | 4 | 8;
}
