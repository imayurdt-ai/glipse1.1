/**
 * @file capture.ts
 * Screen capture pipeline.
 *
 * Safe order:
 *   1. Hide both windows (so they don't appear in screenshot)
 *   2. Wait 350ms for OS compositor to clear them
 *   3. Take screenshot
 *   4. Show overlay window
 *   5. Poll until overlayRendererReady flag is set (renderer called renderer-ready)
 *   6. Send screenshot to renderer
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
): Promise<void> {
  // 1. Hide both windows
  launcherWindow.hide();
  overlayWindow.hide();

  // 2. Let OS compositor re-render the desktop without our windows
  await new Promise((r) => setTimeout(r, 350));

  // 3. Take the clean screenshot
  const image = await captureFullScreen();
  console.log('[Glimpse] Screenshot taken, length:', image.length);

  // 4. Show overlay — renderer will start mounting now
  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  overlayWindow.show();
  overlayWindow.focus();

  // 5. Poll for renderer-ready flag (set via IPC by Overlay.tsx useEffect)
  //    Timeout after 5s as safety net
  const deadline = Date.now() + 5000;
  while (!overlayRendererReady && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (!overlayRendererReady) {
    console.warn('[Glimpse] Renderer-ready timeout — sending anyway');
  } else {
    console.log('[Glimpse] Renderer ready, sending image');
  }

  // 6. Send screenshot
  overlayWindow.webContents.send('reset-overlay');
  await new Promise((r) => setTimeout(r, 30));
  overlayWindow.webContents.send('send-capture-image', image);
}
