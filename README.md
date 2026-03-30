# Glimpse — v1.1

Minimalist desktop screenshot + annotation app built with **Electron + React + Tailwind CSS + Zustand + Konva**.

## Architecture

```
glipse1.1/
├── electron/
│   ├── main.ts          ← App bootstrap, 2 windows, tray, shortcut
│   ├── capture.ts       ← desktopCapturer pipeline
│   ├── preload.ts       ← Typed contextBridge API
│   ├── ipcHandlers.ts   ← All IPC: save, copy, settings, retake
│   └── tsconfig.json
├── src/
│   ├── App.jsx                        ← Window router (?window=overlay|launcher)
│   ├── store/useAppStore.ts           ← Zustand global store
│   ├── hooks/
│   │   ├── useCapture.ts              ← Mouse drag → selection rect
│   │   └── useAnnotation.ts           ← Konva drawing engine
│   ├── windows/overlay/Overlay.tsx    ← Phase A + Phase B overlay
│   └── components/
│       ├── LauncherWindow.jsx
│       ├── FloatingActionBar.jsx      ← Wired to Zustand + IPC
│       └── CaptureOverlay.jsx
└── assets/tray-icon.png               ← Add a 16x16 PNG manually
```

## Getting Started

```bash
# Install all dependencies
npm install

# Run in browser only (UI preview)
npm run dev

# Run as full Electron app
npm run dev:electron
```

## Global Shortcut

`Ctrl+Shift+5` (Windows/Linux) or `Cmd+Shift+5` (macOS) triggers a new capture from anywhere.

## Design System — Mono Premium

| Token | Value |
|---|---|
| App Background | `#111111` |
| Surface | `#1C1C1E` |
| Primary Text | `#F9FAFB` |
| Secondary Text | `#9CA3AF` |
| Borders | `#2A2A2D` |

## Stack

- Electron 30
- React 18 + TypeScript
- Tailwind CSS v3
- Zustand v4 (with localStorage persist)
- React-Konva + Konva (annotation canvas)
- Vite 5
- electron-store (settings persistence)
