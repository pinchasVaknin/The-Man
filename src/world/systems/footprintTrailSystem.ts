import type { BiomeType } from '../domain/worldTypes';
import { walkableHeightAt, getSurfaceBiomeAt, northernSnowZoneFactorAt } from './terrainAndBiomeSystem';

/**
 * Temporary Fading Footprints & Horse Hoofprints Trail System (`footprintTrailSystem.ts`)
 *
 * Renders temporary footprints (on foot) and U-shaped horse hoofprints (when mounted)
 * in mud/wet ground, sand, snow, or dirt trails wherever the player or horse steps,
 * which smoothly fade away over time (`maxAge = 16s`) to enhance world immersion.
 */

export interface FootprintDecalState {
  id: number;
  active: boolean;
  kind: 'boot' | 'hoof';
  biome: BiomeType;
  surfaceTint: 'mud_trail' | 'sand' | 'snow';
  x: number;
  y: number;
  z: number;
  yaw: number;
  isLeft: boolean;
  age: number;
  maxAge: number;
  opacity: number;
}

export interface FootprintTrailTracker {
  decals: FootprintDecalState[];
  nextSlotIndex: number;
  lastStepX: number;
  lastStepZ: number;
  stepAlternator: boolean;
  accumulatedDistance: number;
}

export const MAX_FOOTPRINT_DECALS = 96;
export const FOOTPRINT_MAX_AGE_SECONDS = 16.0;

export function createFootprintTrailTracker(
  initialX = 0,
  initialZ = 68,
  maxDecals = MAX_FOOTPRINT_DECALS
): FootprintTrailTracker {
  const decals: FootprintDecalState[] = [];
  for (let i = 0; i < maxDecals; i++) {
    decals.push({
      id: i,
      active: false,
      kind: 'boot',
      biome: 'trail',
      surfaceTint: 'mud_trail',
      x: 0,
      y: -100,
      z: 0,
      yaw: 0,
      isLeft: i % 2 === 0,
      age: 0,
      maxAge: FOOTPRINT_MAX_AGE_SECONDS,
      opacity: 0,
    });
  }
  return {
    decals,
    nextSlotIndex: 0,
    lastStepX: initialX,
    lastStepZ: initialZ,
    stepAlternator: false,
    accumulatedDistance: 0,
  };
}

/**
 * Determines whether the ground surface supports visible footprints/hoofprints
 * (sand, snow, dirt trail, wet mud near water, or soft meadow/forest soil).
 */
export function isImprintableBiomeSurface(biome: BiomeType, inWater: boolean): boolean {
  if (inWater) return true; // wet mud
  return (
    biome === 'trail' ||
    biome === 'shore' ||
    biome === 'desert' ||
    biome === 'meadow' ||
    biome === 'forest' ||
    biome === 'birch_grove' ||
    biome === 'highland'
  );
}

export function stepFootprintTrailSystem(
  tracker: FootprintTrailTracker,
  x: number,
  y: number,
  z: number,
  headingYaw: number,
  onGround: boolean,
  isFlying: boolean,
  inWater: boolean,
  isMountedOnHorse: boolean,
  rawDt: number
): { spawnedCount: number; activeCount: number } {
  const dt = Math.min(Math.max(rawDt, 0.001), 0.15);
  let spawnedCount = 0;

  // 1. Age and fade existing footprints
  let activeCount = 0;
  for (let i = 0; i < tracker.decals.length; i++) {
    const d = tracker.decals[i];
    if (!d.active) continue;
    d.age += dt;
    if (d.age >= d.maxAge) {
      d.active = false;
      d.opacity = 0;
    } else {
      // Smooth ease-out fade
      const lifeRatio = d.age / d.maxAge;
      const baseStrength =
        d.surfaceTint === 'sand' || d.surfaceTint === 'snow'
          ? 0.78
          : d.biome === 'trail'
            ? 0.68
            : 0.54;
      d.opacity = baseStrength * Math.pow(1.0 - lifeRatio, 1.35);
      activeCount++;
    }
  }

  // 2. Check if player or horse has moved a stride distance on ground
  const stepDx = x - tracker.lastStepX;
  const stepDz = z - tracker.lastStepZ;
  const distMoved = Math.hypot(stepDx, stepDz);
  tracker.lastStepX = x;
  tracker.lastStepZ = z;

  if (!onGround || isFlying || distMoved > 12.0) {
    return { spawnedCount: 0, activeCount };
  }

  tracker.accumulatedDistance += distMoved;
  const strideThreshold = isMountedOnHorse ? 1.15 : 0.92;

  if (tracker.accumulatedDistance >= strideThreshold) {
    tracker.accumulatedDistance %= strideThreshold;
    const walkInfo = walkableHeightAt(x, z, y);
    // Only imprint on natural ground (not wooden bridges or roofs)
    if (walkInfo.surface === 'ground') {
      const biome = getSurfaceBiomeAt(x, z, walkInfo.height);
      if (isImprintableBiomeSurface(biome, inWater)) {
        tracker.stepAlternator = !tracker.stepAlternator;
        const isLeft = tracker.stepAlternator;
        const lateralOffset = (isLeft ? -1 : 1) * (isMountedOnHorse ? 0.24 : 0.16);
        const rightX = Math.cos(headingYaw);
        const rightZ = -Math.sin(headingYaw);

        const printX = x + rightX * lateralOffset;
        const printZ = z + rightZ * lateralOffset;
        const printGroundY = walkableHeightAt(printX, printZ, y).height;

        const slot = tracker.decals[tracker.nextSlotIndex];
        tracker.nextSlotIndex = (tracker.nextSlotIndex + 1) % tracker.decals.length;

        const isSnow = northernSnowZoneFactorAt(printX, printZ) > 0.35 && printGroundY > 15.5;
        const isSand = biome === 'desert' || biome === 'shore';

        slot.active = true;
        slot.kind = isMountedOnHorse ? 'hoof' : 'boot';
        slot.biome = biome;
        slot.surfaceTint = isSnow ? 'snow' : isSand ? 'sand' : 'mud_trail';
        slot.x = printX;
        slot.y = printGroundY + 0.022;
        slot.z = printZ;
        slot.yaw = headingYaw;
        slot.isLeft = isLeft;
        slot.age = 0;
        slot.maxAge = FOOTPRINT_MAX_AGE_SECONDS;
        slot.opacity = isSnow || isSand ? 0.78 : 0.65;
        spawnedCount++;
        activeCount++;
      }
    }
  }

  return { spawnedCount, activeCount };
}
