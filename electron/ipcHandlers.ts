/**
 * @file ipcHandlers.ts
 */

import { app, clipboard, dialog, ipcMain, nativeImage, BrowserWindow } from 'electron';
import fs   from 'node:fs/promises';
import path from 'node:path';
import Store from 'electron-store';
import type { AppSettings } from './types.js';

interface Deps {
  getLauncherWindow:       () => BrowserWindow | null;
  getOverlayWindow:        () => BrowserWindow | null;
  triggerCapture:          () => Promise<void>;
  safeHideOverlay:         () => void;
  setOverlayRendererReady: (v: boolean) => void;
}

const store = new Store<AppSettings>({
  name: 'glimpse-settings',
  defaults: { defaultTool: 'arrow', defaultColor: '#EF4444', defaultWeight: 4 },
});

export function registerIpcHandlers(deps: Deps): void {

  ipcMain.on('renderer-ready', () => {
    console.log('[IPC] renderer-ready received');
    deps.setOverlayRendererReady(true);
  });

  ipcMain.on('start-capture', () => {
    console.log('[IPC] start-capture received');
    void deps.triggerCapture();
  });

  ipcMain.on('retake-capture', async () => {
    console.log('[IPC] retake-capture received');
    deps.safeHideOverlay();
    await new Promise((r) => setTimeout(r, 300));
    void deps.triggerCapture();
  });

  ipcMain.on('close-overlay', () => {
    console.log('[IPC] close-overlay received');
    deps.safeHideOverlay();
  });

  // Save: temporarily lower overlay so native dialog appears on top
  ipcMain.handle('save-image', async (_e, dataUrl: string, filename: string) => {
    const overlay = deps.getOverlayWindow();

    // Step down overlay so the OS file dialog can appear above it
    if (overlay && !overlay.isDestroyed()) {
      overlay.setAlwaysOnTop(false);
      overlay.setVisibleOnAllWorkspaces(false);
    }

    const defaultPath = path.join(app.getPath('pictures'), filename);
    let result: Electron.SaveDialogReturnValue;
    try {
      result = await dialog.showSaveDialog({
        title: 'Save Screenshot',
        defaultPath,
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
      });
    } finally {
      // Always restore overlay on top, even if dialog threw
      if (overlay && !overlay.isDestroyed()) {
        overlay.setAlwaysOnTop(true, 'screen-saver', 1);
        overlay.focus();
      }
    }

    if (result!.canceled || !result!.filePath) return { canceled: true };

    const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    await fs.writeFile(result!.filePath, Buffer.from(b64, 'base64'));
    console.log('[IPC] Image saved to:', result!.filePath);
    return { canceled: false, filePath: result!.filePath };
  });

  ipcMain.handle('copy-to-clipboard', (_e, dataUrl: string) => {
    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
    console.log('[IPC] Image copied to clipboard');
  });

  ipcMain.handle('get-settings', () => ({
    defaultTool:   store.get('defaultTool'),
    defaultColor:  store.get('defaultColor'),
    defaultWeight: store.get('defaultWeight'),
  }));

  ipcMain.handle('save-settings', (_e, s: AppSettings) => store.set(s));
}
