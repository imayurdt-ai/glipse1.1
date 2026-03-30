/**
 * @file preload.ts
 * Secure contextBridge preload for Glimpse.
 * Exposes a strictly typed window.electron API to the renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';

export type Tool = 'pen' | 'square' | 'circle' | 'arrow' | 'text';

export interface AppSettings {
  defaultTool: Tool;
  defaultColor: string;
  defaultWeight: 2 | 4 | 8;
}

export interface ElectronApi {
  onCaptureImage: (cb: (dataUrl: string) => void) => () => void;
  onResetOverlay: (cb: () => void) => () => void;
  saveImage: (dataUrl: string, filename: string) => Promise<{ canceled: boolean; filePath?: string }>;
  copyToClipboard: (dataUrl: string) => Promise<void>;
  closeOverlay: () => void;
  retakeCapture: () => void;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (s: AppSettings) => Promise<void>;
}

function listen<T extends unknown[]>(
  channel: string,
  cb: (...args: T) => void
): () => void {
  const handler = (_e: Electron.IpcRendererEvent, ...args: T) => cb(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api: ElectronApi = {
  onCaptureImage: (cb) => {
    ipcRenderer.removeAllListeners('send-capture-image');
    return listen('send-capture-image', cb);
  },
  onResetOverlay: (cb) => {
    ipcRenderer.removeAllListeners('reset-overlay');
    return listen('reset-overlay', cb);
  },
  saveImage: (dataUrl, filename) =>
    ipcRenderer.invoke('save-image', dataUrl, filename),
  copyToClipboard: (dataUrl) =>
    ipcRenderer.invoke('copy-to-clipboard', dataUrl),
  closeOverlay: () => ipcRenderer.send('close-overlay'),
  retakeCapture: () => ipcRenderer.send('retake-capture'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
};

contextBridge.exposeInMainWorld('electron', api);

declare global {
  interface Window { electron: ElectronApi; }
}
