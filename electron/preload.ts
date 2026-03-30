/**
 * @file preload.ts
 * Runs in the renderer context before any page script.
 * Bridges IPC between renderer and main via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

console.log('[Preload] executing, contextIsolation=true');

export type Tool = 'pen' | 'square' | 'circle' | 'arrow' | 'text';
export interface AppSettings {
  defaultTool: Tool;
  defaultColor: string;
  defaultWeight: 2 | 4 | 8;
}
export interface ElectronApi {
  onCaptureImage:  (cb: (dataUrl: string) => void) => () => void;
  onResetOverlay:  (cb: () => void) => () => void;
  startCapture:    () => void;
  rendererReady:   () => void;
  saveImage:       (dataUrl: string, filename: string) => Promise<{ canceled: boolean; filePath?: string }>;
  copyToClipboard: (dataUrl: string) => Promise<void>;
  closeOverlay:    () => void;
  retakeCapture:   () => void;
  getSettings:     () => Promise<AppSettings>;
  saveSettings:    (s: AppSettings) => Promise<void>;
}

function listen<T extends unknown[]>(channel: string, cb: (...args: T) => void): () => void {
  const handler = (_e: Electron.IpcRendererEvent, ...args: T) => cb(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api: ElectronApi = {
  onCaptureImage: (cb) => {
    console.log('[Preload] registering send-capture-image listener');
    ipcRenderer.removeAllListeners('send-capture-image');
    return listen('send-capture-image', (img: string) => {
      console.log('[Preload] send-capture-image received, length:', img.length);
      cb(img);
    });
  },
  onResetOverlay: (cb) => {
    ipcRenderer.removeAllListeners('reset-overlay');
    return listen('reset-overlay', () => {
      console.log('[Preload] reset-overlay received');
      cb();
    });
  },
  startCapture:    () => { console.log('[Preload] startCapture → IPC start-capture'); ipcRenderer.send('start-capture'); },
  rendererReady:   () => { console.log('[Preload] rendererReady → IPC renderer-ready'); ipcRenderer.send('renderer-ready'); },
  saveImage:       (d, f) => ipcRenderer.invoke('save-image', d, f),
  copyToClipboard: (d)    => ipcRenderer.invoke('copy-to-clipboard', d),
  closeOverlay:    ()     => { console.log('[Preload] closeOverlay → IPC close-overlay'); ipcRenderer.send('close-overlay'); },
  retakeCapture:   ()     => { console.log('[Preload] retakeCapture → IPC retake-capture'); ipcRenderer.send('retake-capture'); },
  getSettings:     ()     => ipcRenderer.invoke('get-settings'),
  saveSettings:    (s)    => ipcRenderer.invoke('save-settings', s),
};

try {
  contextBridge.exposeInMainWorld('electron', api);
  console.log('[Preload] window.electron exposed successfully');
} catch (e) {
  console.error('[Preload] contextBridge.exposeInMainWorld FAILED:', e);
}

declare global { interface Window { electron: ElectronApi; } }
