/**
 * @file ipcHandlers.ts
 * All IPC handlers for Glimpse.
 */

import { app, clipboard, dialog, ipcMain, nativeImage, BrowserWindow } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import Store from 'electron-store';
import type { AppSettings } from './preload.js';

interface Deps {
  getLauncherWindow: () => BrowserWindow | null;
  getOverlayWindow: () => BrowserWindow | null;
  triggerCapture: () => Promise<void>;
  safeHideOverlay: () => void;
}

const store = new Store<AppSettings>({
  name: 'glimpse-settings',
  defaults: { defaultTool: 'arrow', defaultColor: '#EF4444', defaultWeight: 4 },
});

export function registerIpcHandlers(deps: Deps): void {

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

  // X button — fully quit the app
  ipcMain.on('hide-launcher', () => {
    app.quit();
  });

  // Fresh capture from launcher button or shortcut
  ipcMain.on('start-capture', () => {
    void deps.triggerCapture();
  });

  // Retake from FloatingActionBar
  ipcMain.on('retake-capture', async () => {
    deps.safeHideOverlay();
    await new Promise((r) => setTimeout(r, 300));
    await deps.triggerCapture();
  });

  // ESC / close button inside overlay
  ipcMain.on('close-overlay', () => {
    deps.safeHideOverlay();
  });

  ipcMain.handle('get-settings', () => ({
    defaultTool: store.get('defaultTool'),
    defaultColor: store.get('defaultColor'),
    defaultWeight: store.get('defaultWeight'),
  }));

  ipcMain.handle('save-settings', (_e, settings: AppSettings) => {
    store.set(settings);
  });
}
