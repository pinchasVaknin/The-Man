// ============================================================================
// MODULE: Lab / Entity, Animation & Skin Catalog
// DESIGN: 100% Decoupled Laboratory Data Model & Pure State Helpers (SRP)
// SUMMARY: Catalogs all characters, humans, animals, and mythic creatures that
//          exist in the world codebase, along with their animations (starting
//          with 'none' = static pose) and skin variants.
// ============================================================================

import {
  RIDEABLE_HORSES,
  HUNTER_LODGE_POS,
  SAKURA_SANCTUARY_POS,
  VALLEY_FARMS,
  LAKESIDE_TEA_PAVILION_POS,
} from '../world/domain/landmarks/settlementLandmarks';
import {
  SOUTHERN_MINE_POS,
  DWARVEN_GUARDIAN_STATUES,
} from '../world/domain/landmarks/dwarvenLandmarks';
import { DWARVEN_MINERS_COUNT } from '../world/systems/dwarvenMineAndCaravanSystem';
import {
  MARKET_STALL_LOCATIONS,
  SOUTHEAST_HARBOR_POS,
} from '../world/domain/landmarks/oasisAndHarborLandmarks';
import { CHINESE_FORTRESS_POS } from '../world/domain/landmarks/fortressLandmarks';
import { t } from '../locales';

// ======================== TYPES & INTERFACES ======================== \\
// #region Types & Interfaces
export type LabCategoryId = 'characters' | 'animals';
export type LabCategoryFilter = LabCategoryId | 'all';
export type LabEquipmentVisibilityMode = 'auto' | 'both' | 'right_only' | 'left_only' | 'none';

export interface ILabAnimationDef {
  readonly id: string;
  readonly nameHe: string;
  readonly descriptionHe: string;
  readonly isStaticDefault?: boolean;
  readonly loopDurationSec: number;
}

export interface ILabSkinPalette {
  readonly primaryHex: number;
  readonly secondaryHex: number;
  readonly accentHex: number;
  readonly trimHex?: number;
  readonly emissiveHex?: number;
  readonly hasAntlers?: boolean;
}

export interface ILabSkinDef {
  readonly id: string;
  readonly nameHe: string;
  readonly subtitleHe: string;
  readonly badgeColors: readonly [string, string, string];
  readonly palette: ILabSkinPalette;
}

export interface ILabEntityDef {
  readonly id: string;
  readonly nameHe: string;
  readonly subtitleHe: string;
  readonly category: LabCategoryId;
  readonly categoryLabelHe: string;
  readonly worldLocationHe: string;
  readonly worldCoordinatesText: string;
  readonly worldInstanceCount: number;
  readonly sourceFile: string;
  readonly descriptionHe: string;
  readonly defaultCameraDistance: number;
  readonly defaultCameraTargetY: number;
  readonly anatomyTagsHe: readonly string[];
  readonly animations: readonly ILabAnimationDef[];
  readonly skins: readonly ILabSkinDef[];
}

export type LabInspectorTab = 'animations' | 'editor' | 'skins';
export type LabStageEnvironment = 'studio_day' | 'golden_sunset' | 'moonlit_night';
export type LabCameraPreset = 'front' | 'angle' | 'side' | 'back' | 'closeup';

/**
 * Summary: User-editable fine-tuning overrides for animations, right-hand weapon,
 *          left-hand weapon, and body joints in the Lab.
 */
export interface ILabPoseOverrides {
  /** Visibility mode for held weapons/props ('auto' | 'both' | 'right_only' | 'left_only' | 'none') */
  readonly equipmentVisibilityMode: LabEquipmentVisibilityMode;
  /** Multiplier on animation motion amplitude (0.0 to 2.0, default 1.0) */
  readonly amplitudeMultiplier: number;
  /** Right-hand weapon / primary prop rotation offsets in degrees (-180 to +180) */
  readonly weaponRotXDeg: number;
  readonly weaponRotYDeg: number;
  readonly weaponRotZDeg: number;
  /** Right-hand weapon / primary prop scale multiplier (0.5 to 2.0, default 1.0) */
  readonly weaponScale: number;
  /** Left-hand weapon / secondary prop rotation offsets in degrees (-180 to +180) */
  readonly leftWeaponRotXDeg: number;
  readonly leftWeaponRotYDeg: number;
  readonly leftWeaponRotZDeg: number;
  /** Left-hand weapon / secondary prop scale multiplier (0.5 to 2.0, default 1.0) */
  readonly leftWeaponScale: number;
  /** Right arm / wing / fin / front-right leg rotation offsets in degrees (-180 to +180) */
  readonly rightLimbRotXDeg: number;
  readonly rightLimbRotYDeg: number;
  readonly rightLimbRotZDeg: number;
  /** Left arm / wing / fin / front-left leg rotation offsets in degrees (-180 to +180) */
  readonly leftLimbRotXDeg: number;
  readonly leftLimbRotYDeg: number;
  readonly leftLimbRotZDeg: number;
  /** Head & neck rotation offsets in degrees (-90 to +90) */
  readonly headRotXDeg: number;
  readonly headRotYDeg: number;
  readonly headRotZDeg: number;
  /** Torso / body tilt & yaw offsets in degrees (-180 to +180) + vertical height offset */
  readonly bodyRotXDeg: number;
  readonly bodyRotYDeg: number;
  readonly bodyRotZDeg: number;
  readonly bodyOffsetY: number;
  /** Persistent playback speed multiplier for this entity across all animations (0.1 to 3.0, default 1.0) */
  readonly animationSpeedMultiplier?: number;
  /** Persistent per-animation playback speed multipliers (animationId -> multiplier 0.1 to 3.0) */
  readonly perAnimationSpeeds?: Readonly<Record<string, number>>;
}

export const DEFAULT_LAB_POSE_OVERRIDES: ILabPoseOverrides = {
  equipmentVisibilityMode: 'auto',
  amplitudeMultiplier: 1.0,
  weaponRotXDeg: 0,
  weaponRotYDeg: 0,
  weaponRotZDeg: 0,
  weaponScale: 1.0,
  leftWeaponRotXDeg: 0,
  leftWeaponRotYDeg: 0,
  leftWeaponRotZDeg: 0,
  leftWeaponScale: 1.0,
  rightLimbRotXDeg: 0,
  rightLimbRotYDeg: 0,
  rightLimbRotZDeg: 0,
  leftLimbRotXDeg: 0,
  leftLimbRotYDeg: 0,
  leftLimbRotZDeg: 0,
  headRotXDeg: 0,
  headRotYDeg: 0,
  headRotZDeg: 0,
  bodyRotXDeg: 0,
  bodyRotYDeg: 0,
  bodyRotZDeg: 0,
  bodyOffsetY: 0,
  animationSpeedMultiplier: 1.0,
  perAnimationSpeeds: {},
};

export interface ILabSessionState {
  readonly selectedEntityId: string;
  readonly selectedAnimationId: string;
  readonly selectedSkinId: string;
  readonly activeRightTab: LabInspectorTab;
  readonly categoryFilter: LabCategoryFilter;
  readonly searchQuery: string;
  readonly playbackSpeed: number;
  readonly isPaused: boolean;
  readonly manualPhase: number;
  readonly autoTurntable: boolean;
  readonly showWireframe: boolean;
  readonly showFloorGrid: boolean;
  readonly showHeightRuler: boolean;
  readonly stageEnvironment: LabStageEnvironment;
  readonly cameraPreset: LabCameraPreset;
}
// #endregion

// ======================== CATEGORY METADATA ======================== \\
// #region Category Metadata
export const LAB_CATEGORIES: readonly { id: LabCategoryId; labelHe: string; subtitleHe: string }[] = [
  { id: 'characters', labelHe: t('lab.categories.characters.label'), subtitleHe: t('lab.categories.characters.subtitle') },
  { id: 'animals', labelHe: t('lab.categories.animals.label'), subtitleHe: t('lab.categories.animals.subtitle') },
] as const;
// #endregion

// ======================== ENTITY CATALOG ======================== \\
// #region Entity Catalog
const horseSkinsFromWorld: ILabSkinDef[] = RIDEABLE_HORSES.map((h, idx) => {
  const hexToCss = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`;
  return {
    id: h.id,
    nameHe: h.name,
    subtitleHe: t('lab.horse_stable_subtitle', {
      n: idx + 1,
      x: Math.round(h.homeX),
      z: Math.round(h.homeZ),
    }),
    badgeColors: [
      hexToCss(h.coatColorHex),
      hexToCss(h.maneColorHex),
      hexToCss(h.saddleColorHex),
    ],
    palette: {
      primaryHex: h.coatColorHex,
      secondaryHex: h.maneColorHex,
      accentHex: h.saddleColorHex,
      trimHex: 0xd4af37,
    },
  };
});

export const LAB_ENTITIES: readonly ILabEntityDef[] = [
  // ==========================================================================
  // 1. HUMANS & CHARACTERS (אנשים ודמויות)
  // ==========================================================================
  {
    id: 'ranger_third_person',
    nameHe: t('lab.entities.ranger_third_person.name'),
    subtitleHe: t('lab.entities.ranger_third_person.subtitle'),
    category: 'characters',
    categoryLabelHe: t('lab.entities.ranger_third_person.category_label'),
    worldLocationHe: t('lab.entities.ranger_third_person.world_location'),
    worldCoordinatesText: '(0, 22)',
    worldInstanceCount: 1,
    sourceFile: 'src/world/builders/playerAndCombatBuilder.ts',
    descriptionHe:
      t('lab.entities.ranger_third_person.description'),
    defaultCameraDistance: 4.1,
    defaultCameraTargetY: 0.98,
    anatomyTagsHe: [t('lab.entities.ranger_third_person.anatomy_tags.0'), t('lab.entities.ranger_third_person.anatomy_tags.1'), t('lab.entities.ranger_third_person.anatomy_tags.2'), t('lab.entities.ranger_third_person.anatomy_tags.3'), t('lab.entities.ranger_third_person.anatomy_tags.4'), t('lab.entities.ranger_third_person.anatomy_tags.5')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.ranger_third_person.animations.none.name'),
        descriptionHe: t('lab.entities.ranger_third_person.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        nameHe: t('lab.entities.ranger_third_person.animations.idle.name'),
        descriptionHe: t('lab.entities.ranger_third_person.animations.idle.description'),
        loopDurationSec: 3.8,
      },
      {
        id: 'walk',
        nameHe: t('lab.entities.ranger_third_person.animations.walk.name'),
        descriptionHe: t('lab.entities.ranger_third_person.animations.walk.description'),
        loopDurationSec: 1.4,
      },
      {
        id: 'sprint',
        nameHe: t('lab.entities.ranger_third_person.animations.sprint.name'),
        descriptionHe: t('lab.entities.ranger_third_person.animations.sprint.description'),
        loopDurationSec: 0.85,
      },
      {
        id: 'bow_draw',
        nameHe: t('lab.entities.ranger_third_person.animations.bow_draw.name'),
        descriptionHe: t('lab.entities.ranger_third_person.animations.bow_draw.description'),
        loopDurationSec: 2.2,
      },
      {
        id: 'sword_slash',
        nameHe: t('lab.entities.ranger_third_person.animations.sword_slash.name'),
        descriptionHe: t('lab.entities.ranger_third_person.animations.sword_slash.description'),
        loopDurationSec: 1.6,
      },
      {
        id: 'torch_carry',
        nameHe: t('lab.entities.ranger_third_person.animations.torch_carry.name'),
        descriptionHe: t('lab.entities.ranger_third_person.animations.torch_carry.description'),
        loopDurationSec: 2.4,
      },
      {
        id: 'swim',
        nameHe: t('lab.entities.ranger_third_person.animations.swim.name'),
        descriptionHe: t('lab.entities.ranger_third_person.animations.swim.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'horse_mount_pose',
        nameHe: t('lab.entities.ranger_third_person.animations.horse_mount_pose.name'),
        descriptionHe: t('lab.entities.ranger_third_person.animations.horse_mount_pose.description'),
        loopDurationSec: 1.6,
      },
    ],
    skins: [
      {
        id: 'ranger_classic_forest',
        nameHe: t('lab.entities.ranger_third_person.skins.ranger_classic_forest.name'),
        subtitleHe: t('lab.entities.ranger_third_person.skins.ranger_classic_forest.subtitle'),
        badgeColors: ['#3b4d3b', '#2a332b', '#5c3a21'],
        palette: {
          primaryHex: 0x3b4d3b,
          secondaryHex: 0x2a332b,
          accentHex: 0x5c3a21,
          trimHex: 0xc5a059,
          emissiveHex: 0xe2e8f0,
        },
      },
      {
        id: 'ranger_imperial_guard',
        nameHe: t('lab.entities.ranger_third_person.skins.ranger_imperial_guard.name'),
        subtitleHe: t('lab.entities.ranger_third_person.skins.ranger_imperial_guard.subtitle'),
        badgeColors: ['#991b1b', '#7f1d1d', '#d4af37'],
        palette: {
          primaryHex: 0x991b1b,
          secondaryHex: 0x450a0a,
          accentHex: 0xd4af37,
          trimHex: 0xfbbf24,
          emissiveHex: 0xf97316,
        },
      },
      {
        id: 'ranger_shadow_stalker',
        nameHe: t('lab.entities.ranger_third_person.skins.ranger_shadow_stalker.name'),
        subtitleHe: t('lab.entities.ranger_third_person.skins.ranger_shadow_stalker.subtitle'),
        badgeColors: ['#1e293b', '#0f172a', '#a855f7'],
        palette: {
          primaryHex: 0x1e293b,
          secondaryHex: 0x090d16,
          accentHex: 0x334155,
          trimHex: 0xc084fc,
          emissiveHex: 0xa855f7,
        },
      },
      {
        id: 'ranger_oasis_nomad',
        nameHe: t('lab.entities.ranger_third_person.skins.ranger_oasis_nomad.name'),
        subtitleHe: t('lab.entities.ranger_third_person.skins.ranger_oasis_nomad.subtitle'),
        badgeColors: ['#d97706', '#1d4ed8', '#fef3c7'],
        palette: {
          primaryHex: 0xb45309,
          secondaryHex: 0x1e3a8a,
          accentHex: 0x78350f,
          trimHex: 0xfde68a,
          emissiveHex: 0x06b6d4,
        },
      },
    ],
  },

  {
    id: 'ranger_first_person',
    nameHe: t('lab.entities.ranger_first_person.name'),
    subtitleHe: t('lab.entities.ranger_first_person.subtitle'),
    category: 'characters',
    categoryLabelHe: t('lab.entities.ranger_first_person.category_label'),
    worldLocationHe: t('lab.entities.ranger_first_person.world_location'),
    worldCoordinatesText: t('lab.entities.ranger_first_person.world_coordinates'),
    worldInstanceCount: 1,
    sourceFile: 'src/world/systems/swordAttackAnimationSystem.ts',
    descriptionHe:
      t('lab.entities.ranger_first_person.description'),
    defaultCameraDistance: 1.85,
    defaultCameraTargetY: 1.15,
    anatomyTagsHe: [t('lab.entities.ranger_first_person.anatomy_tags.0'), t('lab.entities.ranger_first_person.anatomy_tags.1'), t('lab.entities.ranger_first_person.anatomy_tags.2'), t('lab.entities.ranger_first_person.anatomy_tags.3'), t('lab.entities.ranger_first_person.anatomy_tags.4')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.ranger_first_person.animations.none.name'),
        descriptionHe: t('lab.entities.ranger_first_person.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'fp_sword_combo',
        nameHe: t('lab.entities.ranger_first_person.animations.fp_sword_combo.name'),
        descriptionHe: t('lab.entities.ranger_first_person.animations.fp_sword_combo.description'),
        loopDurationSec: 2.4,
      },
      {
        id: 'fp_sword_heavy',
        nameHe: t('lab.entities.ranger_first_person.animations.fp_sword_heavy.name'),
        descriptionHe: t('lab.entities.ranger_first_person.animations.fp_sword_heavy.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'fp_sword_block',
        nameHe: t('lab.entities.ranger_first_person.animations.fp_sword_block.name'),
        descriptionHe: t('lab.entities.ranger_first_person.animations.fp_sword_block.description'),
        loopDurationSec: 2.0,
      },
      {
        id: 'fp_bow_aim',
        nameHe: t('lab.entities.ranger_first_person.animations.fp_bow_aim.name'),
        descriptionHe: t('lab.entities.ranger_first_person.animations.fp_bow_aim.description'),
        loopDurationSec: 2.2,
      },
      {
        id: 'fp_torch_hold',
        nameHe: t('lab.entities.ranger_first_person.animations.fp_torch_hold.name'),
        descriptionHe: t('lab.entities.ranger_first_person.animations.fp_torch_hold.description'),
        loopDurationSec: 2.0,
      },
    ],
    skins: [
      {
        id: 'fp_elven_emerald',
        nameHe: t('lab.entities.ranger_first_person.skins.fp_elven_emerald.name'),
        subtitleHe: t('lab.entities.ranger_first_person.skins.fp_elven_emerald.subtitle'),
        badgeColors: ['#1b4d3e', '#d4af37', '#36200d'],
        palette: {
          primaryHex: 0x1b4d3e,
          secondaryHex: 0x36200d,
          accentHex: 0xd4af37,
          emissiveHex: 0x38bdf8,
        },
      },
      {
        id: 'fp_imperial_crimson',
        nameHe: t('lab.entities.ranger_first_person.skins.fp_imperial_crimson.name'),
        subtitleHe: t('lab.entities.ranger_first_person.skins.fp_imperial_crimson.subtitle'),
        badgeColors: ['#991b1b', '#fbbf24', '#f97316'],
        palette: {
          primaryHex: 0x991b1b,
          secondaryHex: 0x29150c,
          accentHex: 0xfbbf24,
          emissiveHex: 0xf97316,
        },
      },
      {
        id: 'fp_dwarven_mithril',
        nameHe: t('lab.entities.ranger_first_person.skins.fp_dwarven_mithril.name'),
        subtitleHe: t('lab.entities.ranger_first_person.skins.fp_dwarven_mithril.subtitle'),
        badgeColors: ['#cbd5e1', '#38bdf8', '#1e293b'],
        palette: {
          primaryHex: 0x475569,
          secondaryHex: 0x1e293b,
          accentHex: 0xe2e8f0,
          emissiveHex: 0x38bdf8,
        },
      },
    ],
  },

  {
    id: 'dwarven_miner',
    nameHe: t('lab.entities.dwarven_miner.name'),
    subtitleHe: t('lab.entities.dwarven_miner.subtitle'),
    category: 'characters',
    categoryLabelHe: t('lab.entities.dwarven_miner.category_label'),
    worldLocationHe: t('lab.entities.dwarven_miner.world_location'),
    worldCoordinatesText: `(${SOUTHERN_MINE_POS.x}, ${SOUTHERN_MINE_POS.entranceZ})`,
    worldInstanceCount: DWARVEN_MINERS_COUNT,
    sourceFile: 'src/world/systems/dwarvenMineAndCaravanSystem.ts',
    descriptionHe:
      t('lab.entities.dwarven_miner.description'),
    defaultCameraDistance: 3.4,
    defaultCameraTargetY: 0.82,
    anatomyTagsHe: [t('lab.entities.dwarven_miner.anatomy_tags.0'), t('lab.entities.dwarven_miner.anatomy_tags.1'), t('lab.entities.dwarven_miner.anatomy_tags.2'), t('lab.entities.dwarven_miner.anatomy_tags.3'), t('lab.entities.dwarven_miner.anatomy_tags.4'), t('lab.entities.dwarven_miner.anatomy_tags.5')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.dwarven_miner.animations.none.name'),
        descriptionHe: t('lab.entities.dwarven_miner.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'mining_work',
        nameHe: t('lab.entities.dwarven_miner.animations.mining_work.name'),
        descriptionHe: t('lab.entities.dwarven_miner.animations.mining_work.description'),
        loopDurationSec: 1.2,
      },
      {
        id: 'caravan_march',
        nameHe: t('lab.entities.dwarven_miner.animations.caravan_march.name'),
        descriptionHe: t('lab.entities.dwarven_miner.animations.caravan_march.description'),
        loopDurationSec: 1.1,
      },
      {
        id: 'miner_idle',
        nameHe: t('lab.entities.dwarven_miner.animations.miner_idle.name'),
        descriptionHe: t('lab.entities.dwarven_miner.animations.miner_idle.description'),
        loopDurationSec: 3.2,
      },
      {
        id: 'celebrate_gold',
        nameHe: t('lab.entities.dwarven_miner.animations.celebrate_gold.name'),
        descriptionHe: t('lab.entities.dwarven_miner.animations.celebrate_gold.description'),
        loopDurationSec: 1.5,
      },
    ],
    skins: [
      {
        id: 'dwarf_thorin_red',
        nameHe: t('lab.entities.dwarven_miner.skins.dwarf_thorin_red.name'),
        subtitleHe: t('lab.entities.dwarven_miner.skins.dwarf_thorin_red.subtitle'),
        badgeColors: ['#333629', '#8c3b16', '#9e7b42'],
        palette: {
          primaryHex: 0x333629,
          secondaryHex: 0x8c3b16,
          accentHex: 0x9e7b42,
          trimHex: 0x10b981,
        },
      },
      {
        id: 'dwarf_balin_blue',
        nameHe: t('lab.entities.dwarven_miner.skins.dwarf_balin_blue.name'),
        subtitleHe: t('lab.entities.dwarven_miner.skins.dwarf_balin_blue.subtitle'),
        badgeColors: ['#1e3a5f', '#cbd5e1', '#d4af37'],
        palette: {
          primaryHex: 0x1e3a5f,
          secondaryHex: 0xcbd5e1,
          accentHex: 0x94a3b8,
          trimHex: 0xd4af37,
        },
      },
      {
        id: 'dwarf_dwalin_green',
        nameHe: t('lab.entities.dwarven_miner.skins.dwarf_dwalin_green.name'),
        subtitleHe: t('lab.entities.dwarven_miner.skins.dwarf_dwalin_green.subtitle'),
        badgeColors: ['#2d4c2b', '#1c1917', '#10b981'],
        palette: {
          primaryHex: 0x2d4c2b,
          secondaryHex: 0x1c1917,
          accentHex: 0xb8860b,
          trimHex: 0x10b981,
        },
      },
      {
        id: 'dwarf_bofur_amber',
        nameHe: t('lab.entities.dwarven_miner.skins.dwarf_bofur_amber.name'),
        subtitleHe: t('lab.entities.dwarven_miner.skins.dwarf_bofur_amber.subtitle'),
        badgeColors: ['#5c3a21', '#d97706', '#fbbf24'],
        palette: {
          primaryHex: 0x5c3a21,
          secondaryHex: 0xd97706,
          accentHex: 0xb8860b,
          trimHex: 0xfbbf24,
        },
      },
    ],
  },

  {
    id: 'shaolin_monk',
    nameHe: t('lab.entities.shaolin_monk.name'),
    subtitleHe: t('lab.entities.shaolin_monk.subtitle'),
    category: 'characters',
    categoryLabelHe: t('lab.entities.shaolin_monk.category_label'),
    worldLocationHe: t('lab.entities.shaolin_monk.world_location'),
    worldCoordinatesText: `(${CHINESE_FORTRESS_POS.x}, ${CHINESE_FORTRESS_POS.z})`,
    worldInstanceCount: 8,
    sourceFile: 'src/world/models/fortressModels.ts',
    descriptionHe:
      t('lab.entities.shaolin_monk.description'),
    defaultCameraDistance: 3.9,
    defaultCameraTargetY: 0.95,
    anatomyTagsHe: [t('lab.entities.shaolin_monk.anatomy_tags.0'), t('lab.entities.shaolin_monk.anatomy_tags.1'), t('lab.entities.shaolin_monk.anatomy_tags.2'), t('lab.entities.shaolin_monk.anatomy_tags.3'), t('lab.entities.shaolin_monk.anatomy_tags.4')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.shaolin_monk.animations.none.name'),
        descriptionHe: t('lab.entities.shaolin_monk.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'kung_fu_form',
        nameHe: t('lab.entities.shaolin_monk.animations.kung_fu_form.name'),
        descriptionHe: t('lab.entities.shaolin_monk.animations.kung_fu_form.description'),
        loopDurationSec: 3.4,
      },
      {
        id: 'staff_whirlwind',
        nameHe: t('lab.entities.shaolin_monk.animations.staff_whirlwind.name'),
        descriptionHe: t('lab.entities.shaolin_monk.animations.staff_whirlwind.description'),
        loopDurationSec: 1.4,
      },
      {
        id: 'horse_stance_strike',
        nameHe: t('lab.entities.shaolin_monk.animations.horse_stance_strike.name'),
        descriptionHe: t('lab.entities.shaolin_monk.animations.horse_stance_strike.description'),
        loopDurationSec: 2.0,
      },
      {
        id: 'shaolin_salute',
        nameHe: t('lab.entities.shaolin_monk.animations.shaolin_salute.name'),
        descriptionHe: t('lab.entities.shaolin_monk.animations.shaolin_salute.description'),
        loopDurationSec: 2.6,
      },
    ],
    skins: [
      {
        id: 'monk_saffron_classic',
        nameHe: t('lab.entities.shaolin_monk.skins.monk_saffron_classic.name'),
        subtitleHe: t('lab.entities.shaolin_monk.skins.monk_saffron_classic.subtitle'),
        badgeColors: ['#d96b27', '#991b1b', '#d4af37'],
        palette: {
          primaryHex: 0xd96b27,
          secondaryHex: 0x262626,
          accentHex: 0x991b1b,
          trimHex: 0xd4af37,
        },
      },
      {
        id: 'monk_grandmaster_crimson',
        nameHe: t('lab.entities.shaolin_monk.skins.monk_grandmaster_crimson.name'),
        subtitleHe: t('lab.entities.shaolin_monk.skins.monk_grandmaster_crimson.subtitle'),
        badgeColors: ['#991b1b', '#fbbf24', '#1c1917'],
        palette: {
          primaryHex: 0x991b1b,
          secondaryHex: 0x1c1917,
          accentHex: 0xfbbf24,
          trimHex: 0xfef08a,
        },
      },
      {
        id: 'monk_jade_guardian',
        nameHe: t('lab.entities.shaolin_monk.skins.monk_jade_guardian.name'),
        subtitleHe: t('lab.entities.shaolin_monk.skins.monk_jade_guardian.subtitle'),
        badgeColors: ['#047857', '#064e3b', '#f59e0b'],
        palette: {
          primaryHex: 0x047857,
          secondaryHex: 0x064e3b,
          accentHex: 0xd97706,
          trimHex: 0x34d399,
        },
      },
      {
        id: 'monk_mountain_slate',
        nameHe: t('lab.entities.shaolin_monk.skins.monk_mountain_slate.name'),
        subtitleHe: t('lab.entities.shaolin_monk.skins.monk_mountain_slate.subtitle'),
        badgeColors: ['#475569', '#1e293b', '#38bdf8'],
        palette: {
          primaryHex: 0x475569,
          secondaryHex: 0x1e293b,
          accentHex: 0x0284c7,
          trimHex: 0xe2e8f0,
        },
      },
    ],
  },

  {
    id: 'tai_chi_monk',
    nameHe: t('lab.entities.tai_chi_monk.name'),
    subtitleHe: t('lab.entities.tai_chi_monk.subtitle'),
    category: 'characters',
    categoryLabelHe: t('lab.entities.tai_chi_monk.category_label'),
    worldLocationHe: t('lab.entities.tai_chi_monk.world_location'),
    worldCoordinatesText: `(${SAKURA_SANCTUARY_POS.x}, ${SAKURA_SANCTUARY_POS.z})`,
    worldInstanceCount: 4,
    sourceFile: 'src/world/models/sanctuaryAndDragonModels.ts',
    descriptionHe:
      t('lab.entities.tai_chi_monk.description'),
    defaultCameraDistance: 3.8,
    defaultCameraTargetY: 0.95,
    anatomyTagsHe: [t('lab.entities.tai_chi_monk.anatomy_tags.0'), t('lab.entities.tai_chi_monk.anatomy_tags.1'), t('lab.entities.tai_chi_monk.anatomy_tags.2'), t('lab.entities.tai_chi_monk.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.tai_chi_monk.animations.none.name'),
        descriptionHe: t('lab.entities.tai_chi_monk.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'tai_chi_flow',
        nameHe: t('lab.entities.tai_chi_monk.animations.tai_chi_flow.name'),
        descriptionHe: t('lab.entities.tai_chi_monk.animations.tai_chi_flow.description'),
        loopDurationSec: 4.2,
      },
      {
        id: 'cloud_hands',
        nameHe: t('lab.entities.tai_chi_monk.animations.cloud_hands.name'),
        descriptionHe: t('lab.entities.tai_chi_monk.animations.cloud_hands.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'crane_balance',
        nameHe: t('lab.entities.tai_chi_monk.animations.crane_balance.name'),
        descriptionHe: t('lab.entities.tai_chi_monk.animations.crane_balance.description'),
        loopDurationSec: 3.2,
      },
    ],
    skins: [
      {
        id: 'taichi_sakura_blossom',
        nameHe: t('lab.entities.tai_chi_monk.skins.taichi_sakura_blossom.name'),
        subtitleHe: t('lab.entities.tai_chi_monk.skins.taichi_sakura_blossom.subtitle'),
        badgeColors: ['#f472b6', '#fdf2f8', '#9d174d'],
        palette: {
          primaryHex: 0xfbcfe8,
          secondaryHex: 0x831843,
          accentHex: 0xdb2777,
          trimHex: 0xfef3c7,
        },
      },
      {
        id: 'taichi_sunrise_orange',
        nameHe: t('lab.entities.tai_chi_monk.skins.taichi_sunrise_orange.name'),
        subtitleHe: t('lab.entities.tai_chi_monk.skins.taichi_sunrise_orange.subtitle'),
        badgeColors: ['#d96b27', '#991b1b', '#f5f0e6'],
        palette: {
          primaryHex: 0xd96b27,
          secondaryHex: 0x262626,
          accentHex: 0x991b1b,
          trimHex: 0xf5f0e6,
        },
      },
      {
        id: 'taichi_zen_white',
        nameHe: t('lab.entities.tai_chi_monk.skins.taichi_zen_white.name'),
        subtitleHe: t('lab.entities.tai_chi_monk.skins.taichi_zen_white.subtitle'),
        badgeColors: ['#f8fafc', '#cbd5e1', '#d4af37'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0x334155,
          accentHex: 0xd4af37,
          trimHex: 0x94a3b8,
        },
      },
    ],
  },

  {
    id: 'harbor_merchant',
    nameHe: t('lab.entities.harbor_merchant.name'),
    subtitleHe: t('lab.entities.harbor_merchant.subtitle'),
    category: 'characters',
    categoryLabelHe: t('lab.entities.harbor_merchant.category_label'),
    worldLocationHe: t('lab.entities.harbor_merchant.world_location'),
    worldCoordinatesText: `(${SOUTHEAST_HARBOR_POS.x}, ${SOUTHEAST_HARBOR_POS.z})`,
    worldInstanceCount: MARKET_STALL_LOCATIONS.length,
    sourceFile: 'src/world/domain/landmarks/oasisAndHarborLandmarks.ts',
    descriptionHe:
      t('lab.entities.harbor_merchant.description'),
    defaultCameraDistance: 3.8,
    defaultCameraTargetY: 0.95,
    anatomyTagsHe: [t('lab.entities.harbor_merchant.anatomy_tags.0'), t('lab.entities.harbor_merchant.anatomy_tags.1'), t('lab.entities.harbor_merchant.anatomy_tags.2'), t('lab.entities.harbor_merchant.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.harbor_merchant.animations.none.name'),
        descriptionHe: t('lab.entities.harbor_merchant.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'merchant_welcome',
        nameHe: t('lab.entities.harbor_merchant.animations.merchant_welcome.name'),
        descriptionHe: t('lab.entities.harbor_merchant.animations.merchant_welcome.description'),
        loopDurationSec: 2.8,
      },
      {
        id: 'blacksmith_forge',
        nameHe: t('lab.entities.harbor_merchant.animations.blacksmith_forge.name'),
        descriptionHe: t('lab.entities.harbor_merchant.animations.blacksmith_forge.description'),
        loopDurationSec: 1.3,
      },
      {
        id: 'market_call',
        nameHe: t('lab.entities.harbor_merchant.animations.market_call.name'),
        descriptionHe: t('lab.entities.harbor_merchant.animations.market_call.description'),
        loopDurationSec: 2.2,
      },
    ],
    skins: [
      {
        id: 'merchant_liang_crimson',
        nameHe: t('lab.entities.harbor_merchant.skins.merchant_liang_crimson.name'),
        subtitleHe: t('lab.entities.harbor_merchant.skins.merchant_liang_crimson.subtitle'),
        badgeColors: ['#991b1b', '#d4af37', '#1e293b'],
        palette: {
          primaryHex: 0x991b1b,
          secondaryHex: 0x1e293b,
          accentHex: 0xd4af37,
          trimHex: 0xfbbf24,
        },
      },
      {
        id: 'merchant_mei_emerald',
        nameHe: t('lab.entities.harbor_merchant.skins.merchant_mei_emerald.name'),
        subtitleHe: t('lab.entities.harbor_merchant.skins.merchant_mei_emerald.subtitle'),
        badgeColors: ['#065f46', '#10b981', '#d97706'],
        palette: {
          primaryHex: 0x065f46,
          secondaryHex: 0x064e3b,
          accentHex: 0xd97706,
          trimHex: 0x34d399,
        },
      },
      {
        id: 'merchant_borin_blacksmith',
        nameHe: t('lab.entities.harbor_merchant.skins.merchant_borin_blacksmith.name'),
        subtitleHe: t('lab.entities.harbor_merchant.skins.merchant_borin_blacksmith.subtitle'),
        badgeColors: ['#451a03', '#78350f', '#f97316'],
        palette: {
          primaryHex: 0x451a03,
          secondaryHex: 0x1c1917,
          accentHex: 0x78350f,
          trimHex: 0xf97316,
        },
      },
      {
        id: 'merchant_karim_lapis',
        nameHe: t('lab.entities.harbor_merchant.skins.merchant_karim_lapis.name'),
        subtitleHe: t('lab.entities.harbor_merchant.skins.merchant_karim_lapis.subtitle'),
        badgeColors: ['#1d4ed8', '#dbeafe', '#d4af37'],
        palette: {
          primaryHex: 0x1d4ed8,
          secondaryHex: 0x1e3a8a,
          accentHex: 0xd4af37,
          trimHex: 0x93c5fd,
        },
      },
    ],
  },

  // ==========================================================================
  // 2. ANIMALS & WILDLIFE (חיות בר ורכיבה)
  // ==========================================================================
  {
    id: 'rideable_horse',
    nameHe: t('lab.entities.rideable_horse.name'),
    subtitleHe: t('lab.entities.rideable_horse.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.rideable_horse.category_label'),
    worldLocationHe: t('lab.entities.rideable_horse.world_location'),
    worldCoordinatesText: t('lab.entities.rideable_horse.world_coordinates'),
    worldInstanceCount: RIDEABLE_HORSES.length,
    sourceFile: 'src/world/systems/horsePhysicsSystem.ts',
    descriptionHe:
      t('lab.entities.rideable_horse.description'),
    defaultCameraDistance: 4.1,
    defaultCameraTargetY: 1.15,
    anatomyTagsHe: [t('lab.entities.rideable_horse.anatomy_tags.0'), t('lab.entities.rideable_horse.anatomy_tags.1'), t('lab.entities.rideable_horse.anatomy_tags.2'), t('lab.entities.rideable_horse.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.rideable_horse.animations.none.name'),
        descriptionHe: t('lab.entities.rideable_horse.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'horse_idle',
        nameHe: t('lab.entities.rideable_horse.animations.horse_idle.name'),
        descriptionHe: t('lab.entities.rideable_horse.animations.horse_idle.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'horse_walk',
        nameHe: t('lab.entities.rideable_horse.animations.horse_walk.name'),
        descriptionHe: t('lab.entities.rideable_horse.animations.horse_walk.description'),
        loopDurationSec: 1.6,
      },
      {
        id: 'horse_trot',
        nameHe: t('lab.entities.rideable_horse.animations.horse_trot.name'),
        descriptionHe: t('lab.entities.rideable_horse.animations.horse_trot.description'),
        loopDurationSec: 1.1,
      },
      {
        id: 'horse_gallop',
        nameHe: t('lab.entities.rideable_horse.animations.horse_gallop.name'),
        descriptionHe: t('lab.entities.rideable_horse.animations.horse_gallop.description'),
        loopDurationSec: 0.78,
      },
      {
        id: 'horse_rear',
        nameHe: t('lab.entities.rideable_horse.animations.horse_rear.name'),
        descriptionHe: t('lab.entities.rideable_horse.animations.horse_rear.description'),
        loopDurationSec: 2.2,
      },
    ],
    skins: horseSkinsFromWorld,
  },

  {
    id: 'forest_deer',
    nameHe: t('lab.entities.forest_deer.name'),
    subtitleHe: t('lab.entities.forest_deer.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.forest_deer.category_label'),
    worldLocationHe: t('lab.entities.forest_deer.world_location'),
    worldCoordinatesText: t('lab.entities.forest_deer.world_coordinates'),
    worldInstanceCount: 5,
    sourceFile: 'src/world/models/Deer.ts (public/models/Deer_Complete.ts)',
    descriptionHe:
      t('lab.entities.forest_deer.description'),
    defaultCameraDistance: 3.2,
    defaultCameraTargetY: 0.72,
    anatomyTagsHe: [t('lab.entities.forest_deer.anatomy_tags.0'), t('lab.entities.forest_deer.anatomy_tags.1'), t('lab.entities.forest_deer.anatomy_tags.2'), t('lab.entities.forest_deer.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.forest_deer.animations.none.name'),
        descriptionHe: t('lab.entities.forest_deer.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        nameHe: t('lab.entities.forest_deer.animations.idle.name'),
        descriptionHe: t('lab.entities.forest_deer.animations.idle.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'walk',
        nameHe: t('lab.entities.forest_deer.animations.walk.name'),
        descriptionHe: t('lab.entities.forest_deer.animations.walk.description'),
        loopDurationSec: 1.5,
      },
      {
        id: 'eat',
        nameHe: t('lab.entities.forest_deer.animations.eat.name'),
        descriptionHe: t('lab.entities.forest_deer.animations.eat.description'),
        loopDurationSec: 3.2,
      },
      {
        id: 'call',
        nameHe: t('lab.entities.forest_deer.animations.call.name'),
        descriptionHe: t('lab.entities.forest_deer.animations.call.description'),
        loopDurationSec: 3.0,
      },
      {
        id: 'lie',
        nameHe: t('lab.entities.forest_deer.animations.lie.name'),
        descriptionHe: t('lab.entities.forest_deer.animations.lie.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'run',
        nameHe: t('lab.entities.forest_deer.animations.run.name'),
        descriptionHe: t('lab.entities.forest_deer.animations.run.description'),
        loopDurationSec: 0.9,
      },
      {
        id: 'flee',
        nameHe: t('lab.entities.forest_deer.animations.flee.name'),
        descriptionHe: t('lab.entities.forest_deer.animations.flee.description'),
        loopDurationSec: 0.8,
      },
      {
        id: 'skip',
        nameHe: t('lab.entities.forest_deer.animations.skip.name'),
        descriptionHe: t('lab.entities.forest_deer.animations.skip.description'),
        loopDurationSec: 1.1,
      },
      {
        id: 'death',
        nameHe: t('lab.entities.forest_deer.animations.death.name'),
        descriptionHe: t('lab.entities.forest_deer.animations.death.description'),
        loopDurationSec: 3.5,
      },
    ],
    skins: [
      {
        id: 'deer_stag_classic',
        nameHe: t('lab.entities.forest_deer.skins.deer_stag_classic.name'),
        subtitleHe: t('lab.entities.forest_deer.skins.deer_stag_classic.subtitle'),
        badgeColors: ['#8c583a', '#d8c8b4', '#3b2314'],
        palette: {
          primaryHex: 0x8c583a,
          secondaryHex: 0xd8c8b4,
          accentHex: 0x3b2314,
          hasAntlers: true,
        },
      },
      {
        id: 'deer_doe_gentle',
        nameHe: t('lab.entities.forest_deer.skins.deer_doe_gentle.name'),
        subtitleHe: t('lab.entities.forest_deer.skins.deer_doe_gentle.subtitle'),
        badgeColors: ['#a16237', '#fde68a', '#451a03'],
        palette: {
          primaryHex: 0xa16237,
          secondaryHex: 0xfde68a,
          accentHex: 0x451a03,
          hasAntlers: false,
        },
      },
      {
        id: 'deer_white_hart',
        nameHe: t('lab.entities.forest_deer.skins.deer_white_hart.name'),
        subtitleHe: t('lab.entities.forest_deer.skins.deer_white_hart.subtitle'),
        badgeColors: ['#f8fafc', '#fbbf24', '#cbd5e1'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0xfbbf24,
          accentHex: 0x94a3b8,
          hasAntlers: true,
        },
      },
      {
        id: 'deer_highland_dark',
        nameHe: t('lab.entities.forest_deer.skins.deer_highland_dark.name'),
        subtitleHe: t('lab.entities.forest_deer.skins.deer_highland_dark.subtitle'),
        badgeColors: ['#44403c', '#a8a29e', '#1c1917'],
        palette: {
          primaryHex: 0x44403c,
          secondaryHex: 0xa8a29e,
          accentHex: 0x1c1917,
          hasAntlers: true,
        },
      },
    ],
  },

  {
    id: 'forest_bear',
    nameHe: t('lab.entities.forest_bear.name'),
    subtitleHe: t('lab.entities.forest_bear.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.forest_bear.category_label'),
    worldLocationHe: t('lab.entities.forest_bear.world_location'),
    worldCoordinatesText: t('lab.entities.forest_bear.world_coordinates'),
    worldInstanceCount: 7,
    sourceFile: 'src/world/models/Bear.ts (public/models/animals/Bear_Complete.ts)',
    descriptionHe:
      t('lab.entities.forest_bear.description'),
    defaultCameraDistance: 3.4,
    defaultCameraTargetY: 0.68,
    anatomyTagsHe: [t('lab.entities.forest_bear.anatomy_tags.0'), t('lab.entities.forest_bear.anatomy_tags.1'), t('lab.entities.forest_bear.anatomy_tags.2'), t('lab.entities.forest_bear.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.forest_bear.animations.none.name'),
        descriptionHe: t('lab.entities.forest_bear.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        nameHe: t('lab.entities.forest_bear.animations.idle.name'),
        descriptionHe: t('lab.entities.forest_bear.animations.idle.description'),
        loopDurationSec: 4.2,
      },
      {
        id: 'walk',
        nameHe: t('lab.entities.forest_bear.animations.walk.name'),
        descriptionHe: t('lab.entities.forest_bear.animations.walk.description'),
        loopDurationSec: 1.67,
      },
      {
        id: 'eat',
        nameHe: t('lab.entities.forest_bear.animations.eat.name'),
        descriptionHe: t('lab.entities.forest_bear.animations.eat.description'),
        loopDurationSec: 7.33,
      },
      {
        id: 'call',
        nameHe: t('lab.entities.forest_bear.animations.call.name'),
        descriptionHe: t('lab.entities.forest_bear.animations.call.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'lie',
        nameHe: t('lab.entities.forest_bear.animations.lie.name'),
        descriptionHe: t('lab.entities.forest_bear.animations.lie.description'),
        loopDurationSec: 4.17,
      },
      {
        id: 'sit',
        nameHe: t('lab.entities.forest_bear.animations.sit.name'),
        descriptionHe: t('lab.entities.forest_bear.animations.sit.description'),
        loopDurationSec: 5.0,
      },
      {
        id: 'trot',
        nameHe: t('lab.entities.forest_bear.animations.trot.name'),
        descriptionHe: t('lab.entities.forest_bear.animations.trot.description'),
        loopDurationSec: 0.67,
      },
      {
        id: 'run',
        nameHe: t('lab.entities.forest_bear.animations.run.name'),
        descriptionHe: t('lab.entities.forest_bear.animations.run.description'),
        loopDurationSec: 0.53,
      },
      {
        id: 'flee',
        nameHe: t('lab.entities.forest_bear.animations.flee.name'),
        descriptionHe: t('lab.entities.forest_bear.animations.flee.description'),
        loopDurationSec: 0.47,
      },
      {
        id: 'skip',
        nameHe: t('lab.entities.forest_bear.animations.skip.name'),
        descriptionHe: t('lab.entities.forest_bear.animations.skip.description'),
        loopDurationSec: 1.83,
      },
      {
        id: 'roar',
        nameHe: t('lab.entities.forest_bear.animations.roar.name'),
        descriptionHe: t('lab.entities.forest_bear.animations.roar.description'),
        loopDurationSec: 5.0,
      },
      {
        id: 'stomp',
        nameHe: t('lab.entities.forest_bear.animations.stomp.name'),
        descriptionHe: t('lab.entities.forest_bear.animations.stomp.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'attack',
        nameHe: t('lab.entities.forest_bear.animations.attack.name'),
        descriptionHe: t('lab.entities.forest_bear.animations.attack.description'),
        loopDurationSec: 2.4,
      },
      {
        id: 'death',
        nameHe: t('lab.entities.forest_bear.animations.death.name'),
        descriptionHe: t('lab.entities.forest_bear.animations.death.description'),
        loopDurationSec: 1.8,
      },
    ],
    skins: [
      {
        id: 'bear_grizzly_classic',
        nameHe: t('lab.entities.forest_bear.skins.bear_grizzly_classic.name'),
        subtitleHe: t('lab.entities.forest_bear.skins.bear_grizzly_classic.subtitle'),
        badgeColors: ['#6b4226', '#9c6b43', '#2a1810'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0x9c6b43,
          accentHex: 0x2a1810,
        },
      },
      {
        id: 'bear_black_mountain',
        nameHe: t('lab.entities.forest_bear.skins.bear_black_mountain.name'),
        subtitleHe: t('lab.entities.forest_bear.skins.bear_black_mountain.subtitle'),
        badgeColors: ['#292524', '#57534e', '#0c0a09'],
        palette: {
          primaryHex: 0x57534e,
          secondaryHex: 0x78716c,
          accentHex: 0x1c1917,
        },
      },
      {
        id: 'bear_polar_frost',
        nameHe: t('lab.entities.forest_bear.skins.bear_polar_frost.name'),
        subtitleHe: t('lab.entities.forest_bear.skins.bear_polar_frost.subtitle'),
        badgeColors: ['#f8fafc', '#e2e8f0', '#64748b'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0xe2e8f0,
          accentHex: 0x475569,
        },
      },
    ],
  },

  {
    id: 'river_crocodile',
    nameHe: t('lab.entities.river_crocodile.name'),
    subtitleHe: t('lab.entities.river_crocodile.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.river_crocodile.category_label'),
    worldLocationHe: t('lab.entities.river_crocodile.world_location'),
    worldCoordinatesText: t('lab.entities.river_crocodile.world_coordinates'),
    worldInstanceCount: 5,
    sourceFile: 'src/world/models/Crocodile.ts (public/models/animals/Crocodile_Complete.ts)',
    descriptionHe:
      t('lab.entities.river_crocodile.description'),
    defaultCameraDistance: 3.7,
    defaultCameraTargetY: 0.35,
    anatomyTagsHe: [t('lab.entities.river_crocodile.anatomy_tags.0'), t('lab.entities.river_crocodile.anatomy_tags.1'), t('lab.entities.river_crocodile.anatomy_tags.2'), t('lab.entities.river_crocodile.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.river_crocodile.animations.none.name'),
        descriptionHe: t('lab.entities.river_crocodile.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        nameHe: t('lab.entities.river_crocodile.animations.idle.name'),
        descriptionHe: t('lab.entities.river_crocodile.animations.idle.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'walk',
        nameHe: t('lab.entities.river_crocodile.animations.walk.name'),
        descriptionHe: t('lab.entities.river_crocodile.animations.walk.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'eat',
        nameHe: t('lab.entities.river_crocodile.animations.eat.name'),
        descriptionHe: t('lab.entities.river_crocodile.animations.eat.description'),
        loopDurationSec: 3.2,
      },
      {
        id: 'call',
        nameHe: t('lab.entities.river_crocodile.animations.call.name'),
        descriptionHe: t('lab.entities.river_crocodile.animations.call.description'),
        loopDurationSec: 3.0,
      },
      {
        id: 'lie',
        nameHe: t('lab.entities.river_crocodile.animations.lie.name'),
        descriptionHe: t('lab.entities.river_crocodile.animations.lie.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'sit',
        nameHe: t('lab.entities.river_crocodile.animations.sit.name'),
        descriptionHe: t('lab.entities.river_crocodile.animations.sit.description'),
        loopDurationSec: 3.8,
      },
      {
        id: 'trot',
        nameHe: t('lab.entities.river_crocodile.animations.trot.name'),
        descriptionHe: t('lab.entities.river_crocodile.animations.trot.description'),
        loopDurationSec: 1.6,
      },
      {
        id: 'run',
        nameHe: t('lab.entities.river_crocodile.animations.run.name'),
        descriptionHe: t('lab.entities.river_crocodile.animations.run.description'),
        loopDurationSec: 0.9,
      },
      {
        id: 'flee',
        nameHe: t('lab.entities.river_crocodile.animations.flee.name'),
        descriptionHe: t('lab.entities.river_crocodile.animations.flee.description'),
        loopDurationSec: 0.72,
      },
      {
        id: 'skip',
        nameHe: t('lab.entities.river_crocodile.animations.skip.name'),
        descriptionHe: t('lab.entities.river_crocodile.animations.skip.description'),
        loopDurationSec: 1.1,
      },
      {
        id: 'roar',
        nameHe: t('lab.entities.river_crocodile.animations.roar.name'),
        descriptionHe: t('lab.entities.river_crocodile.animations.roar.description'),
        loopDurationSec: 3.0,
      },
      {
        id: 'attack',
        nameHe: t('lab.entities.river_crocodile.animations.attack.name'),
        descriptionHe: t('lab.entities.river_crocodile.animations.attack.description'),
        loopDurationSec: 2.6,
      },
      {
        id: 'death',
        nameHe: t('lab.entities.river_crocodile.animations.death.name'),
        descriptionHe: t('lab.entities.river_crocodile.animations.death.description'),
        loopDurationSec: 2.2,
      },
    ],
    skins: [
      {
        id: 'croc_nile_classic',
        nameHe: t('lab.entities.river_crocodile.skins.croc_nile_classic.name'),
        subtitleHe: t('lab.entities.river_crocodile.skins.croc_nile_classic.subtitle'),
        badgeColors: ['#4d5d3b', '#8c8253', '#27321c'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0x8c8253,
          accentHex: 0x27321c,
        },
      },
      {
        id: 'croc_swamp_shadow',
        nameHe: t('lab.entities.river_crocodile.skins.croc_swamp_shadow.name'),
        subtitleHe: t('lab.entities.river_crocodile.skins.croc_swamp_shadow.subtitle'),
        badgeColors: ['#27382b', '#4b5563', '#0f172a'],
        palette: {
          primaryHex: 0x5c6f5e,
          secondaryHex: 0x4b5563,
          accentHex: 0x0f172a,
        },
      },
      {
        id: 'croc_oasis_golden',
        nameHe: t('lab.entities.river_crocodile.skins.croc_oasis_golden.name'),
        subtitleHe: t('lab.entities.river_crocodile.skins.croc_oasis_golden.subtitle'),
        badgeColors: ['#d4a359', '#fef08a', '#78350f'],
        palette: {
          primaryHex: 0xe5c07b,
          secondaryHex: 0xfef08a,
          accentHex: 0x78350f,
        },
      },
    ],
  },

  {
    id: 'jungle_jaguar',
    nameHe: t('lab.entities.jungle_jaguar.name'),
    subtitleHe: t('lab.entities.jungle_jaguar.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.jungle_jaguar.category_label'),
    worldLocationHe: t('lab.entities.jungle_jaguar.world_location'),
    worldCoordinatesText: '(-238, 236), (-268, 336), (-148, 228), (-84, 246)',
    worldInstanceCount: 4,
    sourceFile: 'src/world/models/Jaguar.ts (public/models/animals/Jaguar_Complete.ts)',
    descriptionHe:
      t('lab.entities.jungle_jaguar.description'),
    defaultCameraDistance: 3.1,
    defaultCameraTargetY: 0.55,
    anatomyTagsHe: [t('lab.entities.jungle_jaguar.anatomy_tags.0'), t('lab.entities.jungle_jaguar.anatomy_tags.1'), t('lab.entities.jungle_jaguar.anatomy_tags.2'), t('lab.entities.jungle_jaguar.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.jungle_jaguar.animations.none.name'),
        descriptionHe: t('lab.entities.jungle_jaguar.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        nameHe: t('lab.entities.jungle_jaguar.animations.idle.name'),
        descriptionHe: t('lab.entities.jungle_jaguar.animations.idle.description'),
        loopDurationSec: 3.2,
      },
      {
        id: 'walk',
        nameHe: t('lab.entities.jungle_jaguar.animations.walk.name'),
        descriptionHe: t('lab.entities.jungle_jaguar.animations.walk.description'),
        loopDurationSec: 1.3,
      },
      {
        id: 'stalk',
        nameHe: t('lab.entities.jungle_jaguar.animations.stalk.name'),
        descriptionHe: t('lab.entities.jungle_jaguar.animations.stalk.description'),
        loopDurationSec: 2.0,
      },
      {
        id: 'eat',
        nameHe: t('lab.entities.jungle_jaguar.animations.eat.name'),
        descriptionHe: t('lab.entities.jungle_jaguar.animations.eat.description'),
        loopDurationSec: 3.4,
      },
      {
        id: 'call',
        nameHe: t('lab.entities.jungle_jaguar.animations.call.name'),
        descriptionHe: t('lab.entities.jungle_jaguar.animations.call.description'),
        loopDurationSec: 2.8,
      },
      {
        id: 'lie',
        nameHe: t('lab.entities.jungle_jaguar.animations.lie.name'),
        descriptionHe: t('lab.entities.jungle_jaguar.animations.lie.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'sit',
        nameHe: t('lab.entities.jungle_jaguar.animations.sit.name'),
        descriptionHe: t('lab.entities.jungle_jaguar.animations.sit.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'trot',
        nameHe: t('lab.entities.jungle_jaguar.animations.trot.name'),
        descriptionHe: t('lab.entities.jungle_jaguar.animations.trot.description'),
        loopDurationSec: 0.78,
      },
      {
        id: 'run',
        nameHe: t('lab.entities.jungle_jaguar.animations.run.name'),
        descriptionHe: t('lab.entities.jungle_jaguar.animations.run.description'),
        loopDurationSec: 0.52,
      },
      {
        id: 'flee',
        nameHe: t('lab.entities.jungle_jaguar.animations.flee.name'),
        descriptionHe: t('lab.entities.jungle_jaguar.animations.flee.description'),
        loopDurationSec: 0.44,
      },
      {
        id: 'skip',
        nameHe: t('lab.entities.jungle_jaguar.animations.skip.name'),
        descriptionHe: t('lab.entities.jungle_jaguar.animations.skip.description'),
        loopDurationSec: 0.85,
      },
      {
        id: 'roar',
        nameHe: t('lab.entities.jungle_jaguar.animations.roar.name'),
        descriptionHe: t('lab.entities.jungle_jaguar.animations.roar.description'),
        loopDurationSec: 2.8,
      },
      {
        id: 'attack',
        nameHe: t('lab.entities.jungle_jaguar.animations.attack.name'),
        descriptionHe: t('lab.entities.jungle_jaguar.animations.attack.description'),
        loopDurationSec: 1.35,
      },
      {
        id: 'death',
        nameHe: t('lab.entities.jungle_jaguar.animations.death.name'),
        descriptionHe: t('lab.entities.jungle_jaguar.animations.death.description'),
        loopDurationSec: 1.8,
      },
    ],
    skins: [
      {
        id: 'jaguar_rosette_classic',
        nameHe: t('lab.entities.jungle_jaguar.skins.jaguar_rosette_classic.name'),
        subtitleHe: t('lab.entities.jungle_jaguar.skins.jaguar_rosette_classic.subtitle'),
        badgeColors: ['#d97706', '#1c1917', '#fef3c7'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0x1c1917,
          accentHex: 0xfef3c7,
        },
      },
      {
        id: 'jaguar_black_panther',
        nameHe: t('lab.entities.jungle_jaguar.skins.jaguar_black_panther.name'),
        subtitleHe: t('lab.entities.jungle_jaguar.skins.jaguar_black_panther.subtitle'),
        badgeColors: ['#27272a', '#09090b', '#eab308'],
        palette: {
          primaryHex: 0x3f3f46,
          secondaryHex: 0x09090b,
          accentHex: 0xeab308,
        },
      },
      {
        id: 'jaguar_sunlit_amber',
        nameHe: t('lab.entities.jungle_jaguar.skins.jaguar_sunlit_amber.name'),
        subtitleHe: t('lab.entities.jungle_jaguar.skins.jaguar_sunlit_amber.subtitle'),
        badgeColors: ['#f59e0b', '#78350f', '#fffbeb'],
        palette: {
          primaryHex: 0xfde68a,
          secondaryHex: 0x78350f,
          accentHex: 0xfffbeb,
        },
      },
    ],
  },

  {
    id: 'forest_wolf',
    nameHe: t('lab.entities.forest_wolf.name'),
    subtitleHe: t('lab.entities.forest_wolf.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.forest_wolf.category_label'),
    worldLocationHe: t('lab.entities.forest_wolf.world_location'),
    worldCoordinatesText: '(-142, -88), (-158, -112), (-118, 86), (136, -118)',
    worldInstanceCount: 4,
    sourceFile: 'src/world/models/Wolf.ts (public/models/animals/Wolf_Complete.ts)',
    descriptionHe:
      t('lab.entities.forest_wolf.description'),
    defaultCameraDistance: 2.9,
    defaultCameraTargetY: 0.58,
    anatomyTagsHe: [t('lab.entities.forest_wolf.anatomy_tags.0'), t('lab.entities.forest_wolf.anatomy_tags.1'), t('lab.entities.forest_wolf.anatomy_tags.2'), t('lab.entities.forest_wolf.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.forest_wolf.animations.none.name'),
        descriptionHe: t('lab.entities.forest_wolf.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        nameHe: t('lab.entities.forest_wolf.animations.idle.name'),
        descriptionHe: t('lab.entities.forest_wolf.animations.idle.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'walk',
        nameHe: t('lab.entities.forest_wolf.animations.walk.name'),
        descriptionHe: t('lab.entities.forest_wolf.animations.walk.description'),
        loopDurationSec: 1.4,
      },
      {
        id: 'trot',
        nameHe: t('lab.entities.forest_wolf.animations.trot.name'),
        descriptionHe: t('lab.entities.forest_wolf.animations.trot.description'),
        loopDurationSec: 0.9,
      },
      {
        id: 'stalk',
        nameHe: t('lab.entities.forest_wolf.animations.stalk.name'),
        descriptionHe: t('lab.entities.forest_wolf.animations.stalk.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'run',
        nameHe: t('lab.entities.forest_wolf.animations.run.name'),
        descriptionHe: t('lab.entities.forest_wolf.animations.run.description'),
        loopDurationSec: 0.65,
      },
      {
        id: 'flee',
        nameHe: t('lab.entities.forest_wolf.animations.flee.name'),
        descriptionHe: t('lab.entities.forest_wolf.animations.flee.description'),
        loopDurationSec: 0.58,
      },
      {
        id: 'skip',
        nameHe: t('lab.entities.forest_wolf.animations.skip.name'),
        descriptionHe: t('lab.entities.forest_wolf.animations.skip.description'),
        loopDurationSec: 0.95,
      },
      {
        id: 'eat',
        nameHe: t('lab.entities.forest_wolf.animations.eat.name'),
        descriptionHe: t('lab.entities.forest_wolf.animations.eat.description'),
        loopDurationSec: 3.2,
      },
      {
        id: 'sit',
        nameHe: t('lab.entities.forest_wolf.animations.sit.name'),
        descriptionHe: t('lab.entities.forest_wolf.animations.sit.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'lie',
        nameHe: t('lab.entities.forest_wolf.animations.lie.name'),
        descriptionHe: t('lab.entities.forest_wolf.animations.lie.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'howl',
        nameHe: t('lab.entities.forest_wolf.animations.howl.name'),
        descriptionHe: t('lab.entities.forest_wolf.animations.howl.description'),
        loopDurationSec: 3.4,
      },
      {
        id: 'roar',
        nameHe: t('lab.entities.forest_wolf.animations.roar.name'),
        descriptionHe: t('lab.entities.forest_wolf.animations.roar.description'),
        loopDurationSec: 2.8,
      },
      {
        id: 'attack',
        nameHe: t('lab.entities.forest_wolf.animations.attack.name'),
        descriptionHe: t('lab.entities.forest_wolf.animations.attack.description'),
        loopDurationSec: 1.25,
      },
      {
        id: 'death',
        nameHe: t('lab.entities.forest_wolf.animations.death.name'),
        descriptionHe: t('lab.entities.forest_wolf.animations.death.description'),
        loopDurationSec: 2.5,
      },
    ],
    skins: [
      {
        id: 'wolf_timber_classic',
        nameHe: t('lab.entities.forest_wolf.skins.wolf_timber_classic.name'),
        subtitleHe: t('lab.entities.forest_wolf.skins.wolf_timber_classic.subtitle'),
        badgeColors: ['#78716c', '#44403c', '#d6d3d1'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0x44403c,
          accentHex: 0xd6d3d1,
        },
      },
      {
        id: 'wolf_arctic_white',
        nameHe: t('lab.entities.forest_wolf.skins.wolf_arctic_white.name'),
        subtitleHe: t('lab.entities.forest_wolf.skins.wolf_arctic_white.subtitle'),
        badgeColors: ['#f8fafc', '#cbd5e1', '#64748b'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0xcbd5e1,
          accentHex: 0x64748b,
        },
      },
      {
        id: 'wolf_shadow_alpha',
        nameHe: t('lab.entities.forest_wolf.skins.wolf_shadow_alpha.name'),
        subtitleHe: t('lab.entities.forest_wolf.skins.wolf_shadow_alpha.subtitle'),
        badgeColors: ['#27272a', '#18181b', '#f59e0b'],
        palette: {
          primaryHex: 0x52525b,
          secondaryHex: 0x18181b,
          accentHex: 0xf59e0b,
        },
      },
    ],
  },

  {
    id: 'savanna_rhino',
    nameHe: t('lab.entities.savanna_rhino.name'),
    subtitleHe: t('lab.entities.savanna_rhino.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.savanna_rhino.category_label'),
    worldLocationHe: t('lab.entities.savanna_rhino.world_location'),
    worldCoordinatesText: '(-195, 215), (-224, 262), (146, 168)',
    worldInstanceCount: 3,
    sourceFile: 'src/world/models/Rhino.ts (public/models/animals/Rhino_Complete.ts)',
    descriptionHe:
      t('lab.entities.savanna_rhino.description'),
    defaultCameraDistance: 3.8,
    defaultCameraTargetY: 0.85,
    anatomyTagsHe: [t('lab.entities.savanna_rhino.anatomy_tags.0'), t('lab.entities.savanna_rhino.anatomy_tags.1'), t('lab.entities.savanna_rhino.anatomy_tags.2'), t('lab.entities.savanna_rhino.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.savanna_rhino.animations.none.name'),
        descriptionHe: t('lab.entities.savanna_rhino.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        nameHe: t('lab.entities.savanna_rhino.animations.idle.name'),
        descriptionHe: t('lab.entities.savanna_rhino.animations.idle.description'),
        loopDurationSec: 3.8,
      },
      {
        id: 'walk',
        nameHe: t('lab.entities.savanna_rhino.animations.walk.name'),
        descriptionHe: t('lab.entities.savanna_rhino.animations.walk.description'),
        loopDurationSec: 1.5,
      },
      {
        id: 'trot',
        nameHe: t('lab.entities.savanna_rhino.animations.trot.name'),
        descriptionHe: t('lab.entities.savanna_rhino.animations.trot.description'),
        loopDurationSec: 0.85,
      },
      {
        id: 'run',
        nameHe: t('lab.entities.savanna_rhino.animations.run.name'),
        descriptionHe: t('lab.entities.savanna_rhino.animations.run.description'),
        loopDurationSec: 0.65,
      },
      {
        id: 'flee',
        nameHe: t('lab.entities.savanna_rhino.animations.flee.name'),
        descriptionHe: t('lab.entities.savanna_rhino.animations.flee.description'),
        loopDurationSec: 0.58,
      },
      {
        id: 'skip',
        nameHe: t('lab.entities.savanna_rhino.animations.skip.name'),
        descriptionHe: t('lab.entities.savanna_rhino.animations.skip.description'),
        loopDurationSec: 1.1,
      },
      {
        id: 'eat',
        nameHe: t('lab.entities.savanna_rhino.animations.eat.name'),
        descriptionHe: t('lab.entities.savanna_rhino.animations.eat.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'call',
        nameHe: t('lab.entities.savanna_rhino.animations.call.name'),
        descriptionHe: t('lab.entities.savanna_rhino.animations.call.description'),
        loopDurationSec: 3.0,
      },
      {
        id: 'roar',
        nameHe: t('lab.entities.savanna_rhino.animations.roar.name'),
        descriptionHe: t('lab.entities.savanna_rhino.animations.roar.description'),
        loopDurationSec: 2.8,
      },
      {
        id: 'sit',
        nameHe: t('lab.entities.savanna_rhino.animations.sit.name'),
        descriptionHe: t('lab.entities.savanna_rhino.animations.sit.description'),
        loopDurationSec: 3.8,
      },
      {
        id: 'lie',
        nameHe: t('lab.entities.savanna_rhino.animations.lie.name'),
        descriptionHe: t('lab.entities.savanna_rhino.animations.lie.description'),
        loopDurationSec: 4.2,
      },
      {
        id: 'attack',
        nameHe: t('lab.entities.savanna_rhino.animations.attack.name'),
        descriptionHe: t('lab.entities.savanna_rhino.animations.attack.description'),
        loopDurationSec: 1.4,
      },
      {
        id: 'death',
        nameHe: t('lab.entities.savanna_rhino.animations.death.name'),
        descriptionHe: t('lab.entities.savanna_rhino.animations.death.description'),
        loopDurationSec: 2.4,
      },
    ],
    skins: [
      {
        id: 'rhino_savanna_classic',
        nameHe: t('lab.entities.savanna_rhino.skins.rhino_savanna_classic.name'),
        subtitleHe: t('lab.entities.savanna_rhino.skins.rhino_savanna_classic.subtitle'),
        badgeColors: ['#78716c', '#57534e', '#d6d3d1'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0x57534e,
          accentHex: 0xd6d3d1,
        },
      },
      {
        id: 'rhino_desert_sand',
        nameHe: t('lab.entities.savanna_rhino.skins.rhino_desert_sand.name'),
        subtitleHe: t('lab.entities.savanna_rhino.skins.rhino_desert_sand.subtitle'),
        badgeColors: ['#a8a29e', '#78350f', '#fde68a'],
        palette: {
          primaryHex: 0xd6c7b2,
          secondaryHex: 0x78350f,
          accentHex: 0xfde68a,
        },
      },
      {
        id: 'rhino_obsidian_iron',
        nameHe: t('lab.entities.savanna_rhino.skins.rhino_obsidian_iron.name'),
        subtitleHe: t('lab.entities.savanna_rhino.skins.rhino_obsidian_iron.subtitle'),
        badgeColors: ['#3f3f46', '#18181b', '#a1a1aa'],
        palette: {
          primaryHex: 0x71717a,
          secondaryHex: 0x18181b,
          accentHex: 0xa1a1aa,
        },
      },
    ],
  },

  {
    id: 'grazing_sheep',
    nameHe: t('lab.entities.grazing_sheep.name'),
    subtitleHe: t('lab.entities.grazing_sheep.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.grazing_sheep.category_label'),
    worldLocationHe: t('lab.entities.grazing_sheep.world_location'),
    worldCoordinatesText: `(${VALLEY_FARMS[0].x}, ${VALLEY_FARMS[0].z})`,
    worldInstanceCount: 5,
    sourceFile: 'src/world/models/farmhouseModels.ts',
    descriptionHe:
      t('lab.entities.grazing_sheep.description'),
    defaultCameraDistance: 2.5,
    defaultCameraTargetY: 0.55,
    anatomyTagsHe: [t('lab.entities.grazing_sheep.anatomy_tags.0'), t('lab.entities.grazing_sheep.anatomy_tags.1'), t('lab.entities.grazing_sheep.anatomy_tags.2'), t('lab.entities.grazing_sheep.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.grazing_sheep.animations.none.name'),
        descriptionHe: t('lab.entities.grazing_sheep.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'sheep_graze_walk',
        nameHe: t('lab.entities.grazing_sheep.animations.sheep_graze_walk.name'),
        descriptionHe: t('lab.entities.grazing_sheep.animations.sheep_graze_walk.description'),
        loopDurationSec: 1.6,
      },
      {
        id: 'sheep_nibble',
        nameHe: t('lab.entities.grazing_sheep.animations.sheep_nibble.name'),
        descriptionHe: t('lab.entities.grazing_sheep.animations.sheep_nibble.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'sheep_joy_hop',
        nameHe: t('lab.entities.grazing_sheep.animations.sheep_joy_hop.name'),
        descriptionHe: t('lab.entities.grazing_sheep.animations.sheep_joy_hop.description'),
        loopDurationSec: 1.1,
      },
    ],
    skins: [
      {
        id: 'sheep_white_classic',
        nameHe: t('lab.entities.grazing_sheep.skins.sheep_white_classic.name'),
        subtitleHe: t('lab.entities.grazing_sheep.skins.sheep_white_classic.subtitle'),
        badgeColors: ['#f4f1ea', '#3a322c', '#d6d3d1'],
        palette: {
          primaryHex: 0xf4f1ea,
          secondaryHex: 0x3a322c,
          accentHex: 0xd6d3d1,
        },
      },
      {
        id: 'sheep_black_highland',
        nameHe: t('lab.entities.grazing_sheep.skins.sheep_black_highland.name'),
        subtitleHe: t('lab.entities.grazing_sheep.skins.sheep_black_highland.subtitle'),
        badgeColors: ['#292524', '#1c1917', '#57534e'],
        palette: {
          primaryHex: 0x292524,
          secondaryHex: 0x0c0a09,
          accentHex: 0x57534e,
        },
      },
      {
        id: 'sheep_golden_fleece',
        nameHe: t('lab.entities.grazing_sheep.skins.sheep_golden_fleece.name'),
        subtitleHe: t('lab.entities.grazing_sheep.skins.sheep_golden_fleece.subtitle'),
        badgeColors: ['#fef3c7', '#78350f', '#fbbf24'],
        palette: {
          primaryHex: 0xfde68a,
          secondaryHex: 0x78350f,
          accentHex: 0xfbbf24,
        },
      },
    ],
  },

  {
    id: 'forest_rabbit',
    nameHe: t('lab.entities.forest_rabbit.name'),
    subtitleHe: t('lab.entities.forest_rabbit.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.forest_rabbit.category_label'),
    worldLocationHe: t('lab.entities.forest_rabbit.world_location'),
    worldCoordinatesText: t('lab.entities.forest_rabbit.world_coordinates'),
    worldInstanceCount: 8,
    sourceFile: 'src/world/builders/wildlifeAndFootprintsBuilder.ts',
    descriptionHe:
      t('lab.entities.forest_rabbit.description'),
    defaultCameraDistance: 1.9,
    defaultCameraTargetY: 0.32,
    anatomyTagsHe: [t('lab.entities.forest_rabbit.anatomy_tags.0'), t('lab.entities.forest_rabbit.anatomy_tags.1'), t('lab.entities.forest_rabbit.anatomy_tags.2'), t('lab.entities.forest_rabbit.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.forest_rabbit.animations.none.name'),
        descriptionHe: t('lab.entities.forest_rabbit.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'rabbit_sniff',
        nameHe: t('lab.entities.forest_rabbit.animations.rabbit_sniff.name'),
        descriptionHe: t('lab.entities.forest_rabbit.animations.rabbit_sniff.description'),
        loopDurationSec: 2.0,
      },
      {
        id: 'rabbit_alert',
        nameHe: t('lab.entities.forest_rabbit.animations.rabbit_alert.name'),
        descriptionHe: t('lab.entities.forest_rabbit.animations.rabbit_alert.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'rabbit_hop',
        nameHe: t('lab.entities.forest_rabbit.animations.rabbit_hop.name'),
        descriptionHe: t('lab.entities.forest_rabbit.animations.rabbit_hop.description'),
        loopDurationSec: 0.75,
      },
    ],
    skins: [
      {
        id: 'rabbit_wild_brown',
        nameHe: t('lab.entities.forest_rabbit.skins.rabbit_wild_brown.name'),
        subtitleHe: t('lab.entities.forest_rabbit.skins.rabbit_wild_brown.subtitle'),
        badgeColors: ['#8d7966', '#f7f4ef', '#4a3c31'],
        palette: {
          primaryHex: 0x8d7966,
          secondaryHex: 0xf7f4ef,
          accentHex: 0x4a3c31,
        },
      },
      {
        id: 'rabbit_snow_white',
        nameHe: t('lab.entities.forest_rabbit.skins.rabbit_snow_white.name'),
        subtitleHe: t('lab.entities.forest_rabbit.skins.rabbit_snow_white.subtitle'),
        badgeColors: ['#f8fafc', '#fda4af', '#e2e8f0'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0xffffff,
          accentHex: 0xfda4af,
        },
      },
      {
        id: 'rabbit_russet_fox',
        nameHe: t('lab.entities.forest_rabbit.skins.rabbit_russet_fox.name'),
        subtitleHe: t('lab.entities.forest_rabbit.skins.rabbit_russet_fox.subtitle'),
        badgeColors: ['#b45309', '#fef3c7', '#78350f'],
        palette: {
          primaryHex: 0xb45309,
          secondaryHex: 0xfef3c7,
          accentHex: 0x78350f,
        },
      },
    ],
  },

  {
    id: 'woodland_squirrel',
    nameHe: t('lab.entities.woodland_squirrel.name'),
    subtitleHe: t('lab.entities.woodland_squirrel.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.woodland_squirrel.category_label'),
    worldLocationHe: t('lab.entities.woodland_squirrel.world_location'),
    worldCoordinatesText: t('lab.entities.woodland_squirrel.world_coordinates'),
    worldInstanceCount: 14,
    sourceFile: 'src/world/models/environmentAtmosphereModels.ts',
    descriptionHe:
      t('lab.entities.woodland_squirrel.description'),
    defaultCameraDistance: 1.85,
    defaultCameraTargetY: 0.32,
    anatomyTagsHe: [t('lab.entities.woodland_squirrel.anatomy_tags.0'), t('lab.entities.woodland_squirrel.anatomy_tags.1'), t('lab.entities.woodland_squirrel.anatomy_tags.2')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.woodland_squirrel.animations.none.name'),
        descriptionHe: t('lab.entities.woodland_squirrel.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'squirrel_tail_flick',
        nameHe: t('lab.entities.woodland_squirrel.animations.squirrel_tail_flick.name'),
        descriptionHe: t('lab.entities.woodland_squirrel.animations.squirrel_tail_flick.description'),
        loopDurationSec: 1.4,
      },
      {
        id: 'squirrel_forage_hop',
        nameHe: t('lab.entities.woodland_squirrel.animations.squirrel_forage_hop.name'),
        descriptionHe: t('lab.entities.woodland_squirrel.animations.squirrel_forage_hop.description'),
        loopDurationSec: 0.9,
      },
      {
        id: 'squirrel_spiral_climb',
        nameHe: t('lab.entities.woodland_squirrel.animations.squirrel_spiral_climb.name'),
        descriptionHe: t('lab.entities.woodland_squirrel.animations.squirrel_spiral_climb.description'),
        loopDurationSec: 1.8,
      },
    ],
    skins: [
      {
        id: 'squirrel_red_classic',
        nameHe: t('lab.entities.woodland_squirrel.skins.squirrel_red_classic.name'),
        subtitleHe: t('lab.entities.woodland_squirrel.skins.squirrel_red_classic.subtitle'),
        badgeColors: ['#8c4a27', '#7c2d12', '#d97706'],
        palette: {
          primaryHex: 0x8c4a27,
          secondaryHex: 0x7c2d12,
          accentHex: 0xd97706,
        },
      },
      {
        id: 'squirrel_silver_gray',
        nameHe: t('lab.entities.woodland_squirrel.skins.squirrel_silver_gray.name'),
        subtitleHe: t('lab.entities.woodland_squirrel.skins.squirrel_silver_gray.subtitle'),
        badgeColors: ['#64748b', '#cbd5e1', '#334155'],
        palette: {
          primaryHex: 0x64748b,
          secondaryHex: 0x94a3b8,
          accentHex: 0x334155,
        },
      },
      {
        id: 'squirrel_dark_pine',
        nameHe: t('lab.entities.woodland_squirrel.skins.squirrel_dark_pine.name'),
        subtitleHe: t('lab.entities.woodland_squirrel.skins.squirrel_dark_pine.subtitle'),
        badgeColors: ['#3f2e21', '#1c1917', '#78350f'],
        palette: {
          primaryHex: 0x3f2e21,
          secondaryHex: 0x1c1917,
          accentHex: 0x78350f,
        },
      },
    ],
  },

  {
    id: 'mountain_eagle',
    nameHe: t('lab.entities.mountain_eagle.name'),
    subtitleHe: t('lab.entities.mountain_eagle.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.mountain_eagle.category_label'),
    worldLocationHe: t('lab.entities.mountain_eagle.world_location'),
    worldCoordinatesText: t('lab.entities.mountain_eagle.world_coordinates'),
    worldInstanceCount: 1,
    sourceFile: 'src/world/builders/wildlifeAndFootprintsBuilder.ts',
    descriptionHe:
      t('lab.entities.mountain_eagle.description'),
    defaultCameraDistance: 3.6,
    defaultCameraTargetY: 0.85,
    anatomyTagsHe: [t('lab.entities.mountain_eagle.anatomy_tags.0'), t('lab.entities.mountain_eagle.anatomy_tags.1'), t('lab.entities.mountain_eagle.anatomy_tags.2'), t('lab.entities.mountain_eagle.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.mountain_eagle.animations.none.name'),
        descriptionHe: t('lab.entities.mountain_eagle.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'eagle_soar',
        nameHe: t('lab.entities.mountain_eagle.animations.eagle_soar.name'),
        descriptionHe: t('lab.entities.mountain_eagle.animations.eagle_soar.description'),
        loopDurationSec: 2.2,
      },
      {
        id: 'eagle_dive',
        nameHe: t('lab.entities.mountain_eagle.animations.eagle_dive.name'),
        descriptionHe: t('lab.entities.mountain_eagle.animations.eagle_dive.description'),
        loopDurationSec: 1.6,
      },
      {
        id: 'eagle_power_flap',
        nameHe: t('lab.entities.mountain_eagle.animations.eagle_power_flap.name'),
        descriptionHe: t('lab.entities.mountain_eagle.animations.eagle_power_flap.description'),
        loopDurationSec: 1.1,
      },
    ],
    skins: [
      {
        id: 'eagle_golden_classic',
        nameHe: t('lab.entities.mountain_eagle.skins.eagle_golden_classic.name'),
        subtitleHe: t('lab.entities.mountain_eagle.skins.eagle_golden_classic.subtitle'),
        badgeColors: ['#3b2616', '#c8963e', '#eab308'],
        palette: {
          primaryHex: 0x3b2616,
          secondaryHex: 0xc8963e,
          accentHex: 0xeab308,
        },
      },
      {
        id: 'eagle_bald_white',
        nameHe: t('lab.entities.mountain_eagle.skins.eagle_bald_white.name'),
        subtitleHe: t('lab.entities.mountain_eagle.skins.eagle_bald_white.subtitle'),
        badgeColors: ['#27272a', '#f8fafc', '#f59e0b'],
        palette: {
          primaryHex: 0x27272a,
          secondaryHex: 0xf8fafc,
          accentHex: 0xf59e0b,
        },
      },
      {
        id: 'eagle_desert_hawk',
        nameHe: t('lab.entities.mountain_eagle.skins.eagle_desert_hawk.name'),
        subtitleHe: t('lab.entities.mountain_eagle.skins.eagle_desert_hawk.subtitle'),
        badgeColors: ['#92400e', '#fcd34d', '#451a03'],
        palette: {
          primaryHex: 0x92400e,
          secondaryHex: 0xfcd34d,
          accentHex: 0x451a03,
        },
      },
    ],
  },

  {
    id: 'flock_bird',
    nameHe: t('lab.entities.flock_bird.name'),
    subtitleHe: t('lab.entities.flock_bird.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.flock_bird.category_label'),
    worldLocationHe: t('lab.entities.flock_bird.world_location'),
    worldCoordinatesText: t('lab.entities.flock_bird.world_coordinates'),
    worldInstanceCount: 52,
    sourceFile: 'src/world/systems/boidsAndWildlifeSystem.ts',
    descriptionHe:
      t('lab.entities.flock_bird.description'),
    defaultCameraDistance: 2.1,
    defaultCameraTargetY: 0.65,
    anatomyTagsHe: [t('lab.entities.flock_bird.anatomy_tags.0'), t('lab.entities.flock_bird.anatomy_tags.1'), t('lab.entities.flock_bird.anatomy_tags.2'), t('lab.entities.flock_bird.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.flock_bird.animations.none.name'),
        descriptionHe: t('lab.entities.flock_bird.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'bird_cruise',
        nameHe: t('lab.entities.flock_bird.animations.bird_cruise.name'),
        descriptionHe: t('lab.entities.flock_bird.animations.bird_cruise.description'),
        loopDurationSec: 1.0,
      },
      {
        id: 'bird_startled',
        nameHe: t('lab.entities.flock_bird.animations.bird_startled.name'),
        descriptionHe: t('lab.entities.flock_bird.animations.bird_startled.description'),
        loopDurationSec: 0.55,
      },
      {
        id: 'bird_glide_bank',
        nameHe: t('lab.entities.flock_bird.animations.bird_glide_bank.name'),
        descriptionHe: t('lab.entities.flock_bird.animations.bird_glide_bank.description'),
        loopDurationSec: 2.4,
      },
    ],
    skins: [
      {
        id: 'bird_forest_swallow',
        nameHe: t('lab.entities.flock_bird.skins.bird_forest_swallow.name'),
        subtitleHe: t('lab.entities.flock_bird.skins.bird_forest_swallow.subtitle'),
        badgeColors: ['#3a4450', '#c8beae', '#d49b35'],
        palette: {
          primaryHex: 0x3a4450,
          secondaryHex: 0xc8beae,
          accentHex: 0xd49b35,
        },
      },
      {
        id: 'bird_robin_redbreast',
        nameHe: t('lab.entities.flock_bird.skins.bird_robin_redbreast.name'),
        subtitleHe: t('lab.entities.flock_bird.skins.bird_robin_redbreast.subtitle'),
        badgeColors: ['#57534e', '#ea580c', '#fbbf24'],
        palette: {
          primaryHex: 0x57534e,
          secondaryHex: 0xea580c,
          accentHex: 0xfbbf24,
        },
      },
      {
        id: 'bird_azure_kingfisher',
        nameHe: t('lab.entities.flock_bird.skins.bird_azure_kingfisher.name'),
        subtitleHe: t('lab.entities.flock_bird.skins.bird_azure_kingfisher.subtitle'),
        badgeColors: ['#0284c7', '#f59e0b', '#e0f2fe'],
        palette: {
          primaryHex: 0x0284c7,
          secondaryHex: 0xf59e0b,
          accentHex: 0x38bdf8,
        },
      },
    ],
  },

  {
    id: 'harbor_seagull',
    nameHe: t('lab.entities.harbor_seagull.name'),
    subtitleHe: t('lab.entities.harbor_seagull.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.harbor_seagull.category_label'),
    worldLocationHe: t('lab.entities.harbor_seagull.world_location'),
    worldCoordinatesText: `(${SOUTHEAST_HARBOR_POS.x}, ${SOUTHEAST_HARBOR_POS.z})`,
    worldInstanceCount: 10,
    sourceFile: 'src/world/models/harborModels.ts',
    descriptionHe:
      t('lab.entities.harbor_seagull.description'),
    defaultCameraDistance: 2.75,
    defaultCameraTargetY: 0.68,
    anatomyTagsHe: [t('lab.entities.harbor_seagull.anatomy_tags.0'), t('lab.entities.harbor_seagull.anatomy_tags.1'), t('lab.entities.harbor_seagull.anatomy_tags.2'), t('lab.entities.harbor_seagull.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.harbor_seagull.animations.none.name'),
        descriptionHe: t('lab.entities.harbor_seagull.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'seagull_harbor_soar',
        nameHe: t('lab.entities.harbor_seagull.animations.seagull_harbor_soar.name'),
        descriptionHe: t('lab.entities.harbor_seagull.animations.seagull_harbor_soar.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'seagull_wave_skim',
        nameHe: t('lab.entities.harbor_seagull.animations.seagull_wave_skim.name'),
        descriptionHe: t('lab.entities.harbor_seagull.animations.seagull_wave_skim.description'),
        loopDurationSec: 2.2,
      },
      {
        id: 'seagull_fish_dive',
        nameHe: t('lab.entities.harbor_seagull.animations.seagull_fish_dive.name'),
        descriptionHe: t('lab.entities.harbor_seagull.animations.seagull_fish_dive.description'),
        loopDurationSec: 1.4,
      },
    ],
    skins: [
      {
        id: 'seagull_coastal_classic',
        nameHe: t('lab.entities.harbor_seagull.skins.seagull_coastal_classic.name'),
        subtitleHe: t('lab.entities.harbor_seagull.skins.seagull_coastal_classic.subtitle'),
        badgeColors: ['#f8fafc', '#94a3b8', '#eab308'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0x94a3b8,
          accentHex: 0xeab308,
          trimHex: 0x1e293b,
        },
      },
      {
        id: 'seagull_black_backed',
        nameHe: t('lab.entities.harbor_seagull.skins.seagull_black_backed.name'),
        subtitleHe: t('lab.entities.harbor_seagull.skins.seagull_black_backed.subtitle'),
        badgeColors: ['#334155', '#f8fafc', '#f59e0b'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0x334155,
          accentHex: 0xf59e0b,
          trimHex: 0x0f172a,
        },
      },
      {
        id: 'seagull_golden_sunset',
        nameHe: t('lab.entities.harbor_seagull.skins.seagull_golden_sunset.name'),
        subtitleHe: t('lab.entities.harbor_seagull.skins.seagull_golden_sunset.subtitle'),
        badgeColors: ['#fef3c7', '#cbd5e1', '#ea580c'],
        palette: {
          primaryHex: 0xfef3c7,
          secondaryHex: 0xcbd5e1,
          accentHex: 0xea580c,
          trimHex: 0x475569,
        },
      },
    ],
  },

  {
    id: 'koi_fish',
    nameHe: t('lab.entities.koi_fish.name'),
    subtitleHe: t('lab.entities.koi_fish.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.koi_fish.category_label'),
    worldLocationHe: t('lab.entities.koi_fish.world_location'),
    worldCoordinatesText: `(${LAKESIDE_TEA_PAVILION_POS.x}, ${LAKESIDE_TEA_PAVILION_POS.z})`,
    worldInstanceCount: 12,
    sourceFile: 'src/world/models/settlementModels.ts',
    descriptionHe:
      t('lab.entities.koi_fish.description'),
    defaultCameraDistance: 2.65,
    defaultCameraTargetY: 0.42,
    anatomyTagsHe: [t('lab.entities.koi_fish.anatomy_tags.0'), t('lab.entities.koi_fish.anatomy_tags.1'), t('lab.entities.koi_fish.anatomy_tags.2'), t('lab.entities.koi_fish.anatomy_tags.3'), t('lab.entities.koi_fish.anatomy_tags.4')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.koi_fish.animations.none.name'),
        descriptionHe: t('lab.entities.koi_fish.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'koi_pond_swim',
        nameHe: t('lab.entities.koi_fish.animations.koi_pond_swim.name'),
        descriptionHe: t('lab.entities.koi_fish.animations.koi_pond_swim.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'koi_fast_dart',
        nameHe: t('lab.entities.koi_fish.animations.koi_fast_dart.name'),
        descriptionHe: t('lab.entities.koi_fish.animations.koi_fast_dart.description'),
        loopDurationSec: 0.9,
      },
      {
        id: 'koi_surface_feed',
        nameHe: t('lab.entities.koi_fish.animations.koi_surface_feed.name'),
        descriptionHe: t('lab.entities.koi_fish.animations.koi_surface_feed.description'),
        loopDurationSec: 2.2,
      },
    ],
    skins: [
      {
        id: 'koi_imperial_gold',
        nameHe: t('lab.entities.koi_fish.skins.koi_imperial_gold.name'),
        subtitleHe: t('lab.entities.koi_fish.skins.koi_imperial_gold.subtitle'),
        badgeColors: ['#ff6b2b', '#fbbf24', '#fffbeb'],
        palette: {
          primaryHex: 0xff6b2b,
          secondaryHex: 0xfbbf24,
          accentHex: 0xfffbeb,
        },
      },
      {
        id: 'koi_kohaku_crimson',
        nameHe: t('lab.entities.koi_fish.skins.koi_kohaku_crimson.name'),
        subtitleHe: t('lab.entities.koi_fish.skins.koi_kohaku_crimson.subtitle'),
        badgeColors: ['#f8fafc', '#dc2626', '#fca5a5'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0xdc2626,
          accentHex: 0xdc2626,
        },
      },
      {
        id: 'koi_sapphire_asagi',
        nameHe: t('lab.entities.koi_fish.skins.koi_sapphire_asagi.name'),
        subtitleHe: t('lab.entities.koi_fish.skins.koi_sapphire_asagi.subtitle'),
        badgeColors: ['#0284c7', '#e0f2fe', '#38bdf8'],
        palette: {
          primaryHex: 0x0284c7,
          secondaryHex: 0xe0f2fe,
          accentHex: 0x38bdf8,
        },
      },
      {
        id: 'koi_ogon_platinum',
        nameHe: t('lab.entities.koi_fish.skins.koi_ogon_platinum.name'),
        subtitleHe: t('lab.entities.koi_fish.skins.koi_ogon_platinum.subtitle'),
        badgeColors: ['#facc15', '#fef08a', '#d97706'],
        palette: {
          primaryHex: 0xfacc15,
          secondaryHex: 0xfef08a,
          accentHex: 0xd97706,
        },
      },
    ],
  },

  {
    id: 'meadow_butterfly',
    nameHe: t('lab.entities.meadow_butterfly.name'),
    subtitleHe: t('lab.entities.meadow_butterfly.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.meadow_butterfly.category_label'),
    worldLocationHe: t('lab.entities.meadow_butterfly.world_location'),
    worldCoordinatesText: t('lab.entities.meadow_butterfly.world_coordinates'),
    worldInstanceCount: 18,
    sourceFile: 'src/world/models/environmentAtmosphereModels.ts',
    descriptionHe:
      t('lab.entities.meadow_butterfly.description'),
    defaultCameraDistance: 2.45,
    defaultCameraTargetY: 0.52,
    anatomyTagsHe: [t('lab.entities.meadow_butterfly.anatomy_tags.0'), t('lab.entities.meadow_butterfly.anatomy_tags.1'), t('lab.entities.meadow_butterfly.anatomy_tags.2'), t('lab.entities.meadow_butterfly.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.meadow_butterfly.animations.none.name'),
        descriptionHe: t('lab.entities.meadow_butterfly.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'butterfly_meadow_flutter',
        nameHe: t('lab.entities.meadow_butterfly.animations.butterfly_meadow_flutter.name'),
        descriptionHe: t('lab.entities.meadow_butterfly.animations.butterfly_meadow_flutter.description'),
        loopDurationSec: 1.2,
      },
      {
        id: 'butterfly_flower_bask',
        nameHe: t('lab.entities.meadow_butterfly.animations.butterfly_flower_bask.name'),
        descriptionHe: t('lab.entities.meadow_butterfly.animations.butterfly_flower_bask.description'),
        loopDurationSec: 2.6,
      },
      {
        id: 'butterfly_spiral_dance',
        nameHe: t('lab.entities.meadow_butterfly.animations.butterfly_spiral_dance.name'),
        descriptionHe: t('lab.entities.meadow_butterfly.animations.butterfly_spiral_dance.description'),
        loopDurationSec: 1.8,
      },
    ],
    skins: [
      {
        id: 'butterfly_morpho_cyan',
        nameHe: t('lab.entities.meadow_butterfly.skins.butterfly_morpho_cyan.name'),
        subtitleHe: t('lab.entities.meadow_butterfly.skins.butterfly_morpho_cyan.subtitle'),
        badgeColors: ['#06b6d4', '#67e8f9', '#0f172a'],
        palette: {
          primaryHex: 0x06b6d4,
          secondaryHex: 0x67e8f9,
          accentHex: 0x0f172a,
          emissiveHex: 0x22d3ee,
        },
      },
      {
        id: 'butterfly_monarch_amber',
        nameHe: t('lab.entities.meadow_butterfly.skins.butterfly_monarch_amber.name'),
        subtitleHe: t('lab.entities.meadow_butterfly.skins.butterfly_monarch_amber.subtitle'),
        badgeColors: ['#f97316', '#fbbf24', '#1c1917'],
        palette: {
          primaryHex: 0xf97316,
          secondaryHex: 0xfbbf24,
          accentHex: 0x1c1917,
          emissiveHex: 0xf59e0b,
        },
      },
      {
        id: 'butterfly_sakura_pink',
        nameHe: t('lab.entities.meadow_butterfly.skins.butterfly_sakura_pink.name'),
        subtitleHe: t('lab.entities.meadow_butterfly.skins.butterfly_sakura_pink.subtitle'),
        badgeColors: ['#ec4899', '#fbcfe8', '#500724'],
        palette: {
          primaryHex: 0xec4899,
          secondaryHex: 0xfbcfe8,
          accentHex: 0x500724,
          emissiveHex: 0xf472b6,
        },
      },
      {
        id: 'butterfly_swallowtail_gold',
        nameHe: t('lab.entities.meadow_butterfly.skins.butterfly_swallowtail_gold.name'),
        subtitleHe: t('lab.entities.meadow_butterfly.skins.butterfly_swallowtail_gold.subtitle'),
        badgeColors: ['#eab308', '#34d399', '#1e293b'],
        palette: {
          primaryHex: 0xeab308,
          secondaryHex: 0x34d399,
          accentHex: 0x1e293b,
          emissiveHex: 0xfacc15,
        },
      },
    ],
  },

  {
    id: 'imperial_sky_dragon',
    nameHe: t('lab.entities.imperial_sky_dragon.name'),
    subtitleHe: t('lab.entities.imperial_sky_dragon.subtitle'),
    category: 'animals',
    categoryLabelHe: t('lab.entities.imperial_sky_dragon.category_label'),
    worldLocationHe: t('lab.entities.imperial_sky_dragon.world_location'),
    worldCoordinatesText: t('lab.entities.imperial_sky_dragon.world_coordinates'),
    worldInstanceCount: 1,
    sourceFile: 'src/world/models/sanctuaryAndDragonModels.ts',
    descriptionHe:
      t('lab.entities.imperial_sky_dragon.description'),
    defaultCameraDistance: 6.2,
    defaultCameraTargetY: 1.2,
    anatomyTagsHe: [t('lab.entities.imperial_sky_dragon.anatomy_tags.0'), t('lab.entities.imperial_sky_dragon.anatomy_tags.1'), t('lab.entities.imperial_sky_dragon.anatomy_tags.2'), t('lab.entities.imperial_sky_dragon.anatomy_tags.3'), t('lab.entities.imperial_sky_dragon.anatomy_tags.4')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.imperial_sky_dragon.animations.none.name'),
        descriptionHe: t('lab.entities.imperial_sky_dragon.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'dragon_sky_flight',
        nameHe: t('lab.entities.imperial_sky_dragon.animations.dragon_sky_flight.name'),
        descriptionHe: t('lab.entities.imperial_sky_dragon.animations.dragon_sky_flight.description'),
        loopDurationSec: 2.6,
      },
      {
        id: 'dragon_coiled_hover',
        nameHe: t('lab.entities.imperial_sky_dragon.animations.dragon_coiled_hover.name'),
        descriptionHe: t('lab.entities.imperial_sky_dragon.animations.dragon_coiled_hover.description'),
        loopDurationSec: 3.2,
      },
      {
        id: 'dragon_roar_surge',
        nameHe: t('lab.entities.imperial_sky_dragon.animations.dragon_roar_surge.name'),
        descriptionHe: t('lab.entities.imperial_sky_dragon.animations.dragon_roar_surge.description'),
        loopDurationSec: 1.8,
      },
    ],
    skins: [
      {
        id: 'dragon_imperial_gold',
        nameHe: t('lab.entities.imperial_sky_dragon.skins.dragon_imperial_gold.name'),
        subtitleHe: t('lab.entities.imperial_sky_dragon.skins.dragon_imperial_gold.subtitle'),
        badgeColors: ['#d4af37', '#991b1b', '#ff3311'],
        palette: {
          primaryHex: 0xd4af37,
          secondaryHex: 0x991b1b,
          accentHex: 0xf8fafc,
          emissiveHex: 0xff3311,
        },
      },
      {
        id: 'dragon_celestial_jade',
        nameHe: t('lab.entities.imperial_sky_dragon.skins.dragon_celestial_jade.name'),
        subtitleHe: t('lab.entities.imperial_sky_dragon.skins.dragon_celestial_jade.subtitle'),
        badgeColors: ['#10b981', '#047857', '#fbbf24'],
        palette: {
          primaryHex: 0x10b981,
          secondaryHex: 0xd4af37,
          accentHex: 0xecfdf5,
          emissiveHex: 0x38bdf8,
        },
      },
      {
        id: 'dragon_obsidian_amethyst',
        nameHe: t('lab.entities.imperial_sky_dragon.skins.dragon_obsidian_amethyst.name'),
        subtitleHe: t('lab.entities.imperial_sky_dragon.skins.dragon_obsidian_amethyst.subtitle'),
        badgeColors: ['#1e1b4b', '#a855f7', '#e879f9'],
        palette: {
          primaryHex: 0x312e81,
          secondaryHex: 0x9333ea,
          accentHex: 0xe2e8f0,
          emissiveHex: 0xe879f9,
        },
      },
    ],
  },

  // ==========================================================================
  // GUARDIAN CHARACTERS & MONUMENTS (דמויות שומרים ופסלים)
  // ==========================================================================
  {
    id: 'dwarven_king_statue',
    nameHe: t('lab.entities.dwarven_king_statue.name'),
    subtitleHe: t('lab.entities.dwarven_king_statue.subtitle'),
    category: 'characters',
    categoryLabelHe: t('lab.entities.dwarven_king_statue.category_label'),
    worldLocationHe: t('lab.entities.dwarven_king_statue.world_location'),
    worldCoordinatesText: `(${SOUTHERN_MINE_POS.x}, ${SOUTHERN_MINE_POS.entranceZ - 14})`,
    worldInstanceCount: DWARVEN_GUARDIAN_STATUES.length,
    sourceFile: 'src/world/builders/dwarvenKingdomBuilder.ts',
    descriptionHe:
      t('lab.entities.dwarven_king_statue.description'),
    defaultCameraDistance: 4.8,
    defaultCameraTargetY: 1.35,
    anatomyTagsHe: [t('lab.entities.dwarven_king_statue.anatomy_tags.0'), t('lab.entities.dwarven_king_statue.anatomy_tags.1'), t('lab.entities.dwarven_king_statue.anatomy_tags.2'), t('lab.entities.dwarven_king_statue.anatomy_tags.3'), t('lab.entities.dwarven_king_statue.anatomy_tags.4')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.dwarven_king_statue.animations.none.name'),
        descriptionHe: t('lab.entities.dwarven_king_statue.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'statue_lantern_pulse',
        nameHe: t('lab.entities.dwarven_king_statue.animations.statue_lantern_pulse.name'),
        descriptionHe: t('lab.entities.dwarven_king_statue.animations.statue_lantern_pulse.description'),
        loopDurationSec: 3.0,
      },
      {
        id: 'statue_awakened_guard',
        nameHe: t('lab.entities.dwarven_king_statue.animations.statue_awakened_guard.name'),
        descriptionHe: t('lab.entities.dwarven_king_statue.animations.statue_awakened_guard.description'),
        loopDurationSec: 2.6,
      },
    ],
    skins: [
      {
        id: 'statue_granite_bronze',
        nameHe: t('lab.entities.dwarven_king_statue.skins.statue_granite_bronze.name'),
        subtitleHe: t('lab.entities.dwarven_king_statue.skins.statue_granite_bronze.subtitle'),
        badgeColors: ['#6e6a64', '#9c6631', '#d4af37'],
        palette: {
          primaryHex: 0x6e6a64,
          secondaryHex: 0x9c6631,
          accentHex: 0xd4af37,
          emissiveHex: 0xffb732,
        },
      },
      {
        id: 'statue_solid_gold',
        nameHe: t('lab.entities.dwarven_king_statue.skins.statue_solid_gold.name'),
        subtitleHe: t('lab.entities.dwarven_king_statue.skins.statue_solid_gold.subtitle'),
        badgeColors: ['#d4af37', '#b45309', '#ef4444'],
        palette: {
          primaryHex: 0xd4af37,
          secondaryHex: 0x92400e,
          accentHex: 0xfef08a,
          emissiveHex: 0xef4444,
        },
      },
      {
        id: 'statue_basalt_emerald',
        nameHe: t('lab.entities.dwarven_king_statue.skins.statue_basalt_emerald.name'),
        subtitleHe: t('lab.entities.dwarven_king_statue.skins.statue_basalt_emerald.subtitle'),
        badgeColors: ['#1e293b', '#0f172a', '#10b981'],
        palette: {
          primaryHex: 0x1e293b,
          secondaryHex: 0x334155,
          accentHex: 0x10b981,
          emissiveHex: 0x34d399,
        },
      },
    ],
  },

  {
    id: 'golden_buddha',
    nameHe: t('lab.entities.golden_buddha.name'),
    subtitleHe: t('lab.entities.golden_buddha.subtitle'),
    category: 'characters',
    categoryLabelHe: t('lab.entities.golden_buddha.category_label'),
    worldLocationHe: t('lab.entities.golden_buddha.world_location'),
    worldCoordinatesText: `(${SAKURA_SANCTUARY_POS.x}, ${SAKURA_SANCTUARY_POS.z})`,
    worldInstanceCount: 1,
    sourceFile: 'src/world/models/sanctuaryAndDragonModels.ts',
    descriptionHe:
      t('lab.entities.golden_buddha.description'),
    defaultCameraDistance: 4.8,
    defaultCameraTargetY: 1.3,
    anatomyTagsHe: [t('lab.entities.golden_buddha.anatomy_tags.0'), t('lab.entities.golden_buddha.anatomy_tags.1'), t('lab.entities.golden_buddha.anatomy_tags.2'), t('lab.entities.golden_buddha.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        nameHe: t('lab.entities.golden_buddha.animations.none.name'),
        descriptionHe: t('lab.entities.golden_buddha.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'buddha_halo_spin',
        nameHe: t('lab.entities.golden_buddha.animations.buddha_halo_spin.name'),
        descriptionHe: t('lab.entities.golden_buddha.animations.buddha_halo_spin.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'buddha_levitation',
        nameHe: t('lab.entities.golden_buddha.animations.buddha_levitation.name'),
        descriptionHe: t('lab.entities.golden_buddha.animations.buddha_levitation.description'),
        loopDurationSec: 3.6,
      },
    ],
    skins: [
      {
        id: 'buddha_imperial_gold',
        nameHe: t('lab.entities.golden_buddha.skins.buddha_imperial_gold.name'),
        subtitleHe: t('lab.entities.golden_buddha.skins.buddha_imperial_gold.subtitle'),
        badgeColors: ['#d4af37', '#991b1b', '#f8fafc'],
        palette: {
          primaryHex: 0xd4af37,
          secondaryHex: 0x991b1b,
          accentHex: 0xf8fafc,
          emissiveHex: 0xfbbf24,
        },
      },
      {
        id: 'buddha_sacred_jade',
        nameHe: t('lab.entities.golden_buddha.skins.buddha_sacred_jade.name'),
        subtitleHe: t('lab.entities.golden_buddha.skins.buddha_sacred_jade.subtitle'),
        badgeColors: ['#059669', '#d4af37', '#ecfdf5'],
        palette: {
          primaryHex: 0x059669,
          secondaryHex: 0xd4af37,
          accentHex: 0xecfdf5,
          emissiveHex: 0x34d399,
        },
      },
      {
        id: 'buddha_white_marble',
        nameHe: t('lab.entities.golden_buddha.skins.buddha_white_marble.name'),
        subtitleHe: t('lab.entities.golden_buddha.skins.buddha_white_marble.subtitle'),
        badgeColors: ['#f8fafc', '#38bdf8', '#1e3a8a'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0x1e3a8a,
          accentHex: 0xcbd5e1,
          emissiveHex: 0x38bdf8,
        },
      },
    ],
  },
] as const;
// #endregion

// ======================== PURE DOMAIN FUNCTIONS ======================== \\
// #region Pure Domain Functions

/**
 * Summary: Retrieves an entity definition by ID, falling back to the first entity.
 */
export function getLabEntityById(entityId: string): ILabEntityDef {
  return LAB_ENTITIES.find((e) => e.id === entityId) ?? LAB_ENTITIES[0];
}

/**
 * Summary: Retrieves an animation definition for a given entity, falling back to 'none' (static pose).
 */
export function getLabAnimationForEntity(
  entity: ILabEntityDef,
  animationId: string
): ILabAnimationDef {
  return (
    entity.animations.find((a) => a.id === animationId) ??
    entity.animations.find((a) => a.id === 'none') ??
    entity.animations[0]
  );
}

/**
 * Summary: Retrieves a skin definition for a given entity, falling back to its default skin.
 */
export function getLabSkinForEntity(
  entity: ILabEntityDef,
  skinId: string
): ILabSkinDef {
  return entity.skins.find((s) => s.id === skinId) ?? entity.skins[0];
}

/**
 * Summary: Filters entities by category ('all' | 'characters' | 'animals') and Hebrew/English search query.
 */
export function filterLabEntities(
  entities: readonly ILabEntityDef[],
  category: LabCategoryFilter,
  searchQuery: string
): readonly ILabEntityDef[] {
  const q = searchQuery.trim().toLowerCase();
  return entities.filter((entity) => {
    if (category !== 'all' && entity.category !== category) {
      return false;
    }
    if (!q) return true;
    return (
      entity.nameHe.toLowerCase().includes(q) ||
      entity.subtitleHe.toLowerCase().includes(q) ||
      entity.worldLocationHe.toLowerCase().includes(q) ||
      entity.anatomyTagsHe.some((t) => t.toLowerCase().includes(q)) ||
      entity.id.toLowerCase().includes(q)
    );
  });
}

/**
 * Summary: Creates the initial Lab session state — always starting with 'none' (no animation)!
 */
export function createInitialLabSessionState(initialEntityId?: string): ILabSessionState {
  const entity = getLabEntityById(initialEntityId ?? LAB_ENTITIES[0].id);
  return {
    selectedEntityId: entity.id,
    selectedAnimationId: 'none',
    selectedSkinId: entity.skins[0].id,
    activeRightTab: 'animations',
    categoryFilter: entity.category,
    searchQuery: '',
    playbackSpeed: 1.0,
    isPaused: false,
    manualPhase: 0,
    autoTurntable: false,
    showWireframe: false,
    showFloorGrid: true,
    showHeightRuler: false,
    stageEnvironment: 'studio_day',
    cameraPreset: 'angle',
  };
}

/**
 * Summary: Selects a new entity in the Lab and resets animation to 'none' (static initial state)
 *          and skin to the entity's default skin, preserving 'all' filter if active.
 */
export function selectLabEntity(
  state: ILabSessionState,
  newEntityId: string
): ILabSessionState {
  const entity = getLabEntityById(newEntityId);
  return {
    ...state,
    selectedEntityId: entity.id,
    categoryFilter: state.categoryFilter === 'all' ? 'all' : entity.category,
    selectedAnimationId: 'none',
    selectedSkinId: entity.skins[0].id,
    isPaused: false,
    manualPhase: 0,
  };
}

/**
 * Summary: Switches between 'all', 'characters' (דמויות), and 'animals' (חיות) categories,
 *          automatically selecting the first entity of that category in static 'none' pose
 *          if the currently active entity belongs to another category.
 */
export function selectLabCategory(
  state: ILabSessionState,
  newCategory: LabCategoryFilter
): ILabSessionState {
  if (newCategory === 'all') {
    return {
      ...state,
      categoryFilter: 'all',
    };
  }
  const currentEntity = getLabEntityById(state.selectedEntityId);
  if (currentEntity.category === newCategory) {
    return {
      ...state,
      categoryFilter: newCategory,
    };
  }
  const firstInCategory =
    LAB_ENTITIES.find((e) => e.category === newCategory) ?? LAB_ENTITIES[0];
  return {
    ...state,
    categoryFilter: newCategory,
    selectedEntityId: firstInCategory.id,
    selectedAnimationId: 'none',
    selectedSkinId: firstInCategory.skins[0].id,
    isPaused: false,
    manualPhase: 0,
  };
}

/**
 * Summary: Computes normalized cycle progress in [0, 1) for a given elapsed time, speed, and animation.
 *          Returns 0 when animationId is 'none'.
 */
export function computeLabAnimationCycleProgress(
  animation: ILabAnimationDef,
  elapsedTimeSec: number,
  playbackSpeed: number,
  isPaused: boolean,
  manualPhase: number
): number {
  if (animation.id === 'none' || animation.isStaticDefault) {
    return 0;
  }
  if (isPaused) {
    return ((manualPhase % 1) + 1) % 1;
  }
  const dur = Math.max(0.1, animation.loopDurationSec);
  const scaled = (elapsedTimeSec * Math.max(0, playbackSpeed)) / dur;
  return ((scaled % 1) + 1) % 1;
}

/**
 * Summary: Returns the effective playback speed multiplier for a given entity's pose overrides and animation.
 *          Prioritizes perAnimationSpeeds[animationId], then animationSpeedMultiplier, then fallbackSpeed.
 */
export function getEffectiveLabAnimationSpeed(
  overrides: ILabPoseOverrides | undefined,
  animationId: string,
  fallbackSpeed = 1.0
): number {
  if (!overrides) return fallbackSpeed;
  const perAnim = overrides.perAnimationSpeeds?.[animationId];
  if (typeof perAnim === 'number' && Number.isFinite(perAnim) && perAnim > 0) {
    return Math.max(0.1, Math.min(3.0, perAnim));
  }
  const entitySpeed = overrides.animationSpeedMultiplier;
  if (typeof entitySpeed === 'number' && Number.isFinite(entitySpeed) && entitySpeed > 0) {
    return Math.max(0.1, Math.min(3.0, entitySpeed));
  }
  return fallbackSpeed;
}

/**
 * Summary: Counts how many fine-tuning fields in ILabPoseOverrides differ from their default values.
 */
export function countActivePoseOverrides(overrides: ILabPoseOverrides): number {
  let count = 0;
  if (overrides.equipmentVisibilityMode && overrides.equipmentVisibilityMode !== 'auto') count++;
  if (Math.abs(overrides.amplitudeMultiplier - 1.0) > 0.001) count++;
  if (Math.abs((overrides.animationSpeedMultiplier ?? 1.0) - 1.0) > 0.001) count++;
  if (overrides.perAnimationSpeeds) {
    for (const spd of Object.values(overrides.perAnimationSpeeds)) {
      if (typeof spd === 'number' && Math.abs(spd - 1.0) > 0.001) count++;
    }
  }
  if (Math.abs(overrides.weaponRotXDeg) > 0.1) count++;
  if (Math.abs(overrides.weaponRotYDeg) > 0.1) count++;
  if (Math.abs(overrides.weaponRotZDeg) > 0.1) count++;
  if (Math.abs(overrides.weaponScale - 1.0) > 0.001) count++;
  if (Math.abs(overrides.leftWeaponRotXDeg ?? 0) > 0.1) count++;
  if (Math.abs(overrides.leftWeaponRotYDeg ?? 0) > 0.1) count++;
  if (Math.abs(overrides.leftWeaponRotZDeg ?? 0) > 0.1) count++;
  if (Math.abs((overrides.leftWeaponScale ?? 1.0) - 1.0) > 0.001) count++;
  if (Math.abs(overrides.rightLimbRotXDeg) > 0.1) count++;
  if (Math.abs(overrides.rightLimbRotYDeg) > 0.1) count++;
  if (Math.abs(overrides.rightLimbRotZDeg) > 0.1) count++;
  if (Math.abs(overrides.leftLimbRotXDeg) > 0.1) count++;
  if (Math.abs(overrides.leftLimbRotYDeg) > 0.1) count++;
  if (Math.abs(overrides.leftLimbRotZDeg) > 0.1) count++;
  if (Math.abs(overrides.headRotXDeg) > 0.1) count++;
  if (Math.abs(overrides.headRotYDeg) > 0.1) count++;
  if (Math.abs(overrides.headRotZDeg) > 0.1) count++;
  if (Math.abs(overrides.bodyRotXDeg) > 0.1) count++;
  if (Math.abs(overrides.bodyRotYDeg) > 0.1) count++;
  if (Math.abs(overrides.bodyRotZDeg) > 0.1) count++;
  if (Math.abs(overrides.bodyOffsetY) > 0.001) count++;
  return count;
}

/**
 * Summary: Returns context-aware Hebrew labels for the entity's editable right-hand weapon,
 *          left-hand weapon, and limbs.
 */
export function getEntityEditorLabelsHe(entityId: string): {
  readonly weaponGroupTitleHe: string;
  readonly leftWeaponGroupTitleHe: string;
  readonly rightLimbTitleHe: string;
  readonly leftLimbTitleHe: string;
  readonly headTitleHe: string;
} {
  switch (entityId) {
    case 'ranger_third_person':
    case 'ranger_first_person':
      return {
        weaponGroupTitleHe: t('lab.editor.ranger_third_person.weapon_group_title'),
        leftWeaponGroupTitleHe: t('lab.editor.ranger_third_person.left_weapon_group_title'),
        rightLimbTitleHe: t('lab.editor.ranger_third_person.right_limb_title'),
        leftLimbTitleHe: t('lab.editor.ranger_third_person.left_limb_title'),
        headTitleHe: t('lab.editor.ranger_third_person.head_title'),
      };
    case 'dwarven_miner':
      return {
        weaponGroupTitleHe: t('lab.editor.dwarven_miner.weapon_group_title'),
        leftWeaponGroupTitleHe: t('lab.editor.dwarven_miner.left_weapon_group_title'),
        rightLimbTitleHe: t('lab.editor.dwarven_miner.right_limb_title'),
        leftLimbTitleHe: t('lab.editor.dwarven_miner.left_limb_title'),
        headTitleHe: t('lab.editor.dwarven_miner.head_title'),
      };
    case 'shaolin_monk':
      return {
        weaponGroupTitleHe: t('lab.editor.shaolin_monk.weapon_group_title'),
        leftWeaponGroupTitleHe: t('lab.editor.shaolin_monk.left_weapon_group_title'),
        rightLimbTitleHe: t('lab.editor.shaolin_monk.right_limb_title'),
        leftLimbTitleHe: t('lab.editor.shaolin_monk.left_limb_title'),
        headTitleHe: t('lab.editor.shaolin_monk.head_title'),
      };
    case 'tai_chi_monk':
      return {
        weaponGroupTitleHe: t('lab.editor.tai_chi_monk.weapon_group_title'),
        leftWeaponGroupTitleHe: t('lab.editor.tai_chi_monk.left_weapon_group_title'),
        rightLimbTitleHe: t('lab.editor.tai_chi_monk.right_limb_title'),
        leftLimbTitleHe: t('lab.editor.tai_chi_monk.left_limb_title'),
        headTitleHe: t('lab.editor.tai_chi_monk.head_title'),
      };
    case 'harbor_merchant':
      return {
        weaponGroupTitleHe: t('lab.editor.harbor_merchant.weapon_group_title'),
        leftWeaponGroupTitleHe: t('lab.editor.harbor_merchant.left_weapon_group_title'),
        rightLimbTitleHe: t('lab.editor.harbor_merchant.right_limb_title'),
        leftLimbTitleHe: t('lab.editor.harbor_merchant.left_limb_title'),
        headTitleHe: t('lab.editor.harbor_merchant.head_title'),
      };
    case 'dwarven_king_statue':
      return {
        weaponGroupTitleHe: t('lab.editor.dwarven_king_statue.weapon_group_title'),
        leftWeaponGroupTitleHe: t('lab.editor.dwarven_king_statue.left_weapon_group_title'),
        rightLimbTitleHe: t('lab.editor.dwarven_king_statue.right_limb_title'),
        leftLimbTitleHe: t('lab.editor.dwarven_king_statue.left_limb_title'),
        headTitleHe: t('lab.editor.dwarven_king_statue.head_title'),
      };
    case 'golden_buddha':
      return {
        weaponGroupTitleHe: t('lab.editor.golden_buddha.weapon_group_title'),
        leftWeaponGroupTitleHe: t('lab.editor.golden_buddha.left_weapon_group_title'),
        rightLimbTitleHe: t('lab.editor.golden_buddha.right_limb_title'),
        leftLimbTitleHe: t('lab.editor.golden_buddha.left_limb_title'),
        headTitleHe: t('lab.editor.golden_buddha.head_title'),
      };
    case 'mountain_eagle':
    case 'flock_bird':
    case 'harbor_seagull':
      return {
        weaponGroupTitleHe: t('lab.editor.mountain_eagle.weapon_group_title'),
        leftWeaponGroupTitleHe: t('lab.editor.mountain_eagle.left_weapon_group_title'),
        rightLimbTitleHe: t('lab.editor.mountain_eagle.right_limb_title'),
        leftLimbTitleHe: t('lab.editor.mountain_eagle.left_limb_title'),
        headTitleHe: t('lab.editor.mountain_eagle.head_title'),
      };
    case 'meadow_butterfly':
      return {
        weaponGroupTitleHe: t('lab.editor.meadow_butterfly.weapon_group_title'),
        leftWeaponGroupTitleHe: t('lab.editor.meadow_butterfly.left_weapon_group_title'),
        rightLimbTitleHe: t('lab.editor.meadow_butterfly.right_limb_title'),
        leftLimbTitleHe: t('lab.editor.meadow_butterfly.left_limb_title'),
        headTitleHe: t('lab.editor.meadow_butterfly.head_title'),
      };
    case 'koi_fish':
      return {
        weaponGroupTitleHe: t('lab.editor.koi_fish.weapon_group_title'),
        leftWeaponGroupTitleHe: t('lab.editor.koi_fish.left_weapon_group_title'),
        rightLimbTitleHe: t('lab.editor.koi_fish.right_limb_title'),
        leftLimbTitleHe: t('lab.editor.koi_fish.left_limb_title'),
        headTitleHe: t('lab.editor.koi_fish.head_title'),
      };
    case 'forest_deer':
      return {
        weaponGroupTitleHe: t('lab.editor.forest_deer.weapon_group_title'),
        leftWeaponGroupTitleHe: t('lab.editor.forest_deer.left_weapon_group_title'),
        rightLimbTitleHe: t('lab.editor.forest_deer.right_limb_title'),
        leftLimbTitleHe: t('lab.editor.forest_deer.left_limb_title'),
        headTitleHe: t('lab.editor.forest_deer.head_title'),
      };
    case 'forest_bear':
      return {
        weaponGroupTitleHe: t('lab.editor.forest_bear.weapon_group_title'),
        leftWeaponGroupTitleHe: t('lab.editor.forest_bear.left_weapon_group_title'),
        rightLimbTitleHe: t('lab.editor.forest_bear.right_limb_title'),
        leftLimbTitleHe: t('lab.editor.forest_bear.left_limb_title'),
        headTitleHe: t('lab.editor.forest_bear.head_title'),
      };
    case 'river_crocodile':
      return {
        weaponGroupTitleHe: t('lab.editor.river_crocodile.weapon_group_title'),
        leftWeaponGroupTitleHe: t('lab.editor.river_crocodile.left_weapon_group_title'),
        rightLimbTitleHe: t('lab.editor.river_crocodile.right_limb_title'),
        leftLimbTitleHe: t('lab.editor.river_crocodile.left_limb_title'),
        headTitleHe: t('lab.editor.river_crocodile.head_title'),
      };
    case 'jungle_jaguar':
      return {
        weaponGroupTitleHe: t('lab.editor.jungle_jaguar.weapon_group_title'),
        leftWeaponGroupTitleHe: t('lab.editor.jungle_jaguar.left_weapon_group_title'),
        rightLimbTitleHe: t('lab.editor.jungle_jaguar.right_limb_title'),
        leftLimbTitleHe: t('lab.editor.jungle_jaguar.left_limb_title'),
        headTitleHe: t('lab.editor.jungle_jaguar.head_title'),
      };
    default:
      return {
        weaponGroupTitleHe: t('lab.editor.default.weapon_group_title'),
        leftWeaponGroupTitleHe: t('lab.editor.default.left_weapon_group_title'),
        rightLimbTitleHe: t('lab.editor.default.right_limb_title'),
        leftLimbTitleHe: t('lab.editor.default.left_limb_title'),
        headTitleHe: t('lab.editor.default.head_title'),
      };
  }
}
// #endregion
