/**
 * @file main.ts
 * Glimpse — Electron main process.
 */

import {
  app, BrowserWindow, globalShortcut,
  Menu, Tray, nativeImage, screen,
} from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureWithOverlay } from './capture.js';
import { registerIpcHandlers } from './ipcHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const isDev  = !app.isPackaged;
const DEV_URL = 'http://localhost:5173';

let launcherWindow: BrowserWindow | null = null;
let overlayWindow:  BrowserWindow | null = null;
let tray: Tray | null = null;
let overlayDismissTimer: ReturnType<typeof setTimeout> | null = null;

// Tracks whether the overlay renderer has mounted & registered its IPC listeners.
// Set to true by 'renderer-ready', reset to false whenever we hide the overlay.
export let overlayRendererReady = false;
export function setOverlayRendererReady(v: boolean) { overlayRendererReady = v; }

function windowUrl(name: 'launcher' | 'overlay'): string {
  if (isDev) return `${DEV_URL}/?window=${name}`;
  return `file://${path.join(__dirname, '../dist/index.html')}?window=${name}`;
}

export function safeHideOverlay(): void {
  if (overlayDismissTimer) { clearTimeout(overlayDismissTimer); overlayDismissTimer = null; }
  overlayRendererReady = false; // reset — renderer will re-signal on next show
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
    overlayWindow.setAlwaysOnTop(false);
    if (!overlayWindow.webContents.isDestroyed())
      overlayWindow.webContents.send('reset-overlay');
  }
  if (launcherWindow && !launcherWindow.isDestroyed()) launcherWindow.show();
}

function createLauncherWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const W = 320, H = 360;
  const win = new BrowserWindow({
    width: W, height: H,
    x: Math.round(width  / 2 - W / 2),
    y: Math.round(height / 2 - H / 2),
    resizable: false, maximizable: false,
    frame: false, show: true,
    backgroundColor: '#1C1C1E',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  void win.loadURL(windowUrl('launcher'));
  return win;
}

function createOverlayWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().bounds;
  const win = new BrowserWindow({
    width, height, x: 0, y: 0,
    transparent: true, frame: false,
    show: false, alwaysOnTop: true,
    skipTaskbar: true, focusable: true,
    resizable: false, movable: false,
    minimizable: false, maximizable: false,
    fullscreenable: false, hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  void win.loadURL(windowUrl('overlay'));
  win.webContents.on('render-process-gone', () => safeHideOverlay());
  win.webContents.on('unresponsive',         () => safeHideOverlay());
  return win;
}

export async function triggerCapture(): Promise<void> {
  if (!overlayWindow || !launcherWindow) return;
  if (overlayDismissTimer) { clearTimeout(overlayDismissTimer); overlayDismissTimer = null; }
  try {
    await captureWithOverlay(overlayWindow, launcherWindow);
    overlayDismissTimer = setTimeout(() => safeHideOverlay(), 30_000);
  } catch (err) {
    console.error('[Glimpse] Capture error:', err);
    safeHideOverlay();
  }
}

function createTray(): Tray {
  const icon = nativeImage.createEmpty();
  const t    = new Tray(icon);
  t.setToolTip('Glimpse');
  t.setContextMenu(Menu.buildFromTemplate([
    { label: 'New Capture', click: () => void triggerCapture() },
    { label: 'Show',        click: () => launcherWindow?.show() },
    { type: 'separator' },
    { label: 'Quit',        click: () => app.quit() },
  ]));
  t.on('click', () => launcherWindow?.show());
  return t;
}

async function bootstrap(): Promise<void> {
  launcherWindow = createLauncherWindow();
  overlayWindow  = createOverlayWindow();
  tray           = createTray();

  registerIpcHandlers({
    getLauncherWindow:      () => launcherWindow,
    getOverlayWindow:       () => overlayWindow,
    triggerCapture,
    safeHideOverlay,
    setOverlayRendererReady,
  });

  const ok = globalShortcut.register('CommandOrControl+Shift+5', () => void triggerCapture());
  if (!ok) console.warn('[Glimpse] Could not register shortcut.');
}

app.whenReady().then(() => void bootstrap());
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void bootstrap();
  else launcherWindow?.show();
});
app.on('will-quit',        () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
