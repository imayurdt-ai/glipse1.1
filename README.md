# Glimpse UI — v1.1

Minimalist desktop screenshot app UI built with **React + Tailwind CSS**.

## Components

| Component | Description |
|---|---|
| `LauncherWindow` | Small 320×280px main app window with mode toggle and capture type selector |
| `CaptureOverlay` | Fullscreen dimmed overlay with drag-to-select region and dimension badge |
| `FloatingActionBar` | Pill-shaped annotation toolbar with contextual color/weight popover |

## Design System — Mono Premium

| Token | Value |
|---|---|
| App Background | `#111111` |
| Surface/Panels | `#1C1C1E` |
| Primary Text | `#F9FAFB` |
| Secondary Text | `#9CA3AF` |
| Borders | `#2A2A2D` |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to preview all three components.

## Stack

- React 18
- Tailwind CSS v3
- Vite
- Lucide React (icons)

> **Note:** This is the UI shell only. Electron IPC, Zustand state, and Konva canvas are wired in Stage 2.
