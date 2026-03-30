import { contextBridge, ipcRenderer } from 'electron';

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
  rendererReady:   () => void;   // overlay calls this once mounted
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
  onCaptureImage:  (cb) => { ipcRenderer.removeAllListeners('send-capture-image'); return listen('send-capture-image', cb); },
  onResetOverlay:  (cb) => { ipcRenderer.removeAllListeners('reset-overlay'); return listen('reset-overlay', cb); },
  startCapture:    () => ipcRenderer.send('start-capture'),
  rendererReady:   () => ipcRenderer.send('renderer-ready'),
  saveImage:       (d, f) => ipcRenderer.invoke('save-image', d, f),
  copyToClipboard: (d)    => ipcRenderer.invoke('copy-to-clipboard', d),
  closeOverlay:    ()     => ipcRenderer.send('close-overlay'),
  retakeCapture:   ()     => ipcRenderer.send('retake-capture'),
  getSettings:     ()     => ipcRenderer.invoke('get-settings'),
  saveSettings:    (s)    => ipcRenderer.invoke('save-settings', s),
};

contextBridge.exposeInMainWorld('electron', api);
declare global { interface Window { electron: ElectronApi; } }
