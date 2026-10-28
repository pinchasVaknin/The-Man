// ============================================================================
// MODULE: Components / Game Shell Overlay
// DESIGN: Humble UI overlay HUD, pause modal, notifications & touch controls (SRP)
// SUMMARY: Displays telemetry stats (coordinates, biome, clock), crosshairs, stamina bars,
//          quick hotbar, pause menu, and on-screen virtual joystick controls.
// ============================================================================

// ======================== IMPORTS & PROPS ======================== \\
// #region Imports & Props
import React, { useEffect, useState } from 'react';
import {
  WeatherToggleOption,
  INVENTORY_ITEMS,
  InventoryItemId,
  InventoryItemDef,
} from '../world/terrainMath';
import { GameStateMode, TelemetrySnapshot, VirtualMoveState } from './WorldCanvas';
import { ExplorerMinimap } from './ExplorerMinimap';
import {
  SkyrimInventoryModal,
  InventoryCategoryTab,
  SHORT_NAMES_HE,
} from './SkyrimInventoryModal';

export interface GameShellOverlayProps {
  gameState: GameStateMode;
  telemetry: TelemetrySnapshot;
  muted: boolean;
  weatherToggle: WeatherToggleOption;
  onStartGame: () => void;
  onResumeGame: () => void;
  onReturnToTitle: () => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onCycleWeather: () => void;
  onSelectWeather: (option: WeatherToggleOption) => void;
  virtualMoveRef: React.MutableRefObject<VirtualMoveState>;
}

const WEATHER_OPTIONS: { id: WeatherToggleOption; labelHe: string; shortHe: string }[] = [
  { id: 'auto', labelHe: 'אוטומטי (עונות השנה)', shortHe: 'אוטומטי' },
  { id: 'regional_rain', labelHe: 'גשם ושלוליות', shortHe: 'גשם' },
  { id: 'dense_fog', labelHe: 'ערפל כבד', shortHe: 'ערפל' },
  { id: 'lightning_storm', labelHe: 'סופת ברקים ורעמים', shortHe: 'סופת ברקים' },
  { id: 'clear_clouds', labelHe: 'שמיים בהירים', shortHe: 'בהיר' },
];

type SkyrimModalMode = 'none' | 'inventory' | 'favorites';

const DEFAULT_OWNED_IDS: InventoryItemId[] = [
  'bow',
  'sword',
  'torch',
  'unarmed',
  'arrow_normal',
  'arrow_fire',
  'arrow_wind',
  'oak_timber',
  'cut_granite_blocks',
  'iron_ingots',
  'dwarven_gold_ore',
  'crystal_gem',
  'ancient_dwarven_horn',
];

function renderItemSvgIcon(itemId: InventoryItemId, className = 'w-4 h-4') {
  switch (itemId) {
    case 'bow':
    case 'elven_longbow':
    case 'dragonbone_bow':
      return (
        <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2 shrink-0`}>
          <path d="M4 20c6-2 14-10 16-16" />
          <path d="M4 4l16 16" />
          <polyline points="15 4 20 4 20 9" />
        </svg>
      );
    case 'sword':
    case 'katana_imperial':
    case 'dwarven_warhammer':
    case 'celestial_jin_sword':
      return (
        <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2 shrink-0`}>
          <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
          <path d="M13 19l6-6" />
          <path d="M16 16l4 4" />
          <path d="M19 21l2-2" />
        </svg>
      );
    case 'torch':
      return (
        <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2 shrink-0`}>
          <path d="M12 2c2.5 2.5 3.5 5 2 8-1.5 2-4 2-4-1 0-2 1-4 2-7z" />
          <path d="M10 12h4l-1 10h-2l-1-10z" />
        </svg>
      );
    case 'arrow_normal':
    case 'arrow_fire':
    case 'arrow_wind':
      return (
        <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2 shrink-0`}>
          <path d="M5 19L19 5" />
          <polyline points="12 5 19 5 19 12" />
          <path d="M5 19l3-1-2-2-1 3z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2 shrink-0`}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
// #endregion

// ======================== OVERLAY COMPONENT ======================== \\
// #region Overlay Component
export const GameShellOverlay: React.FC<GameShellOverlayProps> = ({
  gameState,
  telemetry,
  weatherToggle,
  onStartGame,
  onResumeGame,
  onReturnToTitle,
  onCycleWeather,
  onSelectWeather,
  virtualMoveRef,
}) => {
  const [skyrimModal, setSkyrimModal] = useState<SkyrimModalMode>('none');
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategoryTab>('all');
  const [selectedItemId, setSelectedItemId] = useState<InventoryItemId>('bow');
  const [, setUiTick] = useState(0);

  const activeWeatherOption =
    WEATHER_OPTIONS.find((o) => o.id === weatherToggle) || WEATHER_OPTIONS[0];

  const equippedTool = telemetry.equippedTool ?? 'bow';
  const activeWeaponId = telemetry.activeWeaponId ?? equippedTool;
  const arrowKind = telemetry.arrowKind ?? 'normal';
  const goldCoins = telemetry.goldCoins ?? 280;
  const ownedItemIds = telemetry.ownedItemIds ?? DEFAULT_OWNED_IDS;
  const hotbarSlots: (InventoryItemId | null)[] = telemetry.hotbarSlots ?? [
    'bow',
    'torch',
    'sword',
    'unarmed',
  ];
  const favoriteIds: InventoryItemId[] = telemetry.favoriteIds ?? [
    'bow',
    'sword',
    'torch',
    'arrow_normal',
    'arrow_fire',
    'arrow_wind',
  ];

  const isItemOwned = (itemId: InventoryItemId): boolean => {
    return ownedItemIds.includes(itemId);
  };

  const isItemEquipped = (itemId: InventoryItemId): boolean => {
    if (telemetry.isSwimming) return false;
    const def: InventoryItemDef | undefined = INVENTORY_ITEMS.find((i) => i.id === itemId);
    if (def?.weaponRole === 'bow') {
      return equippedTool === 'bow' && activeWeaponId === itemId;
    }
    if (def?.weaponRole === 'sword') {
      return equippedTool === 'sword' && activeWeaponId === itemId;
    }
    if (itemId === 'torch' || itemId === 'unarmed') {
      return equippedTool === itemId;
    }
    if (itemId === 'arrow_normal') return arrowKind === 'normal';
    if (itemId === 'arrow_fire') return arrowKind === 'fire';
    if (itemId === 'arrow_wind') return arrowKind === 'wind';
    return false;
  };

  const triggerEquipItem = (itemId: InventoryItemId) => {
    (window as unknown as { equipItem?: (id: InventoryItemId) => void }).equipItem?.(itemId);
    setUiTick((t) => t + 1);
  };

  const triggerBuyItem = (itemId: InventoryItemId): { ok: boolean; reasonHe: string } => {
    const fn = (
      window as unknown as {
        buyItem?: (id: InventoryItemId) => {
          ok: boolean;
          reason?: string;
          goldCoins: number;
          requiredLevel?: number;
        };
      }
    ).buyItem;
    const raw = fn ? fn(itemId) : { ok: false, reason: 'error', goldCoins };
    setUiTick((t) => t + 1);
    if (raw.ok) {
      return { ok: true, reasonHe: `נרכש בהצלחה! יתרת זהב: ${raw.goldCoins}` };
    }
    if (raw.reason === 'not_in_market') {
      return { ok: false, reasonHe: 'קניית נשקים וחומרים מתבצעת רק בחנויות שוק הנמל!' };
    }
    if (raw.reason === 'level_too_low') {
      return { ok: false, reasonHe: `נדרשת דרגת סייר ${raw.requiredLevel ?? 2} לרכישת פריט זה` };
    }
    if (raw.reason === 'not_enough_gold') {
      return { ok: false, reasonHe: 'אין ברשותך מספיק מטבעות זהב' };
    }
    return { ok: false, reasonHe: 'הפריט כבר בבעלותך' };
  };

  const triggerSellItem = (itemId: InventoryItemId): { ok: boolean; reasonHe: string } => {
    const fn = (
      window as unknown as {
        sellItem?: (id: InventoryItemId) => {
          ok: boolean;
          reason?: string;
          goldCoins: number;
          soldForGold: number;
        };
      }
    ).sellItem;
    const raw = fn ? fn(itemId) : { ok: false, reason: 'error', goldCoins, soldForGold: 0 };
    setUiTick((t) => t + 1);
    if (raw.ok) {
      return {
        ok: true,
        reasonHe: `נמכר לסוחר תמורת +${raw.soldForGold} זהב! (יתרה: ${raw.goldCoins})`,
      };
    }
    if (raw.reason === 'not_in_market') {
      return { ok: false, reasonHe: 'מכירה מתבצעת רק אצל המוכרים בשוק הנמל!' };
    }
    return { ok: false, reasonHe: 'לא ניתן למכור פריט זה' };
  };

  const triggerAssignHotbar = (slotIndex: number, itemId: InventoryItemId) => {
    (
      window as unknown as { assignHotbar?: (idx: number, id: InventoryItemId) => void }
    ).assignHotbar?.(slotIndex, itemId);
    setUiTick((t) => t + 1);
  };

  const triggerToggleFavorite = (itemId: InventoryItemId) => {
    (window as unknown as { toggleFavorite?: (id: InventoryItemId) => void }).toggleFavorite?.(
      itemId
    );
    setUiTick((t) => t + 1);
  };

  // Sync body dataset flag so WorldCanvas knows when Radial Inventory [Tab] or Favorites [Q] is open
  useEffect(() => {
    const isOpen = gameState === 'playing' && skyrimModal !== 'none';
    document.body.dataset.skyrimModalOpen = isOpen ? 'true' : 'false';
    if (isOpen && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    return () => {
      document.body.dataset.skyrimModalOpen = 'false';
    };
  }, [gameState, skyrimModal]);

  // Expose helper hooks for automated tests & handle [Tab] / [B] / [Q] / [1-4] / [F] / [E]
  useEffect(() => {
    (window as unknown as Record<string, unknown>).openInventoryModal = (
      open?: boolean,
      category?: InventoryCategoryTab
    ) => {
      if (category) {
        setSelectedCategory(category);
        if (category === 'market') {
          const firstMarket = INVENTORY_ITEMS.find((i) => !i.starterOwned);
          if (firstMarket) setSelectedItemId(firstMarket.id);
        }
      }
      setSkyrimModal((prev) =>
        open === undefined ? (prev === 'inventory' ? 'none' : 'inventory') : open ? 'inventory' : 'none'
      );
    };
    (window as unknown as Record<string, unknown>).openFavoritesModal = (open?: boolean) => {
      setSkyrimModal((prev) =>
        open === undefined ? (prev === 'favorites' ? 'none' : 'favorites') : open ? 'favorites' : 'none'
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      if (e.code === 'Tab') {
        e.preventDefault();
        setSkyrimModal((prev) => (prev === 'inventory' ? 'none' : 'inventory'));
        return;
      }

      if (e.code === 'KeyB' && !e.repeat) {
        if (!telemetry.nearbyMarket) return;
        e.preventDefault();
        if (skyrimModal === 'inventory' && selectedCategory === 'market') {
          setSkyrimModal('none');
        } else {
          setSelectedCategory('market');
          const firstMarket = INVENTORY_ITEMS.find((i) => !i.starterOwned);
          if (firstMarket) setSelectedItemId(firstMarket.id);
          setSkyrimModal('inventory');
        }
        return;
      }

      if (e.code === 'KeyQ' && !e.repeat) {
        e.preventDefault();
        setSkyrimModal((prev) => (prev === 'favorites' ? 'none' : 'favorites'));
        return;
      }

      if (skyrimModal !== 'none') {
        if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3' || e.code === 'Digit4') {
          e.preventDefault();
          const slotIdx =
            e.code === 'Digit1' ? 0 : e.code === 'Digit2' ? 1 : e.code === 'Digit3' ? 2 : 3;
          triggerAssignHotbar(slotIdx, selectedItemId);
          return;
        }
        if (e.code === 'KeyF' && !e.repeat) {
          e.preventDefault();
          triggerToggleFavorite(selectedItemId);
          return;
        }
        if ((e.code === 'Enter' || e.code === 'KeyE') && !e.repeat) {
          e.preventDefault();
          if (isItemOwned(selectedItemId)) {
            triggerEquipItem(selectedItemId);
          } else {
            triggerBuyItem(selectedItemId);
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, skyrimModal, selectedCategory, selectedItemId, telemetry.nearbyMarket]);

  // ============================================================================
  // 1. TITLE SCREEN OVERLAY (Clean Negative Space + Only Weather [V] Button)
  // ============================================================================
  if (gameState === 'title') {
    return (
      <main
        className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-12 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(12, 10, 9, 0.55) 0%, rgba(12, 10, 9, 0.12) 45%, rgba(12, 10, 9, 0.72) 100%)',
        }}
      >
        {/* Top Row: Only Weather [V] Button */}
        <div className="flex items-center justify-end w-full">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              data-testid="weather-toggle-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleWeather();
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-stone-200 transition-colors cursor-pointer shrink-0"
              style={{
                backgroundColor: 'rgba(20, 18, 15, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
              }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-sky-400 stroke-2">
                <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
                <path d="M8 19v2M12 19v2M16 19v2" />
              </svg>
              <span className="whitespace-nowrap">מזג אוויר: {activeWeatherOption.shortHe}</span>
              <kbd className="px-1 py-0.5 text-[10px] rounded bg-stone-800 text-stone-300 font-mono-tabular">
                V
              </kbd>
            </button>
          </div>
        </div>

        {/* Center / Right-Third Negative-Space Title Lockup */}
        <div className="my-auto max-w-xl flex flex-col items-start gap-6">
          <div className="flex items-center gap-4">
            <svg
              viewBox="0 0 72 72"
              className="w-16 h-16 shrink-0"
              aria-hidden="true"
            >
              <circle
                cx="36"
                cy="36"
                r="33"
                fill="rgba(20, 18, 14, 0.88)"
                stroke="#d97706"
                strokeWidth="2"
              />
              <circle cx="46" cy="24" r="7" fill="#fbbf24" />
              <path
                d="M10 48 L26 26 L38 40 L48 30 L62 48 Z"
                fill="#44403c"
                stroke="#78716c"
                strokeWidth="1"
              />
              <path
                d="M26 17 L18 31 L22 31 L16 42 L23 42 L23 48 L29 48 L29 42 L36 42 L30 31 L34 31 Z"
                fill="#4d7c38"
              />
              <path
                d="M15 53 Q36 50 57 53 M20 58 Q36 56 52 58"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            <div>
              <h1
                className="font-display-he text-4xl md:text-6xl font-bold text-stone-100 tracking-tight hud-stroke"
                style={{ textWrap: 'balance' }}
              >
                שביל הטבע
              </h1>
              <p className="text-base md:text-lg text-amber-200/90 font-medium mt-1 hud-stroke">
                עולם פתוח וחי של טבע, מבצר קיסרי, שוק סוחרים וממלכת גמדים
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pointer-events-auto pt-1">
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onStartGame();
              }}
              className="px-7 py-3.5 rounded-xl text-base font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 active:scale-98 transition-all shadow-lg cursor-pointer whitespace-nowrap"
            >
              התחל הליכה בעולם
            </button>
          </div>
        </div>

        <div />
      </main>
    );
  }

  const bowProgress = telemetry.bowDrawProgress ?? 0;
  const isBowDrawn = Boolean(telemetry.bowDrawn);
  const favoriteItems = INVENTORY_ITEMS.filter(
    (item) => favoriteIds.includes(item.id) && isItemOwned(item.id)
  );

  // ============================================================================
  // 2. PLAYING & PAUSED HUD OVERLAY (Strictly ONLY Weather [V] Button in Top Bar!)
  // ============================================================================
  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-4 md:p-5">
      {/* Top Row: ONLY Weather [V] Button */}
      <div className="flex items-start justify-end w-full">
        <div className="flex items-center justify-end pointer-events-auto shrink-0">
          <button
            type="button"
            tabIndex={-1}
            data-testid="weather-toggle-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleWeather();
            }}
            aria-label="החלפת מזג אוויר [V]"
            title="החלפת מזג אוויר [V]"
            className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl flex items-center gap-1.5 text-xs font-medium text-stone-200 hover:text-sky-300 transition-colors cursor-pointer shrink-0"
            style={{
              backgroundColor: 'rgba(18, 16, 13, 0.88)',
              border:
                weatherToggle !== 'auto'
                  ? '1px solid rgba(56, 189, 248, 0.55)'
                  : '1px solid rgba(255, 255, 255, 0.14)',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-sky-400 stroke-2 shrink-0">
              {weatherToggle === 'regional_rain' ? (
                <>
                  <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
                  <path d="M8 19v2M12 19v2M16 19v2" />
                </>
              ) : weatherToggle === 'lightning_storm' ? (
                <>
                  <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9" />
                  <polyline points="13 11 9 17 15 17 11 23" />
                </>
              ) : weatherToggle === 'dense_fog' ? (
                <>
                  <path d="M4 10h16M6 14h12M4 18h16" />
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2" />
                </>
              )}
            </svg>
            <span className="whitespace-nowrap">{activeWeatherOption.shortHe}</span>
            <kbd className="hidden sm:inline-block px-1 py-0.5 text-[10px] rounded bg-stone-800 text-stone-300 font-mono-tabular">
              V
            </kbd>
          </button>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* 2B. RADIAL INVENTORY, MARKET & SKILLS WHEEL ([Tab] / [B])                    */}
      {/* ============================================================================ */}
      {gameState === 'playing' && skyrimModal === 'inventory' && (
        <SkyrimInventoryModal
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedItemId={selectedItemId}
          onSelectItem={setSelectedItemId}
          isItemEquipped={isItemEquipped}
          isItemOwned={isItemOwned}
          goldCoins={goldCoins}
          favoriteIds={favoriteIds}
          hotbarSlots={hotbarSlots}
          onEquipItem={triggerEquipItem}
          onBuyItem={triggerBuyItem}
          onSellItem={triggerSellItem}
          onToggleFavorite={triggerToggleFavorite}
          onAssignHotbar={triggerAssignHotbar}
          onClose={() => setSkyrimModal('none')}
          nearbyMarket={telemetry.nearbyMarket}
          skills={telemetry.skills}
          stamina={telemetry.stamina}
          maxStamina={telemetry.maxStamina}
          distanceWalked={telemetry.distanceWalked}
          arrowsShotCount={telemetry.arrowsShotCount}
        />
      )}

      {/* ============================================================================ */}
      {/* 2C. SKYRIM-STYLE QUICK-FAVORITES MENU ([Q])                                  */}
      {/* ============================================================================ */}
      {gameState === 'playing' && skyrimModal === 'favorites' && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="skyrim-favorites-modal"
          className="fixed inset-0 z-30 flex items-center justify-start p-6 md:p-12 pointer-events-auto"
          style={{ backgroundColor: 'rgba(8, 7, 6, 0.45)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSkyrimModal('none');
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-4 md:p-5 flex flex-col gap-3 text-stone-100"
            style={{
              backgroundColor: 'rgba(16, 14, 12, 0.95)',
              border: '1px solid rgba(251, 191, 36, 0.6)',
              boxShadow: '0 20px 44px rgba(0, 0, 0, 0.85)',
            }}
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-400 text-stone-950 font-mono-tabular text-xs font-bold">
                  Q
                </span>
                <h2 className="font-display-he text-lg font-bold text-amber-200">
                  מועדפים מהירים
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSkyrimModal('none')}
                className="text-xs text-stone-400 hover:text-white cursor-pointer"
              >
                סגור [Q]
              </button>
            </div>

            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {favoriteItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-400">
                  אין פריטים במועדפים. פתח את גלגל הציוד [Tab] וסמן ★.
                </div>
              ) : (
                favoriteItems.map((item) => {
                  const equipped = isItemEquipped(item.id);
                  const boundSlotIdx = hotbarSlots.indexOf(item.id);
                  const isSelected = selectedItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      data-testid={`fav-item-${item.id}`}
                      onClick={() => {
                        setSelectedItemId(item.id);
                        triggerEquipItem(item.id);
                        setSkyrimModal('none');
                      }}
                      className={`p-2.5 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        equipped
                          ? 'bg-amber-400/25 border border-amber-400'
                          : isSelected
                            ? 'bg-stone-800 border border-stone-600'
                            : 'bg-stone-900/85 hover:bg-stone-800 border border-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-amber-400">
                          {renderItemSvgIcon(item.id, 'w-4 h-4')}
                        </span>
                        <span className="text-sm font-bold text-stone-100">
                          {SHORT_NAMES_HE[item.id] ?? item.nameHe}
                        </span>
                        {boundSlotIdx !== -1 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono-tabular text-[10px] font-bold">
                            [{boundSlotIdx + 1}]
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {[0, 1, 2, 3].map((slotIdx) => (
                          <button
                            key={slotIdx}
                            type="button"
                            title={`שייך למקש ${slotIdx + 1}`}
                            onClick={() => triggerAssignHotbar(slotIdx, item.id)}
                            className={`w-5 h-5 rounded text-[10px] font-mono-tabular font-bold cursor-pointer ${
                              boundSlotIdx === slotIdx
                                ? 'bg-amber-400 text-stone-950'
                                : 'bg-stone-800 text-stone-400 hover:text-white'
                            }`}
                          >
                            {slotIdx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2D. LOCKED CENTER AIM RETICLE & GAMING HITMARKER RING (Never pushed or shifted by text!) */}
      {gameState === 'playing' && skyrimModal === 'none' && (
        <>
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
            aria-hidden="true"
          >
            {/* Outer Gaming Hitmarker Ring & 4 Diagonal Hit Ticks when hitting a target */}
            {telemetry.lastArrowHitTargetNameHe && (
              <svg
                data-testid="archery-hit-reticle"
                viewBox="0 0 48 48"
                className="absolute w-11 h-11 pointer-events-none"
              >
                <circle
                  cx="24"
                  cy="24"
                  r="14"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.75"
                  strokeOpacity="0.92"
                />
                <line x1="8" y1="8" x2="15" y2="15" stroke="#fde68a" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="40" y1="8" x2="33" y2="15" stroke="#fde68a" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="8" y1="40" x2="15" y2="33" stroke="#fde68a" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="40" y1="40" x2="33" y2="33" stroke="#fde68a" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            )}

            {/* Dynamic Bow Tension & Zoom Crosshair (Strictly anchored at 50vw, 50vh) */}
            <div
              className="rounded-full transition-transform duration-75 flex items-center justify-center"
              style={{
                width: isBowDrawn ? `${Math.round(36 - bowProgress * 18)}px` : '14px',
                height: isBowDrawn ? `${Math.round(36 - bowProgress * 18)}px` : '14px',
                border: telemetry.lastArrowHitTargetNameHe
                  ? '2px solid #fbbf24'
                  : isBowDrawn
                    ? `2px solid ${bowProgress >= 0.9 ? '#fbbf24' : 'rgba(251, 191, 36, 0.78)'}`
                    : '1px solid rgba(255, 251, 235, 0.35)',
                boxShadow:
                  isBowDrawn || telemetry.lastArrowHitTargetNameHe
                    ? '0 0 10px rgba(251, 191, 36, 0.55)'
                    : 'none',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    isBowDrawn || telemetry.lastArrowHitTargetNameHe
                      ? '#fbbf24'
                      : 'rgba(255, 251, 235, 0.82)',
                  boxShadow: '0 0 4px rgba(0, 0, 0, 0.85)',
                }}
              />
            </div>
          </div>

          {/* Decoupled Floating Prompts & Notifications Below Crosshair (Zero impact on aiming dot!) */}
          <div
            className="fixed left-1/2 top-[calc(50%+34px)] -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2"
            aria-hidden="true"
          >
            {telemetry.lastArrowHitTargetNameHe && (
              <div
                data-testid="archery-hit-toast"
                className="px-3.5 py-1 text-xs font-bold text-amber-200 whitespace-nowrap"
                style={{
                  backgroundColor: 'rgba(14, 12, 10, 0.82)',
                  border: '1px solid rgba(251, 191, 36, 0.45)',
                }}
              >
                פגיעה במטרה (+15 זהב) · {telemetry.lastArrowHitTargetNameHe}
              </div>
            )}

            {telemetry.skills?.lastLevelUpTitleHe && (
              <div
                data-testid="skill-levelup-toast"
                className="px-4 py-1.5 text-xs font-bold text-stone-950 bg-amber-400 shadow-xl whitespace-nowrap"
              >
                עליית מיומנות! (+35 זהב) · {telemetry.skills.lastLevelUpTitleHe}
              </div>
            )}

            {telemetry.nearbyMarket && (
              <div
                data-testid="market-stall-prompt"
                className="mt-1 flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-stone-100 shadow-2xl"
                style={{
                  backgroundColor: 'rgba(15, 13, 10, 0.90)',
                  border: '1px solid rgba(251, 191, 36, 0.65)',
                }}
              >
                <kbd className="px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-mono-tabular font-bold text-xs shadow">
                  B
                </kbd>
                <span className="font-semibold text-xs text-amber-100">
                  {telemetry.nearbyMarket.nameHe} · קנייה ומכירת נשקים
                </span>
              </div>
            )}

            {telemetry.nearbyDoor && !telemetry.climbingLadder && !telemetry.nearbyLadder && (
              <div
                data-testid="door-prompt"
                dir="ltr"
                className="mt-2 flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-stone-100 shadow-2xl"
                style={{
                  backgroundColor: 'rgba(15, 13, 10, 0.90)',
                  border: '1px solid rgba(251, 191, 36, 0.55)',
                }}
              >
                <kbd className="px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-mono-tabular font-bold text-sm shadow">
                  E
                </kbd>
                <span className="font-semibold tracking-wide text-sm text-amber-100">
                  {telemetry.nearbyDoor.isOpen ? 'Close' : 'Open'}
                </span>
              </div>
            )}

            {(telemetry.climbingLadder || telemetry.nearbyLadder) && (
              <div
                data-testid="ladder-prompt"
                dir="ltr"
                className="mt-2 flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-stone-100 shadow-2xl"
                style={{
                  backgroundColor: 'rgba(15, 13, 10, 0.90)',
                  border: '1px solid rgba(251, 191, 36, 0.55)',
                }}
              >
                <kbd className="px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-mono-tabular font-bold text-sm shadow">
                  Space
                </kbd>
                <span className="font-semibold tracking-wide text-sm text-amber-100">
                  Climb
                </span>
              </div>
            )}

            {(telemetry.nearbyHorse || telemetry.mountedHorseId) &&
              !telemetry.climbingLadder &&
              !telemetry.nearbyLadder && (
                <div
                  data-testid="horse-prompt"
                  dir="ltr"
                  className="mt-2 flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-stone-100 shadow-2xl"
                  style={{
                    backgroundColor: 'rgba(15, 13, 10, 0.90)',
                    border: '1px solid rgba(251, 191, 36, 0.55)',
                  }}
                >
                  <kbd className="px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-mono-tabular font-bold text-sm shadow">
                    F
                  </kbd>
                  <span className="font-semibold tracking-wide text-sm text-amber-100">
                    {telemetry.mountedHorseId ? 'Dismount' : 'Ride Horse'}
                  </span>
                </div>
              )}
          </div>

          {/* Skyrim-Style Green Stamina Bar at Bottom Center when sprinting, drawing bow, or attacking */}
          {telemetry.stamina !== undefined &&
            telemetry.maxStamina !== undefined &&
            telemetry.stamina < telemetry.maxStamina - 0.5 && (
              <div
                className="fixed left-1/2 bottom-6 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-1"
                aria-hidden="true"
              >
                <div
                  className="w-48 h-2 overflow-hidden"
                  style={{
                    backgroundColor: 'rgba(12, 10, 9, 0.85)',
                    border: '1px solid rgba(52, 211, 153, 0.45)',
                  }}
                >
                  <div
                    className="h-full transition-all duration-100"
                    style={{
                      width: `${Math.max(0, Math.min(100, (telemetry.stamina / telemetry.maxStamina) * 100))}%`,
                      backgroundColor: '#10b981',
                    }}
                  />
                </div>
              </div>
            )}
        </>
      )}

      {/* Bottom-Left Fog-of-War Explorer Minimap (Player Always Centered) */}
      <ExplorerMinimap
        playerX={telemetry.x}
        playerZ={telemetry.z}
        yawDeg={telemetry.yawDeg}
      />

      {/* Mobile Touch Walk Pad (Positioned on Bottom-Right so it never overlaps the Bottom-Left Minimap) */}
      {gameState === 'playing' && (
        <div className="md:hidden fixed bottom-4 right-3 flex items-end gap-2 pointer-events-none z-20">
          <div
            dir="ltr"
            className="grid grid-cols-3 gap-1 p-1.5 rounded-2xl pointer-events-auto"
            style={{
              backgroundColor: 'rgba(18, 16, 13, 0.86)',
              border: '1px solid rgba(255,255,255,0.14)',
            }}
          >
            <div />
            <button
              type="button"
              aria-label="הליכה קדימה"
              onTouchStart={() => { virtualMoveRef.current.forward = 1; }}
              onTouchEnd={() => { virtualMoveRef.current.forward = 0; }}
              onMouseDown={() => { virtualMoveRef.current.forward = 1; }}
              onMouseUp={() => { virtualMoveRef.current.forward = 0; }}
              className="w-10 h-10 rounded-lg bg-stone-800/90 active:bg-amber-500 text-stone-100 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 5l8 12H4z" /></svg>
            </button>
            <div />
            <button
              type="button"
              aria-label="תנועה שמאלה"
              onTouchStart={() => { virtualMoveRef.current.right = -1; }}
              onTouchEnd={() => { virtualMoveRef.current.right = 0; }}
              onMouseDown={() => { virtualMoveRef.current.right = -1; }}
              onMouseUp={() => { virtualMoveRef.current.right = 0; }}
              className="w-10 h-10 rounded-lg bg-stone-800/90 active:bg-amber-500 text-stone-100 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M5 12l12-8v16z" /></svg>
            </button>
            <button
              type="button"
              aria-label="הליכה אחורה"
              onTouchStart={() => { virtualMoveRef.current.forward = -1; }}
              onTouchEnd={() => { virtualMoveRef.current.forward = 0; }}
              onMouseDown={() => { virtualMoveRef.current.forward = -1; }}
              onMouseUp={() => { virtualMoveRef.current.forward = 0; }}
              className="w-10 h-10 rounded-lg bg-stone-800/90 active:bg-amber-500 text-stone-100 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 19L4 7h16z" /></svg>
            </button>
            <button
              type="button"
              aria-label="תנועה ימינה"
              onTouchStart={() => { virtualMoveRef.current.right = 1; }}
              onTouchEnd={() => { virtualMoveRef.current.right = 0; }}
              onMouseDown={() => { virtualMoveRef.current.right = 1; }}
              onMouseUp={() => { virtualMoveRef.current.right = 0; }}
              className="w-10 h-10 rounded-lg bg-stone-800/90 active:bg-amber-500 text-stone-100 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19 12L7 20V4z" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 3. PAUSE MODAL CARD                                                          */}
      {/* ============================================================================ */}
      {gameState === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-modal-title"
          className="fixed inset-0 z-30 flex items-center justify-center p-4 pointer-events-auto"
          style={{ backgroundColor: 'rgba(10, 9, 7, 0.72)' }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 md:p-8 flex flex-col gap-5"
            style={{
              backgroundColor: 'rgba(22, 19, 16, 0.96)',
              border: '1px solid rgba(217, 119, 6, 0.4)',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.75)',
            }}
          >
            <div>
              <h2 id="pause-modal-title" className="font-display-he text-2xl font-bold text-stone-100">
                הפסקת טיול בשמורה
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                הסימולציה מושהית · זהב נוכחי: {goldCoins} 🪙
              </p>
            </div>

            {/* Dynamic Weather Selector */}
            <div
              className="p-4 rounded-xl flex flex-col gap-2.5 text-xs text-stone-300"
              style={{
                backgroundColor: 'rgba(30, 26, 22, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sky-300">בקרת מזג אוויר [מקש V]:</span>
                <span className="text-[11px] text-stone-400">{telemetry.weatherLabelHe}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WEATHER_OPTIONS.map((opt) => {
                  const active = weatherToggle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectWeather(opt.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-sky-400 text-stone-950 font-semibold'
                          : 'bg-stone-800/90 text-stone-300 hover:bg-stone-700'
                      }`}
                    >
                      {opt.labelHe}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-800">
              <button
                type="button"
                data-start="true"
                onClick={onResumeGame}
                className="flex-1 py-3 px-5 rounded-xl text-sm font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap"
              >
                המשך הליכה בעולם
              </button>
              <button
                type="button"
                onClick={onReturnToTitle}
                className="py-3 px-4 rounded-xl text-sm font-medium text-stone-300 hover:text-white bg-stone-800/90 hover:bg-stone-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                מסך פתיחה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// #endregion
