/**
 * App.jsx — Renderer entry point for Glimpse.
 * Detects window type from URL query param and renders the correct root component.
 * ?window=launcher → LauncherWindow
 * ?window=overlay  → Overlay
 */

import React from 'react';
import LauncherWindow from './components/LauncherWindow';
import Overlay from './windows/overlay/Overlay';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const windowType = params.get('window');

  if (windowType === 'overlay') {
    return <Overlay />;
  }

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center p-8">
      <LauncherWindow />
    </div>
  );
}
