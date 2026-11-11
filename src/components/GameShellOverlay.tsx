// ============================================================================
// MODULE: Components / Game Shell Overlay
// DESIGN: Humble UI overlay HUD, pause modal, notifications & touch controls (SRP)
// SUMMARY: Displays telemetry stats (coordinates, biome, clock), crosshairs, stamina bars,
//          quick hotbar, pause menu, and on-screen virtual joystick controls.
// ============================================================================

// ======================== IMPORTS & PROPS ======================== \\
// #region Imports & Props
import React, { useEffect, useRef, useState } from 'react';
import {
  WeatherToggleOption,
  SeasonType,
  INVENTORY_ITEMS,
  InventoryItemId,
  type IGameActions,
  type IBuyMarketItemPayload,
  type ISellMarketItemPayload,
  type MarketTransactionErrorCode,
  INVENTORY_ITEM_MAP,
  DEFAULT_STARTER_OWNED_ITEM_IDS,
  FIRST_MARKET_CATALOG_ITEM,
  RUINED_ATLANTIS_POS,
  getAnimalSpeciesName,
} from '../world/terrainMath';
import { Result } from '../core/Result';
import { t } from '../locales';
import type { GameStateMode, ITelemetrySnapshot, IVirtualMoveState } from '../world/domain/gameShellTypes';
import { ExplorerMinimap } from './ExplorerMinimap';
import {
  SkyrimInventoryModal,
  InventoryCategoryTab,
  ITEM_SHORT_NAMES,
} from './SkyrimInventoryModal';
import { TrapCraftingModal } from './TrapCraftingModal';
import {
  type IWorkbenchStash,
  type IPlacedTrap,
  DEFAULT_TRAP_WORKBENCH_STASH,
} from '../world/systems/animalTrapsSystem';
import { renderItemSvgIcon } from './itemArtworkRegistry';
import { useTelemetry } from '../core/telemetryStore';
import {
  formatKeyCodeLabel,
  SAVED_GAME_SETTINGS,
  type IGameSettingsConfig,
} from '../config/savedGameSettings';

/**
 * Summary: Props contract for GameShellOverlay heads-up display.
 * Design: Aggregates health, stamina, hotbar, skills, and telemetry signals into HUD.
 */
export interface IGameShellOverlayProps {
  gameState: GameStateMode;
  telemetry?: ITelemetrySnapshot;
  muted: boolean;
  weatherToggle: WeatherToggleOption;
  gameSettings?: IGameSettingsConfig;
  hasSurvivalSave?: boolean;
  onStartGame: () => void;
  onNewGame?: () => void;
  onStartGodMode?: () => void;
  onResumeGame: () => void;
  onReturnToTitle: () => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onCycleWeather: () => void;
  onSelectWeather: (option: WeatherToggleOption) => void;
  onOpenLab: () => void;
  onOpenSettings?: () => void;
  virtualMoveRef: React.MutableRefObject<IVirtualMoveState>;
  gameActions?: IGameActions | null;
}

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
  { id: 'mountain_snow', label: t('weather.mountain_snow'), short: t('weather.mountain_snow_short') },
  { id: 'wind_sand', label: t('weather.wind_sand'), short: t('weather.wind_sand_short') },
  { id: 'clear_clouds', label: t('weather.clear_clouds'), short: t('weather.clear_clouds_short') },
];

const SEASON_OPTIONS: readonly { id: SeasonType | 'auto'; label: string }[] = [
  { id: 'auto', label: t('hud.season_auto') },
  { id: 'spring', label: t('seasons.spring') },
  { id: 'summer', label: t('seasons.summer') },
  { id: 'autumn', label: t('seasons.autumn') },
  { id: 'winter', label: t('seasons.winter') },
];

type SkyrimModalMode = 'none' | 'inventory' | 'favorites';


// #endregion

// ======================== OVERLAY COMPONENT ======================== \\
// #region Overlay Component
export const GameShellOverlay = React.memo<IGameShellOverlayProps>(({
  gameState,
  telemetry: externalTelemetry,
  weatherToggle,
  gameSettings = SAVED_GAME_SETTINGS,
  hasSurvivalSave = false,
  onStartGame,
  onNewGame,
  onStartGodMode,
  onResumeGame,
  onReturnToTitle,
  onCycleWeather,
  onSelectWeather,
  onOpenLab,
  onOpenSettings,
  virtualMoveRef,
  gameActions,
}) => {
  const kb = gameSettings.keybindings;
  const storeTelemetry = useTelemetry();
  const telemetry = externalTelemetry ?? storeTelemetry;
  const [skyrimModal, setSkyrimModal] = useState<SkyrimModalMode>('none');
  const [isTrapModalOpen, setIsTrapModalOpen] = useState(false);
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
    if (def?.category === 'clothing') {
      return (telemetry.equippedClothingId ?? 'ranger_garb') === itemId;
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
    itemId: InventoryItemId,
    quantity = 1
  ): Result<IBuyMarketItemPayload, MarketTransactionErrorCode> => {
    if (gameActions) {
      const res = gameActions.onBuyItem(itemId, quantity);
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

  const triggerTakeChestItem = (
    chestId: string,
    itemId: InventoryItemId,
    quantity = 1
  ) => {
    gameActions?.onTakeChestItem?.(chestId, itemId, quantity);
    setUiTick((t) => t + 1);
  };

  const triggerStoreChestItem = (
    chestId: string,
    itemId: InventoryItemId,
    quantity = 1
  ) => {
    gameActions?.onStoreChestItem?.(chestId, itemId, quantity);
    setUiTick((t) => t + 1);
  };

  const triggerTakeAllChestItems = (chestId: string): number => {
    const count = gameActions?.onTakeAllChestItems?.(chestId) ?? 0;
    setUiTick((t) => t + 1);
    return count;
  };

  const triggerStoreAllChestItems = (chestId: string): number => {
    const count = gameActions?.onStoreAllChestItems?.(chestId) ?? 0;
    setUiTick((t) => t + 1);
    return count;
  };

  const triggerBuyShip = (tierId: string): { ok: boolean; message: string } => {
    const res = gameActions?.onBuyShip?.(tierId) ?? {
      ok: false,
      message: 'Shipwright unavailable',
    };
    setUiTick((t) => t + 1);
    return res;
  };

  const triggerAssignHotbar = (slotIndex: number, itemId: InventoryItemId) => {
    gameActions?.onAssignHotbar(slotIndex, itemId);
    setUiTick((t) => t + 1);
  };

  const triggerToggleFavorite = (itemId: InventoryItemId) => {
    gameActions?.onToggleFavorite(itemId);
    setUiTick((t) => t + 1);
  };

  const closeSkyrimModal = () => {
    document.body.dataset.skyrimModalOpen = 'false';
    if (selectedCategory === 'chest' || telemetry.nearbyChest) {
      gameActions?.onCloseChest?.(telemetry.nearbyChest?.id ?? 'chest-hunter-lodge');
    }
    setSkyrimModal('none');
    window.dispatchEvent(new CustomEvent('reacquire-pointer-lock'));
    gameActions?.onResumeGameControl?.();
  };

  const prevModalOpenRef = useRef(false);
  // Sync body dataset flag so WorldCanvas knows when Radial Inventory [Tab], Favorites [Q], or Trap Workbench is open
  useEffect(() => {
    const isOpen = gameState === 'playing' && (skyrimModal !== 'none' || isTrapModalOpen);
    document.body.dataset.skyrimModalOpen = isOpen ? 'true' : 'false';
    if (isOpen && document.pointerLockElement) {
      document.exitPointerLock?.();
    } else if (!isOpen && prevModalOpenRef.current && gameState === 'playing') {
      // Auto-close chest when exiting inventory or chest modal
      if (selectedCategory === 'chest' || telemetry.nearbyChest) {
        gameActions?.onCloseChest?.(telemetry.nearbyChest?.id ?? 'chest-hunter-lodge');
      }
      // Auto-refocus pointer lock on game viewport
      window.dispatchEvent(new CustomEvent('reacquire-pointer-lock'));
      gameActions?.onResumeGameControl?.();
    }
    prevModalOpenRef.current = isOpen;
    return () => {
      document.body.dataset.skyrimModalOpen = 'false';
    };
  }, [gameState, skyrimModal, isTrapModalOpen, selectedCategory, telemetry.nearbyChest, gameActions]);

  // Expose helper hooks for WorldCanvas chest interaction & automated tests
  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;
    win.openInventoryModal = (
      open?: boolean,
      category?: InventoryCategoryTab
    ) => {
      if (category) {
        setSelectedCategory(category);
        if (category === 'market') {
          setSelectedItemId(FIRST_MARKET_CATALOG_ITEM.id);
        } else if (category === 'chest') {
          const chestFirst = telemetry.nearbyChest?.contents?.[0];
          if (chestFirst) {
            setSelectedItemId(chestFirst);
          }
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
    win.openTrapCraftingModal = (open?: boolean) => {
      setIsTrapModalOpen((prev) => (open === undefined ? !prev : open));
    };
    return () => {
      delete win.openInventoryModal;
      delete win.openFavoritesModal;
      delete win.openTrapCraftingModal;
    };
  }, [telemetry.nearbyChest]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      if (e.code === 'Escape') {
        if (isTrapModalOpen) {
          e.preventDefault();
          setIsTrapModalOpen(false);
          window.dispatchEvent(new CustomEvent('reacquire-pointer-lock'));
          gameActions?.onResumeGameControl?.();
          return;
        }
        if (skyrimModal !== 'none') {
          e.preventDefault();
          closeSkyrimModal();
          return;
        }
      }

      if (e.code === kb.inventoryModal) {
        e.preventDefault();
        if (skyrimModal === 'inventory') {
          closeSkyrimModal();
        } else {
          if (selectedCategory === 'chest' || selectedCategory === 'market') {
            setSelectedCategory('all');
          }
          setSkyrimModal('inventory');
        }
        return;
      }

      if (
        skyrimModal === 'none' &&
        !isTrapModalOpen &&
        e.code === kb.interactDoor &&
        !e.repeat &&
        telemetry.nearbyTrapWorkbench &&
        !telemetry.nearbyDeadAnimal &&
        !telemetry.nearbyPlacedTrap
      ) {
        e.preventDefault();
        setIsTrapModalOpen(true);
        return;
      }

      if (
        skyrimModal === 'none' &&
        !isTrapModalOpen &&
        e.code === kb.interactDoor &&
        !e.repeat &&
        telemetry.nearbyChest &&
        (telemetry.nearbyChest.isCorpse ||
          (!telemetry.nearbyFallenTree && !telemetry.nearbyDoor && !telemetry.nearbyBed))
      ) {
        e.preventDefault();
        gameActions?.onOpenChest?.(telemetry.nearbyChest.id);
        setSelectedCategory('chest');
        const firstChestItem =
          telemetry.nearbyChest.contents?.[0] ?? ownedItemIds[0] ?? 'bow';
        setSelectedItemId(firstChestItem);
        setSkyrimModal('inventory');
        return;
      }

      if (e.code === kb.marketModal && !e.repeat) {
        if (!telemetry.nearbyMarket) return;
        e.preventDefault();
        if (skyrimModal === 'inventory' && selectedCategory === 'market') {
          closeSkyrimModal();
        } else {
          setSelectedCategory('market');
          setSelectedItemId(FIRST_MARKET_CATALOG_ITEM.id);
          setSkyrimModal('inventory');
        }
        return;
      }

      if (e.code === kb.favoritesModal && !e.repeat) {
        e.preventDefault();
        if (skyrimModal === 'favorites') {
          closeSkyrimModal();
        } else {
          setSkyrimModal('favorites');
        }
        return;
      }

      if (skyrimModal !== 'none') {
        if (
          e.code === kb.hotbarSlot1 ||
          e.code === kb.hotbarSlot2 ||
          e.code === kb.hotbarSlot3 ||
          e.code === kb.hotbarSlot4
        ) {
          e.preventDefault();
          const slotIdx =
            e.code === kb.hotbarSlot1
              ? 0
              : e.code === kb.hotbarSlot2
                ? 1
                : e.code === kb.hotbarSlot3
                  ? 2
                  : 3;
          triggerAssignHotbar(slotIdx, selectedItemId);
          return;
        }
        if (e.code === kb.toggleFavorite && !e.repeat) {
          e.preventDefault();
          triggerToggleFavorite(selectedItemId);
          return;
        }
        if (selectedCategory === 'chest' && telemetry.nearbyChest && !e.repeat) {
          if (e.code === 'KeyR') {
            e.preventDefault();
            if (isItemOwned(selectedItemId)) {
              triggerEquipItem(selectedItemId);
            }
            return;
          }
          if (e.code === 'KeyT') {
            e.preventDefault();
            triggerTakeAllChestItems(telemetry.nearbyChest.id);
            return;
          }
          if (e.code === 'KeyY') {
            e.preventDefault();
            triggerStoreAllChestItems(telemetry.nearbyChest.id);
            return;
          }
        }
        if ((e.code === 'Enter' || e.code === kb.interactDoor) && !e.repeat) {
          e.preventDefault();
          if (selectedCategory === 'chest' && telemetry.nearbyChest) {
            if (telemetry.nearbyChest.contents.includes(selectedItemId)) {
              triggerTakeChestItem(telemetry.nearbyChest.id, selectedItemId, 1);
            } else if (isItemOwned(selectedItemId)) {
              triggerStoreChestItem(telemetry.nearbyChest.id, selectedItemId, 1);
            }
            return;
          }
          if (isItemOwned(selectedItemId)) {
            triggerEquipItem(selectedItemId);
          } else {
            triggerBuyItem(selectedItemId, 1);
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    gameState,
    skyrimModal,
    isTrapModalOpen,
    selectedCategory,
    selectedItemId,
    telemetry.nearbyMarket,
    telemetry.nearbyChest,
    telemetry.nearbyTrapWorkbench,
    telemetry.nearbyPlacedTrap,
    telemetry.nearbyDeadAnimal,
    ownedItemIds,
    gameActions,
    kb,
  ]);

  // 1. TITLE SCREEN OVERLAY ("the man" — Left-Aligned Typographic Menu)
  if (gameState === 'title') {
    return (
      <main
        data-testid="title-screen-overlay"
        className="fixed inset-0 z-20 flex flex-col justify-center items-start pl-8 sm:pl-14 md:pl-20 pr-6 pointer-events-none select-none"
        style={{
          background:
            'linear-gradient(to right, rgba(9, 8, 7, 0.88) 0%, rgba(12, 10, 9, 0.56) 26%, rgba(12, 10, 9, 0.14) 50%, rgba(12, 10, 9, 0) 72%)',
        }}
      >
        {/* Subtle Architectural Left-Margin Vertical Hairline */}
        <div
          aria-hidden="true"
          className="fixed top-12 bottom-12 left-5 sm:left-8 md:left-11 w-px pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(251, 191, 36, 0) 0%, rgba(251, 191, 36, 0.38) 30%, rgba(251, 191, 36, 0.38) 70%, rgba(251, 191, 36, 0) 100%)',
          }}
        />

        {/* Left-Docked Title & Pure Text Menu Stack (Raised higher in viewport) */}
        <div className="flex flex-col items-start text-left w-full max-w-lg -mt-20 sm:-mt-28 md:-mt-32">
          {/* Sculptural Game Title Lockup — "the man" (No description text) */}
          <div className="mb-8 sm:mb-9 pl-5 flex flex-col items-start">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="inline-block w-2 h-2 rotate-45 bg-amber-400/90" />
              <span
                className="text-[11px] font-mono uppercase tracking-[0.42em] text-amber-300/85"
              >
                {t('title.edition_tag')}
              </span>
            </div>

            <h1
              data-testid="game-main-title"
              className="font-display-he text-5xl sm:text-6xl md:text-7xl font-bold tracking-[0.14em] lowercase text-stone-100 leading-none whitespace-nowrap"
              style={{
                textShadow:
                  '0 10px 36px rgba(0, 0, 0, 0.92), 0 2px 8px rgba(0, 0, 0, 0.85)',
              }}
            >
              {t('title.game_title')}
            </h1>

            {/* Ornamental Gold Tapered Rule (Fades toward inner screen) */}
            <div
              aria-hidden="true"
              className="mt-5 h-[2px] w-72 sm:w-88"
              style={{
                background:
                  'linear-gradient(to right, rgba(251, 191, 36, 0.95) 0%, rgba(217, 119, 6, 0.45) 52%, rgba(217, 119, 6, 0) 100%)',
              }}
            />
          </div>

          {/* Left-Aligned Pure Text Menu Buttons with Inner-Screen Fading Hover Background */}
          <nav
            aria-label={t('title.main_menu_aria')}
            className="flex flex-col items-start w-full gap-1.5 pointer-events-auto"
          >
            {/* 1. Survival Mode: Start Game (when no save exists) OR Continue + New Game (when save exists) */}
            {!hasSurvivalSave ? (
              <button
                type="button"
                data-start="true"
                data-testid="start-survival-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onStartGame();
                }}
                className="group relative w-80 sm:w-96 py-3.5 pl-5 pr-12 text-left bg-transparent border-0 outline-none cursor-pointer overflow-hidden"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
                  style={{
                    background:
                      'linear-gradient(to right, rgba(245, 158, 11, 0.34) 0%, rgba(217, 119, 6, 0.14) 55%, rgba(217, 119, 6, 0) 100%)',
                  }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-amber-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
                />
                <span
                  className="relative z-10 block font-display-he text-2xl sm:text-3xl font-bold tracking-wide text-stone-100 group-hover:text-amber-200 transition-all duration-200 group-hover:translate-x-1.5"
                  style={{ textShadow: '0 2px 12px rgba(0, 0, 0, 0.9)' }}
                >
                  {t('title.start_game')}
                </span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  data-start="true"
                  data-testid="continue-survival-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onStartGame();
                  }}
                  className="group relative w-80 sm:w-96 py-3.5 pl-5 pr-12 text-left bg-transparent border-0 outline-none cursor-pointer overflow-hidden"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
                    style={{
                      background:
                        'linear-gradient(to right, rgba(245, 158, 11, 0.34) 0%, rgba(217, 119, 6, 0.14) 55%, rgba(217, 119, 6, 0) 100%)',
                    }}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-amber-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
                  />
                  <span
                    className="relative z-10 block font-display-he text-2xl sm:text-3xl font-bold tracking-wide text-stone-100 group-hover:text-amber-200 transition-all duration-200 group-hover:translate-x-1.5"
                    style={{ textShadow: '0 2px 12px rgba(0, 0, 0, 0.9)' }}
                  >
                    Continue
                  </span>
                </button>

                <button
                  type="button"
                  data-testid="new-survival-game-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    if (onNewGame) {
                      onNewGame();
                    } else {
                      onStartGame();
                    }
                  }}
                  className="group relative w-80 sm:w-96 py-3.5 pl-5 pr-12 text-left bg-transparent border-0 outline-none cursor-pointer overflow-hidden"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
                    style={{
                      background:
                        'linear-gradient(to right, rgba(245, 158, 11, 0.28) 0%, rgba(217, 119, 6, 0.11) 55%, rgba(217, 119, 6, 0) 100%)',
                    }}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-amber-400/90 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
                  />
                  <span
                    className="relative z-10 block font-display-he text-xl sm:text-2xl font-semibold tracking-wide text-stone-200 group-hover:text-amber-200 transition-all duration-200 group-hover:translate-x-1.5"
                    style={{ textShadow: '0 2px 12px rgba(0, 0, 0, 0.9)' }}
                  >
                    New Game
                  </span>
                </button>
              </>
            )}

            {/* 1B. God Mode Text Button */}
            <button
              type="button"
              data-testid="start-god-mode-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                if (onStartGodMode) {
                  onStartGodMode();
                } else {
                  onStartGame();
                }
              }}
              className="group relative w-80 sm:w-96 py-3.5 pl-5 pr-12 text-left bg-transparent border-0 outline-none cursor-pointer overflow-hidden"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
                style={{
                  background:
                    'linear-gradient(to right, rgba(245, 158, 11, 0.28) 0%, rgba(217, 119, 6, 0.11) 55%, rgba(217, 119, 6, 0) 100%)',
                }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-amber-400/90 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
              />
              <span
                className="relative z-10 block font-display-he text-xl sm:text-2xl font-medium tracking-wide text-amber-300/90 group-hover:text-amber-100 transition-all duration-200 group-hover:translate-x-1.5"
                style={{ textShadow: '0 2px 12px rgba(0, 0, 0, 0.9)' }}
              >
                {t('title.god_mode')}
              </span>
            </button>

            {/* 2. Character & Animation Lab Text Button */}
            <button
              type="button"
              data-testid="open-lab-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenLab();
              }}
              className="group relative w-80 sm:w-96 py-3.5 pl-5 pr-12 text-left bg-transparent border-0 outline-none cursor-pointer overflow-hidden"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
                style={{
                  background:
                    'linear-gradient(to right, rgba(245, 158, 11, 0.28) 0%, rgba(217, 119, 6, 0.11) 55%, rgba(217, 119, 6, 0) 100%)',
                }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-amber-400/90 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
              />
              <span
                className="relative z-10 block font-display-he text-xl sm:text-2xl font-medium tracking-wide text-stone-300 group-hover:text-amber-100 transition-all duration-200 group-hover:translate-x-1.5"
                style={{ textShadow: '0 2px 12px rgba(0, 0, 0, 0.9)' }}
              >
                {t('title.animation_lab')}
              </span>
            </button>

            {/* 3. Settings & Keybindings Text Button */}
            <button
              type="button"
              data-testid="open-settings-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenSettings?.();
              }}
              className="group relative w-80 sm:w-96 py-3.5 pl-5 pr-12 text-left bg-transparent border-0 outline-none cursor-pointer overflow-hidden"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
                style={{
                  background:
                    'linear-gradient(to right, rgba(245, 158, 11, 0.28) 0%, rgba(217, 119, 6, 0.11) 55%, rgba(217, 119, 6, 0) 100%)',
                }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-amber-400/90 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
              />
              <span
                className="relative z-10 block font-display-he text-xl sm:text-2xl font-medium tracking-wide text-stone-300 group-hover:text-amber-100 transition-all duration-200 group-hover:translate-x-1.5"
                style={{ textShadow: '0 2px 12px rgba(0, 0, 0, 0.9)' }}
              >
                {t('title.settings')}
              </span>
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
  const displayedWeatherKind =
    weatherToggle !== 'auto' ? weatherToggle : (telemetry.weatherKind ?? 'clear_clouds');
  const displayedWeatherName =
    weatherToggle === 'auto'
      ? telemetry.weatherLabel || activeWeatherOption.short
      : activeWeatherOption.short;
  const activeArrowKind = telemetry.arrowKind ?? 'normal';
  const activeArrowItemId =
    activeArrowKind === 'fire'
      ? 'arrow_fire'
      : activeArrowKind === 'wind'
        ? 'arrow_wind'
        : 'arrow_normal';
  const activeArrowCount = ownedItemIds.filter((id) => id === activeArrowItemId).length;
  const damageVignetteAlpha = Math.max(
    telemetry.damageFlashIntensity ?? 0,
    (telemetry.hp ?? 100) < 28 ? (28 - (telemetry.hp ?? 100)) / 48 : 0
  );

  const renderWeatherSvgIcon = (kind: string) => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-sky-400 stroke-2 shrink-0">
      {kind === 'regional_rain' ? (
        <>
          <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
          <path d="M8 19v2M12 19v2M16 19v2" />
        </>
      ) : kind === 'lightning_storm' ? (
        <>
          <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9" />
          <polyline points="13 11 9 17 15 17 11 23" />
        </>
      ) : kind === 'dense_fog' ? (
        <>
          <path d="M4 10h16M6 14h12M4 18h16" />
        </>
      ) : kind === 'mountain_snow' ? (
        <>
          <path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07L19.07 4.93" />
        </>
      ) : kind === 'wind_sand' ? (
        <>
          <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2" />
        </>
      )}
    </svg>
  );

  // 2. PLAYING & PAUSED HUD OVERLAY
  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-4 md:p-5">
      {/* Red Screen-Edge Damage Vignette Overlay when taking damage or critically low HP */}
      {damageVignetteAlpha > 0.01 && !telemetry.deathRespawnPhase && (
        <div
          data-testid="damage-vignette-overlay"
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-10 transition-opacity duration-100"
          style={{
            opacity: Math.min(1, damageVignetteAlpha),
            background:
              'radial-gradient(circle at center, rgba(220, 38, 38, 0) 42%, rgba(220, 38, 38, 0.42) 78%, rgba(153, 27, 27, 0.85) 100%)',
            boxShadow: 'inset 0 0 90px rgba(220, 38, 38, 0.75)',
          }}
        />
      )}

      {/* Survival Death & Rebirth Transition + Bed Awakening Overlay */}
      {telemetry.deathRespawnPhase && (
        <div
          data-testid={
            telemetry.deathRespawnPhase.stage === 'dying'
              ? 'survival-death-respawn-overlay'
              : 'survival-bed-waking-overlay'
          }
          className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center select-none overflow-hidden"
        >
          {telemetry.deathRespawnPhase.stage === 'dying' ? (
            <div
              className="w-full h-full flex flex-col items-center justify-center px-6 text-center transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at center, rgba(40, 6, 6, ${Math.min(
                  0.97,
                  0.68 + telemetry.deathRespawnPhase.timer * 0.14
                )}) 0%, rgba(8, 5, 5, 0.98) 72%)`,
              }}
            >
              <div className="mb-4 px-3 py-1 border border-rose-500/50 bg-rose-950/70 text-rose-300 text-xs font-mono uppercase tracking-[0.28em]">
                SURVIVAL · VITALITY DEPLETED
              </div>
              <h2
                data-testid="survival-death-headline"
                className="font-display-he text-4xl sm:text-6xl font-bold text-rose-400 tracking-wide mb-3"
                style={{ textShadow: '0 4px 28px rgba(220, 38, 38, 0.85)' }}
              >
                YOU FELL
              </h2>
              <p
                data-testid="survival-death-cause"
                className="max-w-lg text-base sm:text-xl font-semibold text-stone-100 mb-6"
              >
                {telemetry.deathRespawnPhase.causeText ??
                  (telemetry.deathRespawnPhase.cause === 'starvation'
                    ? 'Your strength gave out from extreme starvation in the wilderness.'
                    : 'You were overcome by predators and foes of the realm.')}
              </p>
              <div className="w-64 h-[2px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent mb-4" />
              <p className="text-xs sm:text-sm text-amber-200/90 font-medium animate-pulse">
                Awakening in the Hunter's Cabin bed...
              </p>
            </div>
          ) : (
            (() => {
              const tWake = telemetry.deathRespawnPhase.timer;
              // Eyelid blink curve: opens partially, blinks once, then opens wide as player sits up & stands
              const lidCloseFactor =
                tWake < 0.55
                  ? 1.0 - (tWake / 0.55) * 0.65
                  : tWake < 0.85
                    ? 0.35 + ((tWake - 0.55) / 0.3) * 0.45
                    : Math.max(0, 0.8 * (1.0 - (tWake - 0.85) / 1.45));
              const lidHeightPct = Math.round(Math.max(0, Math.min(52, lidCloseFactor * 52)));
              return (
                <>
                  {/* Upper Eyelid */}
                  <div
                    className="fixed top-0 left-0 right-0 bg-stone-950 transition-all duration-75"
                    style={{
                      height: `${lidHeightPct}%`,
                      boxShadow: '0 18px 42px rgba(0,0,0,0.95)',
                    }}
                  />
                  {/* Lower Eyelid */}
                  <div
                    className="fixed bottom-0 left-0 right-0 bg-stone-950 transition-all duration-75"
                    style={{
                      height: `${lidHeightPct}%`,
                      boxShadow: '0 -18px 42px rgba(0,0,0,0.95)',
                    }}
                  />
                  {/* Awakening Status Banner */}
                  <div
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-stone-950/88 border border-amber-400/50 text-center"
                    style={{
                      opacity: tWake < 3.1 ? 1 : Math.max(0, 1 - (tWake - 3.1) / 0.5),
                    }}
                  >
                    <div className="text-xs sm:text-sm font-bold text-amber-300">
                      ✨ Awakened in the Hunter's Cabin Bed
                    </div>
                    <div className="text-[11px] text-stone-300 mt-0.5">
                      {tWake < 1.15
                        ? 'Opening your eyes and sitting up in bed...'
                        : tWake < 2.65
                          ? 'Looking around the cabin...'
                          : 'Standing up from bed — ready to head out!'}
                    </div>
                  </div>
                </>
              );
            })()
          )}
        </div>
      )}

      {/* Top-Right Visual Weather & Season HUD + God Mode Developer Controls */}
      <div className="flex items-start justify-end w-full">
        {gameSettings.godMode !== false ? (
          <div className="flex flex-wrap items-center justify-end gap-2 pointer-events-auto shrink-0">
            {/* Developer Time of Day Control */}
            <div
              data-testid="dev-time-control"
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl flex items-center gap-2 text-xs font-medium text-stone-200 shrink-0"
              style={{
                backgroundColor: 'rgba(18, 16, 13, 0.88)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
              }}
            >
              <span className="font-mono-tabular text-amber-300 font-semibold">
                {telemetry.timeString || '06:40'}
              </span>
              <input
                type="range"
                aria-label={t('hud.time_of_day_aria')}
                data-testid="dev-time-slider"
                min={0}
                max={23.95}
                step={0.1}
                value={telemetry.worldHours ?? 6.68}
                onChange={(e) => {
                  gameActions?.onSetWorldHours?.(parseFloat(e.target.value));
                }}
                className="w-16 sm:w-20 accent-amber-400 cursor-pointer"
              />
              <button
                type="button"
                tabIndex={-1}
                data-testid="dev-time-day-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  gameActions?.onSetWorldHours?.(9.0);
                }}
                className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] text-amber-200 cursor-pointer"
                title={t('hud.set_morning_title')}
              >
                {t('hud.day')}
              </button>
              <button
                type="button"
                tabIndex={-1}
                data-testid="dev-time-night-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  gameActions?.onSetWorldHours?.(22.0);
                }}
                className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] text-sky-300 cursor-pointer"
                title={t('hud.set_night_title')}
              >
                {t('hud.night')}
              </button>
            </div>

            {/* Developer Season Selector */}
            <div
              data-testid="dev-season-control"
              className="h-9 sm:h-10 px-2 sm:px-2.5 rounded-xl flex items-center gap-1 text-xs font-medium text-stone-200 shrink-0"
              style={{
                backgroundColor: 'rgba(18, 16, 13, 0.88)',
                border:
                  telemetry.forcedSeason && telemetry.forcedSeason !== 'auto'
                    ? '1px solid rgba(251, 191, 36, 0.55)'
                    : '1px solid rgba(255, 255, 255, 0.14)',
              }}
            >
              <span className="text-[11px] text-stone-400 hidden md:inline mr-0.5">
                {t('hud.season_label')}
              </span>
              {SEASON_OPTIONS.map((sOpt) => {
                const active = (telemetry.forcedSeason ?? 'auto') === sOpt.id;
                return (
                  <button
                    key={sOpt.id}
                    type="button"
                    tabIndex={-1}
                    data-testid={`dev-season-${sOpt.id}`}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      gameActions?.onSetSeason?.(sOpt.id);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                      active
                        ? 'bg-amber-400 text-stone-950 font-bold'
                        : 'text-stone-300 hover:text-white hover:bg-stone-800'
                    }`}
                  >
                    {sOpt.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              tabIndex={-1}
              data-testid="weather-toggle-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleWeather();
              }}
              aria-label={t('ui.weather_toggle_aria', { key: formatKeyCodeLabel(kb.cycleWeather) })}
              title={t('ui.weather_toggle_title', { key: formatKeyCodeLabel(kb.cycleWeather) })}
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl flex items-center gap-1.5 text-xs font-medium text-stone-200 hover:text-sky-300 transition-colors cursor-pointer shrink-0"
              style={{
                backgroundColor: 'rgba(18, 16, 13, 0.88)',
                border:
                  weatherToggle !== 'auto'
                    ? '1px solid rgba(56, 189, 248, 0.55)'
                    : '1px solid rgba(255, 255, 255, 0.14)',
              }}
            >
              {renderWeatherSvgIcon(displayedWeatherKind)}
              <span data-testid="hud-weather-display" className="whitespace-nowrap">
                {weatherToggle === 'auto' && telemetry.weatherLabel
                  ? `${activeWeatherOption.short} · ${telemetry.weatherLabel}`
                  : activeWeatherOption.short}
              </span>
              <kbd className="hidden sm:inline-block px-1 py-0.5 text-[10px] rounded bg-stone-800 text-stone-300 font-mono-tabular">
                {formatKeyCodeLabel(kb.cycleWeather)}
              </kbd>
            </button>
          </div>
        ) : (
          <div
            data-testid="hud-weather-display"
            className="h-9 sm:h-10 px-3 rounded-xl flex items-center gap-2 text-xs font-medium text-stone-200 shrink-0 shadow-lg"
            style={{
              backgroundColor: 'rgba(18, 16, 13, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
            }}
          >
            {renderWeatherSvgIcon(displayedWeatherKind)}
            <span className="text-amber-300 font-semibold">
              {telemetry.seasonLabel || 'Summer'}
            </span>
            <span className="text-stone-600">·</span>
            <span className="whitespace-nowrap text-stone-200">
              {displayedWeatherName}
            </span>
          </div>
        )}
      </div>

      {/* ============================================================================ */}
      {/* 2B. RADIAL INVENTORY, MARKET, CHEST & SKILLS WHEEL ([Tab] / [B] / [E])       */}
      {/* ============================================================================ */}
      {gameState === 'playing' && skyrimModal === 'inventory' && (
        <SkyrimInventoryModal
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedItemId={selectedItemId}
          onSelectItem={setSelectedItemId}
          isItemEquipped={isItemEquipped}
          isItemOwned={isItemOwned}
          ownedItemIds={ownedItemIds}
          goldCoins={goldCoins}
          favoriteIds={favoriteIds}
          hotbarSlots={hotbarSlots}
          onEquipItem={triggerEquipItem}
          onBuyItem={triggerBuyItem}
          onSellItem={triggerSellItem}
          onTakeChestItem={triggerTakeChestItem}
          onStoreChestItem={triggerStoreChestItem}
          onTakeAllChestItems={triggerTakeAllChestItems}
          onStoreAllChestItems={triggerStoreAllChestItems}
          onBuyShip={triggerBuyShip}
          godMode={gameSettings.godMode !== false}
          onToggleFavorite={triggerToggleFavorite}
          onAssignHotbar={triggerAssignHotbar}
          onClose={closeSkyrimModal}
          closeKeyLabel={formatKeyCodeLabel(kb.inventoryModal)}
          interactKeyLabel={formatKeyCodeLabel(kb.interactDoor)}
          nearbyMarket={telemetry.nearbyMarket}
          nearbyChest={telemetry.nearbyChest}
          skills={telemetry.skills}
          hp={telemetry.hp}
          maxHp={telemetry.maxHp}
          hunger={telemetry.hunger}
          maxHunger={telemetry.maxHunger}
          stamina={telemetry.stamina}
          maxStamina={telemetry.maxStamina}
          distanceWalked={telemetry.distanceWalked}
          arrowsShotCount={telemetry.arrowsShotCount}
        />
      )}

      {/* Trapper's Workbench Modal */}
      {gameState === 'playing' && isTrapModalOpen && (
        <TrapCraftingModal
          isOpen={isTrapModalOpen}
          onClose={() => {
            setIsTrapModalOpen(false);
            window.dispatchEvent(new CustomEvent('reacquire-pointer-lock'));
            gameActions?.onResumeGameControl?.();
          }}
          playerInventory={ownedItemIds.reduce<Partial<Record<InventoryItemId, number>>>(
            (acc, id) => {
              acc[id] = (acc[id] ?? 0) + 1;
              return acc;
            },
            {}
          )}
          workbenchStash={
            (
              window as unknown as {
                getWorkbenchStash?: () => IWorkbenchStash;
              }
            ).getWorkbenchStash?.() ?? { materials: { ...DEFAULT_TRAP_WORKBENCH_STASH } }
          }
          placedTraps={
            (
              window as unknown as {
                getPlacedTraps?: () => IPlacedTrap[];
              }
            ).getPlacedTraps?.() ?? []
          }
          onCraftTrap={(recipeId) => {
            gameActions?.onCraftTrap?.(recipeId);
            setUiTick((n) => n + 1);
          }}
          onDepositMaterial={(itemId, count) => {
            gameActions?.onDepositWorkbenchMaterial?.(itemId, count);
            setUiTick((n) => n + 1);
          }}
          onWithdrawMaterial={(itemId, count) => {
            gameActions?.onWithdrawWorkbenchMaterial?.(itemId, count);
            setUiTick((n) => n + 1);
          }}
          onDepositAllMaterials={() => {
            gameActions?.onDepositAllWorkbenchMaterials?.();
            setUiTick((n) => n + 1);
          }}
          onTakeAllFromStash={() => {
            gameActions?.onTakeAllFromWorkbenchStash?.();
            setUiTick((n) => n + 1);
          }}
          playerCoords={{ x: telemetry.x, y: telemetry.y, z: telemetry.z }}
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
            if (e.target === e.currentTarget) closeSkyrimModal();
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
                  {formatKeyCodeLabel(kb.favoritesModal)}
                </span>
                <h2 className="font-display-he text-lg font-bold text-amber-200">
                  {t('ui.quick_favorites')}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeSkyrimModal}
                className="text-xs text-stone-400 hover:text-white cursor-pointer"
              >
                {t('ui.close_favorites', { key: formatKeyCodeLabel(kb.favoritesModal) })}
              </button>
            </div>

            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {favoriteItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-400">
                  {t('ui.empty_favorites', { key: formatKeyCodeLabel(kb.inventoryModal) })}
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
                        closeSkyrimModal();
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

          {/* Top-Center Visual Enemy Health Bar & Combat/Loot Toasts (No numeric HP text!) */}
          {(telemetry.activeEnemyHealthBar ||
            telemetry.targetedCreature ||
            telemetry.lastArrowHitTargetName ||
            telemetry.lootNotification ||
            telemetry.skills?.lastLevelUpTitle) && (
            <div
              className="fixed left-1/2 top-16 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2 z-20"
              aria-hidden="true"
            >
              {telemetry.targetedCreature && !telemetry.activeEnemyHealthBar && (
                <div
                  data-testid="targeted-creature-hud"
                  className="w-64 sm:w-80 px-3.5 py-2 rounded-xl flex flex-col gap-1.5 shadow-2xl backdrop-blur-md"
                  style={{
                    backgroundColor: 'rgba(15, 12, 10, 0.94)',
                    border:
                      telemetry.targetedCreature.threatRating === 'deadly'
                        ? '1px solid rgba(239, 68, 68, 0.85)'
                        : telemetry.targetedCreature.threatRating === 'dangerous'
                          ? '1px solid rgba(245, 158, 11, 0.75)'
                          : '1px solid rgba(52, 211, 153, 0.55)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                          telemetry.targetedCreature.level >= 10
                            ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50'
                            : telemetry.targetedCreature.level >= 7
                              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                              : telemetry.targetedCreature.level >= 4
                                ? 'bg-sky-500/25 text-sky-300 border border-sky-500/50'
                                : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                        }`}
                      >
                        Lv. {telemetry.targetedCreature.level}
                      </span>
                      <span className="text-xs font-bold text-amber-100 uppercase tracking-wide">
                        {telemetry.targetedCreature.speciesName ||
                          getAnimalSpeciesName(telemetry.targetedCreature.species as never)}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        telemetry.targetedCreature.threatRating === 'deadly'
                          ? 'text-rose-400'
                          : telemetry.targetedCreature.threatRating === 'dangerous'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                      }`}
                    >
                      {telemetry.targetedCreature.threatRating}
                    </span>
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{
                      backgroundColor: 'rgba(28, 22, 18, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                    }}
                  >
                    <div
                      className="h-full transition-all duration-150"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            (telemetry.targetedCreature.hp /
                              Math.max(1, telemetry.targetedCreature.maxHp)) *
                              100
                          )
                        )}%`,
                        backgroundColor:
                          telemetry.targetedCreature.threatRating === 'deadly'
                            ? '#dc2626'
                            : telemetry.targetedCreature.threatRating === 'dangerous'
                              ? '#f59e0b'
                              : '#10b981',
                      }}
                    />
                  </div>
                </div>
              )}

              {telemetry.activeEnemyHealthBar && (
                <div
                  data-testid="enemy-health-bar"
                  className="w-64 sm:w-80 px-3.5 py-2 rounded-xl flex flex-col gap-1.5 shadow-2xl"
                  style={{
                    backgroundColor: 'rgba(14, 11, 9, 0.90)',
                    border: telemetry.activeEnemyHealthBar.isBoss
                      ? '1px solid rgba(251, 191, 36, 0.72)'
                      : '1px solid rgba(239, 68, 68, 0.55)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {telemetry.activeEnemyHealthBar.level !== undefined && (
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/25 text-rose-300 border border-rose-500/50">
                          Lv. {telemetry.activeEnemyHealthBar.level}
                        </span>
                      )}
                      <span className="text-xs font-bold tracking-wide text-stone-100 uppercase">
                        {telemetry.activeEnemyHealthBar.name}
                      </span>
                    </div>
                    {telemetry.activeEnemyHealthBar.isSubdued && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-bold">
                        SUBDUED
                      </span>
                    )}
                  </div>
                  <div
                    className="w-full h-2.5 rounded-full overflow-hidden"
                    style={{
                      backgroundColor: 'rgba(28, 22, 18, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                    }}
                  >
                    <div
                      data-testid="enemy-health-bar-fill"
                      className="h-full transition-all duration-150"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            (telemetry.activeEnemyHealthBar.hp /
                              Math.max(1, telemetry.activeEnemyHealthBar.maxHp)) *
                              100
                          )
                        )}%`,
                        backgroundColor: telemetry.activeEnemyHealthBar.isSubdued
                          ? '#f59e0b'
                          : telemetry.activeEnemyHealthBar.isBoss
                            ? '#dc2626'
                            : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              )}

              {telemetry.lootNotification && (
                <div
                  data-testid="hunting-loot-toast"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-emerald-200 whitespace-nowrap shadow-xl"
                  style={{
                    backgroundColor: 'rgba(6, 28, 20, 0.92)',
                    border: '1px solid rgba(52, 211, 153, 0.65)',
                  }}
                >
                  {telemetry.lootNotification}
                </div>
              )}

              {telemetry.lastArrowHitTargetName && (
                <div
                  data-testid="archery-hit-toast"
                  className="px-3.5 py-1 text-xs font-bold text-amber-200 whitespace-nowrap"
                  style={{
                    backgroundColor: 'rgba(14, 12, 10, 0.82)',
                    border: '1px solid rgba(251, 191, 36, 0.45)',
                  }}
                >
                  {t('skills.target_hit_hud', {
                    target: telemetry.lastArrowHitTargetName ?? '',
                  })}
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
            </div>
          )}

          {/* Side/Bottom-Right Action Prompts Dock (Unobstructed center view!) */}
          <div
            className="fixed right-4 bottom-36 md:right-6 md:bottom-8 z-20 pointer-events-none flex flex-col items-end gap-2"
            aria-hidden="true"
          >
            {telemetry.isCrouching && !telemetry.isSwimming && (
              <div
                data-testid="stealth-crouch-badge"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-emerald-200 shadow-xl"
                style={{
                  backgroundColor: 'rgba(10, 22, 18, 0.88)',
                  border: '1px solid rgba(52, 211, 153, 0.5)',
                }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-xs">{t('hud.stealth_badge')}</span>
              </div>
            )}

            {telemetry.nearbyDeadAnimal && (
              <div
                data-testid="loot-animal-prompt"
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-stone-100 shadow-2xl"
                style={{
                  backgroundColor: 'rgba(12, 26, 18, 0.92)',
                  border: '1px solid rgba(52, 211, 153, 0.72)',
                }}
              >
                <kbd
                  className="px-2 py-0.5 rounded-md bg-emerald-400 text-stone-950 font-mono-tabular font-bold text-xs shadow"
                >
                  {formatKeyCodeLabel(kb.interactDoor)}
                </kbd>
                <span className="font-semibold text-xs text-emerald-100">
                  {t('hud.loot_prompt', { species: telemetry.nearbyDeadAnimal.speciesName })}
                </span>
              </div>
            )}

            {telemetry.nearbyFallenTree && !telemetry.nearbyDeadAnimal && (
              <div
                data-testid="harvest-tree-prompt"
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-stone-100 shadow-2xl"
                style={{
                  backgroundColor: 'rgba(22, 18, 11, 0.94)',
                  border: '1px solid rgba(251, 191, 36, 0.75)',
                }}
              >
                <kbd className="px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-mono-tabular font-bold text-xs shadow">
                  {formatKeyCodeLabel(kb.interactDoor)}
                </kbd>
                <span className="font-semibold text-xs text-amber-100">
                  {t('hud.harvest_fallen_tree', {
                    name: telemetry.nearbyFallenTree.name,
                    count: telemetry.nearbyFallenTree.woodYield,
                  })}
                </span>
              </div>
            )}

            {telemetry.nearbyChest && !telemetry.nearbyDeadAnimal && !telemetry.nearbyFallenTree && (
              <div
                data-testid="open-chest-prompt"
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-stone-100 shadow-2xl"
                style={{
                  backgroundColor: 'rgba(15, 13, 10, 0.92)',
                  border: '1px solid rgba(251, 191, 36, 0.72)',
                }}
              >
                <kbd className="px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-mono-tabular font-bold text-xs shadow">
                  {formatKeyCodeLabel(kb.interactDoor)}
                </kbd>
                <span className="font-semibold text-xs text-amber-100">
                  {t('hud.open_chest', { name: telemetry.nearbyChest.name })}
                </span>
              </div>
            )}

            {telemetry.nearbyBed && !telemetry.nearbyDeadAnimal && !telemetry.nearbyChest && (
              <div
                data-testid="bed-sleep-prompt"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-stone-100 shadow-2xl"
                style={{
                  backgroundColor: 'rgba(15, 13, 10, 0.90)',
                  border: '1px solid rgba(251, 191, 36, 0.55)',
                }}
              >
                <kbd className="px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-mono-tabular font-bold text-sm shadow">
                  {formatKeyCodeLabel(kb.interactDoor)}
                </kbd>
                <span className="font-semibold tracking-wide text-sm text-amber-100">
                  {t('hud.sleep')}
                </span>
              </div>
            )}

            {telemetry.nearbyMarket && (
              <div
                data-testid="market-stall-prompt"
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-stone-100 shadow-2xl"
                style={{
                  backgroundColor: 'rgba(15, 13, 10, 0.90)',
                  border: '1px solid rgba(251, 191, 36, 0.65)',
                }}
              >
                <kbd className="px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-mono-tabular font-bold text-xs shadow">
                  {formatKeyCodeLabel(kb.marketModal)}
                </kbd>
                <span className="font-semibold text-xs text-amber-100">
                  {t('market.hud.buy_and_sell_weapons', {
                    market: telemetry.nearbyMarket.name ?? '',
                  })}
                </span>
              </div>
            )}

            {telemetry.nearbyDoor &&
              !telemetry.nearbyBed &&
              !telemetry.climbingLadder &&
              !telemetry.nearbyLadder && (
              <div
                data-testid="door-prompt"
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-stone-100 shadow-2xl"
                style={{
                  backgroundColor: 'rgba(15, 13, 10, 0.90)',
                  border: '1px solid rgba(251, 191, 36, 0.55)',
                }}
              >
                <kbd className="px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-mono-tabular font-bold text-sm shadow">
                  {formatKeyCodeLabel(kb.interactDoor)}
                </kbd>
                <span className="font-semibold tracking-wide text-sm text-amber-100">
                  {telemetry.nearbyDoor.isOpen ? t('hud.door_close') : t('hud.door_open')}
                </span>
              </div>
            )}

            {(telemetry.climbingLadder || telemetry.nearbyLadder) && (
              <div
                data-testid="ladder-prompt"
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-stone-100 shadow-2xl"
                style={{
                  backgroundColor: 'rgba(15, 13, 10, 0.90)',
                  border: '1px solid rgba(251, 191, 36, 0.55)',
                }}
              >
                <kbd className="px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-mono-tabular font-bold text-sm shadow">
                  {formatKeyCodeLabel(kb.jump)}
                </kbd>
                <span className="font-semibold tracking-wide text-sm text-amber-100">
                  {t('hud.climb')}
                </span>
              </div>
            )}

            {(telemetry.drivingMinecart || telemetry.nearbyMinecart) && (
              <div
                data-testid="minecart-drive-prompt"
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-stone-100 shadow-2xl"
                style={{
                  backgroundColor: 'rgba(15, 13, 10, 0.92)',
                  border: '1px solid rgba(251, 191, 36, 0.72)',
                }}
              >
                <kbd className="px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-mono-tabular font-bold text-sm shadow">
                  {formatKeyCodeLabel(kb.interactDoor)}
                </kbd>
                <span className="font-semibold tracking-wide text-sm text-amber-100">
                  {telemetry.drivingMinecart
                    ? 'Exit · [W/S] Drive'
                    : 'Drive'}
                </span>
              </div>
            )}

            {telemetry.mountedHorseId === 'sailable-ship' && (() => {
              const distToAtlantis = Math.round(
                Math.hypot(
                  RUINED_ATLANTIS_POS.dockX - telemetry.x,
                  RUINED_ATLANTIS_POS.dockZ - telemetry.z
                )
              );
              const arrivedAtAtlantis = distToAtlantis <= 36;
              return (
                <div
                  data-testid="ship-wayfinder-compass"
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-cyan-100 shadow-2xl"
                  style={{
                    backgroundColor: 'rgba(8, 28, 38, 0.92)',
                    border: '1px solid rgba(34, 211, 238, 0.68)',
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-semibold tracking-wide text-xs text-cyan-100">
                    {arrivedAtAtlantis
                      ? 'Ruined Atlantis Dock Reached — Press [F] to Drop Anchor'
                      : `Atlantean Wayfinder: ${distToAtlantis}m East-Southeast`}
                  </span>
                </div>
              );
            })()}

            {(telemetry.nearbyHorse || telemetry.mountedHorseId) &&
              !telemetry.climbingLadder &&
              !telemetry.nearbyLadder && (
                <div
                  data-testid="horse-prompt"
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-stone-100 shadow-2xl"
                  style={{
                    backgroundColor: 'rgba(15, 13, 10, 0.90)',
                    border: '1px solid rgba(251, 191, 36, 0.55)',
                  }}
                >
                  <kbd className="px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-mono-tabular font-bold text-sm shadow">
                    {formatKeyCodeLabel(kb.mountHorse)}
                  </kbd>
                  <span className="font-semibold tracking-wide text-sm text-amber-100">
                    {telemetry.mountedHorseId === 'sailable-ship'
                      ? 'Drop Anchor / Disembark'
                      : telemetry.mountedHorseId
                        ? t('hud.dismount')
                        : telemetry.nearbyHorse?.id === 'sailable-ship'
                          ? 'Sail Ship'
                          : t('hud.ride_horse')}
                  </span>
                </div>
              )}

            {/* Trapper's Workbench Prompt */}
            {telemetry.nearbyTrapWorkbench && (
              <div
                data-testid="trap-workbench-prompt"
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-amber-100 shadow-2xl"
                style={{
                  backgroundColor: 'rgba(28, 18, 10, 0.94)',
                  border: '1px solid rgba(245, 158, 11, 0.75)',
                }}
              >
                <kbd className="px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-mono-tabular font-bold text-sm shadow">
                  {formatKeyCodeLabel(kb.interactDoor)}
                </kbd>
                <span className="font-semibold tracking-wide text-sm text-amber-200">
                  {telemetry.nearbyTrapWorkbench.name || "Trapper's Workbench"}
                </span>
              </div>
            )}

            {/* Placed Trap Interaction Prompt */}
            {telemetry.nearbyPlacedTrap && (
              <div
                data-testid="placed-trap-prompt"
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-stone-100 shadow-2xl"
                style={{
                  backgroundColor:
                    telemetry.nearbyPlacedTrap.status === 'sprung' || telemetry.nearbyPlacedTrap.sprung
                      ? 'rgba(6, 44, 28, 0.95)'
                      : 'rgba(28, 18, 10, 0.94)',
                  border:
                    telemetry.nearbyPlacedTrap.status === 'sprung' || telemetry.nearbyPlacedTrap.sprung
                      ? '1px solid rgba(52, 211, 153, 0.85)'
                      : '1px solid rgba(245, 158, 11, 0.65)',
                }}
              >
                <kbd className="px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-mono-tabular font-bold text-sm shadow">
                  {formatKeyCodeLabel(kb.interactDoor)}
                </kbd>
                <span className="font-semibold tracking-wide text-sm text-stone-100">
                  {telemetry.nearbyPlacedTrap.status === 'sprung' || telemetry.nearbyPlacedTrap.sprung
                    ? `Harvest Trap: Caught ${telemetry.nearbyPlacedTrap.caughtAnimalName ?? 'Game'} (Lv. ${telemetry.nearbyPlacedTrap.caughtAnimalLevel ?? 1})! (+XP)`
                    : 'Pick Up Armed Trap'}
                </span>
              </div>
            )}

            {/* Active Held Trap Placement Mode Banner (Green = Valid, Red = Invalid) */}
            {telemetry.heldTrapStatus && (
              <div
                data-testid="held-trap-placement-banner"
                className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl shadow-2xl text-xs"
                style={{
                  backgroundColor: telemetry.heldTrapStatus.valid
                    ? 'rgba(6, 44, 28, 0.94)'
                    : 'rgba(68, 12, 12, 0.94)',
                  border: telemetry.heldTrapStatus.valid
                    ? '1.5px solid rgba(34, 197, 94, 0.9)'
                    : '1.5px solid rgba(239, 68, 68, 0.9)',
                }}
              >
                <div className="flex items-center gap-2 font-bold text-sm text-white">
                  <span>{telemetry.heldTrapStatus.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/50 text-amber-300 font-mono-tabular text-xs">
                    ×{telemetry.heldTrapStatus.count}
                  </span>
                </div>
                <div
                  className={`font-semibold tracking-wide ${
                    telemetry.heldTrapStatus.valid ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {telemetry.heldTrapStatus.valid
                    ? 'Valid Placement — Left-Click to Place Trap'
                    : telemetry.heldTrapStatus.reason}
                </div>
                <div className="text-[11px] text-stone-300/90 font-mono">
                  [Left-Click] Place • [Right-Click / R] Put Away
                </div>
              </div>
            )}

            {/* Trap Deploy Hint when carrying traps in inventory and not currently holding one */}
            {!telemetry.heldTrapStatus &&
              (() => {
                const hasTrap = [
                  'trap_cage_small',
                  'trap_snare',
                  'trap_bear_jaw',
                  'trap_net',
                  'trap_fish',
                ].some((id) => ownedItemIds.includes(id as InventoryItemId));
                if (!hasTrap) return null;
                return (
                  <div
                    data-testid="deploy-trap-hint"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-amber-200 shadow-lg text-xs"
                    style={{
                      backgroundColor: 'rgba(20, 15, 10, 0.92)',
                      border: '1px solid rgba(245, 158, 11, 0.55)',
                    }}
                  >
                    <kbd className="px-1.5 py-0.5 rounded bg-amber-400 text-stone-950 font-mono-tabular font-bold text-xs shadow">
                      T
                    </kbd>
                    <span className="font-semibold">Hold Trap</span>
                    {(telemetry.placedTrapsCount ?? 0) > 0 && (
                      <span className="text-[11px] text-amber-400/80 font-mono">
                        ({telemetry.placedTrapsCount} active)
                      </span>
                    )}
                  </div>
                );
              })()}

            {telemetry.isSwimming && (
              <div
                data-testid="swim-dive-prompt"
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-stone-100 shadow-2xl"
                style={{
                  backgroundColor: 'rgba(12, 34, 48, 0.90)',
                  border: '1px solid rgba(56, 189, 248, 0.55)',
                }}
              >
                <kbd className="px-2 py-0.5 rounded-md bg-sky-400 text-stone-950 font-mono-tabular font-bold text-xs shadow">
                  {formatKeyCodeLabel(kb.relaxedWalk)}
                </kbd>
                <span className="font-semibold tracking-wide text-xs text-sky-100">
                  {t('hud.dive')}
                </span>
                <span className="text-sky-400/60">·</span>
                <kbd className="px-2 py-0.5 rounded-md bg-sky-400 text-stone-950 font-mono-tabular font-bold text-xs shadow">
                  {formatKeyCodeLabel(kb.jump)}
                </kbd>
                <span className="font-semibold tracking-wide text-xs text-sky-100">
                  {t('hud.surface')}
                </span>
              </div>
            )}

            {/* Bottom-Right Bow Mode Arrow Counter HUD */}
            {(telemetry.equippedTool ?? 'bow') === 'bow' && (
              <div
                data-testid="hud-arrow-counter"
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-stone-100 shadow-2xl"
                style={{
                  backgroundColor: 'rgba(16, 14, 11, 0.92)',
                  border:
                    activeArrowCount > 0
                      ? '1px solid rgba(251, 191, 36, 0.65)'
                      : '1px solid rgba(244, 63, 94, 0.72)',
                }}
              >
                <span className={activeArrowCount > 0 ? 'text-amber-400' : 'text-rose-400'}>
                  {renderItemSvgIcon(activeArrowItemId, 'w-4 h-4')}
                </span>
                <span className="text-xs font-semibold text-stone-200">
                  {ITEM_SHORT_NAMES[activeArrowItemId] ?? 'Arrows'}
                </span>
                <span
                  data-testid="hud-arrow-counter-value"
                  className={`px-2 py-0.5 rounded font-mono-tabular text-xs font-bold ${
                    activeArrowCount > 0
                      ? 'bg-amber-400/20 text-amber-300'
                      : 'bg-rose-500/25 text-rose-300'
                  }`}
                >
                  ×{activeArrowCount}
                </span>
              </div>
            )}
          </div>

          {/* Skyrim-Style Vitals HUD (Health, Hunger & Stamina Bars) at Bottom Center */}
          <div
            data-testid="hud-vitals-bars"
            className="fixed left-1/2 bottom-4 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-1.5 z-20"
            aria-hidden="true"
          >
            {/* Clean Stamina Bar (Mount Stamina when riding, Player Stamina when on foot — no text explanation above it) */}
            {(() => {
              const isMountedOnBeast =
                Boolean(telemetry.mountedHorseId) && telemetry.mountedHorseId !== 'sailable-ship';
              const curStamina = isMountedOnBeast ? telemetry.mountStamina : telemetry.stamina;
              const curMaxStamina = isMountedOnBeast
                ? telemetry.mountMaxStamina
                : telemetry.maxStamina;
              const curExhausted = isMountedOnBeast
                ? Boolean(telemetry.mountStaminaExhausted)
                : Boolean(telemetry.staminaExhausted);
              if (
                curStamina === undefined ||
                curMaxStamina === undefined ||
                (!isMountedOnBeast && curStamina >= curMaxStamina - 0.5)
              ) {
                return null;
              }
              return (
                <div
                  data-testid={isMountedOnBeast ? 'hud-horse-stamina' : 'hud-stamina-bar'}
                  className="w-52 h-2 rounded-full overflow-hidden shadow-lg"
                  style={{
                    backgroundColor: 'rgba(12, 10, 9, 0.85)',
                    border: curExhausted
                      ? '1px solid rgba(245, 158, 11, 0.75)'
                      : '1px solid rgba(52, 211, 153, 0.45)',
                  }}
                >
                  <div
                    data-testid={isMountedOnBeast ? 'hud-horse-stamina-fill' : undefined}
                    className={`h-full transition-all duration-100 ${
                      curExhausted ? 'animate-pulse' : ''
                    }`}
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, (curStamina / Math.max(1, curMaxStamina)) * 100)
                      )}%`,
                      backgroundColor: curExhausted ? '#f59e0b' : '#10b981',
                    }}
                  />
                </div>
              );
            })()}

            {/* Health & Hunger Row */}
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-stone-950/85 border border-stone-800/80 shadow-xl">
              {/* Health (HP) Bar */}
              <div className="flex items-center gap-1.5" data-testid="hud-hp-bar">
                <span className="text-[10px] font-bold tracking-wider uppercase text-rose-400">
                  HP
                </span>
                <div className="w-24 sm:w-28 h-2 rounded-full overflow-hidden bg-stone-900 border border-rose-500/35">
                  <div
                    data-testid="hud-hp-bar-fill"
                    className="h-full transition-all duration-150"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          ((telemetry.hp ?? 100) / Math.max(1, telemetry.maxHp ?? 100)) * 100
                        )
                      )}%`,
                      backgroundColor: '#f43f5e',
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono-tabular font-bold text-rose-200 w-7 text-right">
                  {Math.round(telemetry.hp ?? 100)}
                </span>
              </div>

              <span className="text-stone-700">|</span>

              {/* Hunger Bar */}
              <div className="flex items-center gap-1.5" data-testid="hud-hunger-bar">
                <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400">
                  Hunger
                </span>
                <div className="w-24 sm:w-28 h-2 rounded-full overflow-hidden bg-stone-900 border border-amber-500/35">
                  <div
                    data-testid="hud-hunger-bar-fill"
                    className="h-full transition-all duration-150"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          ((telemetry.hunger ?? 100) / Math.max(1, telemetry.maxHunger ?? 100)) *
                            100
                        )
                      )}%`,
                      backgroundColor: '#f59e0b',
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono-tabular font-bold text-amber-200 w-7 text-right">
                  {Math.round(telemetry.hunger ?? 100)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom-Left Fog-of-War Explorer Minimap & [M] Full-Screen Interactive World Map */}
      <ExplorerMinimap
        playerX={telemetry.x}
        playerY={telemetry.y}
        playerZ={telemetry.z}
        yawDeg={telemetry.yawDeg}
        isPlaying={gameState === 'playing'}
        godMode={gameSettings.godMode !== false}
        onTeleportToWorldPos={(wx, wz, layer) => {
          gameActions?.onTeleportToWorldPos?.(wx, wz, layer);
        }}
      />

      {/* Mobile Touch Walk Pad (Positioned on Bottom-Right so it never overlaps the Bottom-Left Minimap) */}
      {gameState === 'playing' && (
        <div className="md:hidden fixed bottom-4 right-3 flex items-end gap-2 pointer-events-none z-20">
          <div
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

            {/* Dynamic Weather Selector (God Mode Only) */}
            {gameSettings.godMode !== false && (
              <div
                className="p-4 rounded-xl flex flex-col gap-2.5 text-xs text-stone-300"
                style={{
                  backgroundColor: 'rgba(30, 26, 22, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sky-300">
                    {t('ui.weather_control_label', { key: formatKeyCodeLabel(kb.cycleWeather) })}
                  </span>
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
            )}

            {/* Visual Collider Wireframe Debug Toggle */}
            <div
              className="p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs text-stone-300"
              style={{
                backgroundColor: 'rgba(30, 26, 22, 0.9)',
                border: telemetry.colliderDebugVisible
                  ? '1px solid rgba(56, 189, 248, 0.55)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-amber-200">
                  {t('hud.collider_debug_title')}
                </span>
                <span className="text-[11px] text-stone-400">
                  {t('hud.collider_debug_hint')}
                </span>
              </div>
              <button
                type="button"
                data-testid="toggle-collider-debug-btn"
                onClick={() => {
                  const win = window as unknown as {
                    toggleColliderDebug?: () => boolean;
                  };
                  win.toggleColliderDebug?.();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                  telemetry.colliderDebugVisible
                    ? 'bg-sky-400 text-stone-950'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {telemetry.colliderDebugVisible ? t('hud.toggle_on') : t('hud.toggle_off')}
              </button>
            </div>

            {/* Primary Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-stone-800">
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
                data-testid="pause-open-settings-btn"
                onClick={() => onOpenSettings?.()}
                className="py-3 px-4 rounded-xl text-sm font-medium text-amber-200 hover:text-white bg-stone-800 hover:bg-stone-700 border border-amber-500/35 transition-colors cursor-pointer whitespace-nowrap"
              >
                {t('title.settings')}
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
