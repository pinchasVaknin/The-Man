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

ARTWORK_STRATEGIES.set('raw_game_meat', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#ea580c" fillOpacity="0.2" />
    <ellipse cx="76" cy="82" rx="44" ry="30" fill="#9a3412" stroke="#fdba74" strokeWidth="3.5" />
    <ellipse cx="64" cy="78" rx="14" ry="11" fill="#fed7aa" stroke="#7c2d12" strokeWidth="2.5" />
    <circle cx="64" cy="78" r="4" fill="#7c2d12" />
    <path d="M114 76 L136 68 M114 86 L136 94" stroke="#fef3c7" strokeWidth="5" strokeLinecap="round" />
  </svg>
));

ARTWORK_STRATEGIES.set('roasted_meat', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#f97316" fillOpacity="0.24" />
    <ellipse cx="74" cy="86" rx="46" ry="30" fill="#7c2d12" stroke="#fbbf24" strokeWidth="3.5" />
    <path d="M52 72 L64 98 M72 68 L84 96 M92 72 L102 96" stroke="#431407" strokeWidth="4" strokeLinecap="round" />
    <path d="M116 80 L138 72 M116 90 L138 98" stroke="#fef3c7" strokeWidth="5" strokeLinecap="round" />
    <path d="M62 48 Q56 36 64 26 M82 44 Q76 32 84 22 M100 50 Q94 38 102 28" stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.75" />
  </svg>
));

ARTWORK_STRATEGIES.set('fresh_bread_loaf', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#f59e0b" fillOpacity="0.2" />
    <path d="M32 98 C30 62, 56 46, 80 46 C104 46, 130 62, 128 98 C128 110, 114 116, 80 116 C46 116, 32 110, 32 98 Z" fill="#d97706" stroke="#fde68a" strokeWidth="3.5" />
    <path d="M56 58 Q66 72 60 88 M78 54 Q88 70 82 88 M100 58 Q108 72 102 88" stroke="#fef3c7" strokeWidth="3" strokeLinecap="round" />
  </svg>
));

ARTWORK_STRATEGIES.set('harbor_cheese_wheel', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#eab308" fillOpacity="0.2" />
    <ellipse cx="80" cy="70" rx="48" ry="24" fill="#facc15" stroke="#fef08a" strokeWidth="3" />
    <path d="M32 70 L32 98 C32 112, 128 112, 128 98 L128 70" fill="#eab308" stroke="#fde047" strokeWidth="3" />
    <circle cx="62" cy="88" r="5" fill="#ca8a04" />
    <circle cx="94" cy="92" r="6" fill="#ca8a04" />
    <circle cx="78" cy="68" r="4.5" fill="#ca8a04" />
  </svg>
));

ARTWORK_STRATEGIES.set('red_orchard_apples', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#ef4444" fillOpacity="0.2" />
    <circle cx="64" cy="88" r="28" fill="#dc2626" stroke="#fca5a5" strokeWidth="3" />
    <circle cx="98" cy="84" r="26" fill="#ef4444" stroke="#fecaca" strokeWidth="3" />
    <path d="M64 60 Q68 46 76 44 M98 58 Q102 44 110 42" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
    <ellipse cx="82" cy="48" rx="10" ry="5" fill="#22c55e" />
  </svg>
));

const createHideArtwork = (fillHex: string, strokeHex: string): ArtworkRenderStrategy => (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill={fillHex} fillOpacity="0.2" />
    <path
      d="M52 32 Q80 42 108 32 L124 58 Q106 80 122 108 L102 130 Q80 118 58 130 L38 108 Q54 80 36 58 Z"
      fill={fillHex}
      stroke={strokeHex}
      strokeWidth="3.5"
    />
  </svg>
);
ARTWORK_STRATEGIES.set('small_hide', createHideArtwork('#a8a29e', '#fde68a'));
ARTWORK_STRATEGIES.set('deer_hide', createHideArtwork('#92400e', '#fbbf24'));
ARTWORK_STRATEGIES.set('wolf_hide', createHideArtwork('#475569', '#cbd5e1'));
ARTWORK_STRATEGIES.set('jaguar_hide', createHideArtwork('#d97706', '#fef08a'));
ARTWORK_STRATEGIES.set('crocodile_hide', createHideArtwork('#166534', '#86efac'));
ARTWORK_STRATEGIES.set('bear_hide', createHideArtwork('#451a03', '#f59e0b'));
ARTWORK_STRATEGIES.set('rhino_hide', createHideArtwork('#57534e', '#d6d3d1'));
ARTWORK_STRATEGIES.set('sheep_hide', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#f8fafc" fillOpacity="0.18" />
    <circle cx="62" cy="86" r="24" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="3" />
    <circle cx="98" cy="86" r="24" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="3" />
    <circle cx="80" cy="64" r="26" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="3" />
    <circle cx="80" cy="94" r="24" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="3" />
  </svg>
));

ARTWORK_STRATEGIES.set('deer_antlers', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#d97706" fillOpacity="0.18" />
    <path
      d="M72 126 C52 102, 36 74, 42 36 M48 84 L28 68 M54 62 L66 44 M88 126 C108 102, 124 74, 118 36 M112 84 L132 68 M106 62 L94 44"
      stroke="#fde68a"
      strokeWidth="5.5"
      strokeLinecap="round"
    />
  </svg>
));

ARTWORK_STRATEGIES.set('deer_meat', ARTWORK_STRATEGIES.get('raw_game_meat')!);
ARTWORK_STRATEGIES.set('bear_meat', ARTWORK_STRATEGIES.get('raw_game_meat')!);
ARTWORK_STRATEGIES.set('rotten_meat', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#65a30d" fillOpacity="0.2" />
    <ellipse cx="76" cy="82" rx="44" ry="30" fill="#3f6212" stroke="#a3e635" strokeWidth="3.5" />
    <ellipse cx="64" cy="78" rx="14" ry="11" fill="#bef264" stroke="#365314" strokeWidth="2.5" />
    <path d="M114 76 L136 68 M114 86 L136 94" stroke="#d9f99d" strokeWidth="5" strokeLinecap="round" />
  </svg>
));
ARTWORK_STRATEGIES.set('animal_bone', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#e7e5e4" fillOpacity="0.16" />
    <line x1="42" y1="118" x2="118" y2="42" stroke="#f5f5f4" strokeWidth="14" strokeLinecap="round" />
    <circle cx="38" cy="112" r="10" fill="#f5f5f4" />
    <circle cx="48" cy="122" r="10" fill="#f5f5f4" />
    <circle cx="112" cy="38" r="10" fill="#f5f5f4" />
    <circle cx="122" cy="48" r="10" fill="#f5f5f4" />
  </svg>
));
ARTWORK_STRATEGIES.set('animal_fat', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#fde047" fillOpacity="0.18" />
    <ellipse cx="80" cy="86" rx="42" ry="28" fill="#fef08a" stroke="#facc15" strokeWidth="3.5" />
  </svg>
));
ARTWORK_STRATEGIES.set('bear_claws', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#a8a29e" fillOpacity="0.18" />
    <path d="M46 116 Q56 64 76 38 M72 122 Q82 68 102 42 M98 124 Q108 74 126 48" stroke="#e7e5e4" strokeWidth="6" strokeLinecap="round" />
  </svg>
));
ARTWORK_STRATEGIES.set('wolf_fang', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#f5f5f4" fillOpacity="0.18" />
    <path d="M64 38 Q96 74 82 128 Q58 84 64 38 Z" fill="#fafaf9" stroke="#d6d3d1" strokeWidth="3.5" />
  </svg>
));
ARTWORK_STRATEGIES.set('crocodile_teeth', ARTWORK_STRATEGIES.get('wolf_fang')!);
ARTWORK_STRATEGIES.set('rhino_horn', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#d6d3d1" fillOpacity="0.18" />
    <path d="M48 124 Q62 72 114 34 Q96 92 78 126 Z" fill="#a8a29e" stroke="#f5f5f4" strokeWidth="3.5" />
  </svg>
));
ARTWORK_STRATEGIES.set('dragon_meat', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#b91c1c" fillOpacity="0.2" />
    <ellipse cx="76" cy="82" rx="46" ry="31" fill="#7f1d1d" stroke="#f97316" strokeWidth="3.5" />
    <ellipse cx="64" cy="78" rx="14" ry="11" fill="#fecaca" stroke="#450a0a" strokeWidth="2.5" />
    <path d="M58 62 Q66 52 74 62 M80 60 Q88 50 96 60" stroke="#fb923c" strokeWidth="3" strokeLinecap="round" />
    <path d="M116 76 L138 68 M116 86 L138 94" stroke="#fef3c7" strokeWidth="5" strokeLinecap="round" />
  </svg>
));
ARTWORK_STRATEGIES.set('dragon_scales', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#059669" fillOpacity="0.18" />
    <path d="M44 70 Q60 46 76 70 Q60 94 44 70 Z" fill="#065f46" stroke="#6ee7b7" strokeWidth="3" />
    <path d="M84 70 Q100 46 116 70 Q100 94 84 70 Z" fill="#065f46" stroke="#6ee7b7" strokeWidth="3" />
    <path d="M64 100 Q80 76 96 100 Q80 124 64 100 Z" fill="#047857" stroke="#a7f3d0" strokeWidth="3" />
  </svg>
));
ARTWORK_STRATEGIES.set('dragon_horn', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#7c3aed" fillOpacity="0.16" />
    <path d="M52 126 Q48 78 92 46 Q112 32 122 30 Q100 52 96 74 Q90 104 74 128 Z" fill="#44403c" stroke="#c4b5fd" strokeWidth="3.5" />
    <path d="M70 108 L84 104 M74 90 L90 86 M82 72 L98 68" stroke="#a8a29e" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
));
ARTWORK_STRATEGIES.set('dragon_claws', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#1c1917" fillOpacity="0.3" />
    <path d="M42 118 Q50 62 74 34 M70 124 Q78 66 104 38 M98 126 Q106 76 130 46" stroke="#fbbf24" strokeWidth="7" strokeLinecap="round" />
    <path d="M42 118 Q50 62 74 34 M70 124 Q78 66 104 38 M98 126 Q106 76 130 46" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" />
  </svg>
));
ARTWORK_STRATEGIES.set('dragon_bone', (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill="#fbbf24" fillOpacity="0.14" />
    <line x1="40" y1="120" x2="120" y2="40" stroke="#e7e5e4" strokeWidth="18" strokeLinecap="round" />
    <circle cx="35" cy="113" r="13" fill="#e7e5e4" />
    <circle cx="47" cy="125" r="13" fill="#e7e5e4" />
    <circle cx="113" cy="35" r="13" fill="#e7e5e4" />
    <circle cx="125" cy="47" r="13" fill="#e7e5e4" />
    <path d="M66 94 L94 66" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
  </svg>
));

const clothingIcon: IconRenderStrategy = (className) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2 shrink-0`}>
    <path d="M8 4l-5 4 3 3 2-2v11h8V9l2 2 3-3-5-4-2 2h-4L8 4z" />
  </svg>
);
ICON_STRATEGIES.set('simple_tunic', clothingIcon);
ICON_STRATEGIES.set('ranger_garb', clothingIcon);
ICON_STRATEGIES.set('elven_cloak', clothingIcon);
ICON_STRATEGIES.set('imperial_armor', clothingIcon);

const createClothingArtwork = (
  mainFill: string,
  cloakFill: string,
  trimStroke: string
): ArtworkRenderStrategy => (sizeClass) => (
  <svg viewBox="0 0 160 160" className={`${sizeClass} fill-none drop-shadow-2xl`}>
    <circle cx="80" cy="80" r="64" fill={trimStroke} fillOpacity="0.18" />
    <path
      d="M44 42 Q80 28 116 42 L132 128 Q80 138 28 128 Z"
      fill={cloakFill}
      stroke={trimStroke}
      strokeWidth="2.8"
    />
    <path
      d="M56 38 L32 62 L44 76 L56 64 L56 124 L104 124 L104 64 L116 76 L128 62 L104 38 Q80 50 56 38 Z"
      fill={mainFill}
      stroke={trimStroke}
      strokeWidth="3"
    />
    <rect x="56" y="84" width="48" height="10" rx="2" fill="#29180c" stroke={trimStroke} strokeWidth="2" />
    <rect x="74" y="82" width="12" height="14" rx="2" fill={trimStroke} />
  </svg>
);
ARTWORK_STRATEGIES.set('simple_tunic', createClothingArtwork('#a89882', '#786c5c', '#fde68a'));
ARTWORK_STRATEGIES.set('ranger_garb', createClothingArtwork('#3e2a1b', '#2e3627', '#fbbf24'));
ARTWORK_STRATEGIES.set('elven_cloak', createClothingArtwork('#1b4332', '#14532d', '#6ee7b7'));
ARTWORK_STRATEGIES.set('imperial_armor', createClothingArtwork('#7f1d1d', '#450a0a', '#facc15'));
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
