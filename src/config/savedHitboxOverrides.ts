// ============================================================================
// MODULE: Config / Saved Global Hitbox Overrides
// DESIGN: Persistent source-of-truth file written directly by the Lab "Save" button
// SUMMARY: Stores user-customized global hitbox overrides (boxes, obstacles, entities)
//          so calibrated colliders persist across the entire codebase and sessions.
//          Empty object `{}` means all objects use their immutable codebase defaults.
// ============================================================================

export interface IBoxHitboxOverride {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly minY?: number;
  readonly maxY?: number;
  readonly yaw?: number;
}

export interface IObstacleHitboxOverride {
  readonly radiusScale: number;
  readonly heightScale: number;
}

export interface IEntityHitboxOverride {
  readonly radius: number;
  readonly height: number;
  readonly bodyRadius?: number;
}

export interface IHitboxOverridesPayload {
  readonly boxes?: Readonly<Record<string, IBoxHitboxOverride>>;
  readonly obstacles?: Readonly<Record<string, IObstacleHitboxOverride>>;
  readonly entities?: Readonly<Record<string, IEntityHitboxOverride>>;
}

export const SAVED_HITBOX_OVERRIDES: IHitboxOverridesPayload = {};
