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

  /**
   * Save: dismiss overlay instantly, then show native save dialog.
   * User sees clean desktop + file picker — no overlay in the way.
   */
  ipcMain.handle('save-image', async (_e, dataUrl: string, filename: string) => {
    // 1. Hide overlay immediately — launcher comes back
    deps.safeHideOverlay();

    // 2. Small delay so the overlay finishes animating off screen
    await new Promise((r) => setTimeout(r, 150));

    // 3. Show native save dialog (now nothing is in the way)
    const defaultPath = path.join(app.getPath('pictures'), filename);
    const result = await dialog.showSaveDialog({
      title: 'Save Screenshot',
      defaultPath,
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });

    if (result.canceled || !result.filePath) return { canceled: true };

    const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    await fs.writeFile(result.filePath, Buffer.from(b64, 'base64'));
    console.log('[IPC] Saved to:', result.filePath);
    return { canceled: false, filePath: result.filePath };
  });

  /**
   * Copy: dismiss overlay instantly, write image to clipboard.
   * Silent — no dialog needed.
   */
  ipcMain.handle('copy-to-clipboard', (_e, dataUrl: string) => {
    // Hide overlay immediately
    deps.safeHideOverlay();

    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
    console.log('[IPC] Copied to clipboard');
  });

  ipcMain.handle('get-settings', () => ({
    defaultTool:   store.get('defaultTool'),
    defaultColor:  store.get('defaultColor'),
    defaultWeight: store.get('defaultWeight'),
  }));

  ipcMain.handle('save-settings', (_e, s: AppSettings) => store.set(s));
}
