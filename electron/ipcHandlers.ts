/**
 * @file ipcHandlers.ts
 */

import { app, clipboard, dialog, globalShortcut, ipcMain, nativeImage, BrowserWindow } from 'electron';
import fs   from 'node:fs/promises';
import path from 'node:path';
import Store from 'electron-store';
import type { AppSettings } from './types.js';

interface Deps {
  getLauncherWindow:       () => BrowserWindow | null;
  getOverlayWindow:        () => BrowserWindow | null;
  triggerCapture:          (type?: string) => Promise<void>;
  safeHideOverlay:         () => void;
  setOverlayRendererReady: (v: boolean) => void;
}

const store = new Store<AppSettings>({
  name: 'glimpse-settings',
  defaults: {
    defaultTool:        'arrow',
    defaultColor:       '#EF4444',
    defaultWeight:      4,
    defaultCaptureType: 'region',
    filenameFormat:     'glimpse-{date}-{time}',
    launchAtStartup:    false,
    showInTray:         true,
    shortcut:           'CommandOrControl+Shift+5',
  },
});

export function registerIpcHandlers(deps: Deps): void {

  ipcMain.on('renderer-ready', () => {
    deps.setOverlayRendererReady(true);
  });

  ipcMain.on('start-capture', (_e, captureType: string = 'region') => {
    void deps.triggerCapture(captureType);
  });

  ipcMain.on('retake-capture', async () => {
    deps.safeHideOverlay();
    await new Promise((r) => setTimeout(r, 300));
    void deps.triggerCapture('region');
  });

  ipcMain.on('close-overlay', () => deps.safeHideOverlay());

  ipcMain.handle('save-image', async (_e, dataUrl: string, filename: string) => {
    deps.safeHideOverlay();
    await new Promise((r) => setTimeout(r, 150));
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
    deps.safeHideOverlay();
    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
  });

  // Returns the full settings object
  ipcMain.handle('get-settings', () => store.store);

  // Patch-merges incoming keys into the existing store
  // SettingsPage sends only the changed key e.g. { defaultTool: 'pen' }
  // We must merge, not replace the whole store
  ipcMain.handle('save-settings', (_e, patch: Partial<AppSettings>) => {
    const current = store.store;
    const merged  = { ...current, ...patch };
    // Write each key individually so electron-store handles it correctly
    (Object.keys(merged) as (keyof AppSettings)[]).forEach((key) => {
      store.set(key, merged[key]);
    });
  });

  // Re-register global shortcut from settings page
  ipcMain.handle('register-shortcut', (_e, accelerator: string) => {
    try {
      globalShortcut.unregisterAll();
      const ok = globalShortcut.register(accelerator, () => {
        void deps.triggerCapture(store.get('defaultCaptureType') as string ?? 'region');
      });
      if (!ok) {
        const old = store.get('shortcut') as string ?? 'CommandOrControl+Shift+5';
        globalShortcut.register(old, () => void deps.triggerCapture('region'));
        return false;
      }
      return true;
    } catch {
      return false;
    }
  });
}
