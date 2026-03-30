/**
 * @file capture.ts
 * Screen capture using desktopCapturer.
 *
 * CRITICAL ORDER:
 *   1. Hide launcher
 *   2. Hide overlay (must be invisible when screenshot is taken)
 *   3. Wait for GPU to composite the desktop without our windows
 *   4. Take screenshot
 *   5. Send image to overlay renderer
 *   6. Show overlay
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
  // Step 1: hide both windows so they don’t appear in the screenshot
  launcherWindow.hide();
  overlayWindow.hide();

  // Step 2: wait for the OS compositor to re-render the desktop without our windows.
  // 300ms is enough on most systems; increase if screenshot still shows black.
  await new Promise((r) => setTimeout(r, 300));

  // Step 3: take the screenshot (no Glimpse windows on screen now)
  const image = await captureFullScreen();

  // Step 4: send image to overlay renderer and reset any stale state
  overlayWindow.webContents.send('reset-overlay');
  await new Promise((r) => setTimeout(r, 50));
  overlayWindow.webContents.send('send-capture-image', image);

  // Step 5: now show the overlay on top
  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  overlayWindow.show();
  overlayWindow.focus();
}
