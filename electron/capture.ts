/**
 * @file capture.ts
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
  launcherWindow.hide();
  overlayWindow.hide();
  await new Promise((r) => setTimeout(r, 350));

  const image = await captureFullScreen();

  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  overlayWindow.show();
  overlayWindow.focus();

  const deadline = Date.now() + 5000;
  while (!overlayRendererReady && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
  }

  if (captureType === 'fullscreen') {
    const { width, height } = screen.getPrimaryDisplay().bounds;
    overlayWindow.webContents.send('reset-overlay');
    await new Promise((r) => setTimeout(r, 30));
    overlayWindow.webContents.send('fullscreen-mode', { width, height });
    await new Promise((r) => setTimeout(r, 30));
    overlayWindow.webContents.send('send-capture-image', image);
  } else {
    overlayWindow.webContents.send('reset-overlay');
    await new Promise((r) => setTimeout(r, 30));
    overlayWindow.webContents.send('send-capture-image', image);
  }
}
