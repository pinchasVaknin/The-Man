// ============================================================================
// MODULE: Config / Saved Game Settings & Keybindings
// DESIGN: Persistent source-of-truth file written directly by the Settings "Save" button
// SUMMARY: Defines default keyboard/mouse bindings and gameplay settings that can
//          be customized in the main screen Settings modal and saved to disk.
// ============================================================================

import type { CameraPerspectiveMode } from '../world/domain/worldTypes';

export type FirefliesMode = 'sanctuary_only' | 'off';

export interface IGameKeybindings {
  moveForward: string;
  moveBackward: string;
  moveLeft: string;
  moveRight: string;
  sprint: string;
  relaxedWalk: string;
  jump: string;
  interactDoor: string;
  mountHorse: string;
  drawOrSlash: string;
  dash: string;
  cycleArrowElement: string;
  cameraPerspective: string;
  inventoryModal: string;
  favoritesModal: string;
  marketModal: string;
  hotbarSlot1: string;
  hotbarSlot2: string;
  hotbarSlot3: string;
  hotbarSlot4: string;
  cycleWeather: string;
  toggleMute: string;
}

export interface IGameSettingsConfig {
  keybindings: IGameKeybindings;
  defaultCameraPerspective: CameraPerspectiveMode;
  mouseSensitivity: number;
  walkSpeedMultiplier: number;
  jumpForceMultiplier: number;
  firefliesMode: FirefliesMode;
  defaultMuted: boolean;
}

export const DEFAULT_GAME_KEYBINDINGS: IGameKeybindings = {
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  sprint: 'ShiftLeft',
  relaxedWalk: 'ControlLeft',
  jump: 'Space',
  interactDoor: 'KeyE',
  mountHorse: 'KeyF',
  drawOrSlash: 'KeyR',
  dash: 'KeyG',
  cycleArrowElement: 'KeyX',
  cameraPerspective: 'KeyC',
  inventoryModal: 'Tab',
  favoritesModal: 'KeyQ',
  marketModal: 'KeyB',
  hotbarSlot1: 'Digit1',
  hotbarSlot2: 'Digit2',
  hotbarSlot3: 'Digit3',
  hotbarSlot4: 'Digit4',
  cycleWeather: 'KeyV',
  toggleMute: 'KeyM',
};

export const SAVED_GAME_SETTINGS: IGameSettingsConfig = {
  "keybindings": {
    "moveForward": "KeyW",
    "moveBackward": "KeyS",
    "moveLeft": "KeyA",
    "moveRight": "KeyD",
    "sprint": "ShiftLeft",
    "relaxedWalk": "ControlLeft",
    "jump": "Space",
    "interactDoor": "KeyE",
    "mountHorse": "KeyE",
    "drawOrSlash": "KeyR",
    "dash": "KeyG",
    "cycleArrowElement": "KeyX",
    "cameraPerspective": "KeyC",
    "inventoryModal": "Tab",
    "favoritesModal": "KeyQ",
    "marketModal": "KeyB",
    "hotbarSlot1": "Digit1",
    "hotbarSlot2": "Digit2",
    "hotbarSlot3": "Digit3",
    "hotbarSlot4": "Digit4",
    "cycleWeather": "KeyV",
    "toggleMute": "KeyM"
  },
  "defaultCameraPerspective": "third_person",
  "mouseSensitivity": 1,
  "walkSpeedMultiplier": 1,
  "jumpForceMultiplier": 1,
  "firefliesMode": "sanctuary_only",
  "defaultMuted": false
};

const STORAGE_KEY = 'the_man_game_settings_v1';

/**
 * Summary: Loads active game settings by merging SAVED_GAME_SETTINGS with localStorage.
 */
export function loadActiveGameSettings(): IGameSettingsConfig {
  if (typeof window === 'undefined') {
    return SAVED_GAME_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAVED_GAME_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<IGameSettingsConfig>;
    return {
      ...SAVED_GAME_SETTINGS,
      ...parsed,
      keybindings: {
        ...DEFAULT_GAME_KEYBINDINGS,
        ...SAVED_GAME_SETTINGS.keybindings,
        ...(parsed.keybindings ?? {}),
      },
    };
  } catch {
    return SAVED_GAME_SETTINGS;
  }
}

/**
 * Summary: Persists game settings to localStorage and writes directly to src/config/savedGameSettings.ts via Vite API.
 */
export async function saveGameSettingsToFile(
  settings: IGameSettingsConfig
): Promise<{ savedToFile: boolean }> {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('game-settings-updated', { detail: settings }));
    } catch {
      // Ignore storage errors
    }
  }
  try {
    const res = await fetch('/api/save-game-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return { savedToFile: res.ok };
  } catch {
    return { savedToFile: false };
  }
}

/**
 * Summary: Formats a KeyboardEvent.code into a clean human-readable badge string.
 */
export function formatKeyCodeLabel(code: string): string {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  switch (code) {
    case 'Space':
      return 'Space';
    case 'ShiftLeft':
    case 'ShiftRight':
      return 'Shift';
    case 'ControlLeft':
    case 'ControlRight':
      return 'Ctrl';
    case 'AltLeft':
    case 'AltRight':
      return 'Alt';
    case 'ArrowUp':
      return '↑';
    case 'ArrowDown':
      return '↓';
    case 'ArrowLeft':
      return '←';
    case 'ArrowRight':
      return '→';
    default:
      return code;
  }
}
