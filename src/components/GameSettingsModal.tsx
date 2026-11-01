// ============================================================================
// MODULE: Components / Game Settings & Keybind Configuration Modal
// DESIGN: Studio-Grade Keybinding & Default Configuration Editor with Disk Save
// SUMMARY: Allows players to customize every keyboard shortcut and default game
//          setting and save them directly to src/config/savedGameSettings.ts.
// ============================================================================

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

export interface IGameSettingsModalProps {
  readonly isOpen: boolean;
  readonly settings: IGameSettingsConfig;
  readonly onApplySettings: (next: IGameSettingsConfig) => void;
  readonly onClose: () => void;
}

interface IKeybindRowMeta {
  readonly key: keyof IGameKeybindings;
  readonly labelHe: string;
  readonly categoryHe: 'Movement & Navigation' | 'Combat & Interaction' | 'Interface & Camera';
  readonly descriptionHe: string;
}

const KEYBIND_ROWS: readonly IKeybindRowMeta[] = [
  {
    key: 'moveForward',
    labelHe: 'Move Forward',
    categoryHe: 'Movement & Navigation',
    descriptionHe: 'Move forward in the world (or climb ladder)',
  },
  {
    key: 'moveBackward',
    labelHe: 'Move Backward',
    categoryHe: 'Movement & Navigation',
    descriptionHe: 'Walk backward / retreat',
  },
  {
    key: 'moveLeft',
    labelHe: 'Strafe Left',
    categoryHe: 'Movement & Navigation',
    descriptionHe: 'Move sideways left',
  },
  {
    key: 'moveRight',
    labelHe: 'Strafe Right',
    categoryHe: 'Movement & Navigation',
    descriptionHe: 'Move sideways right',
  },
  {
    key: 'sprint',
    labelHe: 'Sprint',
    categoryHe: 'Movement & Navigation',
    descriptionHe: 'Hold to sprint or gallop on horseback',
  },
  {
    key: 'relaxedWalk',
    labelHe: 'Relaxed Walk / Dive',
    categoryHe: 'Movement & Navigation',
    descriptionHe: 'Slow walk on land or dive underwater',
  },
  {
    key: 'jump',
    labelHe: 'Jump / Climb / Fly (Double Tap)',
    categoryHe: 'Movement & Navigation',
    descriptionHe: 'Jump, climb ladder, or double-tap for flight mode',
  },
  {
    key: 'dash',
    labelHe: 'Ranger Dash',
    categoryHe: 'Movement & Navigation',
    descriptionHe: 'Quick forward combat dash or water surge',
  },
  {
    key: 'interactDoor',
    labelHe: 'Interact / Loot / Sleep / Door',
    categoryHe: 'Combat & Interaction',
    descriptionHe: 'Open doors, loot hunted animals, or sleep in bed',
  },
  {
    key: 'mountHorse',
    labelHe: 'Mount / Dismount Horse',
    categoryHe: 'Combat & Interaction',
    descriptionHe: 'Mount a nearby horse or dismount',
  },
  {
    key: 'drawOrSlash',
    labelHe: 'Sword Slash / Draw Bow',
    categoryHe: 'Combat & Interaction',
    descriptionHe: 'Swing sword or draw bow (in addition to Left Click)',
  },
  {
    key: 'cycleArrowElement',
    labelHe: 'Cycle Arrow Type (Steel / Fire / Wind)',
    categoryHe: 'Combat & Interaction',
    descriptionHe: 'Switch between steel, fire, and wind arrows',
  },
  {
    key: 'hotbarSlot1',
    labelHe: 'Quick Slot 1',
    categoryHe: 'Combat & Interaction',
    descriptionHe: 'Equip item bound to slot 1 (Bow by default)',
  },
  {
    key: 'hotbarSlot2',
    labelHe: 'Quick Slot 2',
    categoryHe: 'Combat & Interaction',
    descriptionHe: 'Equip item bound to slot 2 (Torch by default)',
  },
  {
    key: 'hotbarSlot3',
    labelHe: 'Quick Slot 3',
    categoryHe: 'Combat & Interaction',
    descriptionHe: 'Equip item bound to slot 3 (Sword by default)',
  },
  {
    key: 'hotbarSlot4',
    labelHe: 'Quick Slot 4',
    categoryHe: 'Combat & Interaction',
    descriptionHe: 'Equip item bound to slot 4 (Unarmed by default)',
  },
  {
    key: 'cameraPerspective',
    labelHe: 'Toggle Camera (3rd / 1st Person)',
    categoryHe: 'Interface & Camera',
    descriptionHe: 'Switch between 3rd-person and 1st-person view',
  },
  {
    key: 'inventoryModal',
    labelHe: 'Open Inventory & Gear',
    categoryHe: 'Interface & Camera',
    descriptionHe: 'Open inventory, skills, and market window',
  },
  {
    key: 'favoritesModal',
    labelHe: 'Quick Favorites Menu',
    categoryHe: 'Interface & Camera',
    descriptionHe: 'Fast access to favorite weapons and items',
  },
  {
    key: 'marketModal',
    labelHe: 'Trade at Market Stall',
    categoryHe: 'Interface & Camera',
    descriptionHe: 'Open merchant trade window near a market stall',
  },
  {
    key: 'cycleWeather',
    labelHe: 'Cycle Weather',
    categoryHe: 'Interface & Camera',
    descriptionHe: 'Cycle weather modes (Auto, Rain, Fog, Storm, Snow)',
  },
  {
    key: 'toggleMute',
    labelHe: 'Mute / Unmute Audio',
    categoryHe: 'Interface & Camera',
    descriptionHe: 'Toggle nature and sound effects',
  },
];

export const GameSettingsModal: React.FC<IGameSettingsModalProps> = ({
  isOpen,
  settings,
  onApplySettings,
  onClose,
}) => {
  const [draft, setDraft] = useState<IGameSettingsConfig>(settings);
  const [listeningKey, setListeningKey] = useState<keyof IGameKeybindings | null>(null);
  const [activeTab, setActiveTab] = useState<'keybindings' | 'gameplay'>('keybindings');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      setListeningKey(null);
      setSaveStatus('idle');
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
    await saveGameSettingsToFile(draft);
    setSaveStatus('saved');
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
    };
    setDraft(factory);
  }, []);

  if (!isOpen) return null;

  const categories: Array<'Movement & Navigation' | 'Combat & Interaction' | 'Interface & Camera'> = [
    'Movement & Navigation',
    'Combat & Interaction',
    'Interface & Camera',
  ];

  return (
    <div
      dir="ltr"
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
                Game Settings & Keybindings
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Customize keybindings or gameplay defaults and click Save to persist settings
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
                ? 'Saving...'
                : saveStatus === 'saved'
                  ? '✓ Saved!'
                  : 'Save Settings'}
            </button>

            <button
              type="button"
              data-testid="close-settings-btn"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 border border-stone-700 cursor-pointer"
            >
              Close ✕
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
              Keybindings ({KEYBIND_ROWS.length})
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
              Gameplay & Camera Defaults
            </button>
          </div>

          <button
            type="button"
            data-testid="settings-reset-defaults-btn"
            onClick={handleResetToFactory}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-amber-300 bg-stone-900 hover:bg-stone-800 border border-stone-800 cursor-pointer"
          >
            Reset Defaults
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'keybindings' ? (
            <>
              {listeningKey && (
                <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-200 text-xs font-bold flex items-center justify-between">
                  <span>
                    Press a key for &quot;
                    {KEYBIND_ROWS.find((r) => r.key === listeningKey)?.labelHe}
                    &quot; (or ESC to cancel)...
                  </span>
                  <button
                    type="button"
                    onClick={() => setListeningKey(null)}
                    className="px-2.5 py-1 rounded bg-stone-900 text-stone-200 text-[11px] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {categories.map((cat) => {
                const rows = KEYBIND_ROWS.filter((r) => r.categoryHe === cat);
                return (
                  <div key={cat} className="space-y-2">
                    <h3 className="text-xs font-bold text-amber-300 tracking-wide border-b border-stone-800 pb-1.5">
                      {cat}
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
                                {row.labelHe}
                              </div>
                              <div className="text-[11px] text-stone-400 truncate mt-0.5">
                                {row.descriptionHe}
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
                                ? 'Press Key...'
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
              {/* 1. Default Camera Perspective */}
              <div className="p-4 rounded-xl bg-stone-900/75 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-stone-100">
                    Default Camera Perspective
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    Choose whether the game starts in 3rd-person or 1st-person view
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(
                    [
                      { id: 'third_person', label: '3rd Person' },
                      { id: 'first_person', label: '1st Person' },
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

              {/* 2. Fireflies Mode */}
              <div className="p-4 rounded-xl bg-stone-900/75 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-stone-100">
                    Forest Fireflies
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    Show fireflies around the Sakura Sanctuary and Birch Grove or turn off
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(
                    [
                      { id: 'sanctuary_only', label: 'Sanctuary Only' },
                      { id: 'off', label: 'Off' },
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
                    Mouse Sensitivity
                  </span>
                  <span dir="ltr" className="font-mono-tabular text-xs font-bold text-amber-300">
                    {draft.mouseSensitivity.toFixed(2)}x
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
                    Movement Speed
                  </span>
                  <span dir="ltr" className="font-mono-tabular text-xs font-bold text-amber-300">
                    {draft.walkSpeedMultiplier.toFixed(2)}x
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
                    Jump Force
                  </span>
                  <span dir="ltr" className="font-mono-tabular text-xs font-bold text-amber-300">
                    {draft.jumpForceMultiplier.toFixed(2)}x
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
            Saving updates the active session and writes to{' '}
            <code className="text-amber-300 font-mono">src/config/savedGameSettings.ts</code>
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveToFile}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-stone-950 cursor-pointer shadow"
            >
              {saveStatus === 'saved' ? '✓ Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

