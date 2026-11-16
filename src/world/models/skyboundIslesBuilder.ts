// ============================================================================
// MODULE: World / Models / Skybound Isles
// DESIGN: Phase 1 blockout. Every shape is generated from the domain data (islands, bridges,
//         rest platforms, clouds, wind currents, chests), so the visuals can never drift from
//         the collision. Clouds get one material each because their opacity is per cloud;
//         everything else shares a handful of materials.
// SUMMARY: Builds and animates the visible archipelago: island decks with rocky undersides,
//          the bridge, rest platforms, the walkable clouds (sinking, collapsing,
//          storm warnings, phantom fading) and the moving rings that show each wind current.
//          The waterfall climb and the Sky Harbor hub (incl. the Windspire) have their own builders.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  SKYBOUND_ISLANDS,
  SKY_BRIDGES,
  SKY_REST_PLATFORMS,
  SKY_WIND_CURRENTS,
  getSkyCloudRuntimes,
  isWindCurrentActive,
  type ISkyIsland,
  type ISkyCloudRuntime,
  type ISkyWindCurrent,
  type SkyCloudKind,
} from '../domain/landmarksRegistry';
import { WORLD_BEDS, WORLD_CHESTS } from '../domain/landmarks/interactionLandmarks';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the blockout builder hands back to the frame loop. */
export interface ISkyboundIslesBuildResult {
  readonly group: THREE.Group;
  /** Animates clouds and wind rings; call once per frame while nearby. */
  readonly update: (elapsedSec: number) => void;
}

interface ICloudVisual {
  readonly group: THREE.Group;
  readonly material: THREE.MeshStandardMaterial;
  readonly drips: THREE.Mesh[];
  readonly bolt: THREE.Mesh | null;
  readonly baseOpacity: number;
}

interface IWindRingVisual {
  readonly mesh: THREE.Mesh;
  readonly current: ISkyWindCurrent;
  readonly offset: number;
}
// #endregion

// #region Palette
/** Deck and underside colours per island, giving each a distinct identity even as a blockout. */
const ISLAND_COLORS: Record<string, { deck: number; rock: number }> = {
  'sky-harbor': { deck: 0xe7e2d6, rock: 0x6b6458 },
  'floating-garden': { deck: 0x6fa54a, rock: 0x5b4a3a },
  'ancient-sky-ruins': { deck: 0x9aa392, rock: 0x4f5548 },
  'sky-observatory': { deck: 0xb9c3d6, rock: 0x4b5568 },
  'crystal-isles': { deck: 0x8e7fd0, rock: 0x3d3566 },
  'storm-island': { deck: 0x4a4f63, rock: 0x272a36 },
  'forgotten-airship': { deck: 0x8a6440, rock: 0x4a3a2c },
  'hidden-isle': { deck: 0x5fb3a6, rock: 0x2f5550 },
};

const CLOUD_COLORS: Record<SkyCloudKind, { color: number; emissive: number; emissiveIntensity: number; opacity: number }> = {
  soft: { color: 0xf8fafc, emissive: 0xdbeafe, emissiveIntensity: 0.25, opacity: 0.96 },
  charged: { color: 0xcffafe, emissive: 0x22d3ee, emissiveIntensity: 0.9, opacity: 0.94 },
  storm: { color: 0x475569, emissive: 0x1e1b4b, emissiveIntensity: 0.35, opacity: 0.95 },
  bounce: { color: 0xfce7f3, emissive: 0xf9a8d4, emissiveIntensity: 0.55, opacity: 0.98 },
  phantom: { color: 0xe9d5ff, emissive: 0xa855f7, emissiveIntensity: 0.8, opacity: 0.7 },
};

/** Puffs per cloud, as (x, y, z, scale) relative to the cloud's radius; tops sit at y = 0. */
const CLOUD_PUFFS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, -0.32, 0, 0.82],
  [0.45, -0.38, 0.3, 0.55],
  [-0.48, -0.38, -0.22, 0.55],
  [0.1, -0.4, -0.52, 0.5],
  [-0.25, -0.4, 0.5, 0.5],
];

const WIND_RINGS_PER_CURRENT = 9;
/** Seconds a wind ring needs to travel its whole path. */
const WIND_RING_TRAVEL_SEC = 4.5;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the Skybound Isles blockout and returns its frame update.
 * @param ctx Shared build context (disposal lists, software-GL flag, textures).
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildSkyboundIslesBlockout(ctx: IWorldModelBuildContext): ISkyboundIslesBuildResult {
  const group = new THREE.Group();
  group.name = 'skybound-isles';

  const shared = createSharedAssets(ctx);
  for (const isl of SKYBOUND_ISLANDS) group.add(buildIsland(ctx, shared, isl));
  for (const br of SKY_BRIDGES) group.add(buildBridge(ctx, shared, br.ax, br.ay, br.az, br.bx, br.by, br.bz, br.halfWidth));
  for (const p of SKY_REST_PLATFORMS) group.add(buildRestPlatform(shared, p.x, p.y, p.z, p.radius));
  buildChestsAndBed(shared, group);

  const cloudVisuals = getSkyCloudRuntimes().map((rt) => buildCloud(ctx, shared, rt, group));
  const windRings = buildWindRings(ctx, group);

  return {
    group,
    update: (elapsedSec: number) => {
      animateClouds(cloudVisuals, elapsedSec);
      animateWindRings(windRings, elapsedSec);
    },
  };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Shared Assets
interface ISharedAssets {
  readonly deckGeo: THREE.CylinderGeometry;
  readonly undersideGeo: THREE.ConeGeometry;
  readonly platformGeo: THREE.CylinderGeometry;
  readonly puffGeo: THREE.IcosahedronGeometry;
  readonly dripGeo: THREE.SphereGeometry;
  readonly boltGeo: THREE.ConeGeometry;
  readonly ringGeo: THREE.TorusGeometry;
  readonly boxGeo: THREE.BoxGeometry;
  readonly stoneMat: THREE.MeshStandardMaterial;
  readonly darkStoneMat: THREE.MeshStandardMaterial;
  readonly crystalMat: THREE.MeshStandardMaterial;
  readonly goldMat: THREE.MeshStandardMaterial;
  readonly woodMat: THREE.MeshStandardMaterial;
  readonly boltMat: THREE.MeshStandardMaterial;
}

function createSharedAssets(ctx: IWorldModelBuildContext): ISharedAssets {
  const deckGeo = new THREE.CylinderGeometry(1, 1, 1, 40);
  const undersideGeo = new THREE.ConeGeometry(1, 1, 18);
  undersideGeo.rotateX(Math.PI);
  const platformGeo = new THREE.CylinderGeometry(1, 0.7, 1, 16);
  const puffGeo = new THREE.IcosahedronGeometry(1, 2);
  puffGeo.scale(1, 0.5, 1);
  const dripGeo = new THREE.SphereGeometry(0.22, 6, 4);
  const boltGeo = new THREE.ConeGeometry(0.18, 2.6, 4);
  boltGeo.rotateX(Math.PI);
  const ringGeo = new THREE.TorusGeometry(1, 0.06, 6, 24);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  ctx.disposableGeometries.push(deckGeo, undersideGeo, platformGeo, puffGeo, dripGeo, boltGeo, ringGeo, boxGeo);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd6d3c8, roughness: 0.82, bumpMap: ctx.textures.rockBump, bumpScale: 0.04 });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x6b6458, roughness: 0.9, bumpMap: ctx.textures.rockBump, bumpScale: 0.08 });
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x0ea5e9, emissiveIntensity: 1.6, roughness: 0.15 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a73a, roughness: 0.35, metalness: 0.75 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.75 });
  const boltMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfde047, emissiveIntensity: 2.4 });
  ctx.disposableMaterials.push(stoneMat, darkStoneMat, crystalMat, goldMat, woodMat, boltMat);

  return { deckGeo, undersideGeo, platformGeo, puffGeo, dripGeo, boltGeo, ringGeo, boxGeo, stoneMat, darkStoneMat, crystalMat, goldMat, woodMat, boltMat };
}
// #endregion

// #region Islands And Structures
/** Deck slab whose top is exactly at `deckY`, plus a rocky cone underneath. */
function buildIsland(ctx: IWorldModelBuildContext, shared: ISharedAssets, isl: ISkyIsland): THREE.Group {
  const colors = ISLAND_COLORS[isl.id] ?? { deck: 0xd6d3c8, rock: 0x6b6458 };
  const deckMat = new THREE.MeshStandardMaterial({ color: colors.deck, roughness: 0.85 });
  const rockMat = new THREE.MeshStandardMaterial({ color: colors.rock, roughness: 0.92, bumpMap: ctx.textures.rockBump, bumpScale: 0.1 });
  ctx.disposableMaterials.push(deckMat, rockMat);

  const root = new THREE.Group();
  root.name = `island-${isl.id}`;
  const deckThickness = 2.4;
  const deck = new THREE.Mesh(shared.deckGeo, deckMat);
  deck.scale.set(isl.radius, deckThickness, isl.radius);
  deck.position.set(isl.x, isl.deckY - deckThickness / 2, isl.z);
  deck.receiveShadow = !ctx.isSoftwareGl;
  const undersideDepth = isl.radius * 1.1;
  const underside = new THREE.Mesh(shared.undersideGeo, rockMat);
  underside.scale.set(isl.radius * 0.98, undersideDepth, isl.radius * 0.98);
  underside.position.set(isl.x, isl.deckY - deckThickness - undersideDepth / 2, isl.z);
  root.add(deck, underside);
  return root;
}

/** Straight stone ramp between two rim points. */
function buildBridge(
  ctx: IWorldModelBuildContext,
  shared: ISharedAssets,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  halfWidth: number
): THREE.Mesh {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const horiz = Math.hypot(dx, dz);
  const length = Math.hypot(horiz, dy);
  const thickness = 0.6;
  const bridge = new THREE.Mesh(shared.boxGeo, shared.stoneMat);
  bridge.scale.set(length, thickness, halfWidth * 2);
  bridge.position.set((ax + bx) / 2, (ay + by) / 2 - thickness / 2, (az + bz) / 2);
  bridge.rotation.order = 'YZX';
  bridge.rotation.y = Math.atan2(-dz, dx);
  bridge.rotation.z = Math.atan2(dy, horiz);
  bridge.receiveShadow = !ctx.isSoftwareGl;
  return bridge;
}

/** Small stone disc whose top is at `y`. */
function buildRestPlatform(shared: ISharedAssets, x: number, y: number, z: number, radius: number): THREE.Mesh {
  const thickness = 1.4;
  const platform = new THREE.Mesh(shared.platformGeo, shared.darkStoneMat);
  platform.scale.set(radius, thickness, radius);
  platform.position.set(x, y - thickness / 2, z);
  return platform;
}

/** Simple chest boxes at every sky chest, and the hub's bed. */
function buildChestsAndBed(shared: ISharedAssets, group: THREE.Group): void {
  for (const chest of WORLD_CHESTS) {
    if (!chest.id.startsWith('chest-sky-')) continue;
    const body = new THREE.Mesh(shared.boxGeo, shared.woodMat);
    body.scale.set(1.45, 0.85, 0.95);
    body.position.set(chest.x, chest.y + 0.43, chest.z);
    const band = new THREE.Mesh(shared.boxGeo, shared.goldMat);
    band.scale.set(1.5, 0.12, 1.0);
    band.position.set(chest.x, chest.y + 0.7, chest.z);
    group.add(body, band);
  }
  const bed = WORLD_BEDS.find((b) => b.id === 'bed-floating-sky-sanctuary');
  if (bed) {
    const frame = new THREE.Mesh(shared.boxGeo, shared.woodMat);
    frame.scale.set(2.2, 0.55, 3.0);
    frame.position.set(bed.x, bed.y - 0.05, bed.z);
    frame.rotation.y = bed.yaw ?? 0;
    group.add(frame);
  }
}
// #endregion

// #region Clouds
function buildCloud(ctx: IWorldModelBuildContext, shared: ISharedAssets, rt: ISkyCloudRuntime, parent: THREE.Group): ICloudVisual {
  const look = CLOUD_COLORS[rt.def.kind];
  const material = new THREE.MeshStandardMaterial({
    color: look.color,
    emissive: look.emissive,
    emissiveIntensity: look.emissiveIntensity,
    roughness: 0.95,
    transparent: true,
    opacity: look.opacity,
    depthWrite: false,
  });
  ctx.disposableMaterials.push(material);

  const group = new THREE.Group();
  group.name = `cloud-${rt.def.id}`;
  const r = rt.def.radius;
  for (const [px, py, pz, ps] of CLOUD_PUFFS) {
    const puff = new THREE.Mesh(shared.puffGeo, material);
    puff.position.set(px * r, py * r * 0.6, pz * r);
    puff.scale.setScalar(ps * r * 1.15);
    group.add(puff);
  }
  const drips: THREE.Mesh[] = [];
  for (let d = 0; d < 4; d++) {
    const drip = new THREE.Mesh(shared.dripGeo, material);
    drip.visible = false;
    group.add(drip);
    drips.push(drip);
  }
  let bolt: THREE.Mesh | null = null;
  if (rt.def.kind === 'storm') {
    bolt = new THREE.Mesh(shared.boltGeo, shared.boltMat);
    bolt.position.set(0, -r * 0.55, 0);
    bolt.visible = false;
    group.add(bolt);
  }
  group.position.set(rt.def.x, rt.def.y, rt.def.z);
  parent.add(group);
  return { group, material, drips, bolt, baseOpacity: look.opacity };
}

/**
 * Sinking is shown four ways at once: the cloud drops, flattens, thins out and sheds vapour
 * drips from its underside, so the player always sees it coming before it collapses.
 */
function animateClouds(visuals: readonly ICloudVisual[], elapsedSec: number): void {
  const runtimes = getSkyCloudRuntimes();
  for (let i = 0; i < visuals.length; i++) {
    const vis = visuals[i];
    const rt = runtimes[i];
    const bob = rt.state === 'stable' ? Math.sin(elapsedSec * 1.6 + i * 0.7) * 0.06 : 0;
    vis.group.position.y = rt.def.y - rt.sinkOffset + bob;
    const squash = 1 - rt.compression * 0.45;
    const spread = 1 + rt.compression * 0.15;
    vis.group.scale.set(spread, squash, spread);
    const presence = rt.def.kind === 'phantom' ? rt.presence : 1;
    vis.material.opacity = vis.baseOpacity * rt.opacity * presence;
    vis.group.visible = vis.material.opacity > 0.02;

    const shedding = rt.state === 'compressing' || rt.state === 'sinking' || rt.state === 'collapsing';
    for (let d = 0; d < vis.drips.length; d++) {
      const drip = vis.drips[d];
      drip.visible = shedding;
      if (!shedding) continue;
      const cycle = (elapsedSec * 0.9 + d / vis.drips.length) % 1;
      const ang = d * 1.7 + i;
      const spreadR = rt.def.radius * 0.45;
      drip.position.set(Math.cos(ang) * spreadR, -rt.def.radius * 0.35 - cycle * 3.5, Math.sin(ang) * spreadR);
      drip.scale.setScalar(1 - cycle * 0.7);
    }
    if (vis.bolt) {
      vis.bolt.visible = rt.gustWarning || rt.gustActive;
      vis.bolt.scale.setScalar(rt.gustActive ? 1.4 : 0.6);
      vis.bolt.rotation.y = elapsedSec * 10 + i;
    }
  }
}
// #endregion

// #region Wind Currents
function buildWindRings(ctx: IWorldModelBuildContext, parent: THREE.Group): IWindRingVisual[] {
  const material = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
  ctx.disposableMaterials.push(material);
  const geoByRadius = new Map<number, THREE.TorusGeometry>();
  const rings: IWindRingVisual[] = [];
  for (const current of SKY_WIND_CURRENTS) {
    let geo = geoByRadius.get(current.radius);
    if (!geo) {
      geo = new THREE.TorusGeometry(current.radius * 0.8, 0.07, 6, 28);
      ctx.disposableGeometries.push(geo);
      geoByRadius.set(current.radius, geo);
    }
    for (let k = 0; k < WIND_RINGS_PER_CURRENT; k++) {
      const mesh = new THREE.Mesh(geo, material);
      parent.add(mesh);
      rings.push({ mesh, current, offset: k / WIND_RINGS_PER_CURRENT });
    }
  }
  return rings;
}

/** Rings travel along each current's path in its flow direction and face along it. */
function animateWindRings(rings: readonly IWindRingVisual[], elapsedSec: number): void {
  const tangent = new THREE.Vector3();
  for (const ring of rings) {
    const active = isWindCurrentActive(ring.current);
    ring.mesh.visible = active;
    if (!active) continue;
    const t = (elapsedSec / WIND_RING_TRAVEL_SEC + ring.offset) % 1;
    const path = ring.current.path;
    const segCount = path.length - 1;
    const segT = t * segCount;
    const s = Math.min(segCount - 1, Math.floor(segT));
    const u = segT - s;
    const a = path[s];
    const b = path[s + 1];
    ring.mesh.position.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);
    tangent.set(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
    ring.mesh.lookAt(ring.mesh.position.x + tangent.x, ring.mesh.position.y + tangent.y, ring.mesh.position.z + tangent.z);
    ring.mesh.scale.setScalar(0.75 + Math.sin(t * Math.PI) * 0.35);
  }
}
// #endregion
