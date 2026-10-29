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
  IInventoryItemDef,
  type IGameActions,
  type IBuyMarketItemPayload,
  type ISellMarketItemPayload,
  type MarketTransactionErrorCode,
  INVENTORY_ITEM_MAP,
  DEFAULT_STARTER_OWNED_ITEM_IDS,
  FIRST_MARKET_CATALOG_ITEM,
} from '../world/terrainMath';
import { Result } from '../core/Result';
import { t } from '../locales';
import { GameStateMode, ITelemetrySnapshot, IVirtualMoveState } from './WorldCanvas';
import { ExplorerMinimap } from './ExplorerMinimap';
import {
  SkyrimInventoryModal,
  InventoryCategoryTab,
  ITEM_SHORT_NAMES,
} from './SkyrimInventoryModal';
import { renderItemSvgIcon } from './itemArtworkRegistry';
import { useTelemetry } from '../core/telemetryStore';

/**
 * Summary: Props contract for GameShellOverlay heads-up display.
 * Design: Aggregates health, stamina, hotbar, skills, and telemetry signals into HUD.
 */
export interface IGameShellOverlayProps {
  gameState: GameStateMode;
  telemetry?: ITelemetrySnapshot;
  muted: boolean;
  weatherToggle: WeatherToggleOption;
  onStartGame: () => void;
  onResumeGame: () => void;
  onReturnToTitle: () => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onCycleWeather: () => void;
  onSelectWeather: (option: WeatherToggleOption) => void;
  virtualMoveRef: React.MutableRefObject<IVirtualMoveState>;
  gameActions?: IGameActions | null;
}
export type GameShellOverlayProps = IGameShellOverlayProps;

interface IWeatherOptionDef {
  id: WeatherToggleOption;
  label: string;
  short: string;
}

const WEATHER_OPTIONS: readonly IWeatherOptionDef[] = [
  { id: 'auto', label: t('weather.auto'), short: t('weather.auto_short') },
  { id: 'regional_rain', label: t('weather.regional_rain'), short: t('weather.regional_rain_short') },
  { id: 'dense_fog', label: t('weather.dense_fog'), short: t('weather.dense_fog_short') },
  { id: 'lightning_storm', label: t('weather.lightning_storm'), short: t('weather.lightning_storm_short') },
  { id: 'clear_clouds', label: t('weather.clear_clouds'), short: t('weather.clear_clouds_short') },
];

type SkyrimModalMode = 'none' | 'inventory' | 'favorites';


// #endregion

// ======================== OVERLAY COMPONENT ======================== \\
// #region Overlay Component
export const GameShellOverlay = React.memo<IGameShellOverlayProps>(({
  gameState,
  telemetry: externalTelemetry,
  weatherToggle,
  onStartGame,
  onResumeGame,
  onReturnToTitle,
  onCycleWeather,
  onSelectWeather,
  onOpenLab,
  virtualMoveRef,
  gameActions,
}) => {
  const storeTelemetry = useTelemetry();
  const telemetry = externalTelemetry ?? storeTelemetry;
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
  const ownedItemIds = telemetry.ownedItemIds ?? DEFAULT_STARTER_OWNED_ITEM_IDS;
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
    const def = INVENTORY_ITEM_MAP.get(itemId);
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
    gameActions?.onEquipItem(itemId);
    setUiTick((t) => t + 1);
  };

  const triggerBuyItem = (
    itemId: InventoryItemId
  ): Result<IBuyMarketItemPayload, MarketTransactionErrorCode> => {
    if (gameActions) {
      const res = gameActions.onBuyItem(itemId);
      setUiTick((t) => t + 1);
      return res;
    }
    return Result.fail('NOT_IN_MARKET');
  };

  const triggerSellItem = (
    itemId: InventoryItemId
  ): Result<ISellMarketItemPayload, MarketTransactionErrorCode> => {
    if (gameActions) {
      const res = gameActions.onSellItem(itemId);
      setUiTick((t) => t + 1);
      return res;
    }
    return Result.fail('NOT_IN_MARKET');
  };

  const triggerAssignHotbar = (slotIndex: number, itemId: InventoryItemId) => {
    gameActions?.onAssignHotbar(slotIndex, itemId);
    setUiTick((t) => t + 1);
  };

  const triggerToggleFavorite = (itemId: InventoryItemId) => {
    gameActions?.onToggleFavorite(itemId);
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
    if (import.meta.env.DEV) {
      const win = window as unknown as Record<string, unknown>;
      win.openInventoryModal = (
        open?: boolean,
        category?: InventoryCategoryTab
      ) => {
        if (category) {
          setSelectedCategory(category);
          if (category === 'market') {
            setSelectedItemId(FIRST_MARKET_CATALOG_ITEM.id);
          }
        }
        setSkyrimModal((prev) =>
          open === undefined ? (prev === 'inventory' ? 'none' : 'inventory') : open ? 'inventory' : 'none'
        );
      };
      win.openFavoritesModal = (open?: boolean) => {
        setSkyrimModal((prev) =>
          open === undefined ? (prev === 'favorites' ? 'none' : 'favorites') : open ? 'favorites' : 'none'
        );
      };
      return () => {
        delete win.openInventoryModal;
        delete win.openFavoritesModal;
      };
    }
  }, []);

  useEffect(() => {
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
          setSelectedItemId(FIRST_MARKET_CATALOG_ITEM.id);
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
  // 1. TITLE SCREEN OVERLAY ("the man" — Right-Aligned Typographic Menu)
  // ============================================================================
  if (gameState === 'title') {
    return (
      <main
        dir="rtl"
        data-testid="title-screen-overlay"
        className="fixed inset-0 z-20 flex flex-col justify-center items-start pr-8 sm:pr-14 md:pr-20 pl-6 pointer-events-none select-none"
        style={{
          background:
            'linear-gradient(to left, rgba(9, 8, 7, 0.88) 0%, rgba(12, 10, 9, 0.56) 26%, rgba(12, 10, 9, 0.14) 50%, rgba(12, 10, 9, 0) 72%)',
        }}
      >
        {/* Subtle Architectural Right-Margin Vertical Hairline */}
        <div
          aria-hidden="true"
          className="fixed top-12 bottom-12 right-5 sm:right-8 md:right-11 w-px pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(251, 191, 36, 0) 0%, rgba(251, 191, 36, 0.38) 30%, rgba(251, 191, 36, 0.38) 70%, rgba(251, 191, 36, 0) 100%)',
          }}
        />

        {/* Right-Docked Title & Pure Text Menu Stack (Raised higher in viewport) */}
        <div className="flex flex-col items-start text-right w-full max-w-lg -mt-20 sm:-mt-28 md:-mt-32">
          {/* Sculptural Game Title Lockup — "the man" (No description text) */}
          <div className="mb-8 sm:mb-9 pr-5 flex flex-col items-start">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="inline-block w-2 h-2 rotate-45 bg-amber-400/90" />
              <span
                dir="ltr"
                className="text-[11px] font-mono uppercase tracking-[0.42em] text-amber-300/85"
              >
                OPEN WORLD EDITION
              </span>
            </div>

            <h1
              dir="ltr"
              data-testid="game-main-title"
              className="font-display-he text-5xl sm:text-6xl md:text-7xl font-bold tracking-[0.14em] lowercase text-stone-100 leading-none whitespace-nowrap"
              style={{
                textShadow:
                  '0 10px 36px rgba(0, 0, 0, 0.92), 0 2px 8px rgba(0, 0, 0, 0.85)',
              }}
            >
              the man
            </h1>

            {/* Ornamental Gold Tapered Rule (Fades toward inner screen) */}
            <div
              aria-hidden="true"
              className="mt-5 h-[2px] w-72 sm:w-88"
              style={{
                background:
                  'linear-gradient(to left, rgba(251, 191, 36, 0.95) 0%, rgba(217, 119, 6, 0.45) 52%, rgba(217, 119, 6, 0) 100%)',
              }}
            />
          </div>

          {/* Right-Aligned Pure Text Menu Buttons with Inner-Screen Fading Hover Background */}
          <nav
            aria-label="תפריט ראשי"
            className="flex flex-col items-start w-full gap-1.5 pointer-events-auto"
          >
            {/* 1. Start Game Text Button */}
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onStartGame();
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
              <span className="whitespace-nowrap">{t('ui.weather_hud_label', { weather: activeWeatherOption.short })}</span>
              <kbd className="px-1 py-0.5 text-[10px] rounded bg-stone-800 text-stone-300 font-mono-tabular">
                V
              </kbd>
            </button>

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
                {t('ui.app_title')}
              </h1>
              <p className="text-base md:text-lg text-amber-200/90 font-medium mt-1 hud-stroke">
                {t('ui.app_subtitle')}
              </p>
            </div>
          </div>

            {/* 3. Weather Cycle Text Button */}
            <button
              type="button"
              data-testid="weather-toggle-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleWeather();
              }}
              className="group relative w-80 sm:w-96 py-3.5 pr-5 pl-12 text-right bg-transparent border-0 outline-none cursor-pointer overflow-hidden"
            >
              {t('ui.start_walking')}
            </button>
          </nav>
        </div>
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
            aria-label={t('ui.weather_toggle_aria')}
            title={t('ui.weather_toggle_title')}
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
            <span className="whitespace-nowrap">{activeWeatherOption.short}</span>
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
                  {t('ui.quick_favorites')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSkyrimModal('none')}
                className="text-xs text-stone-400 hover:text-white cursor-pointer"
              >
                {t('ui.close_q')}
              </button>
            </div>

            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {favoriteItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-400">
                  {t('ui.empty_favorites')}
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
                          {ITEM_SHORT_NAMES[item.id] ?? item.name}
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
                            title={t('interactions.assign_hotbar_slot_short', { slot: slotIdx + 1 })}
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
            {telemetry.lastArrowHitTargetName && (
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
                border: telemetry.lastArrowHitTargetName
                  ? '2px solid #fbbf24'
                  : isBowDrawn
                    ? `2px solid ${bowProgress >= 0.9 ? '#fbbf24' : 'rgba(251, 191, 36, 0.78)'}`
                    : '1px solid rgba(255, 251, 235, 0.35)',
                boxShadow:
                  isBowDrawn || telemetry.lastArrowHitTargetName
                    ? '0 0 10px rgba(251, 191, 36, 0.55)'
                    : 'none',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    isBowDrawn || telemetry.lastArrowHitTargetName
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
            {telemetry.lastArrowHitTargetName && (
              <div
                data-testid="archery-hit-toast"
                className="px-3.5 py-1 text-xs font-bold text-amber-200 whitespace-nowrap"
                style={{
                  backgroundColor: 'rgba(14, 12, 10, 0.82)',
                  border: '1px solid rgba(251, 191, 36, 0.45)',
                }}
              >
                {t('skills.target_hit_hud', { target: telemetry.lastArrowHitTargetName ?? telemetry.lastArrowHitTargetName ?? '' })}
              </div>
            )}

            {telemetry.skills?.lastLevelUpTitle && (
              <div
                data-testid="skill-levelup-toast"
                className="px-4 py-1.5 text-xs font-bold text-stone-950 bg-amber-400 shadow-xl whitespace-nowrap"
              >
                {t('skills.level_up_hud', { title: telemetry.skills.lastLevelUpTitle ?? '' })}
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
                  {t('market.hud.buy_and_sell_weapons', { market: telemetry.nearbyMarket.name ?? '' })}
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
              aria-label={t('ui.walk_forward_aria')}
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
              aria-label={t('ui.walk_left_aria')}
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
              aria-label={t('ui.walk_back_aria')}
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
              aria-label={t('ui.walk_right_aria')}
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
                {t('ui.pause_title')}
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                {t('ui.pause_subtitle', { gold: goldCoins })}
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
                <span className="font-semibold text-sky-300">{t('ui.weather_control_label')}</span>
                <span className="text-[11px] text-stone-400">{telemetry.weatherLabel}</span>
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
                      {opt.label}
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
                {t('ui.resume_walking')}
              </button>
              <button
                type="button"
                onClick={onReturnToTitle}
                className="py-3 px-4 rounded-xl text-sm font-medium text-stone-300 hover:text-white bg-stone-800/90 hover:bg-stone-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                {t('ui.intro_screen')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
GameShellOverlay.displayName = 'GameShellOverlay';
// #endregion
