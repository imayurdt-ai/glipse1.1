/**
 * @file capture.ts
 * Screen capture with renderer-ready handshake.
 *
 * Flow:
 *   1. Hide both windows
 *   2. Wait for OS compositor to clear them (300ms)
 *   3. Take screenshot
 *   4. Show overlay
 *   5. Wait for overlay renderer to signal 'renderer-ready'
 *   6. Send screenshot image
 */

import { BrowserWindow, desktopCapturer, ipcMain, screen } from 'electron';

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
  launcherWindow: BrowserWindow
): Promise<void> {
  // 1. Hide both windows so they don't appear in the screenshot
  launcherWindow.hide();
  overlayWindow.hide();

  // 2. Let the OS re-composite the desktop without our windows
  await new Promise((r) => setTimeout(r, 300));

  // 3. Take the clean screenshot
  const image = await captureFullScreen();

  // 4. Show overlay window — it starts rendering now
  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  overlayWindow.show();
  overlayWindow.focus();

  // 5. Wait for the renderer to signal it has mounted + registered IPC listeners.
  //    Timeout after 3s as safety fallback.
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 3000);
    ipcMain.once('renderer-ready', () => {
      clearTimeout(timer);
      resolve();
    });
  });

  // 6. Now it's safe to send — listener is guaranteed to be registered
  overlayWindow.webContents.send('reset-overlay');
  await new Promise((r) => setTimeout(r, 30));
  overlayWindow.webContents.send('send-capture-image', image);
}
