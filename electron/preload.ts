/**
 * @file preload.ts
 * Compiled as CommonJS via tsconfig.preload.json.
 */

const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] executing');

function listen(channel, cb) {
  const handler = (_e, ...args) => cb(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api = {
  onCaptureImage: (cb) => {
    console.log('[Preload] registering send-capture-image listener');
    ipcRenderer.removeAllListeners('send-capture-image');
    return listen('send-capture-image', (img) => {
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
  // NEW: overlay listens for 'fullscreen-mode' to skip Phase A
  onFullscreenMode: (cb) => {
    ipcRenderer.removeAllListeners('fullscreen-mode');
    return listen('fullscreen-mode', cb);
  },
  // startCapture now accepts captureType: 'region' | 'fullscreen'
  startCapture:    (type) => { console.log('[Preload] startCapture', type); ipcRenderer.send('start-capture', type); },
  rendererReady:   () => { console.log('[Preload] rendererReady'); ipcRenderer.send('renderer-ready'); },
  saveImage:       (dataUrl, filename) => ipcRenderer.invoke('save-image', dataUrl, filename),
  copyToClipboard: (dataUrl) => ipcRenderer.invoke('copy-to-clipboard', dataUrl),
  closeOverlay:    () => { console.log('[Preload] closeOverlay'); ipcRenderer.send('close-overlay'); },
  retakeCapture:   () => { console.log('[Preload] retakeCapture'); ipcRenderer.send('retake-capture'); },
  getSettings:     () => ipcRenderer.invoke('get-settings'),
  saveSettings:    (s) => ipcRenderer.invoke('save-settings', s),
};

try {
  contextBridge.exposeInMainWorld('electron', api);
  console.log('[Preload] window.electron exposed OK');
} catch (e) {
  console.error('[Preload] contextBridge FAILED:', e);
}
