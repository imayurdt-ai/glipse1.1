/**
 * @file preload.ts
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
    ipcRenderer.removeAllListeners('send-capture-image');
    return listen('send-capture-image', (...args: unknown[]) => cb(args[0] as string));
  },
  onResetOverlay: (cb: () => void) => {
    ipcRenderer.removeAllListeners('reset-overlay');
    return listen('reset-overlay', () => cb());
  },
  onFullscreenMode: (cb: (size: { width: number; height: number }) => void) => {
    ipcRenderer.removeAllListeners('fullscreen-mode');
    return listen('fullscreen-mode', (...args: unknown[]) => cb(args[0] as { width: number; height: number }));
  },
  startCapture:      (type: string)              => ipcRenderer.send('start-capture', type),
  rendererReady:     ()                          => ipcRenderer.send('renderer-ready'),
  saveImage:         (dataUrl: string, filename: string) => ipcRenderer.invoke('save-image', dataUrl, filename),
  copyToClipboard:   (dataUrl: string)           => ipcRenderer.invoke('copy-to-clipboard', dataUrl),
  closeOverlay:      ()                          => ipcRenderer.send('close-overlay'),
  retakeCapture:     ()                          => ipcRenderer.send('retake-capture'),
  getSettings:       ()                          => ipcRenderer.invoke('get-settings'),
  saveSettings:      (s: unknown)                => ipcRenderer.invoke('save-settings', s),
  // Re-register global shortcut from renderer (settings page)
  registerShortcut:  (accelerator: string)       => ipcRenderer.invoke('register-shortcut', accelerator),
};

try {
  contextBridge.exposeInMainWorld('electron', api);
  console.log('[Preload] window.electron exposed OK');
} catch (e) {
  console.error('[Preload] contextBridge FAILED:', e);
}
