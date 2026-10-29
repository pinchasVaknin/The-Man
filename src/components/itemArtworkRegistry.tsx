// ============================================================================
// MODULE: Presentation / Item Artwork Registry
// DESIGN: Strategy dispatch map for inventory artifact SVG artwork & icons (OCP)
// SUMMARY: Maps InventoryItemId variants to deterministic SVG render strategies,
//          eliminating large switch/case branches and enabling open-set extension.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { ReactNode } from 'react';
import type { InventoryItemId } from '../world/domain/worldTypes';
// #endregion

// ======================== STRATEGY DISPATCH MAPPINGS ======================== \\
// #region Strategy Dispatch Mappings
type IconRenderStrategy = (className: string) => ReactNode;
type ArtworkRenderStrategy = (sizeClass: string) => ReactNode;

const ICON_STRATEGIES = new Map<InventoryItemId, IconRenderStrategy>();
const ARTWORK_STRATEGIES = new Map<InventoryItemId, ArtworkRenderStrategy>();

// Register Icon Strategies
const bowIcon: IconRenderStrategy = (className) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2 shrink-0`}>
    <path d="M4 20c6-2 14-10 16-16" />
    <path d="M4 4l16 16" />
    <polyline points="15 4 20 4 20 9" />
  </svg>
);
ICON_STRATEGIES.set('bow', bowIcon);
ICON_STRATEGIES.set('elven_longbow', bowIcon);
ICON_STRATEGIES.set('dragonbone_bow', bowIcon);

const swordIcon: IconRenderStrategy = (className) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2 shrink-0`}>
    <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
    <path d="M13 19l6-6" />
    <path d="M16 16l4 4" />
    <path d="M19 21l2-2" />
  </svg>
);
ICON_STRATEGIES.set('sword', swordIcon);
ICON_STRATEGIES.set('katana_imperial', swordIcon);
ICON_STRATEGIES.set('dwarven_warhammer', swordIcon);
ICON_STRATEGIES.set('celestial_jin_sword', swordIcon);

const torchIcon: IconRenderStrategy = (className) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2 shrink-0`}>
    <path d="M12 2c2.5 2.5 3.5 5 2 8-1.5 2-4 2-4-1 0-2 1-4 2-7z" />
    <path d="M10 12h4l-1 10h-2l-1-10z" />
  </svg>
);
ICON_STRATEGIES.set('torch', torchIcon);

const arrowIcon: IconRenderStrategy = (className) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2 shrink-0`}>
    <path d="M5 19L19 5" />
    <polyline points="12 5 19 5 19 12" />
    <path d="M5 19l3-1-2-2-1 3z" />
  </svg>
);
ICON_STRATEGIES.set('arrow_normal', arrowIcon);
ICON_STRATEGIES.set('arrow_fire', arrowIcon);
ICON_STRATEGIES.set('arrow_wind', arrowIcon);

// Register Artwork Strategies
const createBowArtwork = (bowColor: string, trimColor: string): ArtworkRenderStrategy => (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <defs>
      <radialGradient id={`bowGlow-${bowColor}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={bowColor} stopOpacity="0.28" />
        <stop offset="100%" stopColor={bowColor} stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="80" cy="80" r="68" fill={`url(#bowGlow-${bowColor})`} />
    <path d="M34 128 C68 116, 116 68, 128 34" stroke={bowColor} strokeWidth="7.5" strokeLinecap="round" />
    <path d="M42 120 C72 108, 108 72, 120 42" stroke={trimColor} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.8" />
    <line x1="34" y1="128" x2="128" y2="34" stroke="#e7e5e4" strokeWidth="2" strokeOpacity="0.85" />
    <line x1="44" y1="44" x2="122" y2="122" stroke={trimColor} strokeWidth="3.8" strokeLinecap="round" />
    <polygon points="128,128 110,122 122,110" fill="#fbbf24" />
    <path d="M44 44 L56 40 L48 52 Z" fill={bowColor} />
    <path d="M44 44 L40 56 L52 48 Z" fill={bowColor} />
  </svg>
);
ARTWORK_STRATEGIES.set('bow', createBowArtwork('#f59e0b', '#fde68a'));
ARTWORK_STRATEGIES.set('elven_longbow', createBowArtwork('#34d399', '#a7f3d0'));
ARTWORK_STRATEGIES.set('dragonbone_bow', createBowArtwork('#fb923c', '#fef08a'));

const createSwordArtwork = (bladeFill: string, runeColor: string): ArtworkRenderStrategy => (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <defs>
      <radialGradient id={`swordGlow-${runeColor}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={runeColor} stopOpacity="0.28" />
        <stop offset="100%" stopColor={runeColor} stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="80" cy="80" r="68" fill={`url(#swordGlow-${runeColor})`} />
    <polygon points="54,106 126,34 136,24 128,42 62,114" fill={bladeFill} stroke={runeColor} strokeWidth="2.5" />
    <line x1="64" y1="96" x2="118" y2="42" stroke={runeColor} strokeWidth="3.5" strokeLinecap="round" />
    <path d="M42 90 L70 118" stroke="#fbbf24" strokeWidth="8" strokeLinecap="round" />
    <path d="M32 128 L54 106" stroke="#92400e" strokeWidth="7.5" strokeLinecap="round" />
    <circle cx="28" cy="132" r="6.5" fill="#fbbf24" />
  </svg>
);
ARTWORK_STRATEGIES.set('sword', createSwordArtwork('#e2e8f0', '#c084fc'));
ARTWORK_STRATEGIES.set('katana_imperial', createSwordArtwork('#f1f5f9', '#fb7185'));
ARTWORK_STRATEGIES.set('dwarven_warhammer', createSwordArtwork('#fde68a', '#f59e0b'));
ARTWORK_STRATEGIES.set('celestial_jin_sword', createSwordArtwork('#a5f3fc', '#38bdf8'));

const createArrowArtwork = (col: string): ArtworkRenderStrategy => (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="62" fill={col} fillOpacity="0.14" />
    <line x1="34" y1="126" x2="126" y2="34" stroke={col} strokeWidth="5" strokeLinecap="round" />
    <polygon points="132,28 110,36 124,50" fill={col} />
    <path d="M34 126 L54 120 L42 108 Z" fill={col} />
    <line x1="42" y1="110" x2="114" y2="38" stroke="#fef3c7" strokeWidth="2" strokeOpacity="0.6" />
  </svg>
);
ARTWORK_STRATEGIES.set('arrow_normal', createArrowArtwork('#fbbf24'));
ARTWORK_STRATEGIES.set('arrow_fire', createArrowArtwork('#fb923c'));
ARTWORK_STRATEGIES.set('arrow_wind', createArrowArtwork('#38bdf8'));

ARTWORK_STRATEGIES.set('torch', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="64" r="52" fill="#f97316" fillOpacity="0.22" />
    <path d="M80 24 C102 44, 108 68, 90 86 C76 96, 62 86, 66 64 C70 48, 74 36, 80 24 Z" fill="#fbbf24" stroke="#ea580c" strokeWidth="4" />
    <rect x="72" y="84" width="16" height="52" rx="4" fill="#78350f" stroke="#d97706" strokeWidth="3" />
  </svg>
));

ARTWORK_STRATEGIES.set('oak_timber', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#d97706" fillOpacity="0.15" />
    <rect x="26" y="88" width="108" height="24" rx="5" fill="#92400e" stroke="#f59e0b" strokeWidth="2.5" />
    <rect x="32" y="62" width="96" height="24" rx="5" fill="#b45309" stroke="#fbbf24" strokeWidth="2.5" />
    <rect x="42" y="38" width="76" height="22" rx="5" fill="#d97706" stroke="#fde68a" strokeWidth="2.5" />
    <line x1="44" y1="100" x2="116" y2="100" stroke="#fde68a" strokeWidth="2" strokeOpacity="0.5" />
    <line x1="48" y1="74" x2="112" y2="74" stroke="#fde68a" strokeWidth="2" strokeOpacity="0.5" />
  </svg>
));

const createStoneArtwork = (isMarble: boolean): ArtworkRenderStrategy => (sizeClass) => {
  const fillTop = isMarble ? '#f8fafc' : '#a8a29e';
  const fillSide = isMarble ? '#cbd5e1' : '#78716c';
  const strokeCol = isMarble ? '#38bdf8' : '#fbbf24';
  return (
    <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
      <circle cx="80" cy="80" r="64" fill={strokeCol} fillOpacity="0.14" />
      <rect x="28" y="82" width="50" height="36" rx="4" fill={fillSide} stroke={strokeCol} strokeWidth="2.5" />
      <rect x="82" y="82" width="50" height="36" rx="4" fill={fillTop} stroke={strokeCol} strokeWidth="2.5" />
      <rect x="52" y="42" width="56" height="36" rx="4" fill={fillTop} stroke={strokeCol} strokeWidth="2.5" />
    </svg>
  );
};
ARTWORK_STRATEGIES.set('cut_granite_blocks', createStoneArtwork(false));
ARTWORK_STRATEGIES.set('marble_pillar_stone', createStoneArtwork(true));

ARTWORK_STRATEGIES.set('iron_ingots', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#94a3b8" fillOpacity="0.18" />
    <polygon points="30,112 42,86 86,86 98,112" fill="#64748b" stroke="#e2e8f0" strokeWidth="2.5" />
    <polygon points="62,112 74,86 118,86 130,112" fill="#94a3b8" stroke="#f8fafc" strokeWidth="2.5" />
    <polygon points="48,84 60,58 104,58 116,84" fill="#cbd5e1" stroke="#38bdf8" strokeWidth="2.5" />
  </svg>
));

ARTWORK_STRATEGIES.set('imperial_clay_tiles', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#ef4444" fillOpacity="0.16" />
    <path d="M28 96 Q54 70 80 96 Q106 70 132 96 L124 118 Q102 96 80 118 Q58 96 36 118 Z" fill="#b91c1c" stroke="#fbbf24" strokeWidth="2.8" />
    <path d="M36 66 Q60 42 80 66 Q100 42 124 66 L116 88 Q98 68 80 88 Q62 68 44 88 Z" fill="#dc2626" stroke="#fde68a" strokeWidth="2.8" />
  </svg>
));

ARTWORK_STRATEGIES.set('dwarven_gold_ore', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#fbbf24" fillOpacity="0.22" />
    <polygon points="80,28 126,56 114,116 46,122 34,64" fill="#d97706" fillOpacity="0.45" stroke="#fbbf24" strokeWidth="4" />
    <path d="M46 122 L80 76 L126 56 M80 28 L80 76 L114 116" stroke="#fef08a" strokeWidth="3" />
  </svg>
));

ARTWORK_STRATEGIES.set('crystal_gem', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#22d3ee" fillOpacity="0.22" />
    <polygon points="80,20 120,64 100,134 60,134 40,64" fill="#06b6d4" fillOpacity="0.38" stroke="#67e8f9" strokeWidth="4" />
    <line x1="80" y1="20" x2="80" y2="134" stroke="#cffafe" strokeWidth="2.5" />
    <line x1="40" y1="64" x2="120" y2="64" stroke="#cffafe" strokeWidth="2.5" />
  </svg>
));
// #endregion

// ======================== PUBLIC RENDER FUNCTIONS ======================== \\
// #region Public Render Functions
/**
 * Summary: Renders an SVG icon for the given inventory item using O(1) strategy dispatch.
 * Design: Strategy dispatch map over open item variants without giant switch statements.
 * @param itemId Identifier of the inventory item.
 * @param className CSS styling classes.
 * @returns React SVG element.
 */
export function renderItemSvgIcon(itemId: InventoryItemId, className = 'w-4 h-4'): ReactNode {
  const strategy = ICON_STRATEGIES.get(itemId);
  if (strategy) {
    return strategy(className);
  }
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2 shrink-0`}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

/**
 * Summary: Renders full detailed artwork for an inventory item modal preview.
 * Design: Strategy dispatch map over open item variants without giant switch statements.
 * @param itemId Identifier of the inventory item.
 * @param sizeClass Size and placement CSS classes.
 * @returns React SVG element.
 */
export function renderArtifactArtwork(itemId: InventoryItemId, sizeClass = 'w-56 h-56'): ReactNode {
  const strategy = ARTWORK_STRATEGIES.get(itemId);
  if (strategy) {
    return strategy(sizeClass);
  }
  return (
    <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none stroke-amber-300`}>
      <circle cx="80" cy="80" r="46" strokeWidth="3.5" />
      <circle cx="80" cy="80" r="12" className="fill-amber-300" />
    </svg>
  );
}
// #endregion
