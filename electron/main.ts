/**
 * @file main.ts
 * Electron main process bootstrap for Glimpse.
 */

import { app, BrowserWindow, globalShortcut, Menu, Tray, nativeImage, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureWithOverlay } from './capture.js';
import { registerIpcHandlers } from './ipcHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let launcherWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let overlayDismissTimer: ReturnType<typeof setTimeout> | null = null;

const isDev = !app.isPackaged;
const DEV_URL = 'http://localhost:5173';

function windowUrl(name: 'launcher' | 'overlay'): string {
  if (isDev) return `${DEV_URL}/?window=${name}`;
  return `file://${path.join(__dirname, '../dist/index.html')}?window=${name}`;
}

export function safeHideOverlay(): void {
  if (overlayDismissTimer) { clearTimeout(overlayDismissTimer); overlayDismissTimer = null; }
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
    overlayWindow.setAlwaysOnTop(false);
    if (!overlayWindow.webContents.isDestroyed()) overlayWindow.webContents.send('reset-overlay');
  }
  if (launcherWindow && !launcherWindow.isDestroyed()) launcherWindow.show();
}

function createLauncherWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const WIN_W = 320;
  const WIN_H = 360;
  const win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    x: Math.round(width / 2 - WIN_W / 2),
    y: Math.round(height / 2 - WIN_H / 2),
    resizable: false,
    maximizable: false,
    frame: false,
    show: true,
    backgroundColor: '#1C1C1E',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  void win.loadURL(windowUrl('launcher'));
  // No close interception — allow normal OS close / app.quit() to work
  return win;
}

function createOverlayWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().bounds;
  const win = new BrowserWindow({
    width, height, x: 0, y: 0,
    transparent: true,
    frame: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
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
  win.webContents.on('unresponsive', () => safeHideOverlay());
  return win;
}

async function triggerCapture(): Promise<void> {
  if (!overlayWindow || !launcherWindow) return;
  if (overlayWindow.isVisible()) { safeHideOverlay(); await new Promise((r) => setTimeout(r, 200)); }
  try {
    await captureWithOverlay(overlayWindow, launcherWindow);
    overlayDismissTimer = setTimeout(() => safeHideOverlay(), 30_000);
  } catch (err) {
    console.error('[Glimpse] Capture failed:', err);
    safeHideOverlay();
  }
}

function createTray(): Tray {
  const icon = nativeImage.createEmpty();
  const t = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: 'New Capture', click: () => void triggerCapture() },
    { label: 'Show', click: () => launcherWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ]);
  t.setToolTip('Glimpse');
  t.setContextMenu(menu);
  t.on('click', () => launcherWindow?.show());
  return t;
}

async function bootstrap(): Promise<void> {
  launcherWindow = createLauncherWindow();
  overlayWindow = createOverlayWindow();
  tray = createTray();
  registerIpcHandlers({ getLauncherWindow: () => launcherWindow, getOverlayWindow: () => overlayWindow, triggerCapture, safeHideOverlay });
  const ok = globalShortcut.register('CommandOrControl+Shift+5', () => void triggerCapture());
  if (!ok) console.warn('[Glimpse] Shortcut CmdOrCtrl+Shift+5 could not be registered.');
}

app.whenReady().then(() => void bootstrap());
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void bootstrap();
  else launcherWindow?.show();
});
app.on('before-quit', () => { isQuitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());
// Now that X quits properly, we can allow window-all-closed to quit on non-mac
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
