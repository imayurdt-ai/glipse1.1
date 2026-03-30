/**
 * @file capture.ts
 * Screen capture using desktopCapturer.
 * Uses explicit size (not fullscreen flag) to avoid Windows black-screen bug.
 */

import { BrowserWindow, desktopCapturer, screen } from 'electron';

export async function captureFullScreen(): Promise<string> {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.size;

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
    fetchWindowIcons: false,
  });

  if (!sources.length) throw new Error('[Glimpse] No screen capture source found.');

  // Prefer exact display match, fall back to first source
  const source = sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
  const dataUrl = source.thumbnail.toDataURL();
  if (!dataUrl || dataUrl.length < 100) throw new Error('[Glimpse] Screen thumbnail empty.');

  return dataUrl;
}

export async function captureWithOverlay(
  overlayWindow: BrowserWindow,
  launcherWindow: BrowserWindow
): Promise<void> {
  launcherWindow.hide();

  // Wait for launcher to fully disappear from screen before capturing
  await new Promise((r) => setTimeout(r, 220));

  const image = await captureFullScreen();

  // Reset any stale state first
  overlayWindow.webContents.send('reset-overlay');
  // Small gap so reset processes before new image arrives
  await new Promise((r) => setTimeout(r, 50));

  overlayWindow.webContents.send('send-capture-image', image);

  // Show without taking focus from other apps until user interacts
  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  overlayWindow.showInactive();
  overlayWindow.focus();
}
