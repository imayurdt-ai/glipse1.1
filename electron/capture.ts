/**
 * @file capture.ts
 * Two capture modes:
 *   region     — show overlay in Phase A (crosshair selection)
 *   fullscreen — use full display bounds, skip Phase A, go straight to FAB
 */

import { BrowserWindow, desktopCapturer, screen } from 'electron';
import { overlayRendererReady } from './main.js';

export async function captureFullScreen(): Promise<string> {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.size;
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
    fetchWindowIcons: false,
  });
  if (!sources.length) throw new Error('[Glimpse] No screen source found.');
  const source = sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
  const dataUrl = source.thumbnail.toDataURL();
  if (!dataUrl || dataUrl.length < 100) throw new Error('[Glimpse] Empty thumbnail.');
  return dataUrl;
}

export async function captureWithOverlay(
  overlayWindow: BrowserWindow,
  launcherWindow: BrowserWindow,
  captureType: 'region' | 'fullscreen' = 'region',
): Promise<void> {
  // 1. Hide both windows
  launcherWindow.hide();
  overlayWindow.hide();

  // 2. Wait for OS compositor
  await new Promise((r) => setTimeout(r, 350));

  // 3. Take screenshot
  const image = await captureFullScreen();
  console.log('[Glimpse] Screenshot taken, length:', image.length, '| mode:', captureType);

  // 4. Show overlay
  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  overlayWindow.show();
  overlayWindow.focus();

  // 5. Wait for renderer-ready
  const deadline = Date.now() + 5000;
  while (!overlayRendererReady && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (!overlayRendererReady) console.warn('[Glimpse] renderer-ready timeout — sending anyway');
  else console.log('[Glimpse] Renderer ready, sending image');

  // 6. For fullscreen: signal overlay to skip selection and use full display bounds
  if (captureType === 'fullscreen') {
    const { width, height } = screen.getPrimaryDisplay().bounds;
    overlayWindow.webContents.send('reset-overlay');
    await new Promise((r) => setTimeout(r, 30));
    // Send fullscreen-mode BEFORE the image so overlay sets up the rect first
    overlayWindow.webContents.send('fullscreen-mode', { width, height });
    await new Promise((r) => setTimeout(r, 30));
    overlayWindow.webContents.send('send-capture-image', image);
  } else {
    // Region mode: normal flow, user selects area
    overlayWindow.webContents.send('reset-overlay');
    await new Promise((r) => setTimeout(r, 30));
    overlayWindow.webContents.send('send-capture-image', image);
  }
}
