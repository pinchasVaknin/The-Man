// ============================================================================
// MODULE: Components / Skyrim Inventory Modal
// DESIGN: Humble UI modal implementing Skyrim-style split-pane inventory (SRP)
// SUMMARY: Displays categories (Weapons, Ammo, Gear, Market, Skills), 3D item inspections,
//          gold transactions, hotbar slot bindings, and player attributes.
// ============================================================================

// ======================== IMPORTS & PROPS ======================== \\
// #region Imports & Props
import React, { useState } from 'react';
import {
  INVENTORY_ITEMS,
  InventoryItemId,
  InventoryItemDef,
  CharacterSkillsState,
  getMarketSellPrice,
} from '../world/terrainMath';
import { renderArtifactArtwork } from './itemArtworkRegistry';
export { renderArtifactArtwork };

export type InventoryCategoryTab =
  | 'all'
  | 'weapons'
  | 'materials'
  | 'ammo'
  | 'gear'
  | 'treasures'
  | 'market'
  | 'skills';

export interface ISkyrimInventoryModalProps {
  selectedCategory: InventoryCategoryTab;
  onSelectCategory: (cat: InventoryCategoryTab) => void;
  selectedItemId: InventoryItemId;
  onSelectItem: (id: InventoryItemId) => void;
  isItemEquipped: (id: InventoryItemId) => boolean;
  isItemOwned: (id: InventoryItemId) => boolean;
  goldCoins: number;
  favoriteIds: InventoryItemId[];
  hotbarSlots: (InventoryItemId | null)[];
  onEquipItem: (id: InventoryItemId) => void;
  onBuyItem: (id: InventoryItemId) => { ok: boolean; reasonHe: string };
  onSellItem: (id: InventoryItemId) => { ok: boolean; reasonHe: string };
  onToggleFavorite: (id: InventoryItemId) => void;
  onAssignHotbar: (slotIdx: number, id: InventoryItemId) => void;
  onClose: () => void;
  nearbyMarket?: { id: string; nameHe: string } | null;
  skills?: CharacterSkillsState;
  stamina?: number;
  maxStamina?: number;
  distanceWalked?: number;
  arrowsShotCount?: number;
}
export type SkyrimInventoryModalProps = ISkyrimInventoryModalProps;

export const SHORT_NAMES_HE: Record<InventoryItemId, string> = {
  bow: 'קשת ציידים',
  sword: 'חרב רונות',
  torch: 'לפיד אש',
  unarmed: 'ידיים',
  arrow_normal: 'חץ פלדה',
  arrow_fire: 'חץ אש',
  arrow_wind: 'חץ סערה',
  oak_timber: 'קורות אלון',
  cut_granite_blocks: 'לבני גרניט',
  iron_ingots: 'מטילי ברזל',
  imperial_clay_tiles: 'רעפי חרס',
  marble_pillar_stone: 'אבן שיש',
  dwarven_gold_ore: 'עפרת זהב',
  crystal_gem: 'גביש אור',
  ancient_dwarven_horn: 'קרן גמדים',
  elven_cloak: 'גלימת סייר',
  katana_imperial: 'להב קיסרי',
  elven_longbow: 'קשת אלפים',
  dwarven_warhammer: 'חרב גמדים',
  dragonbone_bow: 'קשת דרקון',
  celestial_jin_sword: 'חרב שמיימית',
};

const NON_SELLABLE_STARTER_IDS: InventoryItemId[] = ['unarmed'];
// #endregion

// ======================== MODAL COMPONENT ======================== \\
// #region Modal Component

export const SkyrimInventoryModal = React.memo<SkyrimInventoryModalProps>(({
  selectedCategory,
  onSelectCategory,
  selectedItemId,
  onSelectItem,
  isItemEquipped,
  isItemOwned,
  goldCoins,
  hotbarSlots,
  onEquipItem,
  onBuyItem,
  onSellItem,
  onAssignHotbar,
  onClose,
  nearbyMarket,
  skills,
}) => {
  const [tradeFeedbackHe, setTradeFeedbackHe] = useState<string | null>(null);
  const [tradeSide, setTradeSide] = useState<'player' | 'merchant'>('merchant');
  const [playerMarketCat, setPlayerMarketCat] = useState<'all' | 'weapons' | 'materials'>('all');
  const [merchantMarketCat, setMerchantMarketCat] = useState<'all' | 'weapons' | 'materials'>('all');

  const s: CharacterSkillsState = skills ?? {
    archeryLevel: 1,
    archeryXp: 0,
    archeryXpNext: 240,
    swordsmanshipLevel: 1,
    swordsmanshipXp: 0,
    swordsmanshipXpNext: 240,
    horsemanshipLevel: 1,
    horsemanshipXp: 0,
    horsemanshipXpNext: 240,
    athleticsLevel: 1,
    athleticsXp: 0,
    athleticsXpNext: 240,
    explorationLevel: 1,
    explorationXp: 0,
    explorationXpNext: 240,
  };

  const totalSkillLevels =
    s.archeryLevel +
    s.swordsmanshipLevel +
    s.horsemanshipLevel +
    s.athleticsLevel +
    s.explorationLevel;
  const overallHeroLevel = Math.max(1, 1 + Math.floor((totalSkillLevels - 5) / 2));

  const inHarborMarket = Boolean(nearbyMarket);

  // Personal Inventory Mode (Outside Market): ONLY show items currently owned by the player!
  const activePersonalTab: 'weapons' | 'materials' =
    selectedCategory === 'materials' || selectedCategory === 'treasures'
      ? 'materials'
      : 'weapons';

  const ownedPersonalItems: readonly InventoryItemDef[] = INVENTORY_ITEMS.filter((item) => {
    if (!isItemOwned(item.id)) return false;
    if (activePersonalTab === 'materials') {
      return item.category === 'materials';
    }
    return item.category === 'weapons' || item.category === 'ammo' || item.id === 'torch';
  });

  // Harbor Market Mode: Left Column = Player's Owned Items | Right Column = Merchant's Items
  const playerOwnedMarketItems: readonly InventoryItemDef[] = INVENTORY_ITEMS.filter((item) => {
    if (!isItemOwned(item.id) || item.id === 'unarmed') return false;
    if (playerMarketCat === 'weapons') {
      return item.category === 'weapons' || item.category === 'ammo' || item.id === 'torch';
    }
    if (playerMarketCat === 'materials') {
      return item.category === 'materials';
    }
    return true;
  });

  const merchantCatalogItems: readonly InventoryItemDef[] = INVENTORY_ITEMS.filter((item) => {
    if (item.id === 'unarmed') return false;
    if (merchantMarketCat === 'weapons') {
      return item.category === 'weapons' || item.category === 'ammo' || item.id === 'torch';
    }
    if (merchantMarketCat === 'materials') {
      return item.category === 'materials';
    }
    return true;
  });

  const inspectedItem: InventoryItemDef = (() => {
    if (!inHarborMarket) {
      return (
        ownedPersonalItems.find((i) => i.id === selectedItemId) ??
        ownedPersonalItems[0] ??
        INVENTORY_ITEMS[0]
      );
    }
    return (
      INVENTORY_ITEMS.find((i) => i.id === selectedItemId) ??
      merchantCatalogItems[0] ??
      INVENTORY_ITEMS[0]
    );
  })();

  const inspectedOwned = isItemOwned(inspectedItem.id);
  const inspectedEquipped = isItemEquipped(inspectedItem.id);
  const inspectedReqLevel = inspectedItem.requiredLevel ?? 1;
  const inspectedLevelLocked = !inspectedOwned && overallHeroLevel < inspectedReqLevel;
  const inspectedSellPrice = getMarketSellPrice(inspectedItem);
  const canSellInspected =
    inHarborMarket &&
    inspectedOwned &&
    !NON_SELLABLE_STARTER_IDS.includes(inspectedItem.id) &&
    inspectedSellPrice > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="תפריט נשקים, חומרי בנייה ושוק הנמל"
      data-testid="skyrim-inventory-modal"
      dir="rtl"
      className="fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-7 pointer-events-auto select-none overflow-hidden"
      style={{
        background:
          'linear-gradient(90deg, rgba(8, 10, 12, 0.92) 0%, rgba(12, 15, 18, 0.86) 50%, rgba(8, 10, 12, 0.92) 100%)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Minimal Header Bar */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between pb-3 border-b border-stone-700/60">
        <div className="flex items-center gap-6">
          <h1 className="font-display-he text-2xl sm:text-3xl font-bold text-stone-100 tracking-wide">
            {inHarborMarket ? `שוק הנמל · ${nearbyMarket?.nameHe}` : 'ציוד הסייר האישי'}
          </h1>
          <div className="flex items-center gap-4 text-sm text-stone-300">
            <span>
              דרגת סייר: <strong className="text-amber-300 font-mono-tabular">{overallHeroLevel}</strong>
            </span>
            <span className="text-stone-600">|</span>
            <span data-testid="inventory-gold-display">
              זהב: <strong className="text-amber-400 font-mono-tabular">{goldCoins}</strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="close-skyrim-inventory"
          onClick={onClose}
          className="text-sm font-semibold text-stone-300 hover:text-amber-300 transition-colors cursor-pointer px-3 py-1.5"
        >
          סגור [Tab]
        </button>
      </header>

      {inHarborMarket ? (
        /* =====================================================================
           HARBOR MARKET SPLIT 3-COLUMN LAYOUT (dir="ltr" so Left = Player, Center = Showcase, Right = Merchant)
           ===================================================================== */
        <div
          dir="ltr"
          data-testid="harbor-market-split-layout"
          className="w-full max-w-7xl mx-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 py-4 overflow-hidden items-stretch"
        >
          {/* PHYSICAL LEFT COLUMN (בצד שמאל של המסך — מה יש לי / הציוד שלי למכירה) */}
          <div
            dir="rtl"
            data-testid="market-left-player-column"
            className="md:col-span-4 flex flex-col h-full max-h-[75vh] bg-stone-900/55 border border-stone-700/60 p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-700/70">
              <div>
                <h2 className="font-display-he text-xl font-bold text-amber-300">
                  הציוד שלי (בצד שמאל)
                </h2>
                <p className="text-xs text-stone-400">לחץ על פריט שברשותך להצגה ומכירה במרכז</p>
              </div>
              <span className="text-xs font-mono-tabular text-stone-300 bg-stone-800/80 px-2 py-0.5">
                {playerOwnedMarketItems.length} פריטים
              </span>
            </div>

            {/* Category Filter for Player's Owned Items */}
            <div className="flex items-center gap-2 mb-3">
              {(
                [
                  ['all', 'הכל'],
                  ['weapons', 'נשקים'],
                  ['materials', 'חומרי בנייה'],
                ] as const
              ).map(([catKey, labelHe]) => (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setPlayerMarketCat(catKey)}
                  className={`px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                    playerMarketCat === catKey
                      ? 'bg-amber-400 text-stone-950'
                      : 'bg-stone-800/70 text-stone-300 hover:text-white'
                  }`}
                >
                  {labelHe}
                </button>
              ))}
            </div>

            <div
              data-testid="market-player-owned-list"
              className="flex-1 overflow-y-auto space-y-1.5 pr-1"
            >
              {playerOwnedMarketItems.map((item) => {
                const isSelected = inspectedItem.id === item.id && tradeSide === 'player';
                const equipped = isItemEquipped(item.id);
                const sellVal = getMarketSellPrice(item);

                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`player-market-item-${item.id}`}
                    onClick={() => {
                      setTradeSide('player');
                      onSelectItem(item.id);
                      setTradeFeedbackHe(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-right transition-colors cursor-pointer border-r-2 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/40 text-white font-bold'
                        : 'border-transparent text-stone-300 hover:bg-stone-800/50 hover:text-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-sm sm:text-base">{item.nameHe}</span>
                      {equipped && (
                        <span className="text-[11px] font-semibold text-amber-300 shrink-0">
                          [מצויד]
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono-tabular text-amber-300 shrink-0">
                      מכירה: +{sellVal} זהב
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PHYSICAL CENTER COLUMN (במרכז המסך — פרטים מלאים ואופציית מכירה / קנייה) */}
          <div
            dir="rtl"
            data-testid="market-center-showcase"
            className="md:col-span-4 flex flex-col items-center justify-center text-center bg-stone-950/65 border border-stone-700/70 p-5 overflow-y-auto"
          >
            <div
              className={`px-3 py-1 text-xs font-bold mb-3 border ${
                tradeSide === 'player'
                  ? 'bg-amber-950/60 border-amber-400/50 text-amber-200'
                  : 'bg-emerald-950/60 border-emerald-400/50 text-emerald-200'
              }`}
            >
              {tradeSide === 'player'
                ? 'נבחר מהרשימה שלך (שמאל) · מוכן למכירה או ציוד'
                : 'נבחר מרשימת המוכר (ימין) · מוכן לקנייה'}
            </div>

            <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center mb-3">
              {renderArtifactArtwork(inspectedItem.id, 'w-44 h-44 sm:w-48 sm:h-48')}
            </div>

            <div className="text-xs font-semibold text-amber-300/90 tracking-wide mb-1">
              {inspectedItem.categoryLabelHe} · דרגה נדרשת {inspectedReqLevel}
            </div>
            <h2
              data-testid="inspected-item-title"
              className="font-display-he text-2xl sm:text-3xl font-bold text-white mb-2"
            >
              {inspectedItem.nameHe}
            </h2>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-stone-300 mb-3">
              <span className="text-amber-200 font-semibold">{inspectedItem.statLabelHe}</span>
              <span className="text-stone-600">·</span>
              <span>משקל: {inspectedItem.weight}</span>
              <span className="text-stone-600">·</span>
              <span>
                {tradeSide === 'player'
                  ? `תמורת מכירה: ${inspectedSellPrice} זהב`
                  : `מחיר קנייה: ${inspectedItem.valueGold} זהב`}
              </span>
            </div>

            <p className="max-w-sm text-xs sm:text-sm text-stone-300/90 leading-relaxed mb-4">
              {inspectedItem.descriptionHe}
            </p>

            {tradeFeedbackHe && (
              <div
                data-testid="trade-feedback-banner"
                className="mb-3 px-4 py-1.5 text-xs font-bold text-amber-200 bg-stone-900/95 border border-amber-400/50"
              >
                {tradeFeedbackHe}
              </div>
            )}

            {/* Center Action Buttons based on whether item was clicked from Player (Left) or Merchant (Right) */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              {tradeSide === 'player' ? (
                <>
                  {canSellInspected && (
                    <button
                      type="button"
                      data-testid="skyrim-sell-btn"
                      onClick={() => {
                        const res = onSellItem(inspectedItem.id);
                        setTradeFeedbackHe(res.reasonHe);
                      }}
                      className="w-full py-2.5 px-5 text-sm font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer"
                    >
                      מכור לסוחר (+{inspectedSellPrice} מטבעות זהב)
                    </button>
                  )}
                  {inspectedOwned && inspectedItem.category !== 'materials' && (
                    <button
                      type="button"
                      data-testid="skyrim-equip-btn"
                      onClick={() => onEquipItem(inspectedItem.id)}
                      className="w-full py-2 px-4 text-xs font-bold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-600 transition-colors cursor-pointer"
                    >
                      {inspectedEquipped ? 'מצויד כעת [E]' : 'צייד פריט [E]'}
                    </button>
                  )}
                </>
              ) : (
                <>
                  {!inspectedOwned ? (
                    <button
                      type="button"
                      data-testid="skyrim-buy-btn"
                      disabled={inspectedLevelLocked || goldCoins < inspectedItem.valueGold}
                      onClick={() => {
                        const res = onBuyItem(inspectedItem.id);
                        setTradeFeedbackHe(res.reasonHe);
                      }}
                      className={`w-full py-2.5 px-5 text-sm font-bold transition-colors ${
                        inspectedLevelLocked
                          ? 'bg-rose-950/80 text-rose-200 border border-rose-500/40 cursor-not-allowed'
                          : goldCoins < inspectedItem.valueGold
                            ? 'bg-stone-800 text-stone-400 cursor-not-allowed'
                            : 'bg-emerald-400 hover:bg-emerald-300 text-stone-950 cursor-pointer'
                      }`}
                    >
                      {inspectedLevelLocked
                        ? `נדרשת דרגת סייר ${inspectedReqLevel}`
                        : goldCoins < inspectedItem.valueGold
                          ? `חסר זהב (${inspectedItem.valueGold} זהב)`
                          : `קנה מהסוחר (${inspectedItem.valueGold} מטבעות זהב)`}
                    </button>
                  ) : (
                    <div className="w-full flex flex-col gap-2">
                      <div className="py-2 px-4 text-xs font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/40">
                        הפריט כבר נמצא ברשותך (מופיע ברשימה משמאל)
                      </div>
                      {canSellInspected && (
                        <button
                          type="button"
                          data-testid="skyrim-sell-btn"
                          onClick={() => {
                            const res = onSellItem(inspectedItem.id);
                            setTradeFeedbackHe(res.reasonHe);
                          }}
                          className="w-full py-2 px-4 text-xs font-bold text-amber-200 bg-stone-800 hover:bg-stone-700 border border-amber-400/40 cursor-pointer"
                        >
                          מכור לסוחר (+{inspectedSellPrice} זהב)
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* PHYSICAL RIGHT COLUMN (בצד ימין של המסך — מה יש למוכר / קטלוג קנייה) */}
          <div
            dir="rtl"
            data-testid="market-right-merchant-column"
            className="md:col-span-4 flex flex-col h-full max-h-[75vh] bg-stone-900/55 border border-stone-700/60 p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-700/70">
              <div>
                <h2 className="font-display-he text-xl font-bold text-emerald-300">
                  סחורת המוכר (בצד ימין)
                </h2>
                <p className="text-xs text-stone-400">לחץ על פריט של המוכר להצגה וקנייה במרכז</p>
              </div>
              <span className="text-xs font-mono-tabular text-stone-300 bg-stone-800/80 px-2 py-0.5">
                {merchantCatalogItems.length} פריטים
              </span>
            </div>

            {/* Category Filter for Merchant's Catalog */}
            <div className="flex items-center gap-2 mb-3">
              {(
                [
                  ['all', 'הכל'],
                  ['weapons', 'נשקים'],
                  ['materials', 'חומרי בנייה'],
                ] as const
              ).map(([catKey, labelHe]) => (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setMerchantMarketCat(catKey)}
                  className={`px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                    merchantMarketCat === catKey
                      ? 'bg-emerald-400 text-stone-950'
                      : 'bg-stone-800/70 text-stone-300 hover:text-white'
                  }`}
                >
                  {labelHe}
                </button>
              ))}
            </div>

            <div
              data-testid="market-merchant-catalog-list"
              className="flex-1 overflow-y-auto space-y-1.5 pr-1"
            >
              {merchantCatalogItems.map((item) => {
                const isSelected = inspectedItem.id === item.id && tradeSide === 'merchant';
                const owned = isItemOwned(item.id);
                const reqLvl = item.requiredLevel ?? 1;
                const locked = !owned && overallHeroLevel < reqLvl;

                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`merchant-market-item-${item.id}`}
                    onClick={() => {
                      setTradeSide('merchant');
                      onSelectItem(item.id);
                      setTradeFeedbackHe(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-right transition-colors cursor-pointer border-r-2 ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-950/40 text-white font-bold'
                        : 'border-transparent text-stone-300 hover:bg-stone-800/50 hover:text-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-sm sm:text-base">{item.nameHe}</span>
                      {owned && (
                        <span className="text-[11px] font-semibold text-emerald-300 shrink-0">
                          [ברשותך]
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs font-mono-tabular">
                      {locked ? (
                        <span className="text-rose-400">דרגה {reqLvl}</span>
                      ) : (
                        <span className="text-amber-300">{item.valueGold} זהב</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* =====================================================================
           PERSONAL INVENTORY OUTSIDE MARKET (רשימת הציוד שבידי הדמות שלי בלבד!)
           ===================================================================== */
        <div
          dir="ltr"
          className="w-full max-w-6xl mx-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 py-6 overflow-hidden items-center"
        >
          {/* LEFT SIDE: Far-Left Text Category Headings + Scrollable Owned Item Names List */}
          <div
            dir="ltr"
            className="md:col-span-6 h-full flex flex-row gap-6 sm:gap-10 overflow-hidden items-stretch"
          >
            <nav
              dir="rtl"
              aria-label="נושאי תפריט"
              className="w-40 sm:w-44 shrink-0 flex flex-col justify-center gap-6 border-r border-stone-700/60 pr-4"
            >
              <button
                type="button"
                data-testid="cat-tab-weapons"
                onClick={() => {
                  onSelectCategory('weapons');
                  const firstOwnedWep = INVENTORY_ITEMS.find(
                    (i) =>
                      isItemOwned(i.id) &&
                      (i.category === 'weapons' || i.category === 'ammo' || i.id === 'torch')
                  );
                  if (firstOwnedWep) onSelectItem(firstOwnedWep.id);
                }}
                className={`text-right font-display-he text-2xl sm:text-3xl font-bold transition-all cursor-pointer ${
                  activePersonalTab === 'weapons'
                    ? 'text-amber-300 translate-x-[-4px]'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                נשקים
              </button>

              <button
                type="button"
                data-testid="cat-tab-materials"
                onClick={() => {
                  onSelectCategory('materials');
                  const firstOwnedMat = INVENTORY_ITEMS.find(
                    (i) => isItemOwned(i.id) && i.category === 'materials'
                  );
                  if (firstOwnedMat) onSelectItem(firstOwnedMat.id);
                }}
                className={`text-right font-display-he text-2xl sm:text-3xl font-bold transition-all cursor-pointer ${
                  activePersonalTab === 'materials'
                    ? 'text-amber-300 translate-x-[-4px]'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                חומרי בנייה
              </button>
            </nav>

            {/* Scrollable Owned Item Names List */}
            <div dir="rtl" className="flex-1 flex flex-col h-full max-h-[68vh] overflow-hidden">
              <div className="text-xs uppercase tracking-widest text-stone-400 pb-2 mb-2 border-b border-stone-800">
                {activePersonalTab === 'weapons'
                  ? 'נשקים וציוד שברשותך כרגע'
                  : 'חומרי בנייה ומשאבים שברשותך כרגע'}
              </div>

              <div
                data-testid="inventory-scrollable-list"
                className="flex-1 overflow-y-auto pr-1 space-y-1.5"
              >
                {ownedPersonalItems.map((item) => {
                  const isSelected = inspectedItem.id === item.id;
                  const equipped = isItemEquipped(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`inv-item-${item.id}`}
                      onMouseEnter={() => {
                        onSelectItem(item.id);
                      }}
                      onClick={() => {
                        onSelectItem(item.id);
                      }}
                      onDoubleClick={() => {
                        onEquipItem(item.id);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-right transition-colors cursor-pointer border-r-2 ${
                        isSelected
                          ? 'border-amber-400 bg-stone-800/75 text-white font-bold'
                          : 'border-transparent text-stone-300 hover:bg-stone-800/40 hover:text-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="truncate text-base sm:text-lg">{item.nameHe}</span>
                        {equipped && (
                          <span className="text-[11px] font-semibold text-amber-300 shrink-0">
                            [מצויד]
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE OF SCREEN: Large Showcase Image & Owned Item Details */}
          <div
            dir="rtl"
            data-testid="inventory-right-showcase"
            className="md:col-span-6 flex flex-col items-center justify-center text-center px-4 sm:px-8"
          >
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center mb-5">
              {renderArtifactArtwork(inspectedItem.id, 'w-52 h-52 sm:w-60 sm:h-60')}
            </div>

            <div className="text-xs font-semibold text-amber-300/90 tracking-wide mb-1">
              {inspectedItem.categoryLabelHe} · ברשות הדמות
            </div>
            <h2
              data-testid="inspected-item-title"
              className="font-display-he text-2xl sm:text-4xl font-bold text-white mb-2"
            >
              {inspectedItem.nameHe}
            </h2>

            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-stone-300 mb-3">
              <span className="text-amber-200 font-semibold">{inspectedItem.statLabelHe}</span>
              <span className="text-stone-600">·</span>
              <span>משקל: {inspectedItem.weight}</span>
              <span className="text-stone-600">·</span>
              <span>שווי מוערך: {inspectedItem.valueGold} זהב</span>
            </div>

            <p className="max-w-md text-xs sm:text-sm text-stone-300/90 leading-relaxed mb-5">
              {inspectedItem.descriptionHe}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {inspectedOwned && inspectedItem.category !== 'materials' && (
                <button
                  type="button"
                  data-testid="skyrim-equip-btn"
                  onClick={() => onEquipItem(inspectedItem.id)}
                  className="px-6 py-2.5 text-sm font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer"
                >
                  {inspectedEquipped ? 'מצויד כעת [E]' : 'צייד פריט [E]'}
                </button>
              )}

              {inspectedOwned && inspectedItem.category !== 'materials' && (
                <div className="flex items-center gap-1.5 mr-2">
                  {[0, 1, 2, 3].map((slotIdx) => {
                    const isBound = hotbarSlots[slotIdx] === inspectedItem.id;
                    return (
                      <button
                        key={slotIdx}
                        type="button"
                        onClick={() => onAssignHotbar(slotIdx, inspectedItem.id)}
                        title={`שייך למקש מהיר ${slotIdx + 1}`}
                        className={`w-8 h-8 text-xs font-mono-tabular font-bold transition-colors cursor-pointer ${
                          isBound
                            ? 'bg-amber-400 text-stone-950'
                            : 'bg-stone-800/90 text-stone-300 hover:text-white border border-stone-700'
                        }`}
                      >
                        {slotIdx + 1}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
SkyrimInventoryModal.displayName = 'SkyrimInventoryModal';
// #endregion

