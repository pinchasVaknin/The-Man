// ============================================================================
// MODULE: Lab / Entity, Animation & Skin Catalog
// DESIGN: 100% Decoupled Laboratory Data Model & Pure State Helpers (SRP)
// SUMMARY: Catalogs all characters, humans, animals, and mythic creatures that
//          exist in the world codebase, along with their animations (starting
//          with 'none' = static pose) and skin variants.
// ============================================================================

import {
  RIDEABLE_HORSES,
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
  readonly name: string;
  readonly description: string;
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
  readonly name: string;
  readonly subtitle: string;
  readonly badgeColors: readonly [string, string, string];
  readonly palette: ILabSkinPalette;
}

export interface ILabEntityDef {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string;
  readonly category: LabCategoryId;
  readonly categoryLabel: string;
  readonly worldLocation: string;
  readonly worldCoordinatesText: string;
  readonly worldInstanceCount: number;
  readonly sourceFile: string;
  readonly description: string;
  readonly defaultCameraDistance: number;
  readonly defaultCameraTargetY: number;
  readonly anatomyTags: readonly string[];
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
export const LAB_CATEGORIES: readonly { id: LabCategoryId; label: string; subtitle: string }[] = [
  { id: 'characters', label: t('lab.categories.characters.label'), subtitle: t('lab.categories.characters.subtitle') },
  { id: 'animals', label: t('lab.categories.animals.label'), subtitle: t('lab.categories.animals.subtitle') },
] as const;
// #endregion

// ======================== ENTITY CATALOG ======================== \\
// #region Entity Catalog
const horseSkinsFromWorld: ILabSkinDef[] = RIDEABLE_HORSES.map((h, idx) => {
  const hexToCss = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`;
  return {
    id: h.id,
    name: h.name,
    subtitle: t('lab.horse_stable_subtitle', {
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
  // 1. HUMANS & CHARACTERS
  {
    id: 'ranger_third_person',
    name: t('lab.entities.ranger_third_person.name'),
    subtitle: t('lab.entities.ranger_third_person.subtitle'),
    category: 'characters',
    categoryLabel: t('lab.entities.ranger_third_person.category_label'),
    worldLocation: t('lab.entities.ranger_third_person.world_location'),
    worldCoordinatesText: '(0, 22)',
    worldInstanceCount: 1,
    sourceFile: 'src/world/builders/playerAndCombatBuilder.ts',
    description:
      t('lab.entities.ranger_third_person.description'),
    defaultCameraDistance: 4.1,
    defaultCameraTargetY: 0.98,
    anatomyTags: [t('lab.entities.ranger_third_person.anatomy_tags.0'), t('lab.entities.ranger_third_person.anatomy_tags.1'), t('lab.entities.ranger_third_person.anatomy_tags.2'), t('lab.entities.ranger_third_person.anatomy_tags.3'), t('lab.entities.ranger_third_person.anatomy_tags.4'), t('lab.entities.ranger_third_person.anatomy_tags.5')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.ranger_third_person.animations.none.name'),
        description: t('lab.entities.ranger_third_person.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        name: t('lab.entities.ranger_third_person.animations.idle.name'),
        description: t('lab.entities.ranger_third_person.animations.idle.description'),
        loopDurationSec: 3.8,
      },
      {
        id: 'walk',
        name: t('lab.entities.ranger_third_person.animations.walk.name'),
        description: t('lab.entities.ranger_third_person.animations.walk.description'),
        loopDurationSec: 1.4,
      },
      {
        id: 'sprint',
        name: t('lab.entities.ranger_third_person.animations.sprint.name'),
        description: t('lab.entities.ranger_third_person.animations.sprint.description'),
        loopDurationSec: 0.85,
      },
      {
        id: 'bow_draw',
        name: t('lab.entities.ranger_third_person.animations.bow_draw.name'),
        description: t('lab.entities.ranger_third_person.animations.bow_draw.description'),
        loopDurationSec: 2.2,
      },
      {
        id: 'sword_slash',
        name: t('lab.entities.ranger_third_person.animations.sword_slash.name'),
        description: t('lab.entities.ranger_third_person.animations.sword_slash.description'),
        loopDurationSec: 1.6,
      },
      {
        id: 'torch_carry',
        name: t('lab.entities.ranger_third_person.animations.torch_carry.name'),
        description: t('lab.entities.ranger_third_person.animations.torch_carry.description'),
        loopDurationSec: 2.4,
      },
      {
        id: 'swim',
        name: t('lab.entities.ranger_third_person.animations.swim.name'),
        description: t('lab.entities.ranger_third_person.animations.swim.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'horse_mount_pose',
        name: t('lab.entities.ranger_third_person.animations.horse_mount_pose.name'),
        description: t('lab.entities.ranger_third_person.animations.horse_mount_pose.description'),
        loopDurationSec: 1.6,
      },
    ],
    skins: [
      {
        id: 'ranger_classic_forest',
        name: t('lab.entities.ranger_third_person.skins.ranger_classic_forest.name'),
        subtitle: t('lab.entities.ranger_third_person.skins.ranger_classic_forest.subtitle'),
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
        name: t('lab.entities.ranger_third_person.skins.ranger_imperial_guard.name'),
        subtitle: t('lab.entities.ranger_third_person.skins.ranger_imperial_guard.subtitle'),
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
        name: t('lab.entities.ranger_third_person.skins.ranger_shadow_stalker.name'),
        subtitle: t('lab.entities.ranger_third_person.skins.ranger_shadow_stalker.subtitle'),
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
        name: t('lab.entities.ranger_third_person.skins.ranger_oasis_nomad.name'),
        subtitle: t('lab.entities.ranger_third_person.skins.ranger_oasis_nomad.subtitle'),
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
    name: t('lab.entities.ranger_first_person.name'),
    subtitle: t('lab.entities.ranger_first_person.subtitle'),
    category: 'characters',
    categoryLabel: t('lab.entities.ranger_first_person.category_label'),
    worldLocation: t('lab.entities.ranger_first_person.world_location'),
    worldCoordinatesText: t('lab.entities.ranger_first_person.world_coordinates'),
    worldInstanceCount: 1,
    sourceFile: 'src/world/systems/swordAttackAnimationSystem.ts',
    description:
      t('lab.entities.ranger_first_person.description'),
    defaultCameraDistance: 1.85,
    defaultCameraTargetY: 1.15,
    anatomyTags: [t('lab.entities.ranger_first_person.anatomy_tags.0'), t('lab.entities.ranger_first_person.anatomy_tags.1'), t('lab.entities.ranger_first_person.anatomy_tags.2'), t('lab.entities.ranger_first_person.anatomy_tags.3'), t('lab.entities.ranger_first_person.anatomy_tags.4')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.ranger_first_person.animations.none.name'),
        description: t('lab.entities.ranger_first_person.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'fp_sword_combo',
        name: t('lab.entities.ranger_first_person.animations.fp_sword_combo.name'),
        description: t('lab.entities.ranger_first_person.animations.fp_sword_combo.description'),
        loopDurationSec: 2.4,
      },
      {
        id: 'fp_sword_heavy',
        name: t('lab.entities.ranger_first_person.animations.fp_sword_heavy.name'),
        description: t('lab.entities.ranger_first_person.animations.fp_sword_heavy.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'fp_sword_block',
        name: t('lab.entities.ranger_first_person.animations.fp_sword_block.name'),
        description: t('lab.entities.ranger_first_person.animations.fp_sword_block.description'),
        loopDurationSec: 2.0,
      },
      {
        id: 'fp_bow_aim',
        name: t('lab.entities.ranger_first_person.animations.fp_bow_aim.name'),
        description: t('lab.entities.ranger_first_person.animations.fp_bow_aim.description'),
        loopDurationSec: 2.2,
      },
      {
        id: 'fp_torch_hold',
        name: t('lab.entities.ranger_first_person.animations.fp_torch_hold.name'),
        description: t('lab.entities.ranger_first_person.animations.fp_torch_hold.description'),
        loopDurationSec: 2.0,
      },
    ],
    skins: [
      {
        id: 'fp_elven_emerald',
        name: t('lab.entities.ranger_first_person.skins.fp_elven_emerald.name'),
        subtitle: t('lab.entities.ranger_first_person.skins.fp_elven_emerald.subtitle'),
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
        name: t('lab.entities.ranger_first_person.skins.fp_imperial_crimson.name'),
        subtitle: t('lab.entities.ranger_first_person.skins.fp_imperial_crimson.subtitle'),
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
        name: t('lab.entities.ranger_first_person.skins.fp_dwarven_mithril.name'),
        subtitle: t('lab.entities.ranger_first_person.skins.fp_dwarven_mithril.subtitle'),
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
    name: t('lab.entities.dwarven_miner.name'),
    subtitle: t('lab.entities.dwarven_miner.subtitle'),
    category: 'characters',
    categoryLabel: t('lab.entities.dwarven_miner.category_label'),
    worldLocation: t('lab.entities.dwarven_miner.world_location'),
    worldCoordinatesText: `(${SOUTHERN_MINE_POS.x}, ${SOUTHERN_MINE_POS.entranceZ})`,
    worldInstanceCount: DWARVEN_MINERS_COUNT,
    sourceFile: 'src/world/systems/dwarvenMineAndCaravanSystem.ts',
    description:
      t('lab.entities.dwarven_miner.description'),
    defaultCameraDistance: 3.4,
    defaultCameraTargetY: 0.82,
    anatomyTags: [t('lab.entities.dwarven_miner.anatomy_tags.0'), t('lab.entities.dwarven_miner.anatomy_tags.1'), t('lab.entities.dwarven_miner.anatomy_tags.2'), t('lab.entities.dwarven_miner.anatomy_tags.3'), t('lab.entities.dwarven_miner.anatomy_tags.4'), t('lab.entities.dwarven_miner.anatomy_tags.5')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.dwarven_miner.animations.none.name'),
        description: t('lab.entities.dwarven_miner.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'mining_work',
        name: t('lab.entities.dwarven_miner.animations.mining_work.name'),
        description: t('lab.entities.dwarven_miner.animations.mining_work.description'),
        loopDurationSec: 1.2,
      },
      {
        id: 'caravan_march',
        name: t('lab.entities.dwarven_miner.animations.caravan_march.name'),
        description: t('lab.entities.dwarven_miner.animations.caravan_march.description'),
        loopDurationSec: 1.1,
      },
      {
        id: 'miner_idle',
        name: t('lab.entities.dwarven_miner.animations.miner_idle.name'),
        description: t('lab.entities.dwarven_miner.animations.miner_idle.description'),
        loopDurationSec: 3.2,
      },
      {
        id: 'celebrate_gold',
        name: t('lab.entities.dwarven_miner.animations.celebrate_gold.name'),
        description: t('lab.entities.dwarven_miner.animations.celebrate_gold.description'),
        loopDurationSec: 1.5,
      },
    ],
    skins: [
      {
        id: 'dwarf_thorin_red',
        name: t('lab.entities.dwarven_miner.skins.dwarf_thorin_red.name'),
        subtitle: t('lab.entities.dwarven_miner.skins.dwarf_thorin_red.subtitle'),
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
        name: t('lab.entities.dwarven_miner.skins.dwarf_balin_blue.name'),
        subtitle: t('lab.entities.dwarven_miner.skins.dwarf_balin_blue.subtitle'),
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
        name: t('lab.entities.dwarven_miner.skins.dwarf_dwalin_green.name'),
        subtitle: t('lab.entities.dwarven_miner.skins.dwarf_dwalin_green.subtitle'),
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
        name: t('lab.entities.dwarven_miner.skins.dwarf_bofur_amber.name'),
        subtitle: t('lab.entities.dwarven_miner.skins.dwarf_bofur_amber.subtitle'),
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
    name: t('lab.entities.shaolin_monk.name'),
    subtitle: t('lab.entities.shaolin_monk.subtitle'),
    category: 'characters',
    categoryLabel: t('lab.entities.shaolin_monk.category_label'),
    worldLocation: t('lab.entities.shaolin_monk.world_location'),
    worldCoordinatesText: `(${CHINESE_FORTRESS_POS.x}, ${CHINESE_FORTRESS_POS.z})`,
    worldInstanceCount: 8,
    sourceFile: 'src/world/models/fortressModels.ts',
    description:
      t('lab.entities.shaolin_monk.description'),
    defaultCameraDistance: 3.9,
    defaultCameraTargetY: 0.95,
    anatomyTags: [t('lab.entities.shaolin_monk.anatomy_tags.0'), t('lab.entities.shaolin_monk.anatomy_tags.1'), t('lab.entities.shaolin_monk.anatomy_tags.2'), t('lab.entities.shaolin_monk.anatomy_tags.3'), t('lab.entities.shaolin_monk.anatomy_tags.4')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.shaolin_monk.animations.none.name'),
        description: t('lab.entities.shaolin_monk.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'kung_fu_form',
        name: t('lab.entities.shaolin_monk.animations.kung_fu_form.name'),
        description: t('lab.entities.shaolin_monk.animations.kung_fu_form.description'),
        loopDurationSec: 3.4,
      },
      {
        id: 'staff_whirlwind',
        name: t('lab.entities.shaolin_monk.animations.staff_whirlwind.name'),
        description: t('lab.entities.shaolin_monk.animations.staff_whirlwind.description'),
        loopDurationSec: 1.4,
      },
      {
        id: 'horse_stance_strike',
        name: t('lab.entities.shaolin_monk.animations.horse_stance_strike.name'),
        description: t('lab.entities.shaolin_monk.animations.horse_stance_strike.description'),
        loopDurationSec: 2.0,
      },
      {
        id: 'shaolin_salute',
        name: t('lab.entities.shaolin_monk.animations.shaolin_salute.name'),
        description: t('lab.entities.shaolin_monk.animations.shaolin_salute.description'),
        loopDurationSec: 2.6,
      },
    ],
    skins: [
      {
        id: 'monk_saffron_classic',
        name: t('lab.entities.shaolin_monk.skins.monk_saffron_classic.name'),
        subtitle: t('lab.entities.shaolin_monk.skins.monk_saffron_classic.subtitle'),
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
        name: t('lab.entities.shaolin_monk.skins.monk_grandmaster_crimson.name'),
        subtitle: t('lab.entities.shaolin_monk.skins.monk_grandmaster_crimson.subtitle'),
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
        name: t('lab.entities.shaolin_monk.skins.monk_jade_guardian.name'),
        subtitle: t('lab.entities.shaolin_monk.skins.monk_jade_guardian.subtitle'),
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
        name: t('lab.entities.shaolin_monk.skins.monk_mountain_slate.name'),
        subtitle: t('lab.entities.shaolin_monk.skins.monk_mountain_slate.subtitle'),
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
    name: t('lab.entities.tai_chi_monk.name'),
    subtitle: t('lab.entities.tai_chi_monk.subtitle'),
    category: 'characters',
    categoryLabel: t('lab.entities.tai_chi_monk.category_label'),
    worldLocation: t('lab.entities.tai_chi_monk.world_location'),
    worldCoordinatesText: `(${SAKURA_SANCTUARY_POS.x}, ${SAKURA_SANCTUARY_POS.z})`,
    worldInstanceCount: 4,
    sourceFile: 'src/world/models/sanctuaryAndDragonModels.ts',
    description:
      t('lab.entities.tai_chi_monk.description'),
    defaultCameraDistance: 3.8,
    defaultCameraTargetY: 0.95,
    anatomyTags: [t('lab.entities.tai_chi_monk.anatomy_tags.0'), t('lab.entities.tai_chi_monk.anatomy_tags.1'), t('lab.entities.tai_chi_monk.anatomy_tags.2'), t('lab.entities.tai_chi_monk.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.tai_chi_monk.animations.none.name'),
        description: t('lab.entities.tai_chi_monk.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'tai_chi_flow',
        name: t('lab.entities.tai_chi_monk.animations.tai_chi_flow.name'),
        description: t('lab.entities.tai_chi_monk.animations.tai_chi_flow.description'),
        loopDurationSec: 4.2,
      },
      {
        id: 'cloud_hands',
        name: t('lab.entities.tai_chi_monk.animations.cloud_hands.name'),
        description: t('lab.entities.tai_chi_monk.animations.cloud_hands.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'crane_balance',
        name: t('lab.entities.tai_chi_monk.animations.crane_balance.name'),
        description: t('lab.entities.tai_chi_monk.animations.crane_balance.description'),
        loopDurationSec: 3.2,
      },
    ],
    skins: [
      {
        id: 'taichi_sakura_blossom',
        name: t('lab.entities.tai_chi_monk.skins.taichi_sakura_blossom.name'),
        subtitle: t('lab.entities.tai_chi_monk.skins.taichi_sakura_blossom.subtitle'),
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
        name: t('lab.entities.tai_chi_monk.skins.taichi_sunrise_orange.name'),
        subtitle: t('lab.entities.tai_chi_monk.skins.taichi_sunrise_orange.subtitle'),
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
        name: t('lab.entities.tai_chi_monk.skins.taichi_zen_white.name'),
        subtitle: t('lab.entities.tai_chi_monk.skins.taichi_zen_white.subtitle'),
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
    name: t('lab.entities.harbor_merchant.name'),
    subtitle: t('lab.entities.harbor_merchant.subtitle'),
    category: 'characters',
    categoryLabel: t('lab.entities.harbor_merchant.category_label'),
    worldLocation: t('lab.entities.harbor_merchant.world_location'),
    worldCoordinatesText: `(${SOUTHEAST_HARBOR_POS.x}, ${SOUTHEAST_HARBOR_POS.z})`,
    worldInstanceCount: MARKET_STALL_LOCATIONS.length,
    sourceFile: 'src/world/domain/landmarks/oasisAndHarborLandmarks.ts',
    description:
      t('lab.entities.harbor_merchant.description'),
    defaultCameraDistance: 3.8,
    defaultCameraTargetY: 0.95,
    anatomyTags: [t('lab.entities.harbor_merchant.anatomy_tags.0'), t('lab.entities.harbor_merchant.anatomy_tags.1'), t('lab.entities.harbor_merchant.anatomy_tags.2'), t('lab.entities.harbor_merchant.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.harbor_merchant.animations.none.name'),
        description: t('lab.entities.harbor_merchant.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'merchant_welcome',
        name: t('lab.entities.harbor_merchant.animations.merchant_welcome.name'),
        description: t('lab.entities.harbor_merchant.animations.merchant_welcome.description'),
        loopDurationSec: 2.8,
      },
      {
        id: 'blacksmith_forge',
        name: t('lab.entities.harbor_merchant.animations.blacksmith_forge.name'),
        description: t('lab.entities.harbor_merchant.animations.blacksmith_forge.description'),
        loopDurationSec: 1.3,
      },
      {
        id: 'market_call',
        name: t('lab.entities.harbor_merchant.animations.market_call.name'),
        description: t('lab.entities.harbor_merchant.animations.market_call.description'),
        loopDurationSec: 2.2,
      },
    ],
    skins: [
      {
        id: 'merchant_liang_crimson',
        name: t('lab.entities.harbor_merchant.skins.merchant_liang_crimson.name'),
        subtitle: t('lab.entities.harbor_merchant.skins.merchant_liang_crimson.subtitle'),
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
        name: t('lab.entities.harbor_merchant.skins.merchant_mei_emerald.name'),
        subtitle: t('lab.entities.harbor_merchant.skins.merchant_mei_emerald.subtitle'),
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
        name: t('lab.entities.harbor_merchant.skins.merchant_borin_blacksmith.name'),
        subtitle: t('lab.entities.harbor_merchant.skins.merchant_borin_blacksmith.subtitle'),
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
        name: t('lab.entities.harbor_merchant.skins.merchant_karim_lapis.name'),
        subtitle: t('lab.entities.harbor_merchant.skins.merchant_karim_lapis.subtitle'),
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

  // 2. ANIMALS & WILDLIFE
  {
    id: 'rideable_horse',
    name: t('lab.entities.rideable_horse.name'),
    subtitle: t('lab.entities.rideable_horse.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.rideable_horse.category_label'),
    worldLocation: t('lab.entities.rideable_horse.world_location'),
    worldCoordinatesText: t('lab.entities.rideable_horse.world_coordinates'),
    worldInstanceCount: RIDEABLE_HORSES.length,
    sourceFile: 'src/world/models/Horse.ts (src/world/models/animals/Horse_Complete.ts)',
    description:
      t('lab.entities.rideable_horse.description'),
    defaultCameraDistance: 4.1,
    defaultCameraTargetY: 1.15,
    anatomyTags: [t('lab.entities.rideable_horse.anatomy_tags.0'), t('lab.entities.rideable_horse.anatomy_tags.1'), t('lab.entities.rideable_horse.anatomy_tags.2'), t('lab.entities.rideable_horse.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.rideable_horse.animations.none.name'),
        description: t('lab.entities.rideable_horse.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        name: t('lab.entities.rideable_horse.animations.horse_idle.name'),
        description: t('lab.entities.rideable_horse.animations.horse_idle.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'walk',
        name: t('lab.entities.rideable_horse.animations.horse_walk.name'),
        description: t('lab.entities.rideable_horse.animations.horse_walk.description'),
        loopDurationSec: 1.53,
      },
      {
        id: 'trot',
        name: t('lab.entities.rideable_horse.animations.horse_trot.name'),
        description: t('lab.entities.rideable_horse.animations.horse_trot.description'),
        loopDurationSec: 0.77,
      },
      {
        id: 'run',
        name: t('lab.entities.rideable_horse.animations.horse_gallop.name'),
        description: t('lab.entities.rideable_horse.animations.horse_gallop.description'),
        loopDurationSec: 0.6,
      },
      {
        id: 'flee',
        name: 'Fast Gallop (Flee)',
        description: 'High-tempo sprint gallop away from danger.',
        loopDurationSec: 0.5,
      },
      {
        id: 'skip',
        name: 'Canter / Jump (Skip)',
        description: 'Bounding canter and obstacle leap.',
        loopDurationSec: 0.9,
      },
      {
        id: 'eat',
        name: 'Graze (Eat)',
        description: 'Lowers neck and head to graze meadow grass.',
        loopDurationSec: 4.5,
      },
      {
        id: 'call',
        name: 'Neigh (Call)',
        description: 'Raises head and vocalizes a resonant neigh.',
        loopDurationSec: 2.33,
      },
      {
        id: 'buck_attack',
        name: t('lab.entities.rideable_horse.animations.horse_rear.name'),
        description: t('lab.entities.rideable_horse.animations.horse_rear.description'),
        loopDurationSec: 1.5,
      },
      {
        id: 'roar',
        name: 'Stallion Rear (Roar)',
        description: 'Dramatic rearing threat display.',
        loopDurationSec: 2.6,
      },
      {
        id: 'attack',
        name: 'Lunge Strike (Attack)',
        description: 'Forward neck lunge and strike.',
        loopDurationSec: 1.33,
      },
      {
        id: 'sit',
        name: 'Rest Kneel (Sit)',
        description: 'Settles forelegs and haunches into a seated rest.',
        loopDurationSec: 3.33,
      },
      {
        id: 'lie',
        name: 'Lie Down (Lie)',
        description: 'Rests calmly on the ground.',
        loopDurationSec: 4.0,
      },
      {
        id: 'death',
        name: 'Collapse (Death)',
        description: 'Full skeletal collapse onto its side.',
        loopDurationSec: 2.0,
      },
    ],
    skins: horseSkinsFromWorld,
  },

  {
    id: 'forest_deer',
    name: t('lab.entities.forest_deer.name'),
    subtitle: t('lab.entities.forest_deer.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.forest_deer.category_label'),
    worldLocation: t('lab.entities.forest_deer.world_location'),
    worldCoordinatesText: t('lab.entities.forest_deer.world_coordinates'),
    worldInstanceCount: 5,
    sourceFile: 'src/world/models/Deer.ts (src/world/models/animals/Deer_Complete.ts)',
    description:
      t('lab.entities.forest_deer.description'),
    defaultCameraDistance: 3.2,
    defaultCameraTargetY: 0.72,
    anatomyTags: [t('lab.entities.forest_deer.anatomy_tags.0'), t('lab.entities.forest_deer.anatomy_tags.1'), t('lab.entities.forest_deer.anatomy_tags.2'), t('lab.entities.forest_deer.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.forest_deer.animations.none.name'),
        description: t('lab.entities.forest_deer.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        name: t('lab.entities.forest_deer.animations.idle.name'),
        description: t('lab.entities.forest_deer.animations.idle.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'walk',
        name: t('lab.entities.forest_deer.animations.walk.name'),
        description: t('lab.entities.forest_deer.animations.walk.description'),
        loopDurationSec: 1.5,
      },
      {
        id: 'eat',
        name: t('lab.entities.forest_deer.animations.eat.name'),
        description: t('lab.entities.forest_deer.animations.eat.description'),
        loopDurationSec: 3.2,
      },
      {
        id: 'call',
        name: t('lab.entities.forest_deer.animations.call.name'),
        description: t('lab.entities.forest_deer.animations.call.description'),
        loopDurationSec: 3.0,
      },
      {
        id: 'lie',
        name: t('lab.entities.forest_deer.animations.lie.name'),
        description: t('lab.entities.forest_deer.animations.lie.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'run',
        name: t('lab.entities.forest_deer.animations.run.name'),
        description: t('lab.entities.forest_deer.animations.run.description'),
        loopDurationSec: 0.9,
      },
      {
        id: 'flee',
        name: t('lab.entities.forest_deer.animations.flee.name'),
        description: t('lab.entities.forest_deer.animations.flee.description'),
        loopDurationSec: 0.8,
      },
      {
        id: 'skip',
        name: t('lab.entities.forest_deer.animations.skip.name'),
        description: t('lab.entities.forest_deer.animations.skip.description'),
        loopDurationSec: 1.1,
      },
      {
        id: 'death',
        name: t('lab.entities.forest_deer.animations.death.name'),
        description: t('lab.entities.forest_deer.animations.death.description'),
        loopDurationSec: 3.5,
      },
    ],
    skins: [
      {
        id: 'deer_stag_classic',
        name: t('lab.entities.forest_deer.skins.deer_stag_classic.name'),
        subtitle: t('lab.entities.forest_deer.skins.deer_stag_classic.subtitle'),
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
        name: t('lab.entities.forest_deer.skins.deer_doe_gentle.name'),
        subtitle: t('lab.entities.forest_deer.skins.deer_doe_gentle.subtitle'),
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
        name: t('lab.entities.forest_deer.skins.deer_white_hart.name'),
        subtitle: t('lab.entities.forest_deer.skins.deer_white_hart.subtitle'),
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
        name: t('lab.entities.forest_deer.skins.deer_highland_dark.name'),
        subtitle: t('lab.entities.forest_deer.skins.deer_highland_dark.subtitle'),
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
    name: t('lab.entities.forest_bear.name'),
    subtitle: t('lab.entities.forest_bear.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.forest_bear.category_label'),
    worldLocation: t('lab.entities.forest_bear.world_location'),
    worldCoordinatesText: t('lab.entities.forest_bear.world_coordinates'),
    worldInstanceCount: 7,
    sourceFile: 'src/world/models/Bear.ts (src/world/models/animals/Bear_Complete.ts)',
    description:
      t('lab.entities.forest_bear.description'),
    defaultCameraDistance: 3.4,
    defaultCameraTargetY: 0.68,
    anatomyTags: [t('lab.entities.forest_bear.anatomy_tags.0'), t('lab.entities.forest_bear.anatomy_tags.1'), t('lab.entities.forest_bear.anatomy_tags.2'), t('lab.entities.forest_bear.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.forest_bear.animations.none.name'),
        description: t('lab.entities.forest_bear.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        name: t('lab.entities.forest_bear.animations.idle.name'),
        description: t('lab.entities.forest_bear.animations.idle.description'),
        loopDurationSec: 4.2,
      },
      {
        id: 'walk',
        name: t('lab.entities.forest_bear.animations.walk.name'),
        description: t('lab.entities.forest_bear.animations.walk.description'),
        loopDurationSec: 1.67,
      },
      {
        id: 'eat',
        name: t('lab.entities.forest_bear.animations.eat.name'),
        description: t('lab.entities.forest_bear.animations.eat.description'),
        loopDurationSec: 7.33,
      },
      {
        id: 'call',
        name: t('lab.entities.forest_bear.animations.call.name'),
        description: t('lab.entities.forest_bear.animations.call.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'lie',
        name: t('lab.entities.forest_bear.animations.lie.name'),
        description: t('lab.entities.forest_bear.animations.lie.description'),
        loopDurationSec: 4.17,
      },
      {
        id: 'sit',
        name: t('lab.entities.forest_bear.animations.sit.name'),
        description: t('lab.entities.forest_bear.animations.sit.description'),
        loopDurationSec: 5.0,
      },
      {
        id: 'trot',
        name: t('lab.entities.forest_bear.animations.trot.name'),
        description: t('lab.entities.forest_bear.animations.trot.description'),
        loopDurationSec: 0.67,
      },
      {
        id: 'run',
        name: t('lab.entities.forest_bear.animations.run.name'),
        description: t('lab.entities.forest_bear.animations.run.description'),
        loopDurationSec: 0.53,
      },
      {
        id: 'flee',
        name: t('lab.entities.forest_bear.animations.flee.name'),
        description: t('lab.entities.forest_bear.animations.flee.description'),
        loopDurationSec: 0.47,
      },
      {
        id: 'skip',
        name: t('lab.entities.forest_bear.animations.skip.name'),
        description: t('lab.entities.forest_bear.animations.skip.description'),
        loopDurationSec: 1.83,
      },
      {
        id: 'roar',
        name: t('lab.entities.forest_bear.animations.roar.name'),
        description: t('lab.entities.forest_bear.animations.roar.description'),
        loopDurationSec: 5.0,
      },
      {
        id: 'stomp',
        name: t('lab.entities.forest_bear.animations.stomp.name'),
        description: t('lab.entities.forest_bear.animations.stomp.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'attack',
        name: t('lab.entities.forest_bear.animations.attack.name'),
        description: t('lab.entities.forest_bear.animations.attack.description'),
        loopDurationSec: 2.4,
      },
      {
        id: 'death',
        name: t('lab.entities.forest_bear.animations.death.name'),
        description: t('lab.entities.forest_bear.animations.death.description'),
        loopDurationSec: 1.8,
      },
    ],
    skins: [
      {
        id: 'bear_grizzly_classic',
        name: t('lab.entities.forest_bear.skins.bear_grizzly_classic.name'),
        subtitle: t('lab.entities.forest_bear.skins.bear_grizzly_classic.subtitle'),
        badgeColors: ['#6b4226', '#9c6b43', '#2a1810'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0x9c6b43,
          accentHex: 0x2a1810,
        },
      },
      {
        id: 'bear_black_mountain',
        name: t('lab.entities.forest_bear.skins.bear_black_mountain.name'),
        subtitle: t('lab.entities.forest_bear.skins.bear_black_mountain.subtitle'),
        badgeColors: ['#292524', '#57534e', '#0c0a09'],
        palette: {
          primaryHex: 0x57534e,
          secondaryHex: 0x78716c,
          accentHex: 0x1c1917,
        },
      },
      {
        id: 'bear_polar_frost',
        name: t('lab.entities.forest_bear.skins.bear_polar_frost.name'),
        subtitle: t('lab.entities.forest_bear.skins.bear_polar_frost.subtitle'),
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
    name: t('lab.entities.river_crocodile.name'),
    subtitle: t('lab.entities.river_crocodile.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.river_crocodile.category_label'),
    worldLocation: t('lab.entities.river_crocodile.world_location'),
    worldCoordinatesText: t('lab.entities.river_crocodile.world_coordinates'),
    worldInstanceCount: 5,
    sourceFile: 'src/world/models/Crocodile.ts (src/world/models/animals/Crocodile_Complete.ts)',
    description:
      t('lab.entities.river_crocodile.description'),
    defaultCameraDistance: 3.7,
    defaultCameraTargetY: 0.35,
    anatomyTags: [t('lab.entities.river_crocodile.anatomy_tags.0'), t('lab.entities.river_crocodile.anatomy_tags.1'), t('lab.entities.river_crocodile.anatomy_tags.2'), t('lab.entities.river_crocodile.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.river_crocodile.animations.none.name'),
        description: t('lab.entities.river_crocodile.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        name: t('lab.entities.river_crocodile.animations.idle.name'),
        description: t('lab.entities.river_crocodile.animations.idle.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'walk',
        name: t('lab.entities.river_crocodile.animations.walk.name'),
        description: t('lab.entities.river_crocodile.animations.walk.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'eat',
        name: t('lab.entities.river_crocodile.animations.eat.name'),
        description: t('lab.entities.river_crocodile.animations.eat.description'),
        loopDurationSec: 3.2,
      },
      {
        id: 'call',
        name: t('lab.entities.river_crocodile.animations.call.name'),
        description: t('lab.entities.river_crocodile.animations.call.description'),
        loopDurationSec: 3.0,
      },
      {
        id: 'lie',
        name: t('lab.entities.river_crocodile.animations.lie.name'),
        description: t('lab.entities.river_crocodile.animations.lie.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'sit',
        name: t('lab.entities.river_crocodile.animations.sit.name'),
        description: t('lab.entities.river_crocodile.animations.sit.description'),
        loopDurationSec: 3.8,
      },
      {
        id: 'trot',
        name: t('lab.entities.river_crocodile.animations.trot.name'),
        description: t('lab.entities.river_crocodile.animations.trot.description'),
        loopDurationSec: 1.6,
      },
      {
        id: 'run',
        name: t('lab.entities.river_crocodile.animations.run.name'),
        description: t('lab.entities.river_crocodile.animations.run.description'),
        loopDurationSec: 0.9,
      },
      {
        id: 'flee',
        name: t('lab.entities.river_crocodile.animations.flee.name'),
        description: t('lab.entities.river_crocodile.animations.flee.description'),
        loopDurationSec: 0.72,
      },
      {
        id: 'skip',
        name: t('lab.entities.river_crocodile.animations.skip.name'),
        description: t('lab.entities.river_crocodile.animations.skip.description'),
        loopDurationSec: 1.1,
      },
      {
        id: 'roar',
        name: t('lab.entities.river_crocodile.animations.roar.name'),
        description: t('lab.entities.river_crocodile.animations.roar.description'),
        loopDurationSec: 3.0,
      },
      {
        id: 'attack',
        name: t('lab.entities.river_crocodile.animations.attack.name'),
        description: t('lab.entities.river_crocodile.animations.attack.description'),
        loopDurationSec: 2.6,
      },
      {
        id: 'death',
        name: t('lab.entities.river_crocodile.animations.death.name'),
        description: t('lab.entities.river_crocodile.animations.death.description'),
        loopDurationSec: 2.2,
      },
    ],
    skins: [
      {
        id: 'croc_nile_classic',
        name: t('lab.entities.river_crocodile.skins.croc_nile_classic.name'),
        subtitle: t('lab.entities.river_crocodile.skins.croc_nile_classic.subtitle'),
        badgeColors: ['#4d5d3b', '#8c8253', '#27321c'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0x8c8253,
          accentHex: 0x27321c,
        },
      },
      {
        id: 'croc_swamp_shadow',
        name: t('lab.entities.river_crocodile.skins.croc_swamp_shadow.name'),
        subtitle: t('lab.entities.river_crocodile.skins.croc_swamp_shadow.subtitle'),
        badgeColors: ['#27382b', '#4b5563', '#0f172a'],
        palette: {
          primaryHex: 0x5c6f5e,
          secondaryHex: 0x4b5563,
          accentHex: 0x0f172a,
        },
      },
      {
        id: 'croc_oasis_golden',
        name: t('lab.entities.river_crocodile.skins.croc_oasis_golden.name'),
        subtitle: t('lab.entities.river_crocodile.skins.croc_oasis_golden.subtitle'),
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
    name: t('lab.entities.jungle_jaguar.name'),
    subtitle: t('lab.entities.jungle_jaguar.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.jungle_jaguar.category_label'),
    worldLocation: t('lab.entities.jungle_jaguar.world_location'),
    worldCoordinatesText: '(-238, 236), (-268, 336), (-148, 228), (-84, 246)',
    worldInstanceCount: 4,
    sourceFile: 'src/world/models/Jaguar.ts (src/world/models/animals/Jaguar_Complete.ts)',
    description:
      t('lab.entities.jungle_jaguar.description'),
    defaultCameraDistance: 3.1,
    defaultCameraTargetY: 0.55,
    anatomyTags: [t('lab.entities.jungle_jaguar.anatomy_tags.0'), t('lab.entities.jungle_jaguar.anatomy_tags.1'), t('lab.entities.jungle_jaguar.anatomy_tags.2'), t('lab.entities.jungle_jaguar.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.jungle_jaguar.animations.none.name'),
        description: t('lab.entities.jungle_jaguar.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        name: t('lab.entities.jungle_jaguar.animations.idle.name'),
        description: t('lab.entities.jungle_jaguar.animations.idle.description'),
        loopDurationSec: 3.2,
      },
      {
        id: 'walk',
        name: t('lab.entities.jungle_jaguar.animations.walk.name'),
        description: t('lab.entities.jungle_jaguar.animations.walk.description'),
        loopDurationSec: 1.3,
      },
      {
        id: 'stalk',
        name: t('lab.entities.jungle_jaguar.animations.stalk.name'),
        description: t('lab.entities.jungle_jaguar.animations.stalk.description'),
        loopDurationSec: 2.0,
      },
      {
        id: 'eat',
        name: t('lab.entities.jungle_jaguar.animations.eat.name'),
        description: t('lab.entities.jungle_jaguar.animations.eat.description'),
        loopDurationSec: 3.4,
      },
      {
        id: 'call',
        name: t('lab.entities.jungle_jaguar.animations.call.name'),
        description: t('lab.entities.jungle_jaguar.animations.call.description'),
        loopDurationSec: 2.8,
      },
      {
        id: 'lie',
        name: t('lab.entities.jungle_jaguar.animations.lie.name'),
        description: t('lab.entities.jungle_jaguar.animations.lie.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'sit',
        name: t('lab.entities.jungle_jaguar.animations.sit.name'),
        description: t('lab.entities.jungle_jaguar.animations.sit.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'trot',
        name: t('lab.entities.jungle_jaguar.animations.trot.name'),
        description: t('lab.entities.jungle_jaguar.animations.trot.description'),
        loopDurationSec: 0.78,
      },
      {
        id: 'run',
        name: t('lab.entities.jungle_jaguar.animations.run.name'),
        description: t('lab.entities.jungle_jaguar.animations.run.description'),
        loopDurationSec: 0.52,
      },
      {
        id: 'flee',
        name: t('lab.entities.jungle_jaguar.animations.flee.name'),
        description: t('lab.entities.jungle_jaguar.animations.flee.description'),
        loopDurationSec: 0.44,
      },
      {
        id: 'skip',
        name: t('lab.entities.jungle_jaguar.animations.skip.name'),
        description: t('lab.entities.jungle_jaguar.animations.skip.description'),
        loopDurationSec: 0.85,
      },
      {
        id: 'roar',
        name: t('lab.entities.jungle_jaguar.animations.roar.name'),
        description: t('lab.entities.jungle_jaguar.animations.roar.description'),
        loopDurationSec: 2.8,
      },
      {
        id: 'attack',
        name: t('lab.entities.jungle_jaguar.animations.attack.name'),
        description: t('lab.entities.jungle_jaguar.animations.attack.description'),
        loopDurationSec: 1.35,
      },
      {
        id: 'death',
        name: t('lab.entities.jungle_jaguar.animations.death.name'),
        description: t('lab.entities.jungle_jaguar.animations.death.description'),
        loopDurationSec: 1.8,
      },
    ],
    skins: [
      {
        id: 'jaguar_rosette_classic',
        name: t('lab.entities.jungle_jaguar.skins.jaguar_rosette_classic.name'),
        subtitle: t('lab.entities.jungle_jaguar.skins.jaguar_rosette_classic.subtitle'),
        badgeColors: ['#d97706', '#1c1917', '#fef3c7'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0x1c1917,
          accentHex: 0xfef3c7,
        },
      },
      {
        id: 'jaguar_black_panther',
        name: t('lab.entities.jungle_jaguar.skins.jaguar_black_panther.name'),
        subtitle: t('lab.entities.jungle_jaguar.skins.jaguar_black_panther.subtitle'),
        badgeColors: ['#27272a', '#09090b', '#eab308'],
        palette: {
          primaryHex: 0x3f3f46,
          secondaryHex: 0x09090b,
          accentHex: 0xeab308,
        },
      },
      {
        id: 'jaguar_sunlit_amber',
        name: t('lab.entities.jungle_jaguar.skins.jaguar_sunlit_amber.name'),
        subtitle: t('lab.entities.jungle_jaguar.skins.jaguar_sunlit_amber.subtitle'),
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
    name: t('lab.entities.forest_wolf.name'),
    subtitle: t('lab.entities.forest_wolf.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.forest_wolf.category_label'),
    worldLocation: t('lab.entities.forest_wolf.world_location'),
    worldCoordinatesText: '(-142, -88), (-158, -112), (-118, 86), (136, -118)',
    worldInstanceCount: 4,
    sourceFile: 'src/world/models/Wolf.ts (src/world/models/animals/Wolf_Complete.ts)',
    description:
      t('lab.entities.forest_wolf.description'),
    defaultCameraDistance: 2.9,
    defaultCameraTargetY: 0.58,
    anatomyTags: [t('lab.entities.forest_wolf.anatomy_tags.0'), t('lab.entities.forest_wolf.anatomy_tags.1'), t('lab.entities.forest_wolf.anatomy_tags.2'), t('lab.entities.forest_wolf.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.forest_wolf.animations.none.name'),
        description: t('lab.entities.forest_wolf.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        name: t('lab.entities.forest_wolf.animations.idle.name'),
        description: t('lab.entities.forest_wolf.animations.idle.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'walk',
        name: t('lab.entities.forest_wolf.animations.walk.name'),
        description: t('lab.entities.forest_wolf.animations.walk.description'),
        loopDurationSec: 1.4,
      },
      {
        id: 'trot',
        name: t('lab.entities.forest_wolf.animations.trot.name'),
        description: t('lab.entities.forest_wolf.animations.trot.description'),
        loopDurationSec: 0.9,
      },
      {
        id: 'stalk',
        name: t('lab.entities.forest_wolf.animations.stalk.name'),
        description: t('lab.entities.forest_wolf.animations.stalk.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'run',
        name: t('lab.entities.forest_wolf.animations.run.name'),
        description: t('lab.entities.forest_wolf.animations.run.description'),
        loopDurationSec: 0.65,
      },
      {
        id: 'flee',
        name: t('lab.entities.forest_wolf.animations.flee.name'),
        description: t('lab.entities.forest_wolf.animations.flee.description'),
        loopDurationSec: 0.58,
      },
      {
        id: 'skip',
        name: t('lab.entities.forest_wolf.animations.skip.name'),
        description: t('lab.entities.forest_wolf.animations.skip.description'),
        loopDurationSec: 0.95,
      },
      {
        id: 'eat',
        name: t('lab.entities.forest_wolf.animations.eat.name'),
        description: t('lab.entities.forest_wolf.animations.eat.description'),
        loopDurationSec: 3.2,
      },
      {
        id: 'sit',
        name: t('lab.entities.forest_wolf.animations.sit.name'),
        description: t('lab.entities.forest_wolf.animations.sit.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'lie',
        name: t('lab.entities.forest_wolf.animations.lie.name'),
        description: t('lab.entities.forest_wolf.animations.lie.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'howl',
        name: t('lab.entities.forest_wolf.animations.howl.name'),
        description: t('lab.entities.forest_wolf.animations.howl.description'),
        loopDurationSec: 3.4,
      },
      {
        id: 'roar',
        name: t('lab.entities.forest_wolf.animations.roar.name'),
        description: t('lab.entities.forest_wolf.animations.roar.description'),
        loopDurationSec: 2.8,
      },
      {
        id: 'attack',
        name: t('lab.entities.forest_wolf.animations.attack.name'),
        description: t('lab.entities.forest_wolf.animations.attack.description'),
        loopDurationSec: 1.25,
      },
      {
        id: 'death',
        name: t('lab.entities.forest_wolf.animations.death.name'),
        description: t('lab.entities.forest_wolf.animations.death.description'),
        loopDurationSec: 2.5,
      },
    ],
    skins: [
      {
        id: 'wolf_timber_classic',
        name: t('lab.entities.forest_wolf.skins.wolf_timber_classic.name'),
        subtitle: t('lab.entities.forest_wolf.skins.wolf_timber_classic.subtitle'),
        badgeColors: ['#78716c', '#44403c', '#d6d3d1'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0x44403c,
          accentHex: 0xd6d3d1,
        },
      },
      {
        id: 'wolf_arctic_white',
        name: t('lab.entities.forest_wolf.skins.wolf_arctic_white.name'),
        subtitle: t('lab.entities.forest_wolf.skins.wolf_arctic_white.subtitle'),
        badgeColors: ['#f8fafc', '#cbd5e1', '#64748b'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0xcbd5e1,
          accentHex: 0x64748b,
        },
      },
      {
        id: 'wolf_shadow_alpha',
        name: t('lab.entities.forest_wolf.skins.wolf_shadow_alpha.name'),
        subtitle: t('lab.entities.forest_wolf.skins.wolf_shadow_alpha.subtitle'),
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
    name: t('lab.entities.savanna_rhino.name'),
    subtitle: t('lab.entities.savanna_rhino.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.savanna_rhino.category_label'),
    worldLocation: t('lab.entities.savanna_rhino.world_location'),
    worldCoordinatesText: '(-195, 215), (-224, 262), (146, 168)',
    worldInstanceCount: 3,
    sourceFile: 'src/world/models/Rhino.ts (src/world/models/animals/Rhino_Complete.ts)',
    description:
      t('lab.entities.savanna_rhino.description'),
    defaultCameraDistance: 5.2,
    defaultCameraTargetY: 1.05,
    anatomyTags: [t('lab.entities.savanna_rhino.anatomy_tags.0'), t('lab.entities.savanna_rhino.anatomy_tags.1'), t('lab.entities.savanna_rhino.anatomy_tags.2'), t('lab.entities.savanna_rhino.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.savanna_rhino.animations.none.name'),
        description: t('lab.entities.savanna_rhino.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        name: t('lab.entities.savanna_rhino.animations.idle.name'),
        description: t('lab.entities.savanna_rhino.animations.idle.description'),
        loopDurationSec: 3.8,
      },
      {
        id: 'walk',
        name: t('lab.entities.savanna_rhino.animations.walk.name'),
        description: t('lab.entities.savanna_rhino.animations.walk.description'),
        loopDurationSec: 1.5,
      },
      {
        id: 'trot',
        name: t('lab.entities.savanna_rhino.animations.trot.name'),
        description: t('lab.entities.savanna_rhino.animations.trot.description'),
        loopDurationSec: 0.85,
      },
      {
        id: 'run',
        name: t('lab.entities.savanna_rhino.animations.run.name'),
        description: t('lab.entities.savanna_rhino.animations.run.description'),
        loopDurationSec: 0.65,
      },
      {
        id: 'flee',
        name: t('lab.entities.savanna_rhino.animations.flee.name'),
        description: t('lab.entities.savanna_rhino.animations.flee.description'),
        loopDurationSec: 0.58,
      },
      {
        id: 'skip',
        name: t('lab.entities.savanna_rhino.animations.skip.name'),
        description: t('lab.entities.savanna_rhino.animations.skip.description'),
        loopDurationSec: 1.1,
      },
      {
        id: 'eat',
        name: t('lab.entities.savanna_rhino.animations.eat.name'),
        description: t('lab.entities.savanna_rhino.animations.eat.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'call',
        name: t('lab.entities.savanna_rhino.animations.call.name'),
        description: t('lab.entities.savanna_rhino.animations.call.description'),
        loopDurationSec: 3.0,
      },
      {
        id: 'roar',
        name: t('lab.entities.savanna_rhino.animations.roar.name'),
        description: t('lab.entities.savanna_rhino.animations.roar.description'),
        loopDurationSec: 2.8,
      },
      {
        id: 'sit',
        name: t('lab.entities.savanna_rhino.animations.sit.name'),
        description: t('lab.entities.savanna_rhino.animations.sit.description'),
        loopDurationSec: 3.8,
      },
      {
        id: 'lie',
        name: t('lab.entities.savanna_rhino.animations.lie.name'),
        description: t('lab.entities.savanna_rhino.animations.lie.description'),
        loopDurationSec: 4.2,
      },
      {
        id: 'attack',
        name: t('lab.entities.savanna_rhino.animations.attack.name'),
        description: t('lab.entities.savanna_rhino.animations.attack.description'),
        loopDurationSec: 1.4,
      },
      {
        id: 'death',
        name: t('lab.entities.savanna_rhino.animations.death.name'),
        description: t('lab.entities.savanna_rhino.animations.death.description'),
        loopDurationSec: 2.4,
      },
    ],
    skins: [
      {
        id: 'rhino_savanna_classic',
        name: t('lab.entities.savanna_rhino.skins.rhino_savanna_classic.name'),
        subtitle: t('lab.entities.savanna_rhino.skins.rhino_savanna_classic.subtitle'),
        badgeColors: ['#78716c', '#57534e', '#d6d3d1'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0x57534e,
          accentHex: 0xd6d3d1,
        },
      },
      {
        id: 'rhino_desert_sand',
        name: t('lab.entities.savanna_rhino.skins.rhino_desert_sand.name'),
        subtitle: t('lab.entities.savanna_rhino.skins.rhino_desert_sand.subtitle'),
        badgeColors: ['#a8a29e', '#78350f', '#fde68a'],
        palette: {
          primaryHex: 0xd6c7b2,
          secondaryHex: 0x78350f,
          accentHex: 0xfde68a,
        },
      },
      {
        id: 'rhino_obsidian_iron',
        name: t('lab.entities.savanna_rhino.skins.rhino_obsidian_iron.name'),
        subtitle: t('lab.entities.savanna_rhino.skins.rhino_obsidian_iron.subtitle'),
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
    id: 'savanna_lion',
    name: t('lab.entities.savanna_lion.name'),
    subtitle: t('lab.entities.savanna_lion.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.savanna_lion.category_label'),
    worldLocation: t('lab.entities.savanna_lion.world_location'),
    worldCoordinatesText: '(-205, 185), (-238, 224), (118, 178)',
    worldInstanceCount: 3,
    sourceFile: 'src/world/models/CatLion.ts (src/world/models/animals/CatLion_Complete.ts)',
    description: t('lab.entities.savanna_lion.description'),
    defaultCameraDistance: 3.6,
    defaultCameraTargetY: 0.72,
    anatomyTags: [
      t('lab.entities.savanna_lion.anatomy_tags.0'),
      t('lab.entities.savanna_lion.anatomy_tags.1'),
      t('lab.entities.savanna_lion.anatomy_tags.2'),
      t('lab.entities.savanna_lion.anatomy_tags.3'),
    ],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.savanna_lion.animations.none.name'),
        description: t('lab.entities.savanna_lion.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        name: t('lab.entities.savanna_lion.animations.idle.name'),
        description: t('lab.entities.savanna_lion.animations.idle.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'walk',
        name: t('lab.entities.savanna_lion.animations.walk.name'),
        description: t('lab.entities.savanna_lion.animations.walk.description'),
        loopDurationSec: 1.35,
      },
      {
        id: 'trot',
        name: t('lab.entities.savanna_lion.animations.trot.name'),
        description: t('lab.entities.savanna_lion.animations.trot.description'),
        loopDurationSec: 0.82,
      },
      {
        id: 'run',
        name: t('lab.entities.savanna_lion.animations.run.name'),
        description: t('lab.entities.savanna_lion.animations.run.description'),
        loopDurationSec: 0.62,
      },
      {
        id: 'eat',
        name: t('lab.entities.savanna_lion.animations.eat.name'),
        description: t('lab.entities.savanna_lion.animations.eat.description'),
        loopDurationSec: 3.4,
      },
      {
        id: 'call',
        name: t('lab.entities.savanna_lion.animations.call.name'),
        description: t('lab.entities.savanna_lion.animations.call.description'),
        loopDurationSec: 2.8,
      },
      {
        id: 'roar',
        name: t('lab.entities.savanna_lion.animations.roar.name'),
        description: t('lab.entities.savanna_lion.animations.roar.description'),
        loopDurationSec: 2.8,
      },
      {
        id: 'bite_attack',
        name: t('lab.entities.savanna_lion.animations.bite_attack.name'),
        description: t('lab.entities.savanna_lion.animations.bite_attack.description'),
        loopDurationSec: 1.3,
      },
      {
        id: 'sit',
        name: t('lab.entities.savanna_lion.animations.sit.name'),
        description: t('lab.entities.savanna_lion.animations.sit.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'lie',
        name: t('lab.entities.savanna_lion.animations.lie.name'),
        description: t('lab.entities.savanna_lion.animations.lie.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'death',
        name: t('lab.entities.savanna_lion.animations.death.name'),
        description: t('lab.entities.savanna_lion.animations.death.description'),
        loopDurationSec: 2.4,
      },
    ],
    skins: [
      {
        id: 'lion_savanna_gold',
        name: t('lab.entities.savanna_lion.skins.lion_savanna_gold.name'),
        subtitle: t('lab.entities.savanna_lion.skins.lion_savanna_gold.subtitle'),
        badgeColors: ['#d97706', '#92400e', '#fef3c7'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0x92400e,
          accentHex: 0xfef3c7,
        },
      },
      {
        id: 'lion_kalahari_amber',
        name: t('lab.entities.savanna_lion.skins.lion_kalahari_amber.name'),
        subtitle: t('lab.entities.savanna_lion.skins.lion_kalahari_amber.subtitle'),
        badgeColors: ['#b45309', '#451a03', '#fde68a'],
        palette: {
          primaryHex: 0xd99b52,
          secondaryHex: 0x451a03,
          accentHex: 0xfde68a,
        },
      },
      {
        id: 'lion_white_royal',
        name: t('lab.entities.savanna_lion.skins.lion_white_royal.name'),
        subtitle: t('lab.entities.savanna_lion.skins.lion_white_royal.subtitle'),
        badgeColors: ['#f8fafc', '#cbd5e1', '#fef08a'],
        palette: {
          primaryHex: 0xf5f5f4,
          secondaryHex: 0xd6d3d1,
          accentHex: 0xfef08a,
        },
      },
    ],
  },

  {
    id: 'royal_stag',
    name: t('lab.entities.royal_stag.name'),
    subtitle: t('lab.entities.royal_stag.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.royal_stag.category_label'),
    worldLocation: t('lab.entities.royal_stag.world_location'),
    worldCoordinatesText: '(168, -62), (185, -88), (-118, -142), (48, 138)',
    worldInstanceCount: 4,
    sourceFile: 'src/world/models/Stag.ts (src/world/models/animals/Stag_Complete.ts)',
    description: t('lab.entities.royal_stag.description'),
    defaultCameraDistance: 3.9,
    defaultCameraTargetY: 0.95,
    anatomyTags: [
      t('lab.entities.royal_stag.anatomy_tags.0'),
      t('lab.entities.royal_stag.anatomy_tags.1'),
      t('lab.entities.royal_stag.anatomy_tags.2'),
      t('lab.entities.royal_stag.anatomy_tags.3'),
    ],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.royal_stag.animations.none.name'),
        description: t('lab.entities.royal_stag.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        name: t('lab.entities.royal_stag.animations.idle.name'),
        description: t('lab.entities.royal_stag.animations.idle.description'),
        loopDurationSec: 3.8,
      },
      {
        id: 'walk',
        name: t('lab.entities.royal_stag.animations.walk.name'),
        description: t('lab.entities.royal_stag.animations.walk.description'),
        loopDurationSec: 1.4,
      },
      {
        id: 'trot',
        name: t('lab.entities.royal_stag.animations.trot.name'),
        description: t('lab.entities.royal_stag.animations.trot.description'),
        loopDurationSec: 0.85,
      },
      {
        id: 'stalk',
        name: t('lab.entities.royal_stag.animations.stalk.name'),
        description: t('lab.entities.royal_stag.animations.stalk.description'),
        loopDurationSec: 1.6,
      },
      {
        id: 'run',
        name: t('lab.entities.royal_stag.animations.run.name'),
        description: t('lab.entities.royal_stag.animations.run.description'),
        loopDurationSec: 0.65,
      },
      {
        id: 'flee',
        name: t('lab.entities.royal_stag.animations.flee.name'),
        description: t('lab.entities.royal_stag.animations.flee.description'),
        loopDurationSec: 0.55,
      },
      {
        id: 'skip',
        name: t('lab.entities.royal_stag.animations.skip.name'),
        description: t('lab.entities.royal_stag.animations.skip.description'),
        loopDurationSec: 1.0,
      },
      {
        id: 'eat',
        name: t('lab.entities.royal_stag.animations.eat.name'),
        description: t('lab.entities.royal_stag.animations.eat.description'),
        loopDurationSec: 3.5,
      },
      {
        id: 'call',
        name: t('lab.entities.royal_stag.animations.call.name'),
        description: t('lab.entities.royal_stag.animations.call.description'),
        loopDurationSec: 3.0,
      },
      {
        id: 'roar',
        name: t('lab.entities.royal_stag.animations.roar.name'),
        description: t('lab.entities.royal_stag.animations.roar.description'),
        loopDurationSec: 2.8,
      },
      {
        id: 'sit',
        name: t('lab.entities.royal_stag.animations.sit.name'),
        description: t('lab.entities.royal_stag.animations.sit.description'),
        loopDurationSec: 3.8,
      },
      {
        id: 'lie',
        name: t('lab.entities.royal_stag.animations.lie.name'),
        description: t('lab.entities.royal_stag.animations.lie.description'),
        loopDurationSec: 4.2,
      },
      {
        id: 'attack',
        name: t('lab.entities.royal_stag.animations.attack.name'),
        description: t('lab.entities.royal_stag.animations.attack.description'),
        loopDurationSec: 1.35,
      },
      {
        id: 'death',
        name: t('lab.entities.royal_stag.animations.death.name'),
        description: t('lab.entities.royal_stag.animations.death.description'),
        loopDurationSec: 2.5,
      },
    ],
    skins: [
      {
        id: 'stag_royal_chestnut',
        name: t('lab.entities.royal_stag.skins.stag_royal_chestnut.name'),
        subtitle: t('lab.entities.royal_stag.skins.stag_royal_chestnut.subtitle'),
        badgeColors: ['#8c4a27', '#d6c7b2', '#451a03'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0xd6c7b2,
          accentHex: 0x451a03,
        },
      },
      {
        id: 'stag_silver_birch',
        name: t('lab.entities.royal_stag.skins.stag_silver_birch.name'),
        subtitle: t('lab.entities.royal_stag.skins.stag_silver_birch.subtitle'),
        badgeColors: ['#cbd5e1', '#94a3b8', '#f8fafc'],
        palette: {
          primaryHex: 0xe2e8f0,
          secondaryHex: 0x94a3b8,
          accentHex: 0xf8fafc,
        },
      },
      {
        id: 'stag_autumn_umber',
        name: t('lab.entities.royal_stag.skins.stag_autumn_umber.name'),
        subtitle: t('lab.entities.royal_stag.skins.stag_autumn_umber.subtitle'),
        badgeColors: ['#5c3a21', '#29180c', '#fbbf24'],
        palette: {
          primaryHex: 0x9a6b48,
          secondaryHex: 0x29180c,
          accentHex: 0xfbbf24,
        },
      },
    ],
  },

  {
    id: 'grazing_sheep',
    name: t('lab.entities.grazing_sheep.name'),
    subtitle: t('lab.entities.grazing_sheep.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.grazing_sheep.category_label'),
    worldLocation: t('lab.entities.grazing_sheep.world_location'),
    worldCoordinatesText: `(${VALLEY_FARMS[0].x}, ${VALLEY_FARMS[0].z})`,
    worldInstanceCount: 5,
    sourceFile: 'src/world/models/farmhouseModels.ts',
    description:
      t('lab.entities.grazing_sheep.description'),
    defaultCameraDistance: 2.5,
    defaultCameraTargetY: 0.55,
    anatomyTags: [t('lab.entities.grazing_sheep.anatomy_tags.0'), t('lab.entities.grazing_sheep.anatomy_tags.1'), t('lab.entities.grazing_sheep.anatomy_tags.2'), t('lab.entities.grazing_sheep.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.grazing_sheep.animations.none.name'),
        description: t('lab.entities.grazing_sheep.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'sheep_graze_walk',
        name: t('lab.entities.grazing_sheep.animations.sheep_graze_walk.name'),
        description: t('lab.entities.grazing_sheep.animations.sheep_graze_walk.description'),
        loopDurationSec: 1.6,
      },
      {
        id: 'sheep_nibble',
        name: t('lab.entities.grazing_sheep.animations.sheep_nibble.name'),
        description: t('lab.entities.grazing_sheep.animations.sheep_nibble.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'sheep_joy_hop',
        name: t('lab.entities.grazing_sheep.animations.sheep_joy_hop.name'),
        description: t('lab.entities.grazing_sheep.animations.sheep_joy_hop.description'),
        loopDurationSec: 1.1,
      },
    ],
    skins: [
      {
        id: 'sheep_white_classic',
        name: t('lab.entities.grazing_sheep.skins.sheep_white_classic.name'),
        subtitle: t('lab.entities.grazing_sheep.skins.sheep_white_classic.subtitle'),
        badgeColors: ['#f4f1ea', '#3a322c', '#d6d3d1'],
        palette: {
          primaryHex: 0xf4f1ea,
          secondaryHex: 0x3a322c,
          accentHex: 0xd6d3d1,
        },
      },
      {
        id: 'sheep_black_highland',
        name: t('lab.entities.grazing_sheep.skins.sheep_black_highland.name'),
        subtitle: t('lab.entities.grazing_sheep.skins.sheep_black_highland.subtitle'),
        badgeColors: ['#292524', '#1c1917', '#57534e'],
        palette: {
          primaryHex: 0x292524,
          secondaryHex: 0x0c0a09,
          accentHex: 0x57534e,
        },
      },
      {
        id: 'sheep_golden_fleece',
        name: t('lab.entities.grazing_sheep.skins.sheep_golden_fleece.name'),
        subtitle: t('lab.entities.grazing_sheep.skins.sheep_golden_fleece.subtitle'),
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
    name: t('lab.entities.forest_rabbit.name'),
    subtitle: t('lab.entities.forest_rabbit.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.forest_rabbit.category_label'),
    worldLocation: t('lab.entities.forest_rabbit.world_location'),
    worldCoordinatesText: t('lab.entities.forest_rabbit.world_coordinates'),
    worldInstanceCount: 8,
    sourceFile: 'src/world/builders/wildlifeAndFootprintsBuilder.ts',
    description:
      t('lab.entities.forest_rabbit.description'),
    defaultCameraDistance: 1.9,
    defaultCameraTargetY: 0.32,
    anatomyTags: [t('lab.entities.forest_rabbit.anatomy_tags.0'), t('lab.entities.forest_rabbit.anatomy_tags.1'), t('lab.entities.forest_rabbit.anatomy_tags.2'), t('lab.entities.forest_rabbit.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.forest_rabbit.animations.none.name'),
        description: t('lab.entities.forest_rabbit.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'rabbit_sniff',
        name: t('lab.entities.forest_rabbit.animations.rabbit_sniff.name'),
        description: t('lab.entities.forest_rabbit.animations.rabbit_sniff.description'),
        loopDurationSec: 2.0,
      },
      {
        id: 'rabbit_alert',
        name: t('lab.entities.forest_rabbit.animations.rabbit_alert.name'),
        description: t('lab.entities.forest_rabbit.animations.rabbit_alert.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'rabbit_hop',
        name: t('lab.entities.forest_rabbit.animations.rabbit_hop.name'),
        description: t('lab.entities.forest_rabbit.animations.rabbit_hop.description'),
        loopDurationSec: 0.75,
      },
    ],
    skins: [
      {
        id: 'rabbit_wild_brown',
        name: t('lab.entities.forest_rabbit.skins.rabbit_wild_brown.name'),
        subtitle: t('lab.entities.forest_rabbit.skins.rabbit_wild_brown.subtitle'),
        badgeColors: ['#8d7966', '#f7f4ef', '#4a3c31'],
        palette: {
          primaryHex: 0x8d7966,
          secondaryHex: 0xf7f4ef,
          accentHex: 0x4a3c31,
        },
      },
      {
        id: 'rabbit_snow_white',
        name: t('lab.entities.forest_rabbit.skins.rabbit_snow_white.name'),
        subtitle: t('lab.entities.forest_rabbit.skins.rabbit_snow_white.subtitle'),
        badgeColors: ['#f8fafc', '#fda4af', '#e2e8f0'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0xffffff,
          accentHex: 0xfda4af,
        },
      },
      {
        id: 'rabbit_russet_fox',
        name: t('lab.entities.forest_rabbit.skins.rabbit_russet_fox.name'),
        subtitle: t('lab.entities.forest_rabbit.skins.rabbit_russet_fox.subtitle'),
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
    name: t('lab.entities.woodland_squirrel.name'),
    subtitle: t('lab.entities.woodland_squirrel.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.woodland_squirrel.category_label'),
    worldLocation: t('lab.entities.woodland_squirrel.world_location'),
    worldCoordinatesText: t('lab.entities.woodland_squirrel.world_coordinates'),
    worldInstanceCount: 14,
    sourceFile: 'src/world/models/environmentAtmosphereModels.ts',
    description:
      t('lab.entities.woodland_squirrel.description'),
    defaultCameraDistance: 1.85,
    defaultCameraTargetY: 0.32,
    anatomyTags: [t('lab.entities.woodland_squirrel.anatomy_tags.0'), t('lab.entities.woodland_squirrel.anatomy_tags.1'), t('lab.entities.woodland_squirrel.anatomy_tags.2')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.woodland_squirrel.animations.none.name'),
        description: t('lab.entities.woodland_squirrel.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'squirrel_tail_flick',
        name: t('lab.entities.woodland_squirrel.animations.squirrel_tail_flick.name'),
        description: t('lab.entities.woodland_squirrel.animations.squirrel_tail_flick.description'),
        loopDurationSec: 1.4,
      },
      {
        id: 'squirrel_forage_hop',
        name: t('lab.entities.woodland_squirrel.animations.squirrel_forage_hop.name'),
        description: t('lab.entities.woodland_squirrel.animations.squirrel_forage_hop.description'),
        loopDurationSec: 0.9,
      },
      {
        id: 'squirrel_spiral_climb',
        name: t('lab.entities.woodland_squirrel.animations.squirrel_spiral_climb.name'),
        description: t('lab.entities.woodland_squirrel.animations.squirrel_spiral_climb.description'),
        loopDurationSec: 1.8,
      },
    ],
    skins: [
      {
        id: 'squirrel_red_classic',
        name: t('lab.entities.woodland_squirrel.skins.squirrel_red_classic.name'),
        subtitle: t('lab.entities.woodland_squirrel.skins.squirrel_red_classic.subtitle'),
        badgeColors: ['#8c4a27', '#7c2d12', '#d97706'],
        palette: {
          primaryHex: 0x8c4a27,
          secondaryHex: 0x7c2d12,
          accentHex: 0xd97706,
        },
      },
      {
        id: 'squirrel_silver_gray',
        name: t('lab.entities.woodland_squirrel.skins.squirrel_silver_gray.name'),
        subtitle: t('lab.entities.woodland_squirrel.skins.squirrel_silver_gray.subtitle'),
        badgeColors: ['#64748b', '#cbd5e1', '#334155'],
        palette: {
          primaryHex: 0x64748b,
          secondaryHex: 0x94a3b8,
          accentHex: 0x334155,
        },
      },
      {
        id: 'squirrel_dark_pine',
        name: t('lab.entities.woodland_squirrel.skins.squirrel_dark_pine.name'),
        subtitle: t('lab.entities.woodland_squirrel.skins.squirrel_dark_pine.subtitle'),
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
    name: t('lab.entities.mountain_eagle.name'),
    subtitle: t('lab.entities.mountain_eagle.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.mountain_eagle.category_label'),
    worldLocation: t('lab.entities.mountain_eagle.world_location'),
    worldCoordinatesText: t('lab.entities.mountain_eagle.world_coordinates'),
    worldInstanceCount: 1,
    sourceFile: 'src/world/builders/wildlifeAndFootprintsBuilder.ts',
    description:
      t('lab.entities.mountain_eagle.description'),
    defaultCameraDistance: 3.6,
    defaultCameraTargetY: 0.85,
    anatomyTags: [t('lab.entities.mountain_eagle.anatomy_tags.0'), t('lab.entities.mountain_eagle.anatomy_tags.1'), t('lab.entities.mountain_eagle.anatomy_tags.2'), t('lab.entities.mountain_eagle.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.mountain_eagle.animations.none.name'),
        description: t('lab.entities.mountain_eagle.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'eagle_soar',
        name: t('lab.entities.mountain_eagle.animations.eagle_soar.name'),
        description: t('lab.entities.mountain_eagle.animations.eagle_soar.description'),
        loopDurationSec: 2.2,
      },
      {
        id: 'eagle_dive',
        name: t('lab.entities.mountain_eagle.animations.eagle_dive.name'),
        description: t('lab.entities.mountain_eagle.animations.eagle_dive.description'),
        loopDurationSec: 1.6,
      },
      {
        id: 'eagle_power_flap',
        name: t('lab.entities.mountain_eagle.animations.eagle_power_flap.name'),
        description: t('lab.entities.mountain_eagle.animations.eagle_power_flap.description'),
        loopDurationSec: 1.1,
      },
    ],
    skins: [
      {
        id: 'eagle_golden_classic',
        name: t('lab.entities.mountain_eagle.skins.eagle_golden_classic.name'),
        subtitle: t('lab.entities.mountain_eagle.skins.eagle_golden_classic.subtitle'),
        badgeColors: ['#3b2616', '#c8963e', '#eab308'],
        palette: {
          primaryHex: 0x3b2616,
          secondaryHex: 0xc8963e,
          accentHex: 0xeab308,
        },
      },
      {
        id: 'eagle_bald_white',
        name: t('lab.entities.mountain_eagle.skins.eagle_bald_white.name'),
        subtitle: t('lab.entities.mountain_eagle.skins.eagle_bald_white.subtitle'),
        badgeColors: ['#27272a', '#f8fafc', '#f59e0b'],
        palette: {
          primaryHex: 0x27272a,
          secondaryHex: 0xf8fafc,
          accentHex: 0xf59e0b,
        },
      },
      {
        id: 'eagle_desert_hawk',
        name: t('lab.entities.mountain_eagle.skins.eagle_desert_hawk.name'),
        subtitle: t('lab.entities.mountain_eagle.skins.eagle_desert_hawk.subtitle'),
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
    name: t('lab.entities.flock_bird.name'),
    subtitle: t('lab.entities.flock_bird.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.flock_bird.category_label'),
    worldLocation: t('lab.entities.flock_bird.world_location'),
    worldCoordinatesText: t('lab.entities.flock_bird.world_coordinates'),
    worldInstanceCount: 52,
    sourceFile: 'src/world/models/Dove.ts (src/world/models/animals/Dove_Complete.ts)',
    description:
      t('lab.entities.flock_bird.description'),
    defaultCameraDistance: 2.2,
    defaultCameraTargetY: 0.45,
    anatomyTags: [t('lab.entities.flock_bird.anatomy_tags.0'), t('lab.entities.flock_bird.anatomy_tags.1'), t('lab.entities.flock_bird.anatomy_tags.2'), t('lab.entities.flock_bird.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.flock_bird.animations.none.name'),
        description: t('lab.entities.flock_bird.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'fly',
        name: t('lab.entities.flock_bird.animations.bird_cruise.name'),
        description: t('lab.entities.flock_bird.animations.bird_cruise.description'),
        loopDurationSec: 0.77,
      },
      {
        id: 'flee',
        name: t('lab.entities.flock_bird.animations.bird_startled.name'),
        description: t('lab.entities.flock_bird.animations.bird_startled.description'),
        loopDurationSec: 0.47,
      },
      {
        id: 'idle',
        name: 'Perched Idle (Idle)',
        description: 'Calm perched breathing and subtle head movement.',
        loopDurationSec: 4.17,
      },
      {
        id: 'walk',
        name: 'Ground Strut (Walk)',
        description: 'Gentle ground walking with head bobbing.',
        loopDurationSec: 1.53,
      },
      {
        id: 'trot',
        name: 'BriskHop (Trot)',
        description: 'Quick ground trot.',
        loopDurationSec: 0.77,
      },
      {
        id: 'run',
        name: 'Takeoff Run (Run)',
        description: 'Rapid running stride with wing assist.',
        loopDurationSec: 0.6,
      },
      {
        id: 'skip',
        name: 'Flutter Hop (Skip)',
        description: 'Light aerial hop.',
        loopDurationSec: 0.9,
      },
      {
        id: 'eat',
        name: 'Forage Peck (Eat)',
        description: 'Pecks seeds on the ground.',
        loopDurationSec: 4.5,
      },
      {
        id: 'call',
        name: 'Coo Vocalization (Call)',
        description: 'Chest puffs out in a soft dove coo.',
        loopDurationSec: 2.33,
      },
      {
        id: 'roar',
        name: 'Wing Display (Roar)',
        description: 'Spreads wings in an alert display.',
        loopDurationSec: 2.6,
      },
      {
        id: 'attack',
        name: 'Wing Strike (Attack)',
        description: 'Defensive peck and wing buffet.',
        loopDurationSec: 1.33,
      },
      {
        id: 'sit',
        name: 'Roost Tuck (Sit)',
        description: 'Tucks legs into a perched roost.',
        loopDurationSec: 3.33,
      },
      {
        id: 'lie',
        name: 'Nest Rest (Lie)',
        description: 'Settles low as if nesting.',
        loopDurationSec: 4.0,
      },
      {
        id: 'death',
        name: 'Collapse (Death)',
        description: 'Full skeletal collapse.',
        loopDurationSec: 2.0,
      },
    ],
    skins: [
      {
        id: 'bird_forest_swallow',
        name: t('lab.entities.flock_bird.skins.bird_forest_swallow.name'),
        subtitle: t('lab.entities.flock_bird.skins.bird_forest_swallow.subtitle'),
        badgeColors: ['#3a4450', '#c8beae', '#d49b35'],
        palette: {
          primaryHex: 0x3a4450,
          secondaryHex: 0xc8beae,
          accentHex: 0xd49b35,
        },
      },
      {
        id: 'bird_robin_redbreast',
        name: t('lab.entities.flock_bird.skins.bird_robin_redbreast.name'),
        subtitle: t('lab.entities.flock_bird.skins.bird_robin_redbreast.subtitle'),
        badgeColors: ['#57534e', '#ea580c', '#fbbf24'],
        palette: {
          primaryHex: 0x57534e,
          secondaryHex: 0xea580c,
          accentHex: 0xfbbf24,
        },
      },
      {
        id: 'bird_azure_kingfisher',
        name: t('lab.entities.flock_bird.skins.bird_azure_kingfisher.name'),
        subtitle: t('lab.entities.flock_bird.skins.bird_azure_kingfisher.subtitle'),
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
    name: t('lab.entities.harbor_seagull.name'),
    subtitle: t('lab.entities.harbor_seagull.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.harbor_seagull.category_label'),
    worldLocation: t('lab.entities.harbor_seagull.world_location'),
    worldCoordinatesText: `(${SOUTHEAST_HARBOR_POS.x}, ${SOUTHEAST_HARBOR_POS.z})`,
    worldInstanceCount: 10,
    sourceFile: 'src/world/models/harborModels.ts',
    description:
      t('lab.entities.harbor_seagull.description'),
    defaultCameraDistance: 2.75,
    defaultCameraTargetY: 0.68,
    anatomyTags: [t('lab.entities.harbor_seagull.anatomy_tags.0'), t('lab.entities.harbor_seagull.anatomy_tags.1'), t('lab.entities.harbor_seagull.anatomy_tags.2'), t('lab.entities.harbor_seagull.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.harbor_seagull.animations.none.name'),
        description: t('lab.entities.harbor_seagull.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'seagull_harbor_soar',
        name: t('lab.entities.harbor_seagull.animations.seagull_harbor_soar.name'),
        description: t('lab.entities.harbor_seagull.animations.seagull_harbor_soar.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'seagull_wave_skim',
        name: t('lab.entities.harbor_seagull.animations.seagull_wave_skim.name'),
        description: t('lab.entities.harbor_seagull.animations.seagull_wave_skim.description'),
        loopDurationSec: 2.2,
      },
      {
        id: 'seagull_fish_dive',
        name: t('lab.entities.harbor_seagull.animations.seagull_fish_dive.name'),
        description: t('lab.entities.harbor_seagull.animations.seagull_fish_dive.description'),
        loopDurationSec: 1.4,
      },
    ],
    skins: [
      {
        id: 'seagull_coastal_classic',
        name: t('lab.entities.harbor_seagull.skins.seagull_coastal_classic.name'),
        subtitle: t('lab.entities.harbor_seagull.skins.seagull_coastal_classic.subtitle'),
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
        name: t('lab.entities.harbor_seagull.skins.seagull_black_backed.name'),
        subtitle: t('lab.entities.harbor_seagull.skins.seagull_black_backed.subtitle'),
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
        name: t('lab.entities.harbor_seagull.skins.seagull_golden_sunset.name'),
        subtitle: t('lab.entities.harbor_seagull.skins.seagull_golden_sunset.subtitle'),
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
    name: t('lab.entities.koi_fish.name'),
    subtitle: t('lab.entities.koi_fish.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.koi_fish.category_label'),
    worldLocation: t('lab.entities.koi_fish.world_location'),
    worldCoordinatesText: `(${LAKESIDE_TEA_PAVILION_POS.x}, ${LAKESIDE_TEA_PAVILION_POS.z})`,
    worldInstanceCount: 12,
    sourceFile: 'src/world/models/settlementModels.ts',
    description:
      t('lab.entities.koi_fish.description'),
    defaultCameraDistance: 2.65,
    defaultCameraTargetY: 0.42,
    anatomyTags: [t('lab.entities.koi_fish.anatomy_tags.0'), t('lab.entities.koi_fish.anatomy_tags.1'), t('lab.entities.koi_fish.anatomy_tags.2'), t('lab.entities.koi_fish.anatomy_tags.3'), t('lab.entities.koi_fish.anatomy_tags.4')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.koi_fish.animations.none.name'),
        description: t('lab.entities.koi_fish.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'koi_pond_swim',
        name: t('lab.entities.koi_fish.animations.koi_pond_swim.name'),
        description: t('lab.entities.koi_fish.animations.koi_pond_swim.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'koi_fast_dart',
        name: t('lab.entities.koi_fish.animations.koi_fast_dart.name'),
        description: t('lab.entities.koi_fish.animations.koi_fast_dart.description'),
        loopDurationSec: 0.9,
      },
      {
        id: 'koi_surface_feed',
        name: t('lab.entities.koi_fish.animations.koi_surface_feed.name'),
        description: t('lab.entities.koi_fish.animations.koi_surface_feed.description'),
        loopDurationSec: 2.2,
      },
    ],
    skins: [
      {
        id: 'koi_imperial_gold',
        name: t('lab.entities.koi_fish.skins.koi_imperial_gold.name'),
        subtitle: t('lab.entities.koi_fish.skins.koi_imperial_gold.subtitle'),
        badgeColors: ['#ff6b2b', '#fbbf24', '#fffbeb'],
        palette: {
          primaryHex: 0xff6b2b,
          secondaryHex: 0xfbbf24,
          accentHex: 0xfffbeb,
        },
      },
      {
        id: 'koi_kohaku_crimson',
        name: t('lab.entities.koi_fish.skins.koi_kohaku_crimson.name'),
        subtitle: t('lab.entities.koi_fish.skins.koi_kohaku_crimson.subtitle'),
        badgeColors: ['#f8fafc', '#dc2626', '#fca5a5'],
        palette: {
          primaryHex: 0xf8fafc,
          secondaryHex: 0xdc2626,
          accentHex: 0xdc2626,
        },
      },
      {
        id: 'koi_sapphire_asagi',
        name: t('lab.entities.koi_fish.skins.koi_sapphire_asagi.name'),
        subtitle: t('lab.entities.koi_fish.skins.koi_sapphire_asagi.subtitle'),
        badgeColors: ['#0284c7', '#e0f2fe', '#38bdf8'],
        palette: {
          primaryHex: 0x0284c7,
          secondaryHex: 0xe0f2fe,
          accentHex: 0x38bdf8,
        },
      },
      {
        id: 'koi_ogon_platinum',
        name: t('lab.entities.koi_fish.skins.koi_ogon_platinum.name'),
        subtitle: t('lab.entities.koi_fish.skins.koi_ogon_platinum.subtitle'),
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
    name: t('lab.entities.meadow_butterfly.name'),
    subtitle: t('lab.entities.meadow_butterfly.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.meadow_butterfly.category_label'),
    worldLocation: t('lab.entities.meadow_butterfly.world_location'),
    worldCoordinatesText: t('lab.entities.meadow_butterfly.world_coordinates'),
    worldInstanceCount: 18,
    sourceFile: 'src/world/models/environmentAtmosphereModels.ts',
    description:
      t('lab.entities.meadow_butterfly.description'),
    defaultCameraDistance: 2.45,
    defaultCameraTargetY: 0.52,
    anatomyTags: [t('lab.entities.meadow_butterfly.anatomy_tags.0'), t('lab.entities.meadow_butterfly.anatomy_tags.1'), t('lab.entities.meadow_butterfly.anatomy_tags.2'), t('lab.entities.meadow_butterfly.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.meadow_butterfly.animations.none.name'),
        description: t('lab.entities.meadow_butterfly.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'butterfly_meadow_flutter',
        name: t('lab.entities.meadow_butterfly.animations.butterfly_meadow_flutter.name'),
        description: t('lab.entities.meadow_butterfly.animations.butterfly_meadow_flutter.description'),
        loopDurationSec: 1.2,
      },
      {
        id: 'butterfly_flower_bask',
        name: t('lab.entities.meadow_butterfly.animations.butterfly_flower_bask.name'),
        description: t('lab.entities.meadow_butterfly.animations.butterfly_flower_bask.description'),
        loopDurationSec: 2.6,
      },
      {
        id: 'butterfly_spiral_dance',
        name: t('lab.entities.meadow_butterfly.animations.butterfly_spiral_dance.name'),
        description: t('lab.entities.meadow_butterfly.animations.butterfly_spiral_dance.description'),
        loopDurationSec: 1.8,
      },
    ],
    skins: [
      {
        id: 'butterfly_morpho_cyan',
        name: t('lab.entities.meadow_butterfly.skins.butterfly_morpho_cyan.name'),
        subtitle: t('lab.entities.meadow_butterfly.skins.butterfly_morpho_cyan.subtitle'),
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
        name: t('lab.entities.meadow_butterfly.skins.butterfly_monarch_amber.name'),
        subtitle: t('lab.entities.meadow_butterfly.skins.butterfly_monarch_amber.subtitle'),
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
        name: t('lab.entities.meadow_butterfly.skins.butterfly_sakura_pink.name'),
        subtitle: t('lab.entities.meadow_butterfly.skins.butterfly_sakura_pink.subtitle'),
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
        name: t('lab.entities.meadow_butterfly.skins.butterfly_swallowtail_gold.name'),
        subtitle: t('lab.entities.meadow_butterfly.skins.butterfly_swallowtail_gold.subtitle'),
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
    name: t('lab.entities.imperial_sky_dragon.name'),
    subtitle: t('lab.entities.imperial_sky_dragon.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.imperial_sky_dragon.category_label'),
    worldLocation: t('lab.entities.imperial_sky_dragon.world_location'),
    worldCoordinatesText: t('lab.entities.imperial_sky_dragon.world_coordinates'),
    worldInstanceCount: 1,
    sourceFile: 'src/world/models/sanctuaryAndDragonModels.ts',
    description:
      t('lab.entities.imperial_sky_dragon.description'),
    defaultCameraDistance: 6.2,
    defaultCameraTargetY: 1.2,
    anatomyTags: [t('lab.entities.imperial_sky_dragon.anatomy_tags.0'), t('lab.entities.imperial_sky_dragon.anatomy_tags.1'), t('lab.entities.imperial_sky_dragon.anatomy_tags.2'), t('lab.entities.imperial_sky_dragon.anatomy_tags.3'), t('lab.entities.imperial_sky_dragon.anatomy_tags.4')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.imperial_sky_dragon.animations.none.name'),
        description: t('lab.entities.imperial_sky_dragon.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'dragon_sky_flight',
        name: t('lab.entities.imperial_sky_dragon.animations.dragon_sky_flight.name'),
        description: t('lab.entities.imperial_sky_dragon.animations.dragon_sky_flight.description'),
        loopDurationSec: 2.6,
      },
      {
        id: 'dragon_coiled_hover',
        name: t('lab.entities.imperial_sky_dragon.animations.dragon_coiled_hover.name'),
        description: t('lab.entities.imperial_sky_dragon.animations.dragon_coiled_hover.description'),
        loopDurationSec: 3.2,
      },
      {
        id: 'dragon_roar_surge',
        name: t('lab.entities.imperial_sky_dragon.animations.dragon_roar_surge.name'),
        description: t('lab.entities.imperial_sky_dragon.animations.dragon_roar_surge.description'),
        loopDurationSec: 1.8,
      },
    ],
    skins: [
      {
        id: 'dragon_imperial_gold',
        name: t('lab.entities.imperial_sky_dragon.skins.dragon_imperial_gold.name'),
        subtitle: t('lab.entities.imperial_sky_dragon.skins.dragon_imperial_gold.subtitle'),
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
        name: t('lab.entities.imperial_sky_dragon.skins.dragon_celestial_jade.name'),
        subtitle: t('lab.entities.imperial_sky_dragon.skins.dragon_celestial_jade.subtitle'),
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
        name: t('lab.entities.imperial_sky_dragon.skins.dragon_obsidian_amethyst.name'),
        subtitle: t('lab.entities.imperial_sky_dragon.skins.dragon_obsidian_amethyst.subtitle'),
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

  {
    id: 'forest_dragon',
    name: t('lab.entities.forest_dragon.name'),
    subtitle: t('lab.entities.forest_dragon.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.forest_dragon.category_label'),
    worldLocation: t('lab.entities.forest_dragon.world_location'),
    worldCoordinatesText: t('lab.entities.forest_dragon.world_coordinates'),
    worldInstanceCount: 1,
    sourceFile: 'src/world/models/ForestDragon.ts (src/world/models/animals/ForestDragon_Complete.ts)',
    description: t('lab.entities.forest_dragon.description'),
    defaultCameraDistance: 6.4,
    defaultCameraTargetY: 1.35,
    anatomyTags: [
      t('lab.entities.forest_dragon.anatomy_tags.0'),
      t('lab.entities.forest_dragon.anatomy_tags.1'),
      t('lab.entities.forest_dragon.anatomy_tags.2'),
      t('lab.entities.forest_dragon.anatomy_tags.3'),
    ],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.forest_dragon.animations.none.name'),
        description: t('lab.entities.forest_dragon.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        name: t('lab.entities.forest_dragon.animations.idle.name'),
        description: t('lab.entities.forest_dragon.animations.idle.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'walk',
        name: t('lab.entities.forest_dragon.animations.walk.name'),
        description: t('lab.entities.forest_dragon.animations.walk.description'),
        loopDurationSec: 1.6,
      },
      {
        id: 'trot',
        name: t('lab.entities.forest_dragon.animations.trot.name'),
        description: t('lab.entities.forest_dragon.animations.trot.description'),
        loopDurationSec: 1.1,
      },
      {
        id: 'run',
        name: t('lab.entities.forest_dragon.animations.run.name'),
        description: t('lab.entities.forest_dragon.animations.run.description'),
        loopDurationSec: 0.85,
      },
      {
        id: 'fly',
        name: t('lab.entities.forest_dragon.animations.fly.name'),
        description: t('lab.entities.forest_dragon.animations.fly.description'),
        loopDurationSec: 1.4,
      },
      {
        id: 'stalk',
        name: t('lab.entities.forest_dragon.animations.stalk.name'),
        description: t('lab.entities.forest_dragon.animations.stalk.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'roar',
        name: t('lab.entities.forest_dragon.animations.roar.name'),
        description: t('lab.entities.forest_dragon.animations.roar.description'),
        loopDurationSec: 2.8,
      },
      {
        id: 'call',
        name: t('lab.entities.forest_dragon.animations.call.name'),
        description: t('lab.entities.forest_dragon.animations.call.description'),
        loopDurationSec: 2.6,
      },
      {
        id: 'attack',
        name: t('lab.entities.forest_dragon.animations.attack.name'),
        description: t('lab.entities.forest_dragon.animations.attack.description'),
        loopDurationSec: 1.4,
      },
      {
        id: 'sit',
        name: t('lab.entities.forest_dragon.animations.sit.name'),
        description: t('lab.entities.forest_dragon.animations.sit.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'lie',
        name: t('lab.entities.forest_dragon.animations.lie.name'),
        description: t('lab.entities.forest_dragon.animations.lie.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'sleep',
        name: t('lab.entities.forest_dragon.animations.sleep.name'),
        description: t('lab.entities.forest_dragon.animations.sleep.description'),
        loopDurationSec: 4.2,
      },
      {
        id: 'death',
        name: t('lab.entities.forest_dragon.animations.death.name'),
        description: t('lab.entities.forest_dragon.animations.death.description'),
        loopDurationSec: 2.6,
      },
    ],
    skins: [
      {
        id: 'forest_dragon_emerald',
        name: t('lab.entities.forest_dragon.skins.forest_dragon_emerald.name'),
        subtitle: t('lab.entities.forest_dragon.skins.forest_dragon_emerald.subtitle'),
        badgeColors: ['#4d7c0f', '#78350f', '#d97706'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0x78350f,
          accentHex: 0xd97706,
        },
      },
      {
        id: 'forest_dragon_crimson',
        name: t('lab.entities.forest_dragon.skins.forest_dragon_crimson.name'),
        subtitle: t('lab.entities.forest_dragon.skins.forest_dragon_crimson.subtitle'),
        badgeColors: ['#b91c1c', '#7c2d12', '#fbbf24'],
        palette: {
          primaryHex: 0xef8870,
          secondaryHex: 0x7c2d12,
          accentHex: 0xfbbf24,
        },
      },
      {
        id: 'forest_dragon_jade',
        name: t('lab.entities.forest_dragon.skins.forest_dragon_jade.name'),
        subtitle: t('lab.entities.forest_dragon.skins.forest_dragon_jade.subtitle'),
        badgeColors: ['#10b981', '#064e3b', '#a7f3d0'],
        palette: {
          primaryHex: 0x86efac,
          secondaryHex: 0x064e3b,
          accentHex: 0xa7f3d0,
        },
      },
    ],
  },

  {
    id: 'demon_dragon',
    name: t('lab.entities.demon_dragon.name'),
    subtitle: t('lab.entities.demon_dragon.subtitle'),
    category: 'animals',
    categoryLabel: t('lab.entities.demon_dragon.category_label'),
    worldLocation: t('lab.entities.demon_dragon.world_location'),
    worldCoordinatesText: t('lab.entities.demon_dragon.world_coordinates'),
    worldInstanceCount: 1,
    sourceFile: 'src/world/models/DemonDragon.ts (src/world/models/animals/DemonDragon_Complete.ts)',
    description: t('lab.entities.demon_dragon.description'),
    defaultCameraDistance: 6.4,
    defaultCameraTargetY: 1.35,
    anatomyTags: [
      t('lab.entities.demon_dragon.anatomy_tags.0'),
      t('lab.entities.demon_dragon.anatomy_tags.1'),
      t('lab.entities.demon_dragon.anatomy_tags.2'),
      t('lab.entities.demon_dragon.anatomy_tags.3'),
    ],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.demon_dragon.animations.none.name'),
        description: t('lab.entities.demon_dragon.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'idle',
        name: t('lab.entities.demon_dragon.animations.idle.name'),
        description: t('lab.entities.demon_dragon.animations.idle.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'walk',
        name: t('lab.entities.demon_dragon.animations.walk.name'),
        description: t('lab.entities.demon_dragon.animations.walk.description'),
        loopDurationSec: 1.6,
      },
      {
        id: 'trot',
        name: t('lab.entities.demon_dragon.animations.trot.name'),
        description: t('lab.entities.demon_dragon.animations.trot.description'),
        loopDurationSec: 1.1,
      },
      {
        id: 'run',
        name: t('lab.entities.demon_dragon.animations.run.name'),
        description: t('lab.entities.demon_dragon.animations.run.description'),
        loopDurationSec: 0.85,
      },
      {
        id: 'fly',
        name: t('lab.entities.demon_dragon.animations.fly.name'),
        description: t('lab.entities.demon_dragon.animations.fly.description'),
        loopDurationSec: 1.4,
      },
      {
        id: 'stalk',
        name: t('lab.entities.demon_dragon.animations.stalk.name'),
        description: t('lab.entities.demon_dragon.animations.stalk.description'),
        loopDurationSec: 1.8,
      },
      {
        id: 'roar',
        name: t('lab.entities.demon_dragon.animations.roar.name'),
        description: t('lab.entities.demon_dragon.animations.roar.description'),
        loopDurationSec: 2.8,
      },
      {
        id: 'call',
        name: t('lab.entities.demon_dragon.animations.call.name'),
        description: t('lab.entities.demon_dragon.animations.call.description'),
        loopDurationSec: 2.6,
      },
      {
        id: 'attack',
        name: t('lab.entities.demon_dragon.animations.attack.name'),
        description: t('lab.entities.demon_dragon.animations.attack.description'),
        loopDurationSec: 1.4,
      },
      {
        id: 'eat',
        name: t('lab.entities.demon_dragon.animations.eat.name'),
        description: t('lab.entities.demon_dragon.animations.eat.description'),
        loopDurationSec: 3.4,
      },
      {
        id: 'sit',
        name: t('lab.entities.demon_dragon.animations.sit.name'),
        description: t('lab.entities.demon_dragon.animations.sit.description'),
        loopDurationSec: 3.6,
      },
      {
        id: 'lie',
        name: t('lab.entities.demon_dragon.animations.lie.name'),
        description: t('lab.entities.demon_dragon.animations.lie.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'sleep',
        name: t('lab.entities.demon_dragon.animations.sleep.name'),
        description: t('lab.entities.demon_dragon.animations.sleep.description'),
        loopDurationSec: 4.2,
      },
      {
        id: 'flee',
        name: t('lab.entities.demon_dragon.animations.flee.name'),
        description: t('lab.entities.demon_dragon.animations.flee.description'),
        loopDurationSec: 0.75,
      },
      {
        id: 'skip',
        name: t('lab.entities.demon_dragon.animations.skip.name'),
        description: t('lab.entities.demon_dragon.animations.skip.description'),
        loopDurationSec: 1.2,
      },
      {
        id: 'death',
        name: t('lab.entities.demon_dragon.animations.death.name'),
        description: t('lab.entities.demon_dragon.animations.death.description'),
        loopDurationSec: 2.6,
      },
    ],
    skins: [
      {
        id: 'demon_dragon_classic',
        name: t('lab.entities.demon_dragon.skins.demon_dragon_classic.name'),
        subtitle: t('lab.entities.demon_dragon.skins.demon_dragon_classic.subtitle'),
        badgeColors: ['#475569', '#1e293b', '#38bdf8'],
        palette: {
          primaryHex: 0xffffff,
          secondaryHex: 0x1e293b,
          accentHex: 0x38bdf8,
        },
      },
      {
        id: 'demon_dragon_glacier',
        name: t('lab.entities.demon_dragon.skins.demon_dragon_glacier.name'),
        subtitle: t('lab.entities.demon_dragon.skins.demon_dragon_glacier.subtitle'),
        badgeColors: ['#7dd3fc', '#0284c7', '#e0f2fe'],
        palette: {
          primaryHex: 0xbae6fd,
          secondaryHex: 0x0284c7,
          accentHex: 0xe0f2fe,
        },
      },
      {
        id: 'demon_dragon_hellfire',
        name: t('lab.entities.demon_dragon.skins.demon_dragon_hellfire.name'),
        subtitle: t('lab.entities.demon_dragon.skins.demon_dragon_hellfire.subtitle'),
        badgeColors: ['#7f1d1d', '#18181b', '#f97316'],
        palette: {
          primaryHex: 0xdca590,
          secondaryHex: 0x18181b,
          accentHex: 0xf97316,
        },
      },
    ],
  },

  // GUARDIAN CHARACTERS & MONUMENTS
  {
    id: 'dwarven_king_statue',
    name: t('lab.entities.dwarven_king_statue.name'),
    subtitle: t('lab.entities.dwarven_king_statue.subtitle'),
    category: 'characters',
    categoryLabel: t('lab.entities.dwarven_king_statue.category_label'),
    worldLocation: t('lab.entities.dwarven_king_statue.world_location'),
    worldCoordinatesText: `(${SOUTHERN_MINE_POS.x}, ${SOUTHERN_MINE_POS.entranceZ - 14})`,
    worldInstanceCount: DWARVEN_GUARDIAN_STATUES.length,
    sourceFile: 'src/world/builders/dwarvenKingdomBuilder.ts',
    description:
      t('lab.entities.dwarven_king_statue.description'),
    defaultCameraDistance: 4.8,
    defaultCameraTargetY: 1.35,
    anatomyTags: [t('lab.entities.dwarven_king_statue.anatomy_tags.0'), t('lab.entities.dwarven_king_statue.anatomy_tags.1'), t('lab.entities.dwarven_king_statue.anatomy_tags.2'), t('lab.entities.dwarven_king_statue.anatomy_tags.3'), t('lab.entities.dwarven_king_statue.anatomy_tags.4')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.dwarven_king_statue.animations.none.name'),
        description: t('lab.entities.dwarven_king_statue.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'statue_lantern_pulse',
        name: t('lab.entities.dwarven_king_statue.animations.statue_lantern_pulse.name'),
        description: t('lab.entities.dwarven_king_statue.animations.statue_lantern_pulse.description'),
        loopDurationSec: 3.0,
      },
      {
        id: 'statue_awakened_guard',
        name: t('lab.entities.dwarven_king_statue.animations.statue_awakened_guard.name'),
        description: t('lab.entities.dwarven_king_statue.animations.statue_awakened_guard.description'),
        loopDurationSec: 2.6,
      },
    ],
    skins: [
      {
        id: 'statue_granite_bronze',
        name: t('lab.entities.dwarven_king_statue.skins.statue_granite_bronze.name'),
        subtitle: t('lab.entities.dwarven_king_statue.skins.statue_granite_bronze.subtitle'),
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
        name: t('lab.entities.dwarven_king_statue.skins.statue_solid_gold.name'),
        subtitle: t('lab.entities.dwarven_king_statue.skins.statue_solid_gold.subtitle'),
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
        name: t('lab.entities.dwarven_king_statue.skins.statue_basalt_emerald.name'),
        subtitle: t('lab.entities.dwarven_king_statue.skins.statue_basalt_emerald.subtitle'),
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
    name: t('lab.entities.golden_buddha.name'),
    subtitle: t('lab.entities.golden_buddha.subtitle'),
    category: 'characters',
    categoryLabel: t('lab.entities.golden_buddha.category_label'),
    worldLocation: t('lab.entities.golden_buddha.world_location'),
    worldCoordinatesText: `(${SAKURA_SANCTUARY_POS.x}, ${SAKURA_SANCTUARY_POS.z})`,
    worldInstanceCount: 1,
    sourceFile: 'src/world/models/sanctuaryAndDragonModels.ts',
    description:
      t('lab.entities.golden_buddha.description'),
    defaultCameraDistance: 4.8,
    defaultCameraTargetY: 1.3,
    anatomyTags: [t('lab.entities.golden_buddha.anatomy_tags.0'), t('lab.entities.golden_buddha.anatomy_tags.1'), t('lab.entities.golden_buddha.anatomy_tags.2'), t('lab.entities.golden_buddha.anatomy_tags.3')],
    animations: [
      {
        id: 'none',
        name: t('lab.entities.golden_buddha.animations.none.name'),
        description: t('lab.entities.golden_buddha.animations.none.description'),
        isStaticDefault: true,
        loopDurationSec: 1,
      },
      {
        id: 'buddha_halo_spin',
        name: t('lab.entities.golden_buddha.animations.buddha_halo_spin.name'),
        description: t('lab.entities.golden_buddha.animations.buddha_halo_spin.description'),
        loopDurationSec: 4.0,
      },
      {
        id: 'buddha_levitation',
        name: t('lab.entities.golden_buddha.animations.buddha_levitation.name'),
        description: t('lab.entities.golden_buddha.animations.buddha_levitation.description'),
        loopDurationSec: 3.6,
      },
    ],
    skins: [
      {
        id: 'buddha_imperial_gold',
        name: t('lab.entities.golden_buddha.skins.buddha_imperial_gold.name'),
        subtitle: t('lab.entities.golden_buddha.skins.buddha_imperial_gold.subtitle'),
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
        name: t('lab.entities.golden_buddha.skins.buddha_sacred_jade.name'),
        subtitle: t('lab.entities.golden_buddha.skins.buddha_sacred_jade.subtitle'),
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
        name: t('lab.entities.golden_buddha.skins.buddha_white_marble.name'),
        subtitle: t('lab.entities.golden_buddha.skins.buddha_white_marble.subtitle'),
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
 * Summary: Filters entities by category ('all' | 'characters' | 'animals') and a search query.
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
      entity.name.toLowerCase().includes(q) ||
      entity.subtitle.toLowerCase().includes(q) ||
      entity.worldLocation.toLowerCase().includes(q) ||
      entity.anatomyTags.some((t) => t.toLowerCase().includes(q)) ||
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
 * Summary: Switches between 'all', 'characters', and 'animals' categories,
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

/** Summary: Lab entity id -> editor label set. Entities not listed use the 'default' set. */
const EDITOR_LABEL_SETS: Readonly<Record<string, string>> = {
  ranger_third_person: 'ranger_third_person',
  ranger_first_person: 'ranger_third_person',
  dwarven_miner: 'dwarven_miner',
  shaolin_monk: 'shaolin_monk',
  tai_chi_monk: 'tai_chi_monk',
  harbor_merchant: 'harbor_merchant',
  dwarven_king_statue: 'dwarven_king_statue',
  golden_buddha: 'golden_buddha',
  mountain_eagle: 'mountain_eagle',
  flock_bird: 'mountain_eagle',
  harbor_seagull: 'mountain_eagle',
  meadow_butterfly: 'meadow_butterfly',
  koi_fish: 'koi_fish',
  forest_deer: 'forest_deer',
  forest_bear: 'forest_bear',
  river_crocodile: 'river_crocodile',
  jungle_jaguar: 'jungle_jaguar',
  forest_wolf: 'forest_wolf',
  savanna_rhino: 'savanna_rhino',
  savanna_lion: 'savanna_lion',
  royal_stag: 'royal_stag',
  forest_dragon: 'forest_dragon',
  demon_dragon: 'demon_dragon',
};

/** Summary: The five label fields every editor label set provides. */
const EDITOR_LABEL_FIELDS = {
  weaponGroupTitle: 'weapon_group_title',
  leftWeaponGroupTitle: 'left_weapon_group_title',
  rightLimbTitle: 'right_limb_title',
  leftLimbTitle: 'left_limb_title',
  headTitle: 'head_title',
} as const;

/**
 * Summary: Returns context-aware labels for the entity's editable right-hand weapon,
 *          left-hand weapon, and limbs.
 */
export function getEntityEditorLabels(entityId: string): {
  readonly weaponGroupTitle: string;
  readonly leftWeaponGroupTitle: string;
  readonly rightLimbTitle: string;
  readonly leftLimbTitle: string;
  readonly headTitle: string;
} {
  const labelSet = Object.hasOwn(EDITOR_LABEL_SETS, entityId) ? EDITOR_LABEL_SETS[entityId] : 'default';
  const label = (field: keyof typeof EDITOR_LABEL_FIELDS) => t(`lab.editor.${labelSet}.${EDITOR_LABEL_FIELDS[field]}`);
  return {
    weaponGroupTitle: label('weaponGroupTitle'),
    leftWeaponGroupTitle: label('leftWeaponGroupTitle'),
    rightLimbTitle: label('rightLimbTitle'),
    leftLimbTitle: label('leftLimbTitle'),
    headTitle: label('headTitle'),
  };
}
// #endregion
