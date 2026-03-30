/**
 * App.jsx — Renderer entry point for Glimpse.
 * Routes to LauncherWindow or Overlay based on ?window= query param.
 * No scrollable wrapper — each window renders at exact native size.
 */

import React from 'react';
import LauncherWindow from './components/LauncherWindow';
import Overlay from './windows/overlay/Overlay';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const windowType = params.get('window');

  // Overlay: fullscreen, no padding, no background wrapper
  if (windowType === 'overlay') {
    return <Overlay />;
  }

  // Launcher: fixed 320x300, no scroll, exact fit
  return <LauncherWindow />;
}
