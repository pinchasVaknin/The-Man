// ============================================================================
// MODULE: Lab / Global Hitbox Editor Catalog & Pure State Helpers
// DESIGN: Immutable Baseline Defaults + Pure Override Queries & Reset Helpers
// SUMMARY: Catalogs all editable 3D hitboxes across ships, buildings, props,
//          terrain obstacles (trees/rocks), and characters/wildlife, preserving
//          every original codebase collider as an immutable default.
// ============================================================================

import type {
  IBoxHitboxOverride,
  IEntityHitboxOverride,
  IHitboxOverridesPayload,
  IObstacleHitboxOverride,
} from '../config/savedHitboxOverrides';
import {
  DEFAULT_ENTITY_HITBOXES,
  DEFAULT_OBSTACLE_DIMENSIONS,
  applyBoxHitboxOverride,
  applyObstacleHitboxOverride,
  getEffectiveEntityHitbox,
} from '../world/domain/hitboxOverrides';
import { SOLID_BUILDING_BOXES } from '../world/domain/landmarks/collisionAndTerraces';
import {
  ATLANTIS_DEAD_KING_STATUE_POS,
  HUNTER_LODGE_POS,
  NORDIC_FROST_SHRINE_POS,
  RIVERSIDE_WINDMILLS,
  SOUTHEAST_HARBOR_POS,
  VALLEY_FARMS,
} from '../world/domain/landmarksRegistry';
import { ARCHERY_TARGETS } from '../world/domain/landmarks/fortressLandmarks';
import type { ISolidBuildingBox } from '../world/domain/worldTypes';
import { DEFAULT_SAILABLE_SHIP_LOCAL_BOXES } from '../world/systems/sailableShipSystem';
import { LAB_ENTITIES } from './labCatalog';

export type LabStudioMode = 'models' | 'hitboxes';

export type LabHitboxCategory =
  | 'all'
  | 'vehicles'
  | 'buildings'
  | 'props'
  | 'obstacles'
  | 'entities';

export type LabHitboxTargetKind = 'ship_boxes' | 'world_boxes' | 'obstacle' | 'entity';

export type LabHitboxPreviewType =
  | 'sailable_ship'
  | 'galleon'
  | 'cabin'
  | 'farmhouse'
  | 'lighthouse'
  | 'tavern'
  | 'warehouse'
  | 'hotspring'
  | 'windmill'
  | 'archery_target'
  | 'atlantis_statue'
  | 'obstacle'
  | 'entity';

export interface ILabHitboxAnchor {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ILabHitboxTargetDef {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string;
  readonly category: Exclude<LabHitboxCategory, 'all'>;
  readonly categoryLabel: string;
  readonly kind: LabHitboxTargetKind;
  readonly previewType: LabHitboxPreviewType;
  readonly defaultCameraDistance: number;
  readonly defaultCameraTargetY: number;
  readonly anchor: ILabHitboxAnchor;
  readonly boxIds?: readonly string[];
  readonly boxPrefixes?: readonly string[];
  readonly obstacleKey?: string;
  readonly entityId?: string;
  readonly description: string;
}

export const LAB_HITBOX_CATEGORIES: readonly {
  readonly id: LabHitboxCategory;
  readonly label: string;
}[] = [
  { id: 'all', label: 'All Hitbox Targets' },
  { id: 'vehicles', label: 'Ships & Vehicles' },
  { id: 'buildings', label: 'Buildings & Structures' },
  { id: 'props', label: 'Props & Targets' },
  { id: 'obstacles', label: 'Trees & Rocks' },
  { id: 'entities', label: 'Characters & Wildlife' },
];

const FORTRESS_ARCHERY_BASE_Y =
  SOLID_BUILDING_BOXES.find((b) => b.id === 'fortress-archery-target-0')?.minY ?? 26.0;

const OBSTACLE_TARGET_DEFS: readonly ILabHitboxTargetDef[] = Object.entries(
  DEFAULT_OBSTACLE_DIMENSIONS
).map(([key, dims]) => ({
  id: `obstacle_${key}`,
  name: dims.label,
  subtitle: `Radius ${dims.radius.toFixed(2)}m · Height ${dims.height.toFixed(1)}m`,
  category: 'obstacles',
  categoryLabel: 'Trees & Rocks',
  kind: 'obstacle',
  previewType: 'obstacle',
  defaultCameraDistance: Math.max(4.5, Math.min(18.0, dims.height * 1.15)),
  defaultCameraTargetY: Math.max(0.8, dims.height * 0.45),
  anchor: { x: 0, y: 0, z: 0 },
  obstacleKey: key,
  description:
    'Cylinder collider applied globally across all world terrain instances of this tree, boulder, or stone pillar.',
}));

const ENTITY_TARGET_DEFS: readonly ILabHitboxTargetDef[] = Object.entries(
  DEFAULT_ENTITY_HITBOXES
).map(([entityId, dims]) => {
  const labMatch = LAB_ENTITIES.find((e) => e.id === entityId);
  const displayName =
    labMatch?.name ??
    (entityId === 'ranger_third_person'
      ? 'Ranger (Player Character)'
      : entityId.replace(/_/g, ' '));
  return {
    id: `entity_${entityId}`,
    name: displayName,
    subtitle: `Hit Radius ${dims.radius.toFixed(2)}m · Height ${dims.height.toFixed(2)}m`,
    category: 'entities',
    categoryLabel: 'Characters & Wildlife',
    kind: 'entity',
    previewType: 'entity',
    defaultCameraDistance: Math.max(3.0, Math.min(12.0, dims.height * 1.65)),
    defaultCameraTargetY: Math.max(0.45, dims.height * 0.45),
    anchor: { x: 0, y: 0, z: 0 },
    entityId,
    description:
      'Dual combat & body-separation cylinder collider used for player movement, arrow impacts, and AI separation.',
  };
});

export const LAB_HITBOX_TARGETS: readonly ILabHitboxTargetDef[] = [
  {
    id: 'sailable_ship',
    name: 'Sailable Ship (ship.glb)',
    subtitle: 'Hull, railings, forecastle, stairs, 2F & side openings',
    category: 'vehicles',
    categoryLabel: 'Ships & Vehicles',
    kind: 'ship_boxes',
    previewType: 'sailable_ship',
    defaultCameraDistance: 24.0,
    defaultCameraTargetY: 1.8,
    anchor: { x: 0, y: 0, z: 0 },
    boxIds: DEFAULT_SAILABLE_SHIP_LOCAL_BOXES.map((b) => b.id),
    description:
      'Base-scale local collision boxes for the sailable ship (Y relative to main deck = 0). Port & Starboard gangway gaps sit at Z = 0.0..3.5.',
  },
  {
    id: 'harbor_galleon',
    name: 'Harbor Royal Galleon',
    subtitle: 'Moored dockside galleon, quarterdeck, office & masts',
    category: 'vehicles',
    categoryLabel: 'Ships & Vehicles',
    kind: 'world_boxes',
    previewType: 'galleon',
    defaultCameraDistance: 36.0,
    defaultCameraTargetY: 4.5,
    anchor: {
      x: SOUTHEAST_HARBOR_POS.shipX,
      y: SOUTHEAST_HARBOR_POS.shipDeckY,
      z: SOUTHEAST_HARBOR_POS.shipZ,
    },
    boxPrefixes: ['galleon-'],
    description:
      'World-space collision boxes for the moored Southeast Harbor Royal Galleon and Shipwright Naval Office.',
  },
  {
    id: 'hunter_cabin',
    name: "Hunter's Cabin & Porch",
    subtitle: 'Walls, chimney, doorway, porch rails & interior props',
    category: 'buildings',
    categoryLabel: 'Buildings & Structures',
    kind: 'world_boxes',
    previewType: 'cabin',
    defaultCameraDistance: 18.0,
    defaultCameraTargetY: 2.2,
    anchor: {
      x: HUNTER_LODGE_POS.x,
      y: HUNTER_LODGE_POS.height,
      z: HUNTER_LODGE_POS.z,
    },
    boxPrefixes: ['hunter-'],
    description:
      "Timber cabin exterior walls, lintel header, porch railings, bed, table, starter chest, and water trough.",
  },
  {
    id: 'farmhouse',
    name: 'Valley Farmhouse (West)',
    subtitle: 'Farmhouse walls, loft interior, workshop, fence & gate',
    category: 'buildings',
    categoryLabel: 'Buildings & Structures',
    kind: 'world_boxes',
    previewType: 'farmhouse',
    defaultCameraDistance: 26.0,
    defaultCameraTargetY: 2.5,
    anchor: {
      x: VALLEY_FARMS[0].x,
      y: VALLEY_FARMS[0].height,
      z: VALLEY_FARMS[0].z,
    },
    boxPrefixes: ['farm-west-'],
    description:
      'West valley farmhouse walls, doorway lintel, bakery oven, beds, hay bales, and perimeter paddock fences.',
  },
  {
    id: 'harbor_lighthouse',
    name: 'Harbor Cylindrical Lighthouse',
    subtitle: 'Curved tower segments, top rail & lantern room',
    category: 'buildings',
    categoryLabel: 'Buildings & Structures',
    kind: 'world_boxes',
    previewType: 'lighthouse',
    defaultCameraDistance: 26.0,
    defaultCameraTargetY: 9.0,
    anchor: {
      x: SOUTHEAST_HARBOR_POS.lighthouseX,
      y: SOUTHEAST_HARBOR_POS.lighthouseBaseY,
      z: SOUTHEAST_HARBOR_POS.lighthouseZ,
    },
    boxPrefixes: ['harbor-lighthouse-'],
    description:
      '14 cylindrical stone tower wall segments, 16 top observation gallery railing segments, and central lantern room.',
  },
  {
    id: 'harbor_tavern',
    name: 'Harbor Tavern',
    subtitle: 'Exterior walls, tavern bar counter, hearth, barrels & tables',
    category: 'buildings',
    categoryLabel: 'Buildings & Structures',
    kind: 'world_boxes',
    previewType: 'tavern',
    defaultCameraDistance: 18.0,
    defaultCameraTargetY: 2.4,
    anchor: {
      x: SOUTHEAST_HARBOR_POS.tavernX,
      y: SOUTHEAST_HARBOR_POS.tavernFloorY,
      z: SOUTHEAST_HARBOR_POS.tavernZ,
    },
    boxPrefixes: ['harbor-tavern-'],
    description:
      'Southeast Harbor tavern stone & timber walls, open south doorway, bar counter, fireplace hearth, and seating tables.',
  },
  {
    id: 'harbor_warehouse',
    name: 'Harbor Warehouse',
    subtitle: 'Exterior walls, cargo crate stacks, racks & desk',
    category: 'buildings',
    categoryLabel: 'Buildings & Structures',
    kind: 'world_boxes',
    previewType: 'warehouse',
    defaultCameraDistance: 19.0,
    defaultCameraTargetY: 2.4,
    anchor: {
      x: SOUTHEAST_HARBOR_POS.warehouseX,
      y: SOUTHEAST_HARBOR_POS.warehouseFloorY,
      z: SOUTHEAST_HARBOR_POS.warehouseZ,
    },
    boxPrefixes: ['harbor-warehouse-'],
    description:
      'Harbor cargo warehouse perimeter walls, stacked wooden crates, supply racks, grain sacks, and quartermaster desk.',
  },
  {
    id: 'hotspring_compound',
    name: 'Northern Hot Spring Compound',
    subtitle: 'Perimeter walls, gate pillars, stair balustrades & wing props',
    category: 'buildings',
    categoryLabel: 'Buildings & Structures',
    kind: 'world_boxes',
    previewType: 'hotspring',
    defaultCameraDistance: 46.0,
    defaultCameraTargetY: 2.8,
    anchor: {
      x: NORDIC_FROST_SHRINE_POS.x,
      y: NORDIC_FROST_SHRINE_POS.floorY,
      z: NORDIC_FROST_SHRINE_POS.z,
    },
    boxPrefixes: ['nordic-compound-', 'nordic-hotspring-'],
    description:
      'Full northern hot spring sanctuary walls, gate pillars, grand stairway balustrades, tables, gong, braziers, and targets.',
  },
  {
    id: 'windmill',
    name: 'Riverside Windmill (Lower)',
    subtitle: 'Octagonal stone tower segments',
    category: 'buildings',
    categoryLabel: 'Buildings & Structures',
    kind: 'world_boxes',
    previewType: 'windmill',
    defaultCameraDistance: 17.0,
    defaultCameraTargetY: 4.5,
    anchor: {
      x: RIVERSIDE_WINDMILLS[0].x,
      y: RIVERSIDE_WINDMILLS[0].height,
      z: RIVERSIDE_WINDMILLS[0].z,
    },
    boxPrefixes: ['windmill-lower-'],
    description: '8 octagonal angled wall colliders wrapping the Lower Riverside Windmill tower.',
  },
  {
    id: 'archery_targets',
    name: 'Archery Targets (3D)',
    subtitle: 'Courtyard archery target easels (Archery target.glb)',
    category: 'props',
    categoryLabel: 'Props & Targets',
    kind: 'world_boxes',
    previewType: 'archery_target',
    defaultCameraDistance: 34.0,
    defaultCameraTargetY: 1.4,
    anchor: {
      x: 0,
      y: FORTRESS_ARCHERY_BASE_Y,
      z: ARCHERY_TARGETS[0].z,
    },
    boxPrefixes: ['fortress-archery-target-'],
    description: 'Solid collision boxes protecting the 3D wooden courtyard archery target easels.',
  },
  {
    id: 'atlantis_statue',
    name: 'Atlantis Dead King Statue',
    subtitle: 'Stepped pedestal base & monumental skeleton guardian',
    category: 'props',
    categoryLabel: 'Props & Targets',
    kind: 'world_boxes',
    previewType: 'atlantis_statue',
    defaultCameraDistance: 18.0,
    defaultCameraTargetY: 4.5,
    anchor: {
      x: ATLANTIS_DEAD_KING_STATUE_POS.x,
      y: ATLANTIS_DEAD_KING_STATUE_POS.baseY,
      z: ATLANTIS_DEAD_KING_STATUE_POS.z,
    },
    boxPrefixes: ['atlantis-dead-king-statue-'],
    description: 'Pedestal plinth and main statue hull colliders for the sunken Atlantean king.',
  },
  ...OBSTACLE_TARGET_DEFS,
  ...ENTITY_TARGET_DEFS,
];

function buildShipBoxTemplate(box: (typeof DEFAULT_SAILABLE_SHIP_LOCAL_BOXES)[number]): ISolidBuildingBox {
  return {
    id: box.id,
    minX: box.minX,
    maxX: box.maxX,
    minZ: box.minZ,
    maxZ: box.maxZ,
    minY: box.minY,
    maxY: box.maxY,
  };
}

/**
 * Summary: Returns immutable codebase-default boxes for any box-based hitbox target.
 */
export function getDefaultBoxesForTarget(target: ILabHitboxTargetDef): ISolidBuildingBox[] {
  if (target.kind === 'ship_boxes') {
    return DEFAULT_SAILABLE_SHIP_LOCAL_BOXES.map(buildShipBoxTemplate);
  }
  if (target.kind === 'world_boxes') {
    const idSet = target.boxIds ? new Set(target.boxIds) : null;
    const prefixes = target.boxPrefixes ?? [];
    return SOLID_BUILDING_BOXES.filter(
      (b) =>
        (idSet !== null && idSet.has(b.id)) ||
        prefixes.some((p) => b.id.startsWith(p))
    ).map((b) => ({ ...b }));
  }
  return [];
}

/**
 * Summary: Applies overrides onto the target's default boxes using the supplied overrides map.
 */
export function getEffectiveBoxesForTarget(
  target: ILabHitboxTargetDef,
  overrides: IHitboxOverridesPayload
): ISolidBuildingBox[] {
  const defaults = getDefaultBoxesForTarget(target);
  return defaults.map((box) => {
    const ov = overrides.boxes?.[box.id];
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
  });
}

/**
 * Summary: Resolves effective obstacle cylinder metrics from a target & overrides map.
 */
export function getEffectiveObstacleForTarget(
  target: ILabHitboxTargetDef,
  overrides: IHitboxOverridesPayload
): {
  readonly baseRadius: number;
  readonly baseHeight: number;
  readonly radiusScale: number;
  readonly heightScale: number;
  readonly radius: number;
  readonly height: number;
} {
  const key = target.obstacleKey ?? 'oakgreen';
  const base = DEFAULT_OBSTACLE_DIMENSIONS[key] ?? { radius: 0.55, height: 10.0 };
  const ov = overrides.obstacles?.[key];
  const radiusScale = ov?.radiusScale ?? 1.0;
  const heightScale = ov?.heightScale ?? 1.0;
  return {
    baseRadius: base.radius,
    baseHeight: base.height,
    radiusScale,
    heightScale,
    radius: base.radius * radiusScale,
    height: base.height * heightScale,
  };
}

/**
 * Summary: Resolves effective entity hitbox metrics from a target & overrides map.
 */
export function getEffectiveEntityForTarget(
  target: ILabHitboxTargetDef,
  overrides: IHitboxOverridesPayload
): {
  readonly defaults: IEntityHitboxOverride;
  readonly effective: IEntityHitboxOverride;
} {
  const key = target.entityId ?? 'ranger_third_person';
  const defaults = DEFAULT_ENTITY_HITBOXES[key] ?? { radius: 0.45, height: 1.8, bodyRadius: 0.45 };
  const ov = overrides.entities?.[key];
  if (!ov) {
    return { defaults, effective: defaults };
  }
  return {
    defaults,
    effective: {
      radius: ov.radius,
      height: ov.height,
      bodyRadius: ov.bodyRadius ?? defaults.bodyRadius,
    },
  };
}

/**
 * Summary: Formats raw collider box IDs into readable part titles.
 */
export function formatHitboxPartLabel(boxId: string): string {
  return boxId
    .replace(/^(ship-|galleon-|hunter-lodge-|hunter-|farm-west-|harbor-lighthouse-|harbor-tavern-|harbor-warehouse-|nordic-compound-|nordic-hotspring-|windmill-lower-|fortress-archery-|atlantis-dead-king-statue-)/, '')
    .split('-')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/**
 * Summary: Returns true when a target has at least one active override differing from defaults.
 */
export function isHitboxTargetCustomized(
  target: ILabHitboxTargetDef,
  overrides: IHitboxOverridesPayload
): boolean {
  if (target.kind === 'ship_boxes' || target.kind === 'world_boxes') {
    const defaults = getDefaultBoxesForTarget(target);
    return defaults.some((b) => overrides.boxes?.[b.id] !== undefined);
  }
  if (target.kind === 'obstacle' && target.obstacleKey) {
    return overrides.obstacles?.[target.obstacleKey] !== undefined;
  }
  if (target.kind === 'entity' && target.entityId) {
    return overrides.entities?.[target.entityId] !== undefined;
  }
  return false;
}

/**
 * Summary: Counts total individual overrides active across boxes, obstacles, and entities.
 */
export function countActiveHitboxOverrides(overrides: IHitboxOverridesPayload): number {
  return (
    Object.keys(overrides.boxes ?? {}).length +
    Object.keys(overrides.obstacles ?? {}).length +
    Object.keys(overrides.entities ?? {}).length
  );
}

/**
 * Summary: Updates a single box collider inside the overrides payload (preserving immutability).
 */
export function updateBoxOverrideInPayload(
  overrides: IHitboxOverridesPayload,
  boxId: string,
  nextBox: IBoxHitboxOverride
): IHitboxOverridesPayload {
  return {
    ...overrides,
    boxes: {
      ...(overrides.boxes ?? {}),
      [boxId]: nextBox,
    },
  };
}

/**
 * Summary: Updates an obstacle cylinder multiplier entry inside the overrides payload.
 */
export function updateObstacleOverrideInPayload(
  overrides: IHitboxOverridesPayload,
  obstacleKey: string,
  nextObstacle: IObstacleHitboxOverride
): IHitboxOverridesPayload {
  return {
    ...overrides,
    obstacles: {
      ...(overrides.obstacles ?? {}),
      [obstacleKey]: nextObstacle,
    },
  };
}

/**
 * Summary: Updates an entity cylinder collider entry inside the overrides payload.
 */
export function updateEntityOverrideInPayload(
  overrides: IHitboxOverridesPayload,
  entityId: string,
  nextEntity: IEntityHitboxOverride
): IHitboxOverridesPayload {
  return {
    ...overrides,
    entities: {
      ...(overrides.entities ?? {}),
      [entityId]: nextEntity,
    },
  };
}

/**
 * Summary: Resets a single box part (or obstacle/entity) back to its codebase default.
 */
export function resetPartOverrideInPayload(
  target: ILabHitboxTargetDef,
  partId: string,
  overrides: IHitboxOverridesPayload
): IHitboxOverridesPayload {
  if (target.kind === 'ship_boxes' || target.kind === 'world_boxes') {
    const nextBoxes = { ...(overrides.boxes ?? {}) };
    delete nextBoxes[partId];
    return pruneEmptySections({ ...overrides, boxes: nextBoxes });
  }
  if (target.kind === 'obstacle' && target.obstacleKey) {
    const nextObs = { ...(overrides.obstacles ?? {}) };
    delete nextObs[target.obstacleKey];
    return pruneEmptySections({ ...overrides, obstacles: nextObs });
  }
  if (target.kind === 'entity' && target.entityId) {
    const nextEnts = { ...(overrides.entities ?? {}) };
    delete nextEnts[target.entityId];
    return pruneEmptySections({ ...overrides, entities: nextEnts });
  }
  return overrides;
}

/**
 * Summary: Resets every part of the selected target back to immutable codebase defaults.
 */
export function resetTargetOverridesInPayload(
  target: ILabHitboxTargetDef,
  overrides: IHitboxOverridesPayload
): IHitboxOverridesPayload {
  if (target.kind === 'ship_boxes' || target.kind === 'world_boxes') {
    const defaults = getDefaultBoxesForTarget(target);
    const nextBoxes = { ...(overrides.boxes ?? {}) };
    for (let i = 0; i < defaults.length; i++) {
      delete nextBoxes[defaults[i].id];
    }
    return pruneEmptySections({ ...overrides, boxes: nextBoxes });
  }
  if (target.kind === 'obstacle' && target.obstacleKey) {
    return resetPartOverrideInPayload(target, target.obstacleKey, overrides);
  }
  if (target.kind === 'entity' && target.entityId) {
    return resetPartOverrideInPayload(target, target.entityId, overrides);
  }
  return overrides;
}

function pruneEmptySections(payload: IHitboxOverridesPayload): IHitboxOverridesPayload {
  const out: {
    boxes?: Record<string, IBoxHitboxOverride>;
    obstacles?: Record<string, IObstacleHitboxOverride>;
    entities?: Record<string, IEntityHitboxOverride>;
  } = {};
  if (payload.boxes && Object.keys(payload.boxes).length > 0) out.boxes = payload.boxes;
  if (payload.obstacles && Object.keys(payload.obstacles).length > 0) out.obstacles = payload.obstacles;
  if (payload.entities && Object.keys(payload.entities).length > 0) out.entities = payload.entities;
  return out;
}

/**
 * Summary: Filters hitbox targets by category and free-text query.
 */
export function filterHitboxTargets(
  targets: readonly ILabHitboxTargetDef[],
  category: LabHitboxCategory,
  searchQuery: string
): ILabHitboxTargetDef[] {
  const q = searchQuery.trim().toLowerCase();
  return targets.filter((item) => {
    if (category !== 'all' && item.category !== category) return false;
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.categoryLabel.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
    );
  });
}

// Re-export live domain resolvers for Lab inspection parity checks
export { applyBoxHitboxOverride, applyObstacleHitboxOverride, getEffectiveEntityHitbox };
