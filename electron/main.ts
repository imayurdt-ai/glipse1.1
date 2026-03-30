/**
 * @file main.ts
 * Electron main process bootstrap for Glimpse.
 * SAFETY: Overlay has a hard 30s auto-dismiss timeout and ESC always works.
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

// ── Safety: force-hide overlay ────────────────────────────────────────────────
// Called any time we need to guarantee the overlay is gone.
export function safeHideOverlay(): void {
  if (overlayDismissTimer) {
    clearTimeout(overlayDismissTimer);
    overlayDismissTimer = null;
  }
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
    overlayWindow.setAlwaysOnTop(false);
    // Reset renderer state
    if (!overlayWindow.webContents.isDestroyed()) {
      overlayWindow.webContents.send('reset-overlay');
    }
  }
  if (launcherWindow && !launcherWindow.isDestroyed()) {
    launcherWindow.show();
  }
}

function createLauncherWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width: 320,
    height: 300,
    x: Math.round(width / 2 - 160),
    y: Math.round(height / 2 - 150),
    resizable: false,
    maximizable: false,
    frame: false,
    show: true,
    backgroundColor: '#111111',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  void win.loadURL(windowUrl('launcher'));
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
  return win;
}

function createOverlayWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().bounds;
  const win = new BrowserWindow({
    // Use explicit size instead of fullscreen:true to avoid
    // Windows fullscreen black-screen bug
    width,
    height,
    x: 0,
    y: 0,
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

  // SAFETY: If renderer crashes, immediately hide the overlay
  win.webContents.on('render-process-gone', () => {
    safeHideOverlay();
  });

  win.webContents.on('unresponsive', () => {
    safeHideOverlay();
  });

  return win;
}

async function triggerCapture(): Promise<void> {
  if (!overlayWindow || !launcherWindow) return;
  if (overlayWindow.isVisible()) {
    // Already open — safe-hide and restart
    safeHideOverlay();
    await new Promise((r) => setTimeout(r, 200));
  }

  try {
    await captureWithOverlay(overlayWindow, launcherWindow);

    // SAFETY: Hard 30-second auto-dismiss timeout.
    // If the user does nothing (app frozen), overlay vanishes automatically.
    overlayDismissTimer = setTimeout(() => {
      safeHideOverlay();
    }, 30_000);
  } catch (err) {
    console.error('[Glimpse] Capture failed:', err);
    safeHideOverlay();
  }
}

function createTray(): Tray {
  const icon = nativeImage.createEmpty();
  const t = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: 'New Capture', accelerator: 'CmdOrCtrl+Shift+5', click: () => void triggerCapture() },
    { label: 'Settings', click: () => launcherWindow?.show() },
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

  registerIpcHandlers({
    getLauncherWindow: () => launcherWindow,
    getOverlayWindow: () => overlayWindow,
    triggerCapture,
    safeHideOverlay,
  });

  // Register shortcut — wrap in try/catch so a conflict doesn't crash app
  const registered = globalShortcut.register('CommandOrControl+Shift+5', () => {
    void triggerCapture();
  });
  if (!registered) {
    console.warn('[Glimpse] Global shortcut CmdOrCtrl+Shift+5 could not be registered.');
  }
}

app.whenReady().then(() => void bootstrap());

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void bootstrap();
  else launcherWindow?.show();
});

app.on('before-quit', () => { isQuitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());
// Prevent accidental full quit when all windows are hidden (lives in tray)
app.on('window-all-closed', (e: Event) => e.preventDefault());
