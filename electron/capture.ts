/**
 * @file capture.ts
 * Screen capture helpers using Electron's desktopCapturer.
 * Grabs the primary display as a base64 PNG and feeds it to the overlay window.
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

  const source =
    sources.find((s) => s.display_id === String(display.id)) ?? sources[0];

  if (!source) throw new Error('[Glimpse] No screen capture source found.');

  const dataUrl = source.thumbnail.toDataURL();
  if (!dataUrl) throw new Error('[Glimpse] Screen thumbnail is empty.');

  return dataUrl;
}

export async function captureWithOverlay(
  overlayWindow: BrowserWindow,
  launcherWindow: BrowserWindow
): Promise<void> {
  launcherWindow.hide();
  await new Promise((r) => setTimeout(r, 180));

  const image = await captureFullScreen();

  overlayWindow.webContents.send('reset-overlay');
  overlayWindow.webContents.send('send-capture-image', image);
  overlayWindow.showInactive();
  overlayWindow.focus();
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
}
