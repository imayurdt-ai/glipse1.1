/**
 * @file preload.ts
 * Compiled as CommonJS via tsconfig.preload.json.
 */

const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] executing');

function listen(channel: string, cb: (...args: unknown[]) => void): () => void {
  const handler = (_e: unknown, ...args: unknown[]) => cb(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api = {
  onCaptureImage: (cb: (img: string) => void) => {
    console.log('[Preload] registering send-capture-image listener');
    ipcRenderer.removeAllListeners('send-capture-image');
    return listen('send-capture-image', (...args: unknown[]) => {
      const img = args[0] as string;
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

  onFullscreenMode: (cb: (size: { width: number; height: number }) => void) => {
    ipcRenderer.removeAllListeners('fullscreen-mode');
    return listen('fullscreen-mode', (...args: unknown[]) => {
      cb(args[0] as { width: number; height: number });
    });
  },

  startCapture:    (type: string) => { console.log('[Preload] startCapture', type); ipcRenderer.send('start-capture', type); },
  rendererReady:   () => { console.log('[Preload] rendererReady'); ipcRenderer.send('renderer-ready'); },
  saveImage:       (dataUrl: string, filename: string) => ipcRenderer.invoke('save-image', dataUrl, filename),
  copyToClipboard: (dataUrl: string) => ipcRenderer.invoke('copy-to-clipboard', dataUrl),
  closeOverlay:    () => { console.log('[Preload] closeOverlay'); ipcRenderer.send('close-overlay'); },
  retakeCapture:   () => { console.log('[Preload] retakeCapture'); ipcRenderer.send('retake-capture'); },
  getSettings:     () => ipcRenderer.invoke('get-settings'),
  saveSettings:    (s: unknown) => ipcRenderer.invoke('save-settings', s),
};

try {
  contextBridge.exposeInMainWorld('electron', api);
  console.log('[Preload] window.electron exposed OK');
} catch (e) {
  console.error('[Preload] contextBridge FAILED:', e);
}
