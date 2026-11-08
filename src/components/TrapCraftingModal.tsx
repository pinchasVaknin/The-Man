// ============================================================================
// MODULE: Presentation / Trap Crafting & Workbench Modal
// DESIGN: Nordic-themed Trapper's Workbench UI for crafting small-game traps,
//          managing raw material stash, and monitoring deployed field traps.
// ============================================================================

import React, { useState } from 'react';
import {
  INVENTORY_ITEM_MAP,
  type InventoryItemId,
  type IInventoryItemDef,
} from '../world/domain/worldTypes';
import {
  TRAP_RECIPES,
  type ITrapRecipe,
  type IPlacedTrap,
  type IWorkbenchStash,
} from '../world/systems/animalTrapsSystem';
import { renderItemSvgIcon, renderArtifactArtwork } from './itemArtworkRegistry';

export interface ITrapCraftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerInventory: Partial<Record<InventoryItemId, number>>;
  workbenchStash: IWorkbenchStash;
  placedTraps: IPlacedTrap[];
  onCraftTrap: (recipeId: InventoryItemId) => void;
  onDepositMaterial: (itemId: InventoryItemId, count: number) => void;
  onWithdrawMaterial: (itemId: InventoryItemId, count: number) => void;
  onDepositAllMaterials: () => void;
  onTakeAllFromStash: () => void;
  playerCoords?: { x: number; y: number; z: number };
}

type TabType = 'craft' | 'stash' | 'monitor';

export const TrapCraftingModal: React.FC<ITrapCraftingModalProps> = ({
  isOpen,
  onClose,
  playerInventory,
  workbenchStash,
  placedTraps,
  onCraftTrap,
  onDepositMaterial,
  onWithdrawMaterial,
  onDepositAllMaterials,
  onTakeAllFromStash,
  playerCoords,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('craft');
  const [selectedRecipe, setSelectedRecipe] = useState<ITrapRecipe>(TRAP_RECIPES[0]);

  if (!isOpen) return null;

  const stashMaterials = workbenchStash?.materials ?? {};

  // Helper to calculate total available count (player inventory + workbench stash)
  const getTotalAvailable = (itemId: InventoryItemId) => {
    const fromInv = playerInventory[itemId] ?? 0;
    const fromStash = stashMaterials[itemId] ?? 0;
    return fromInv + fromStash;
  };

  const canCraftRecipe = (recipe: ITrapRecipe) => {
    return recipe.ingredients.every((ing) => getTotalAvailable(ing.itemId) >= ing.count);
  };

  const getDistanceToPlayer = (trap: IPlacedTrap) => {
    if (!playerCoords) return null;
    const dx = trap.x - playerCoords.x;
    const dz = trap.z - playerCoords.z;
    return Math.round(Math.hypot(dx, dz));
  };

  return (
    <div
      data-testid="trap-crafting-modal"
      className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none font-serif text-amber-100"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-stone-900 border-2 border-amber-700/60 rounded-xl shadow-2xl overflow-hidden shadow-amber-950/40">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-stone-950 via-amber-950/40 to-stone-950 border-b border-amber-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-900/40 border border-amber-600/50 flex items-center justify-center text-amber-400">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-2">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <line x1="8" y1="5" x2="8" y2="19" />
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="16" y1="5" x2="16" y2="19" />
                <line x1="3" y1="12" x2="21" y2="12" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wider text-amber-200">
                Trapper&apos;s Workbench
              </h2>
              <p className="text-xs text-amber-400/80 tracking-wide font-sans">
                Hunter&apos;s Lodge • Craft Wildlife Traps, Manage Material Stash &amp; Track Field Traps
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-trap-workbench-btn"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-sans font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 border border-amber-700/40 text-amber-300 hover:text-white transition-colors cursor-pointer"
          >
            Close [ESC]
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-amber-900/40 bg-stone-950/80 px-6 gap-2 pt-2 font-sans">
          <button
            type="button"
            onClick={() => setActiveTab('craft')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'craft'
                ? 'border-amber-400 text-amber-200 bg-amber-950/20'
                : 'border-transparent text-stone-400 hover:text-amber-300'
            }`}
          >
            Craft Traps
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stash')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'stash'
                ? 'border-amber-400 text-amber-200 bg-amber-950/20'
                : 'border-transparent text-stone-400 hover:text-amber-300'
            }`}
          >
            Workbench Stash
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monitor')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'monitor'
                ? 'border-amber-400 text-amber-200 bg-amber-950/20'
                : 'border-transparent text-stone-400 hover:text-amber-300'
            }`}
          >
            Active Field Traps ({placedTraps.length})
            {placedTraps.some((t) => t.status === 'sprung' || t.sprung) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-900/60">
          {/* TAB 1: CRAFT TRAPS */}
          {activeTab === 'craft' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Recipe List */}
              <div className="md:col-span-5 space-y-3">
                <h3 className="text-xs font-sans uppercase tracking-wider text-amber-500 font-bold mb-2">
                  Available Trap Recipes
                </h3>
                {TRAP_RECIPES.map((recipe) => {
                  const canCraft = canCraftRecipe(recipe);
                  const isSelected = selectedRecipe.kind === recipe.kind;

                  return (
                    <div
                      key={recipe.itemId}
                      data-testid={`trap-recipe-${recipe.itemId}`}
                      onClick={() => setSelectedRecipe(recipe)}
                      className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/40 ring-1 ring-amber-400/50 shadow-md'
                          : 'border-stone-800 bg-stone-950/50 hover:border-amber-700/40 hover:bg-stone-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-stone-900 border border-amber-700/30 flex items-center justify-center p-2 text-amber-400">
                          {renderItemSvgIcon(recipe.itemId, 'w-8 h-8')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm text-amber-200 truncate">
                              {recipe.name}
                            </span>
                            {canCraft ? (
                              <span className="text-[11px] font-sans px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/40 shrink-0">
                                Ready
                              </span>
                            ) : (
                              <span className="text-[11px] font-sans px-1.5 py-0.5 rounded bg-stone-900 text-stone-500 border border-stone-800 shrink-0">
                                Missing Mats
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-stone-400 block truncate font-sans">
                            {recipe.subtitle}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recipe Details & Craft Panel */}
              <div className="md:col-span-7 flex flex-col bg-stone-950/60 rounded-xl border border-amber-900/40 p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-24 h-24 rounded-lg bg-stone-900/90 border border-amber-600/40 flex items-center justify-center p-3 text-amber-400 shadow-inner">
                    {renderArtifactArtwork(selectedRecipe.itemId, 'w-20 h-20')}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-amber-200">
                      {selectedRecipe.name}
                    </h4>
                    <p className="text-xs text-amber-400/70 mb-2 font-sans">
                      {selectedRecipe.subtitle}
                    </p>
                    <p className="text-xs text-stone-300 leading-relaxed font-sans">
                      {selectedRecipe.description}
                    </p>
                  </div>
                </div>

                {/* Target Prey Species */}
                <div className="mb-4 p-3 bg-stone-900/80 rounded-lg border border-amber-950">
                  <div className="text-xs font-sans text-amber-400 font-bold mb-1.5">
                    Target Prey:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs font-sans px-2.5 py-1 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                      {selectedRecipe.targetAnimalsLabel}
                    </span>
                  </div>
                </div>

                {/* Required Ingredients */}
                <div className="flex-1 mb-5">
                  <div className="text-xs font-sans text-amber-400 font-bold mb-2">
                    Required Materials (from Inventory or Workbench Stash):
                  </div>
                  <div className="space-y-2">
                    {selectedRecipe.ingredients.map((ing) => {
                      const itemDef: IInventoryItemDef | undefined = INVENTORY_ITEM_MAP.get(ing.itemId);
                      const totalAvailable = getTotalAvailable(ing.itemId);
                      const isSatisfied = totalAvailable >= ing.count;

                      return (
                        <div
                          key={ing.itemId}
                          className="flex items-center justify-between p-2 rounded bg-stone-900/60 border border-stone-800 text-xs font-sans"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 flex items-center justify-center text-amber-400">
                              {renderItemSvgIcon(ing.itemId, 'w-4 h-4')}
                            </span>
                            <span className="text-stone-300">{itemDef?.name ?? ing.itemId}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-semibold ${
                                isSatisfied ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {totalAvailable} / {ing.count}
                            </span>
                            {isSatisfied ? (
                              <span className="text-emerald-400 text-sm">✓</span>
                            ) : (
                              <span className="text-rose-400 text-sm">✗</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Craft Action Button */}
                <button
                  type="button"
                  data-testid="craft-trap-submit-btn"
                  disabled={!canCraftRecipe(selectedRecipe)}
                  onClick={() => onCraftTrap(selectedRecipe.itemId)}
                  className={`w-full py-3 px-4 rounded-lg font-bold font-sans tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 ${
                    canCraftRecipe(selectedRecipe)
                      ? 'bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-amber-100 border border-amber-500/60 shadow-amber-900/40 cursor-pointer'
                      : 'bg-stone-800/80 text-stone-500 border border-stone-700/40 cursor-not-allowed'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2">
                    <path d="M14 4c3 1 5 4 5 7-3 1-6 0-8-2L5 19l-2-2 6-6c-2-2-3-5-2-8 3 0 5 1 7 1z" />
                  </svg>
                  Craft {selectedRecipe.name}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: WORKBENCH STASH */}
          {activeTab === 'stash' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-950/60 p-4 rounded-lg border border-amber-900/30">
                <div>
                  <h4 className="text-base font-bold text-amber-200">
                    Workbench Raw Material Stash
                  </h4>
                  <p className="text-xs text-stone-400 font-sans mt-0.5">
                    Store crafting resources in the workbench so they are always available for building traps.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onDepositAllMaterials}
                    className="px-3 py-1.5 text-xs font-sans rounded bg-stone-800 hover:bg-stone-700 border border-amber-700/40 text-amber-300 transition-colors cursor-pointer"
                  >
                    Deposit All Materials
                  </button>
                  <button
                    type="button"
                    onClick={onTakeAllFromStash}
                    className="px-3 py-1.5 text-xs font-sans rounded bg-stone-800 hover:bg-stone-700 border border-amber-700/40 text-amber-300 transition-colors cursor-pointer"
                  >
                    Withdraw All to Inventory
                  </button>
                </div>
              </div>

              {/* Stash Inventory Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Workbench Storage */}
                <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800">
                  <h5 className="text-xs font-sans uppercase font-bold text-amber-400 mb-3 flex items-center justify-between">
                    <span>Stored in Workbench</span>
                    <span className="text-stone-500">
                      {Object.keys(stashMaterials).length} types
                    </span>
                  </h5>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {Object.entries(stashMaterials).length === 0 ? (
                      <p className="text-xs text-stone-500 font-sans py-4 text-center">
                        Workbench stash is empty. Deposit materials from your inventory.
                      </p>
                    ) : (
                      Object.entries(stashMaterials).map(([itemId, count]) => {
                        const itemDef = INVENTORY_ITEM_MAP.get(itemId as InventoryItemId);
                        return (
                          <div
                            key={itemId}
                            className="flex items-center justify-between p-2 rounded bg-stone-900/60 border border-stone-800 text-xs font-sans"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 flex items-center justify-center text-amber-400">
                                {renderItemSvgIcon(itemId as InventoryItemId, 'w-5 h-5')}
                              </span>
                              <span className="text-amber-100">{itemDef?.name ?? itemId}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-amber-400 font-mono text-sm">
                                x{count}
                              </span>
                              <button
                                type="button"
                                onClick={() => onWithdrawMaterial(itemId as InventoryItemId, 1)}
                                className="px-2 py-0.5 rounded bg-stone-800 hover:bg-amber-800/60 text-[11px] text-amber-200 border border-stone-700 cursor-pointer"
                              >
                                Withdraw 1
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Player Inventory */}
                <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800">
                  <h5 className="text-xs font-sans uppercase font-bold text-amber-400 mb-3 flex items-center justify-between">
                    <span>Player Inventory</span>
                    <span className="text-stone-500">Available to Deposit</span>
                  </h5>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {Object.entries(playerInventory)
                      .filter(([, count]) => (count ?? 0) > 0)
                      .map(([itemId, count]) => {
                        const itemDef = INVENTORY_ITEM_MAP.get(itemId as InventoryItemId);
                        return (
                          <div
                            key={itemId}
                            className="flex items-center justify-between p-2 rounded bg-stone-900/60 border border-stone-800 text-xs font-sans"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 flex items-center justify-center text-amber-400">
                                {renderItemSvgIcon(itemId as InventoryItemId, 'w-5 h-5')}
                              </span>
                              <span className="text-amber-100">{itemDef?.name ?? itemId}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-stone-300 font-mono text-sm">
                                x{count}
                              </span>
                              <button
                                type="button"
                                onClick={() => onDepositMaterial(itemId as InventoryItemId, 1)}
                                className="px-2 py-0.5 rounded bg-stone-800 hover:bg-amber-800/60 text-[11px] text-amber-200 border border-stone-700 cursor-pointer"
                              >
                                Deposit 1
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLACED TRAPS MONITOR */}
          {activeTab === 'monitor' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-950/60 p-4 rounded-lg border border-amber-900/30">
                <div>
                  <h4 className="text-base font-bold text-amber-200">
                    Active Field Traps ({placedTraps.length})
                  </h4>
                  <p className="text-xs text-stone-400 font-sans mt-0.5">
                    Traps deployed in the wilderness. Walk up to a sprung trap and press [E] to harvest your catch.
                  </p>
                </div>
                <div className="text-xs font-sans px-3 py-1.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/40">
                  Deploy Trap: Press [T] outdoors
                </div>
              </div>

              {placedTraps.length === 0 ? (
                <div className="p-8 text-center bg-stone-950/40 rounded-xl border border-dashed border-stone-800">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-stone-900 flex items-center justify-center text-stone-600">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-2">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                    </svg>
                  </div>
                  <h5 className="text-sm font-bold text-stone-400 mb-1">
                    No Active Field Traps
                  </h5>
                  <p className="text-xs text-stone-500 font-sans max-w-md mx-auto">
                    Craft a cage or snare trap at this workbench, head out into the forest, and press [T] to place it on the ground.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {placedTraps.map((trap) => {
                    const dist = getDistanceToPlayer(trap);
                    const itemDef = INVENTORY_ITEM_MAP.get(trap.kind);
                    const isSprung = trap.status === 'sprung' || Boolean(trap.sprung);

                    return (
                      <div
                        key={trap.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isSprung
                            ? 'bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                            : 'bg-stone-950/60 border-amber-900/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-400">
                              {renderItemSvgIcon(trap.kind, 'w-5 h-5')}
                            </span>
                            <span className="font-bold text-sm text-amber-200">
                              {itemDef?.name ?? trap.kind}
                            </span>
                          </div>
                          {isSprung ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-sans font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 animate-pulse">
                              Prey Caught!
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-sans bg-amber-950/60 text-amber-400 border border-amber-800/40">
                              Armed &amp; Waiting...
                            </span>
                          )}
                        </div>

                        {isSprung && trap.caughtAnimalName ? (
                          <div className="my-2 p-2.5 rounded bg-stone-900/80 border border-emerald-800/50">
                            <div className="text-xs font-sans text-emerald-300 font-bold">
                              Caught: {trap.caughtAnimalName} (Lv. {trap.caughtAnimalLevel ?? 1})
                            </div>
                            {trap.loot && trap.loot.length > 0 && (
                              <div className="text-[11px] font-sans text-stone-300 mt-1">
                                Loot:{' '}
                                {trap.loot
                                  .map(
                                    (l) =>
                                      `${l.quantity}x ${INVENTORY_ITEM_MAP.get(l.itemId)?.name ?? l.itemId}`
                                  )
                                  .join(', ')}
                              </div>
                            )}
                            {trap.xp && (
                              <div className="text-[11px] font-sans text-amber-400 mt-0.5">
                                +{trap.xp} Hunting XP
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-400 font-sans my-2">
                            Armed trap waiting for woodland critters and wild game to pass by.
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] font-sans text-stone-500 pt-2 border-t border-stone-800/60">
                          <span>
                            Coords: X:{Math.round(trap.x)}, Z:{Math.round(trap.z)}
                          </span>
                          {dist !== null && (
                            <span className="text-amber-400/80 font-mono">
                              Distance: {dist}m
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-6 py-3 bg-stone-950 border-t border-amber-900/40 flex flex-wrap items-center justify-between gap-2 text-xs font-sans text-stone-400">
          <div className="flex items-center gap-2 text-amber-300">
            <span className="font-bold">Field Guide:</span>
            <span>
              1. Craft trap at workbench ➔ 2. Press <strong>[T]</strong> outdoors to place ➔ 3. Wait for squirrel or rabbit catch ➔ 4. Press <strong>[E]</strong> by trap to harvest.
            </span>
          </div>
          <div className="text-stone-500">
            Close: <strong>[ESC]</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
