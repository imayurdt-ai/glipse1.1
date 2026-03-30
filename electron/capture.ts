/**
 * @file capture.ts
 * Screen capture using desktopCapturer.
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

  // Wait for launcher to fully disappear before screenshotting
  await new Promise((r) => setTimeout(r, 250));

  const image = await captureFullScreen();

  // Reset stale state in overlay renderer
  overlayWindow.webContents.send('reset-overlay');
  await new Promise((r) => setTimeout(r, 60));

  // Send the screenshot
  overlayWindow.webContents.send('send-capture-image', image);

  // Use show() not showInactive() — showInactive on transparent windows
  // does not reliably bring the window to front on Windows
  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  overlayWindow.show();
  overlayWindow.focus();
}
