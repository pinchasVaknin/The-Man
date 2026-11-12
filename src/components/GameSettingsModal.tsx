// ============================================================================
// MODULE: Components / Game Settings & Keybind Configuration Modal
// DESIGN: Studio-Grade Keybinding & Default Configuration Editor with Disk Save
// SUMMARY: Allows players to customize every keyboard shortcut and default game
//          setting and save them directly to src/config/savedGameSettings.ts.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import React, { useState, useEffect, useCallback } from 'react';
import {
  DEFAULT_GAME_KEYBINDINGS,
  formatKeyCodeLabel,
  saveGameSettingsToFile,
  type FirefliesMode,
  type IGameKeybindings,
  type IGameSettingsConfig,
} from '../config/savedGameSettings';
import type { CameraPerspectiveMode } from '../world/domain/worldTypes';
import type { GraphicsQuality } from '../world/domain/graphicsQuality';
import { t } from '../locales';
import { useAppServices } from '../app/AppServicesContext';

// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants & Types
export interface IGameSettingsModalProps {
  readonly isOpen: boolean;
  readonly settings: IGameSettingsConfig;
  readonly onApplySettings: (next: IGameSettingsConfig) => void;
  readonly onResetWorld?: (mode: 'survival' | 'creative' | 'both') => { ok: boolean; message: string } | undefined;
  readonly onClose: () => void;
}

type KeybindCategory = 'movement' | 'combat' | 'interface';

interface IKeybindRowMeta {
  readonly key: keyof IGameKeybindings;
  readonly category: KeybindCategory;
}

const KEYBIND_CATEGORIES: readonly KeybindCategory[] = ['movement', 'combat', 'interface'];

const KEYBIND_ROWS: readonly IKeybindRowMeta[] = [
  { key: 'moveForward', category: 'movement' },
  { key: 'moveBackward', category: 'movement' },
  { key: 'moveLeft', category: 'movement' },
  { key: 'moveRight', category: 'movement' },
  { key: 'sprint', category: 'movement' },
  { key: 'relaxedWalk', category: 'movement' },
  { key: 'jump', category: 'movement' },
  { key: 'dash', category: 'movement' },
  { key: 'interactDoor', category: 'combat' },
  { key: 'mountHorse', category: 'combat' },
  { key: 'drawOrSlash', category: 'combat' },
  { key: 'cycleArrowElement', category: 'combat' },
  { key: 'hotbarSlot1', category: 'combat' },
  { key: 'hotbarSlot2', category: 'combat' },
  { key: 'hotbarSlot3', category: 'combat' },
  { key: 'hotbarSlot4', category: 'combat' },
  { key: 'cameraPerspective', category: 'interface' },
  { key: 'inventoryModal', category: 'interface' },
  { key: 'favoritesModal', category: 'interface' },
  { key: 'marketModal', category: 'interface' },
  { key: 'cycleWeather', category: 'interface' },
  { key: 'toggleMute', category: 'interface' },
  { key: 'pauseGame', category: 'interface' },
  { key: 'toggleFavorite', category: 'interface' },
];

// #endregion

// ======================== SETTINGS MODAL COMPONENT ======================== \\
// #region Game Settings Modal
export const GameSettingsModal: React.FC<IGameSettingsModalProps> = ({
  isOpen,
  settings,
  onApplySettings,
  onResetWorld,
  onClose,
}) => {
  const { logger } = useAppServices();
  const [draft, setDraft] = useState<IGameSettingsConfig>(settings);
  const [listeningKey, setListeningKey] = useState<keyof IGameKeybindings | null>(null);
  const [activeTab, setActiveTab] = useState<'keybindings' | 'gameplay'>('keybindings');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'saved_local'>('idle');
  const [resetWorldNotice, setResetWorldNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      setListeningKey(null);
      setSaveStatus('idle');
      setResetWorldNotice(null);
    }
  }, [isOpen, settings]);

  // Capture next key press when rebinding a key
  useEffect(() => {
    if (!isOpen || !listeningKey) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListeningKey(null);
        return;
      }
      setDraft((prev) => ({
        ...prev,
        keybindings: {
          ...prev.keybindings,
          [listeningKey]: e.code,
        },
      }));
      setListeningKey(null);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, listeningKey]);

  const handleSaveToFile = useCallback(async () => {
    setSaveStatus('saving');
    onApplySettings(draft);
    const { savedToFile } = await saveGameSettingsToFile(draft, logger);
    setSaveStatus(savedToFile ? 'saved' : 'saved_local');
    window.setTimeout(() => setSaveStatus('idle'), 2200);
  }, [draft, onApplySettings]);

  const handleResetToFactory = useCallback(() => {
    const factory: IGameSettingsConfig = {
      keybindings: { ...DEFAULT_GAME_KEYBINDINGS },
      defaultCameraPerspective: 'third_person',
      mouseSensitivity: 1.0,
      walkSpeedMultiplier: 1.0,
      jumpForceMultiplier: 1.0,
      firefliesMode: 'sanctuary_only',
      defaultMuted: false,
      graphicsQuality: 'high',
      godMode: true,
    };
    setDraft(factory);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="game-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-auto select-none"
      style={{ backgroundColor: 'rgba(8, 7, 6, 0.82)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !listeningKey) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] rounded-2xl flex flex-col overflow-hidden text-stone-100"
        style={{
          backgroundColor: '#141210',
          border: '1px solid rgba(245, 158, 11, 0.48)',
          boxShadow: '0 28px 64px rgba(0, 0, 0, 0.92)',
        }}
      >
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between gap-4 bg-[#191613]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-block w-2.5 h-2.5 rotate-45 bg-amber-400" />
              <h2 className="font-display-he text-2xl font-bold text-stone-100">
                {t('settings.title')}
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {t('settings.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              data-testid="settings-save-to-file-btn"
              onClick={handleSaveToFile}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow ${
                saveStatus === 'saved'
                  ? 'bg-emerald-400 text-stone-950'
                  : 'bg-amber-400 hover:bg-amber-300 text-stone-950'
              }`}
            >
              {saveStatus === 'saving'
                ? t('settings.saving')
                : saveStatus === 'saved'
                  ? t('settings.saved')
                  : saveStatus === 'saved_local'
                    ? t('settings.saved_local')
                    : t('settings.save')}
            </button>

            <button
              type="button"
              data-testid="close-settings-btn"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 border border-stone-700 cursor-pointer"
            >
              {t('settings.close')}
            </button>
          </div>
        </div>

        {/* Sub-Tab Bar: Keybindings vs Gameplay & Environment Defaults */}
        <div className="px-6 pt-3 pb-2 border-b border-stone-800/80 flex items-center justify-between gap-3 bg-[#161411]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="settings-tab-keybindings"
              onClick={() => setActiveTab('keybindings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'keybindings'
                  ? 'bg-amber-400 text-stone-950'
                  : 'bg-stone-900 text-stone-300 hover:text-stone-100 border border-stone-800'
              }`}
            >
              {t('settings.tab_keybindings', { count: KEYBIND_ROWS.length })}
            </button>
            <button
              type="button"
              data-testid="settings-tab-gameplay"
              onClick={() => setActiveTab('gameplay')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'gameplay'
                  ? 'bg-amber-400 text-stone-950'
                  : 'bg-stone-900 text-stone-300 hover:text-stone-100 border border-stone-800'
              }`}
            >
              {t('settings.tab_gameplay')}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="settings-reset-survival-top-btn"
              onClick={() => {
                const res = onResetWorld?.('survival');
                setResetWorldNotice(
                  res?.message ?? 'Survival World & Map have been reset to a fresh state!'
                );
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-200 hover:text-white bg-rose-950/70 hover:bg-rose-800 border border-rose-500/40 cursor-pointer"
              title="Reset Survival Mode world, map discovery, chests, ships, and wildlife"
            >
              Reset Survival World
            </button>
            <button
              type="button"
              data-testid="settings-reset-creative-top-btn"
              onClick={() => {
                const res = onResetWorld?.('creative');
                setResetWorldNotice(
                  res?.message ?? 'Creative (God Mode) World & Map have been reset to a fresh state!'
                );
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-sky-200 hover:text-white bg-sky-950/70 hover:bg-sky-800 border border-sky-500/40 cursor-pointer"
              title="Reset Creative (God Mode) world, map discovery, chests, ships, and wildlife"
            >
              Reset Creative World
            </button>
            <button
              type="button"
              data-testid="settings-reset-defaults-btn"
              onClick={handleResetToFactory}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-amber-300 bg-stone-900 hover:bg-stone-800 border border-stone-800 cursor-pointer"
            >
              {t('settings.reset_defaults')}
            </button>
          </div>
        </div>

        {resetWorldNotice && (
          <div
            data-testid="settings-world-reset-notice"
            className="px-6 py-2.5 bg-emerald-950/85 border-b border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between"
          >
            <span>✓ {resetWorldNotice}</span>
            <button
              type="button"
              onClick={() => setResetWorldNotice(null)}
              className="text-emerald-300 hover:text-white text-[11px] underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'keybindings' ? (
            <>
              {listeningKey && (
                <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-200 text-xs font-bold flex items-center justify-between">
                  <span>
                    {t('settings.listening_prompt', {
                      action: t(`settings.bindings.${listeningKey}.label`),
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setListeningKey(null)}
                    className="px-2.5 py-1 rounded bg-stone-900 text-stone-200 text-[11px] cursor-pointer"
                  >
                    {t('settings.cancel')}
                  </button>
                </div>
              )}

              {KEYBIND_CATEGORIES.map((cat) => {
                const rows = KEYBIND_ROWS.filter((r) => r.category === cat);
                return (
                  <div key={cat} className="space-y-2">
                    <h3 className="text-xs font-bold text-amber-300 tracking-wide border-b border-stone-800 pb-1.5">
                      {t(`settings.categories.${cat}`)}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {rows.map((row) => {
                        const currentCode = draft.keybindings[row.key];
                        const isListening = listeningKey === row.key;
                        return (
                          <div
                            key={row.key}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                              isListening
                                ? 'bg-amber-500/15 border-amber-400'
                                : 'bg-stone-900/75 border-stone-800/90 hover:border-stone-700'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-stone-100 truncate">
                                {t(`settings.bindings.${row.key}.label`)}
                              </div>
                              <div className="text-[11px] text-stone-400 truncate mt-0.5">
                                {t(`settings.bindings.${row.key}.description`)}
                              </div>
                            </div>

                            <button
                              type="button"
                              data-testid={`rebind-btn-${row.key}`}
                              onClick={() =>
                                setListeningKey(isListening ? null : row.key)
                              }
                              className={`min-w-[82px] px-3 py-1.5 rounded-lg font-mono-tabular text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                isListening
                                  ? 'bg-amber-400 text-stone-950 animate-pulse'
                                  : 'bg-stone-950 text-amber-300 border border-stone-700 hover:border-amber-400'
                              }`}
                            >
                              {isListening
                                ? t('settings.press_key')
                                : formatKeyCodeLabel(currentCode)}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="space-y-4">
              {/* 0. God Mode (Flight, Infinite Arrows & Map Teleport) */}
              <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <span>God Mode (Developer / Sandbox Powers)</span>
                    <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] uppercase tracking-wider">
                      {draft.godMode !== false ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                  <div className="text-xs text-stone-300 mt-0.5">
                    Enables double-space Flying, Infinite Arrows, and Click-to-Teleport on the Full World Map [M].
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    data-testid="god-mode-on-btn"
                    onClick={() => setDraft((prev) => ({ ...prev, godMode: true }))}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                      draft.godMode !== false
                        ? 'bg-amber-400 text-stone-950'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    On (God Mode)
                  </button>
                  <button
                    type="button"
                    data-testid="god-mode-off-btn"
                    onClick={() => setDraft((prev) => ({ ...prev, godMode: false }))}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                      draft.godMode === false
                        ? 'bg-amber-400 text-stone-950'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    Off (Survival)
                  </button>
                </div>
              </div>

              {/* 0B. World State & Map Reset (Survival / Creative Initialization) */}
              <div
                data-testid="settings-world-reset-card"
                className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/35 flex flex-col gap-3"
              >
                <div>
                  <div className="text-sm font-bold text-rose-300">
                    World & Map Reset (Re-Initialize Survival or Creative)
                  </div>
                  <div className="text-xs text-stone-300 mt-0.5">
                    Resets the selected mode&apos;s map discovery, player spawn, inventory, chests, ships, horses, doors, and all wildlife/bosses back to a brand-new world.
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    data-testid="reset-survival-world-btn"
                    onClick={() => {
                      const res = onResetWorld?.('survival');
                      setResetWorldNotice(
                        res?.message ?? 'Survival World & Map have been reset to a fresh state!'
                      );
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
                  >
                    Reset Survival World
                  </button>
                  <button
                    type="button"
                    data-testid="reset-creative-world-btn"
                    onClick={() => {
                      const res = onResetWorld?.('creative');
                      setResetWorldNotice(
                        res?.message ?? 'Creative (God Mode) World & Map have been reset to a fresh state!'
                      );
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-colors cursor-pointer"
                  >
                    Reset Creative (God Mode) World
                  </button>
                  <button
                    type="button"
                    data-testid="reset-all-worlds-btn"
                    onClick={() => {
                      const res = onResetWorld?.('both');
                      setResetWorldNotice(
                        res?.message ?? 'Both Survival & Creative Worlds and the Map have been reset!'
                      );
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/40 transition-colors cursor-pointer"
                  >
                    Reset Both Worlds
                  </button>
                </div>
              </div>

              {/* 1. Default Camera Perspective */}
              <div className="p-4 rounded-xl bg-stone-900/75 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-stone-100">
                    {t('settings.camera_title')}
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    {t('settings.camera_hint')}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(
                    [
                      { id: 'third_person', label: t('settings.camera_third_person') },
                      { id: 'first_person', label: t('settings.camera_first_person') },
                    ] as const
                  ).map((opt) => {
                    const active = draft.defaultCameraPerspective === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            defaultCameraPerspective: opt.id as CameraPerspectiveMode,
                          }))
                        }
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                          active
                            ? 'bg-amber-400 text-stone-950'
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Graphics Quality */}
              <div className="p-4 rounded-xl bg-stone-900/75 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-stone-100">
                    {t('settings.graphics_title')}
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    {t('settings.graphics_hint')}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(
                    [
                      { id: 'low', label: t('settings.graphics_low') },
                      { id: 'medium', label: t('settings.graphics_medium') },
                      { id: 'high', label: t('settings.graphics_high') },
                    ] as const
                  ).map((opt) => {
                    const active = draft.graphicsQuality === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        data-testid={`graphics-quality-${opt.id}`}
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            graphicsQuality: opt.id as GraphicsQuality,
                          }))
                        }
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                          active
                            ? 'bg-amber-400 text-stone-950'
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Fireflies Mode */}
              <div className="p-4 rounded-xl bg-stone-900/75 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-stone-100">
                    {t('settings.fireflies_title')}
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    {t('settings.fireflies_hint')}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(
                    [
                      { id: 'sanctuary_only', label: t('settings.fireflies_sanctuary_only') },
                      { id: 'off', label: t('settings.fireflies_off') },
                    ] as const
                  ).map((opt) => {
                    const active = draft.firefliesMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        data-testid={`fireflies-mode-${opt.id}`}
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            firefliesMode: opt.id as FirefliesMode,
                          }))
                        }
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                          active
                            ? 'bg-amber-400 text-stone-950'
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Mouse Look Sensitivity */}
              <div className="p-4 rounded-xl bg-stone-900/75 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-100">
                    {t('settings.mouse_sensitivity')}
                  </span>
                  <span className="font-mono-tabular text-xs font-bold text-amber-300">
                    {t('settings.multiplier', { value: draft.mouseSensitivity.toFixed(2) })}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={2.5}
                  step={0.05}
                  value={draft.mouseSensitivity}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      mouseSensitivity: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* 4. Movement Speed Multiplier */}
              <div className="p-4 rounded-xl bg-stone-900/75 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-100">
                    {t('settings.movement_speed')}
                  </span>
                  <span className="font-mono-tabular text-xs font-bold text-amber-300">
                    {t('settings.multiplier', { value: draft.walkSpeedMultiplier.toFixed(2) })}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.8}
                  step={0.05}
                  value={draft.walkSpeedMultiplier}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      walkSpeedMultiplier: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* 5. Jump Height Multiplier */}
              <div className="p-4 rounded-xl bg-stone-900/75 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-100">
                    {t('settings.jump_force')}
                  </span>
                  <span className="font-mono-tabular text-xs font-bold text-amber-300">
                    {t('settings.multiplier', { value: draft.jumpForceMultiplier.toFixed(2) })}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.7}
                  max={1.6}
                  step={0.05}
                  value={draft.jumpForceMultiplier}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      jumpForceMultiplier: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer with Save CTA */}
        <div className="px-6 py-3.5 border-t border-stone-800 bg-[#191613] flex items-center justify-between gap-4">
          <span className="text-xs text-stone-400">
            {t('settings.footer_note')}{' '}
            <code className="text-amber-300 font-mono">src/config/savedGameSettings.ts</code>
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveToFile}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-stone-950 cursor-pointer shadow"
            >
              {saveStatus === 'saved'
                ? t('settings.saved')
                : saveStatus === 'saved_local'
                  ? t('settings.saved_local')
                  : t('settings.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// #endregion
