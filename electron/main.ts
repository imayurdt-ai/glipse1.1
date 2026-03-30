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

const isDev   = !app.isPackaged;
const DEV_URL = 'http://localhost:5173';

let launcherWindow: BrowserWindow | null = null;
let overlayWindow:  BrowserWindow | null = null;
let tray: Tray | null = null;
let overlayDismissTimer: ReturnType<typeof setTimeout> | null = null;

export let overlayRendererReady = false;
export function setOverlayRendererReady(v: boolean) {
  console.log(`[Main] overlayRendererReady → ${v}`);
  overlayRendererReady = v;
}

function windowUrl(name: 'launcher' | 'overlay'): string {
  const url = isDev
    ? `${DEV_URL}/?window=${name}`
    : `file://${path.join(__dirname, '../dist/index.html')}?window=${name}`;
  console.log(`[Main] windowUrl(${name}) = ${url}`);
  return url;
}

// Preload is compiled as CJS so it must use the .cjs extension
// to avoid Node treating it as ESM (because package.json has "type":"module")
const preloadPath = path.join(__dirname, 'preload.cjs');

export function safeHideOverlay(): void {
  console.log('[Main] safeHideOverlay called');
  if (overlayDismissTimer) { clearTimeout(overlayDismissTimer); overlayDismissTimer = null; }
  overlayRendererReady = false;
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
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  void win.loadURL(windowUrl('launcher'));
  win.webContents.on('did-finish-load', () => console.log('[Main] Launcher did-finish-load'));
  win.webContents.on('did-fail-load',   (_e, code, desc) => console.error(`[Main] Launcher FAILED: ${code} ${desc}`));
  win.webContents.on('console-message', (_e, _lvl, msg, line, src) => console.log(`[Launcher-Renderer] ${msg}  (${src}:${line})`));
  return win;
}

function createOverlayWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().bounds;
  console.log(`[Main] Creating overlay window ${width}x${height}, preload: ${preloadPath}`);
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
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  void win.loadURL(windowUrl('overlay'));
  win.webContents.on('did-finish-load',      () => console.log('[Main] Overlay did-finish-load'));
  win.webContents.on('did-fail-load',        (_e, code, desc) => console.error(`[Main] Overlay FAILED: ${code} ${desc}`));
  win.webContents.on('console-message',      (_e, _lvl, msg, line, src) => console.log(`[Overlay-Renderer] ${msg}  (${src}:${line})`));
  win.webContents.on('render-process-gone',  (_e, details) => { console.error('[Main] Overlay render-process-gone:', details); safeHideOverlay(); });
  return win;
}

export async function triggerCapture(): Promise<void> {
  console.log('[Main] triggerCapture called');
  if (!overlayWindow || !launcherWindow) { console.error('[Main] windows not ready'); return; }
  if (overlayDismissTimer) { clearTimeout(overlayDismissTimer); overlayDismissTimer = null; }
  try {
    await captureWithOverlay(overlayWindow, launcherWindow);
    overlayDismissTimer = setTimeout(() => safeHideOverlay(), 30_000);
  } catch (err) {
    console.error('[Main] Capture error:', err);
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
  console.log('[Main] bootstrap start, isDev =', isDev);
  console.log('[Main] preload path:', preloadPath);
  launcherWindow = createLauncherWindow();
  overlayWindow  = createOverlayWindow();
  tray           = createTray();
  registerIpcHandlers({
    getLauncherWindow:       () => launcherWindow,
    getOverlayWindow:        () => overlayWindow,
    triggerCapture,
    safeHideOverlay,
    setOverlayRendererReady,
  });
  const ok = globalShortcut.register('CommandOrControl+Shift+5', () => void triggerCapture());
  console.log('[Main] Shortcut Ctrl+Shift+5 registered:', ok);
}

app.whenReady().then(() => void bootstrap());
app.on('activate',          () => { if (BrowserWindow.getAllWindows().length === 0) void bootstrap(); else launcherWindow?.show(); });
app.on('will-quit',         () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
