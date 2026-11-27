// ============================================================================
// MODULE: World / Domain / Global Hitbox Overrides
// DESIGN: Live Runtime Registry Over Immutable Codebase Defaults (SRP)
// SUMMARY: Resolves active hitbox overrides (boxes, obstacles, entities) from
//          SAVED_HITBOX_OVERRIDES + browser localStorage, while preserving every
//          original codebase hitbox as an immutable default for instant reset.
// ============================================================================

import {
  SAVED_HITBOX_OVERRIDES,
  type IBoxHitboxOverride,
  type IEntityHitboxOverride,
  type IHitboxOverridesPayload,
  type IObstacleHitboxOverride,
} from '../../config/savedHitboxOverrides';
import { validateHitboxOverrides } from '../../config/persistedSettingsValidation';
import type { ISolidBuildingBox } from './worldTypes';

export const HITBOX_OVERRIDES_STORAGE_KEY = 'theman_hitbox_overrides_v1';
export const HITBOX_OVERRIDES_SAVED_EVENT = 'hitbox-overrides-saved';

/**
 * Summary: Immutable default hitbox radii, vertical heights, and wildlife body separation radii
 *          preserved from the codebase so any Lab Reset-to-Default restores exact baseline gameplay.
 */
export const DEFAULT_ENTITY_HITBOXES: Readonly<Record<string, IEntityHitboxOverride>> = {
  ranger_third_person: { radius: 0.44, height: 1.85, bodyRadius: 0.45 },
  forest_dragon: { radius: 5.2, height: 6.5, bodyRadius: 2.4 },
  demon_dragon: { radius: 5.2, height: 6.5, bodyRadius: 2.4 },
  skeleton_dragon: { radius: 4.8, height: 7.2, bodyRadius: 2.4 },
  hydra_dragon: { radius: 5.2, height: 6.4, bodyRadius: 2.6 },
  forest_bear: { radius: 2.45, height: 3.05, bodyRadius: 1.45 },
  river_crocodile: { radius: 2.65, height: 1.55, bodyRadius: 1.25 },
  savanna_rhino: { radius: 2.65, height: 2.65, bodyRadius: 1.4 },
  oasis_hippo: { radius: 2.65, height: 2.65, bodyRadius: 1.4 },
  royal_stag: { radius: 2.05, height: 2.45, bodyRadius: 0.95 },
  forest_deer: { radius: 1.45, height: 2.45, bodyRadius: 0.72 },
  savanna_lion: { radius: 1.42, height: 1.75, bodyRadius: 0.85 },
  jungle_jaguar: { radius: 1.42, height: 1.75, bodyRadius: 0.8 },
  forest_wolf: { radius: 1.42, height: 1.75, bodyRadius: 0.72 },
  meadow_sheep: { radius: 1.05, height: 1.25, bodyRadius: 0.65 },
  koi_fish: { radius: 0.56, height: 0.54, bodyRadius: 0.35 },
  ocean_dolphin: { radius: 1.18, height: 1.35, bodyRadius: 0.75 },
  meadow_rabbit: { radius: 1.18, height: 1.35, bodyRadius: 0.38 },
  forest_squirrel: { radius: 1.18, height: 1.35, bodyRadius: 0.38 },
};

/**
 * Summary: Maps runtime wildlife species names to their canonical Lab / Hitbox entity keys.
 */
export const WILDLIFE_SPECIES_TO_ENTITY_ID: Readonly<Record<string, string>> = {
  dragon: 'forest_dragon',
  skeleton_dragon: 'skeleton_dragon',
  hydra_dragon: 'hydra_dragon',
  bear: 'forest_bear',
  crocodile: 'river_crocodile',
  rhino: 'savanna_rhino',
  hippo: 'oasis_hippo',
  stag: 'royal_stag',
  deer: 'forest_deer',
  lion: 'savanna_lion',
  jaguar: 'jungle_jaguar',
  wolf: 'forest_wolf',
  sheep: 'meadow_sheep',
  koifish: 'koi_fish',
  dolphin: 'ocean_dolphin',
  rabbit: 'meadow_rabbit',
  squirrel: 'forest_squirrel',
};

/**
 * Summary: Baseline (scale = 1.0) obstacle collider dimensions preserved from `getObstacleColliderMetrics`.
 */
export const DEFAULT_OBSTACLE_DIMENSIONS: Readonly<
  Record<string, { readonly radius: number; readonly height: number; readonly label: string }>
> = {
  pinetree: { radius: 0.55, height: 14.5, label: 'Pine Tree (GLB)' },
  oakgreen: { radius: 0.58, height: 11.0, label: 'Green Oak Tree (GLB)' },
  oakyellow: { radius: 0.58, height: 10.8, label: 'Autumn Oak Tree (GLB)' },
  animtree: { radius: 0.56, height: 10.0, label: 'Animated Tree (GLB)' },
  animtree_wide: { radius: 0.62, height: 8.8, label: 'Wide Canopy Tree (GLB)' },
  animtree_compact: { radius: 0.5, height: 7.9, label: 'Compact Tree (GLB)' },
  pine: { radius: 0.45, height: 12.4, label: 'Procedural Pine Tree' },
  birch: { radius: 0.4, height: 9.4, label: 'Procedural Birch Tree' },
  palm: { radius: 0.42, height: 9.2, label: 'Procedural Palm Tree' },
  oak: { radius: 0.5, height: 8.6, label: 'Procedural Oak Tree' },
  acacia: { radius: 0.45, height: 7.4, label: 'Procedural Acacia Tree' },
  boulder: { radius: 0.9, height: 1.25, label: 'Terrain Boulder Rock' },
  pillar: { radius: 0.55, height: 3.5, label: 'Ancient Stone Pillar' },
};

function sanitizeOverridesPayload(raw: IHitboxOverridesPayload): IHitboxOverridesPayload {
  const checked = validateHitboxOverrides(raw);
  if (checked.isSuccess) {
    return checked.value;
  }
  return {};
}

function loadInitialHitboxOverrides(): IHitboxOverridesPayload {
  const base = sanitizeOverridesPayload(SAVED_HITBOX_OVERRIDES);
  if (typeof window === 'undefined') {
    return base;
  }
  try {
    const raw = window.localStorage.getItem(HITBOX_OVERRIDES_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as unknown;
    const validated = validateHitboxOverrides(parsed);
    if (validated.isSuccess) {
      return {
        boxes: { ...(base.boxes ?? {}), ...(validated.value.boxes ?? {}) },
        obstacles: { ...(base.obstacles ?? {}), ...(validated.value.obstacles ?? {}) },
        entities: { ...(base.entities ?? {}), ...(validated.value.entities ?? {}) },
      };
    }
  } catch {
    // Ignore malformed localStorage and fall back to codebase file overrides
  }
  return base;
}

let activeHitboxOverrides: IHitboxOverridesPayload = loadInitialHitboxOverrides();
const changeListeners = new Set<(overrides: IHitboxOverridesPayload) => void>();

function notifyListeners(): void {
  changeListeners.forEach((listener) => {
    try {
      listener(activeHitboxOverrides);
    } catch {
      // Protect callers from individual listener errors
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener(HITBOX_OVERRIDES_SAVED_EVENT, ((ev: CustomEvent<IHitboxOverridesPayload>) => {
    if (ev && ev.detail && typeof ev.detail === 'object') {
      activeHitboxOverrides = sanitizeOverridesPayload(ev.detail);
      notifyListeners();
    }
  }) as EventListener);
}

/**
 * Summary: Subscribes to live hitbox override updates (from Lab edits, saves, or resets).
 * @returns Unsubscribe callback.
 */
export function subscribeHitboxOverridesChanged(
  listener: (overrides: IHitboxOverridesPayload) => void
): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

/**
 * Summary: Returns the currently active hitbox overrides map.
 */
export function getActiveHitboxOverrides(): IHitboxOverridesPayload {
  return activeHitboxOverrides;
}

/**
 * Summary: Replaces active hitbox overrides across the runtime and optionally mirrors into localStorage.
 */
export function setActiveHitboxOverrides(
  next: IHitboxOverridesPayload,
  persistToStorage = false
): IHitboxOverridesPayload {
  const clean = sanitizeOverridesPayload(next);
  const pruned: {
    boxes?: Record<string, IBoxHitboxOverride>;
    obstacles?: Record<string, IObstacleHitboxOverride>;
    entities?: Record<string, IEntityHitboxOverride>;
  } = {};
  if (clean.boxes && Object.keys(clean.boxes).length > 0) {
    pruned.boxes = { ...clean.boxes };
  }
  if (clean.obstacles && Object.keys(clean.obstacles).length > 0) {
    pruned.obstacles = { ...clean.obstacles };
  }
  if (clean.entities && Object.keys(clean.entities).length > 0) {
    pruned.entities = { ...clean.entities };
  }
  activeHitboxOverrides = pruned;
  if (persistToStorage && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(HITBOX_OVERRIDES_STORAGE_KEY, JSON.stringify(pruned));
    } catch {
      // Ignore storage quota / restricted environment errors
    }
  }
  notifyListeners();
  return activeHitboxOverrides;
}

/**
 * Summary: Resets all box, obstacle, and entity overrides back to immutable codebase defaults.
 */
export function resetAllHitboxOverrides(persistToStorage = true): IHitboxOverridesPayload {
  return setActiveHitboxOverrides({}, persistToStorage);
}

/**
 * Summary: Returns the override entry for a solid box ID if configured.
 */
export function getBoxHitboxOverride(boxId: string): IBoxHitboxOverride | undefined {
  return activeHitboxOverrides.boxes?.[boxId];
}

/**
 * Summary: Applies any active box override to an `ISolidBuildingBox`.
 *          Returns the exact same object reference when no override exists so identity indices stay valid.
 */
export function applyBoxHitboxOverride<T extends ISolidBuildingBox>(box: T): T {
  const ov = activeHitboxOverrides.boxes?.[box.id];
  if (!ov) return box;
  return {
    ...box,
    minX: ov.minX,
    maxX: ov.maxX,
    minZ: ov.minZ,
    maxZ: ov.maxZ,
    minY: ov.minY !== undefined ? ov.minY : box.minY,
    maxY: ov.maxY !== undefined ? ov.maxY : box.maxY,
    yaw: ov.yaw !== undefined ? ov.yaw : box.yaw,
  };
}

/**
 * Summary: Applies any active scale multiplier override to an obstacle cylinder metric.
 */
export function applyObstacleHitboxOverride(
  obstacleKey: string,
  baseRadius: number,
  baseHeight: number
): { readonly radius: number; readonly height: number } {
  const ov = activeHitboxOverrides.obstacles?.[obstacleKey];
  if (!ov) {
    return { radius: baseRadius, height: baseHeight };
  }
  return {
    radius: baseRadius * ov.radiusScale,
    height: baseHeight * ov.heightScale,
  };
}

/**
 * Summary: Resolves effective entity hitbox metrics (arrow/combat radius, height, body separation radius),
 *          falling back to `DEFAULT_ENTITY_HITBOXES` or provided fallback when unmodified.
 */
export function getEffectiveEntityHitbox(
  entityIdOrSpecies: string,
  fallback?: IEntityHitboxOverride
): IEntityHitboxOverride {
  const canonicalId = WILDLIFE_SPECIES_TO_ENTITY_ID[entityIdOrSpecies] ?? entityIdOrSpecies;
  const ov = activeHitboxOverrides.entities?.[canonicalId] ?? activeHitboxOverrides.entities?.[entityIdOrSpecies];
  const base =
    DEFAULT_ENTITY_HITBOXES[canonicalId] ??
    DEFAULT_ENTITY_HITBOXES[entityIdOrSpecies] ??
    fallback ?? { radius: 0.45, height: 1.8, bodyRadius: 0.45 };
  if (!ov) {
    return fallback
      ? {
          radius: fallback.radius,
          height: fallback.height,
          bodyRadius: fallback.bodyRadius ?? base.bodyRadius,
        }
      : base;
  }
  return {
    radius: ov.radius,
    height: ov.height,
    bodyRadius: ov.bodyRadius ?? fallback?.bodyRadius ?? base.bodyRadius,
  };
}
