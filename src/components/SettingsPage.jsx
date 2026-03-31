/**
 * @file SettingsPage.jsx
 * Annotation Defaults section removed.
 * Sections: Capture, Save Defaults, Keyboard Shortcut, App.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft, Monitor, Palette,
  Keyboard, Save, RotateCcw, Globe,
} from 'lucide-react';

function eventToAccelerator(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl');
  if (e.altKey)               parts.push('Alt');
  if (e.shiftKey)             parts.push('Shift');
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (!['Control','Meta','Alt','Shift'].includes(key)) parts.push(key);
  return parts.join('+');
}

function formatAccelerator(acc) {
  return acc
    .replace('CommandOrControl', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
    .replace('Shift', '⇧')
    .replace('Alt', navigator.platform.includes('Mac') ? '⌥' : 'Alt')
    .replace(/\+/g, ' + ');
}

export default function SettingsPage({ onBack, onSettingsSaved }) {
  const [settings,      setSettings]      = useState(null);
  const [shortcutDraft, setShortcutDraft] = useState('');
  const [recording,     setRecording]     = useState(false);
  const [shortcutError, setShortcutError] = useState('');
  const [saveStatus,    setSaveStatus]    = useState('');
  const recordRef = useRef(null);

  useEffect(() => {
    window.electron?.getSettings?.().then((s) => {
      setSettings({
        defaultCaptureType: 'region',
        filenameFormat:     'glimpse-{date}-{time}',
        launchAtStartup:    false,
        showInTray:         true,
        shortcut:           'CommandOrControl+Shift+5',
        ...s,
      });
    });
  }, []);

  const save = async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await window.electron?.saveSettings?.(patch);
    setSaveStatus('Saved');
    setTimeout(() => setSaveStatus(''), 1200);
    onSettingsSaved?.(next);
  };

  const startRecording = () => {
    setRecording(true); setShortcutDraft(''); setShortcutError('');
    setTimeout(() => recordRef.current?.focus(), 50);
  };

  const handleRecordKey = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.key === 'Escape') { setRecording(false); setShortcutDraft(''); return; }
    const acc = eventToAccelerator(e);
    if (!acc.includes('+')) { setShortcutError('Must include a modifier (Ctrl / ⌘ / Alt / Shift)'); return; }
    setShortcutError('');
    setShortcutDraft(acc);
  };

  const confirmShortcut = async () => {
    if (!shortcutDraft) return;
    const ok = await window.electron?.registerShortcut?.(shortcutDraft);
    if (ok === false) { setShortcutError('Shortcut in use by another app. Try a different combo.'); return; }
    await save({ shortcut: shortcutDraft });
    setRecording(false); setShortcutDraft('');
  };

  const cancelShortcut = () => { setRecording(false); setShortcutDraft(''); setShortcutError(''); };

  const filenamePreview = (fmt) => {
    const now  = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    return fmt.replace('{date}', date).replace('{time}', time) + '.png';
  };

  if (!settings) return (
    <div className="w-full h-full bg-[#1C1C1E] flex items-center justify-center">
      <span className="text-[#9CA3AF] text-sm">Loading…</span>
    </div>
  );

  return (
    <div className="w-full h-full bg-[#1C1C1E] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2D] flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' }}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} title="Back"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#2A2A2D] transition-colors"
            style={{ WebkitAppRegion: 'no-drag' }}>
            <ArrowLeft size={15} />
          </button>
          <span className="text-[#F9FAFB] text-sm font-semibold tracking-tight">Settings</span>
        </div>
        {saveStatus && (
          <span className="text-[#22C55E] text-xs font-medium" style={{ WebkitAppRegion: 'no-drag' }}>✓ {saveStatus}</span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4"
        style={{ WebkitAppRegion: 'no-drag' }}>

        {/* Capture */}
        <Section icon={<Monitor size={13} />} title="Capture">
          <Label>Default mode</Label>
          <div className="flex gap-2">
            {['region','fullscreen'].map((v) => (
              <Chip key={v} active={settings.defaultCaptureType === v} onClick={() => save({ defaultCaptureType: v })}>
                {v === 'region' ? '▣ Region' : '⛶ Full Screen'}
              </Chip>
            ))}
          </div>
        </Section>

        {/* Save */}
        <Section icon={<Save size={13} />} title="Save Defaults">
          <Label>Filename format</Label>
          <input
            value={settings.filenameFormat}
            onChange={(e) => save({ filenameFormat: e.target.value })}
            className="w-full bg-[#1C1C1E] border border-[#2A2A2D] rounded-lg px-3 py-1.5 text-[#F9FAFB] text-xs font-mono outline-none focus:border-[#3B82F6]"
          />
          <p className="text-[#6B7280] text-[10px] mt-0.5">
            Preview: <span className="text-[#9CA3AF]">{filenamePreview(settings.filenameFormat)}</span>
          </p>
        </Section>

        {/* Shortcut */}
        <Section icon={<Keyboard size={13} />} title="Keyboard Shortcut">
          <Label>Capture shortcut</Label>
          {!recording ? (
            <div className="flex items-center gap-2">
              <kbd className="px-2.5 py-1 bg-[#111111] border border-[#3A3A3D] rounded-lg text-[#F9FAFB] text-xs font-mono tracking-wide">
                {formatAccelerator(settings.shortcut)}
              </kbd>
              <button onClick={startRecording} className="text-[#3B82F6] text-xs hover:underline">Edit</button>
              {settings.shortcut !== 'CommandOrControl+Shift+5' && (
                <button
                  onClick={() => { save({ shortcut: 'CommandOrControl+Shift+5' }); window.electron?.registerShortcut?.('CommandOrControl+Shift+5'); }}
                  className="text-[#6B7280] text-xs hover:text-[#9CA3AF] flex items-center gap-1">
                  <RotateCcw size={10} /> Reset
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div ref={recordRef} tabIndex={0} onKeyDown={handleRecordKey}
                className="w-full bg-[#111111] border-2 border-[#3B82F6] rounded-lg px-3 py-2 text-xs font-mono outline-none cursor-pointer"
                style={{ color: shortcutDraft ? '#F9FAFB' : '#6B7280' }}>
                {shortcutDraft ? formatAccelerator(shortcutDraft) : 'Press your shortcut combination…'}
              </div>
              {shortcutError && <p className="text-[#EF4444] text-[10px]">{shortcutError}</p>}
              <div className="flex gap-2">
                <button onClick={confirmShortcut} disabled={!shortcutDraft}
                  className="flex-1 bg-[#3B82F6] disabled:opacity-40 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-[#2563EB]">
                  Save shortcut
                </button>
                <button onClick={cancelShortcut}
                  className="flex-1 bg-[#2A2A2D] text-[#9CA3AF] text-xs font-semibold py-1.5 rounded-lg hover:bg-[#3A3A3D]">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* App */}
        <Section icon={<Globe size={13} />} title="App">
          <Toggle label="Show in system tray" checked={settings.showInTray}      onChange={(v) => save({ showInTray: v })} />
          <Toggle label="Launch at startup"   checked={settings.launchAtStartup} onChange={(v) => save({ launchAtStartup: v })} />
        </Section>

      </div>
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[#6B7280]">{icon}</span>
        <span className="text-[#9CA3AF] text-[10px] font-semibold uppercase tracking-widest">{title}</span>
      </div>
      <div className="bg-[#111111] border border-[#2A2A2D] rounded-xl px-3 py-2.5 flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

function Label({ children, className = '' }) {
  return <p className={`text-[#6B7280] text-[10px] font-medium uppercase tracking-wider ${className}`}>{children}</p>;
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
        active
          ? 'bg-[#3B82F6]/15 border-[#3B82F6] text-[#3B82F6]'
          : 'bg-transparent border-[#2A2A2D] text-[#9CA3AF] hover:border-[#3A3A3D] hover:text-[#F9FAFB]'
      }`}>
      {children}
    </button>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[#F9FAFB] text-xs">{label}</span>
      <button onClick={() => onChange(!checked)}
        className={`relative w-8 h-4 rounded-full transition-colors ${checked ? 'bg-[#3B82F6]' : 'bg-[#3A3A3D]'}`}>
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
