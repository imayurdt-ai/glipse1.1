/**
 * @file preload.ts
 * Compiled as CommonJS (tsconfig.preload.json) so Electron can require() it.
 * Bridges IPC between renderer and main via contextBridge.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] executing');

type Tool = 'pen' | 'square' | 'circle' | 'arrow' | 'text';

interface AppSettings {
  defaultTool: Tool;
  defaultColor: string;
  defaultWeight: 2 | 4 | 8;
}

function listen(channel: string, cb: (...args: any[]) => void): () => void {
  const handler = (_e: any, ...args: any[]) => cb(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api = {
  onCaptureImage: (cb: (dataUrl: string) => void) => {
    console.log('[Preload] registering send-capture-image listener');
    ipcRenderer.removeAllListeners('send-capture-image');
    return listen('send-capture-image', (img: string) => {
      console.log('[Preload] send-capture-image received, length:', img.length);
      cb(img);
    });
  },
  onResetOverlay: (cb: () => void) => {
    ipcRenderer.removeAllListeners('reset-overlay');
    return listen('reset-overlay', () => {
      console.log('[Preload] reset-overlay received');
      cb();
    });
  },
  startCapture:    () => { console.log('[Preload] startCapture'); ipcRenderer.send('start-capture'); },
  rendererReady:   () => { console.log('[Preload] rendererReady'); ipcRenderer.send('renderer-ready'); },
  saveImage:       (dataUrl: string, filename: string) => ipcRenderer.invoke('save-image', dataUrl, filename),
  copyToClipboard: (dataUrl: string) => ipcRenderer.invoke('copy-to-clipboard', dataUrl),
  closeOverlay:    () => { console.log('[Preload] closeOverlay'); ipcRenderer.send('close-overlay'); },
  retakeCapture:   () => { console.log('[Preload] retakeCapture'); ipcRenderer.send('retake-capture'); },
  getSettings:     () => ipcRenderer.invoke('get-settings'),
  saveSettings:    (s: AppSettings) => ipcRenderer.invoke('save-settings', s),
};

try {
  contextBridge.exposeInMainWorld('electron', api);
  console.log('[Preload] window.electron exposed OK');
} catch (e) {
  console.error('[Preload] contextBridge FAILED:', e);
}
