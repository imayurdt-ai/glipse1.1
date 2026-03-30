/**
 * @file main.ts
 * Electron main process bootstrap for Glimpse.
 * Creates launcher + overlay windows, tray, global shortcut, and app lifecycle.
 */

import { app, BrowserWindow, globalShortcut, Menu, Tray, nativeImage } from 'electron';
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

const isDev = !app.isPackaged;
const DEV_URL = 'http://localhost:5173';

function windowUrl(name: 'launcher' | 'overlay'): string {
  if (isDev) return `${DEV_URL}/?window=${name}`;
  return `file://${path.join(__dirname, '../dist/index.html')}?window=${name}`;
}

function createLauncherWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 320,
    height: 300,
    center: true,
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
  const win = new BrowserWindow({
    fullscreen: true,
    transparent: true,
    frame: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  void win.loadURL(windowUrl('overlay'));
  return win;
}

function triggerCapture(): Promise<void> {
  if (!overlayWindow || !launcherWindow) return Promise.resolve();
  return captureWithOverlay(overlayWindow, launcherWindow);
}

function createTray(): Tray {
  const icon = nativeImage.createEmpty();
  const t = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: 'New Capture', click: () => void triggerCapture() },
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
  });
  globalShortcut.register('CommandOrControl+Shift+5', () => void triggerCapture());
}

app.whenReady().then(() => void bootstrap());

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void bootstrap();
  else launcherWindow?.show();
});

app.on('before-quit', () => { isQuitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', (e: Event) => e.preventDefault());
