/**
 * @file ipcHandlers.ts
 */

import { app, clipboard, dialog, ipcMain, nativeImage, BrowserWindow } from 'electron';
import fs   from 'node:fs/promises';
import path from 'node:path';
import Store from 'electron-store';
import type { AppSettings } from './preload.js';

interface Deps {
  getLauncherWindow:      () => BrowserWindow | null;
  getOverlayWindow:       () => BrowserWindow | null;
  triggerCapture:         () => Promise<void>;
  safeHideOverlay:        () => void;
  setOverlayRendererReady:(v: boolean) => void;
}

const store = new Store<AppSettings>({
  name: 'glimpse-settings',
  defaults: { defaultTool: 'arrow', defaultColor: '#EF4444', defaultWeight: 4 },
});

export function registerIpcHandlers(deps: Deps): void {

  // Overlay renderer signals it is mounted and ready to receive the image
  ipcMain.on('renderer-ready', () => {
    console.log('[Glimpse] renderer-ready received');
    deps.setOverlayRendererReady(true);
  });

  // Fresh capture — from launcher button or global shortcut
  ipcMain.on('start-capture', () => {
    console.log('[Glimpse] start-capture received');
    void deps.triggerCapture();
  });

  // Retake — from FloatingActionBar
  ipcMain.on('retake-capture', async () => {
    deps.safeHideOverlay(); // also resets overlayRendererReady
    await new Promise((r) => setTimeout(r, 300));
    void deps.triggerCapture();
  });

  // ESC / close overlay
  ipcMain.on('close-overlay', () => deps.safeHideOverlay());

  // Save image to disk
  ipcMain.handle('save-image', async (_e, dataUrl: string, filename: string) => {
    const defaultPath = path.join(app.getPath('pictures'), filename);
    const result = await dialog.showSaveDialog({
      title: 'Save Screenshot',
      defaultPath,
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    await fs.writeFile(result.filePath, Buffer.from(b64, 'base64'));
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle('copy-to-clipboard', (_e, dataUrl: string) => {
    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
  });

  ipcMain.handle('get-settings', () => ({
    defaultTool:   store.get('defaultTool'),
    defaultColor:  store.get('defaultColor'),
    defaultWeight: store.get('defaultWeight'),
  }));

  ipcMain.handle('save-settings', (_e, s: AppSettings) => store.set(s));
}
