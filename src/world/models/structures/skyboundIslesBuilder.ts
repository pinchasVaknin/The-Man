// ============================================================================
// MODULE: World / Models / Skybound Isles
// DESIGN: Every shape is generated from the domain data (islands, bridges, rest platforms,
//         clouds, wind currents, chests), so the visuals can never drift from the collision.
//         Islands feature multi-layered craggy cliff rims and jagged stalactite spires beneath
//         each deck; bridges feature carved stone steps, arch trusses and lantern pillars;
//         chests and the canopy bed are richly detailed multi-part models.
// SUMMARY: Builds and animates the visible archipelago: craggy floating islands, ornate stone
//          bridges, rest platforms, chests, canopy bed, walkable clouds, and wind rings.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  SKYBOUND_ISLANDS,
  SKY_BRIDGES,
  SKY_REST_PLATFORMS,
  SKY_WIND_CURRENTS,
  getSkyCloudRuntimes,
  getSkyIsland,
  isWindCurrentActive,
  type ISkyIsland,
  type ISkyCloudRuntime,
  type ISkyWindCurrent,
  type SkyCloudKind,
} from '../../domain/landmarksRegistry';
import { WORLD_CHESTS } from '../../domain/landmarks/interactionLandmarks';
import type { IWorldModelBuildContext } from '../types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the archipelago builder hands back to the frame loop. */
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
/** Deck, cliff rim, and underside colours per island, giving each a distinct biome identity. */
const ISLAND_COLORS: Record<string, { deck: number; rim: number; rock: number }> = {
  'sky-harbor': { deck: 0xe7e2d6, rim: 0xcbc3b2, rock: 0x6b6458 },
  'floating-garden': { deck: 0x5f9e42, rim: 0x4b7d34, rock: 0x544232 },
  'ancient-sky-ruins': { deck: 0x7c9068, rim: 0x627352, rock: 0x4b5344 },
  'sky-observatory': { deck: 0xb9c3d6, rim: 0x8e9bb2, rock: 0x454f63 },
  'crystal-isles': { deck: 0x583c87, rim: 0x432c68, rock: 0x2a1f4a },
  'storm-island': { deck: 0x4a4f63, rim: 0x363b4d, rock: 0x272a36 },
  'forgotten-airship': { deck: 0x8a6440, rim: 0x6e4e30, rock: 0x4a3a2c },
  'hidden-isle': { deck: 0x5fb3a6, rim: 0x438e82, rock: 0x2f5550 },
};

const CLOUD_COLORS: Record<SkyCloudKind, { color: number; emissive: number; emissiveIntensity: number; opacity: number }> = {
  soft: { color: 0xf8fafc, emissive: 0xdbeafe, emissiveIntensity: 0.28, opacity: 0.96 },
  charged: { color: 0xcffafe, emissive: 0x22d3ee, emissiveIntensity: 0.95, opacity: 0.95 },
  storm: { color: 0x475569, emissive: 0x1e1b4b, emissiveIntensity: 0.4, opacity: 0.95 },
  bounce: { color: 0xfce7f3, emissive: 0xf9a8d4, emissiveIntensity: 0.62, opacity: 0.98 },
  phantom: { color: 0xe9d5ff, emissive: 0xa855f7, emissiveIntensity: 0.85, opacity: 0.72 },
};

/** Puffs per cloud, as (x, y, z, scale) relative to the cloud's radius; tops sit at y = 0. */
const CLOUD_PUFFS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, -0.3, 0, 0.86],
  [0.46, -0.36, 0.3, 0.58],
  [-0.48, -0.36, -0.22, 0.58],
  [0.12, -0.38, -0.52, 0.52],
  [-0.25, -0.38, 0.5, 0.52],
  [0.52, -0.4, -0.28, 0.46],
  [-0.42, -0.4, 0.32, 0.46],
];

const WIND_RINGS_PER_CURRENT = 9;
const WIND_RING_TRAVEL_SEC = 4.5;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the Skybound Isles archipelago and returns its frame update.
 * @param ctx Shared build context (disposal lists, software-GL flag, textures).
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildSkyboundIslesBlockout(ctx: IWorldModelBuildContext): ISkyboundIslesBuildResult {
  const group = new THREE.Group();
  group.name = 'skybound-isles';

  const shared = createSharedAssets(ctx);
  group.add(...buildMergedIslands(ctx, shared, SKYBOUND_ISLANDS));
  for (const br of SKY_BRIDGES) group.add(buildBridge(ctx, shared, br.ax, br.ay, br.az, br.bx, br.by, br.bz, br.halfWidth));
  for (const p of SKY_REST_PLATFORMS) group.add(buildRestPlatform(shared, p.x, p.y, p.z, p.radius));
  buildStormAndHiddenDressing(ctx, shared, group);
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
  readonly stalactiteGeo: THREE.ConeGeometry;
  readonly platformGeo: THREE.CylinderGeometry;
  readonly puffGeo: THREE.IcosahedronGeometry;
  readonly dripGeo: THREE.SphereGeometry;
  readonly boltGeo: THREE.ConeGeometry;
  readonly ringGeo: THREE.TorusGeometry;
  readonly archGeo: THREE.TorusGeometry;
  readonly boxGeo: THREE.BoxGeometry;
  readonly chestLidGeo: THREE.CylinderGeometry;
  readonly stoneMat: THREE.MeshStandardMaterial;
  readonly darkStoneMat: THREE.MeshStandardMaterial;
  readonly crystalMat: THREE.MeshStandardMaterial;
  readonly goldMat: THREE.MeshStandardMaterial;
  readonly woodMat: THREE.MeshStandardMaterial;
  readonly fabricMat: THREE.MeshStandardMaterial;
  readonly boltMat: THREE.MeshStandardMaterial;
}

function createSharedAssets(ctx: IWorldModelBuildContext): ISharedAssets {
  const deckGeo = new THREE.CylinderGeometry(1, 1.04, 1, 48);
  const undersideGeo = new THREE.ConeGeometry(1, 1, 16);
  undersideGeo.rotateX(Math.PI);
  shadeRockByHeight(undersideGeo);
  const stalactiteGeo = new THREE.ConeGeometry(1, 1, 7);
  stalactiteGeo.rotateX(Math.PI);
  shadeRockByHeight(stalactiteGeo);
  const platformGeo = new THREE.CylinderGeometry(1, 0.72, 1, 24);
  const puffGeo = new THREE.IcosahedronGeometry(1, 2);
  puffGeo.scale(1, 0.5, 1);
  const dripGeo = new THREE.SphereGeometry(0.22, 6, 4);
  const boltGeo = new THREE.ConeGeometry(0.18, 2.6, 4);
  boltGeo.rotateX(Math.PI);
  const ringGeo = new THREE.TorusGeometry(1, 0.06, 8, 28);
  const archGeo = new THREE.TorusGeometry(1, 0.09, 8, 22, Math.PI);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const chestLidGeo = new THREE.CylinderGeometry(0.48, 0.48, 1.46, 12, 1, false, 0, Math.PI);
  chestLidGeo.rotateZ(Math.PI / 2);
  ctx.disposableGeometries.push(deckGeo, undersideGeo, stalactiteGeo, platformGeo, puffGeo, dripGeo, boltGeo, ringGeo, archGeo, boxGeo, chestLidGeo);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd6d3c8, roughness: 0.78, bumpMap: ctx.textures.rockBump, bumpScale: 0.04 });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x6b6458, roughness: 0.88, bumpMap: ctx.textures.rockBump, bumpScale: 0.08 });
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x0ea5e9, emissiveIntensity: 1.75, roughness: 0.14 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a73a, emissive: 0x78350f, emissiveIntensity: 0.18, roughness: 0.28, metalness: 0.82 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.75 });
  const fabricMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.25, roughness: 0.6 });
  const boltMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfde047, emissiveIntensity: 2.4 });
  ctx.disposableMaterials.push(stoneMat, darkStoneMat, crystalMat, goldMat, woodMat, fabricMat, boltMat);

  return {
    deckGeo,
    undersideGeo,
    stalactiteGeo,
    platformGeo,
    puffGeo,
    dripGeo,
    boltGeo,
    ringGeo,
    archGeo,
    boxGeo,
    chestLidGeo,
    stoneMat,
    darkStoneMat,
    crystalMat,
    goldMat,
    woodMat,
    fabricMat,
    boltMat,
  };
}
// #endregion

// #region Islands And Structures
function shadeRockByHeight(geo: THREE.BufferGeometry): void {
  const pos = geo.getAttribute('position');
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    minY = Math.min(minY, pos.getY(i));
    maxY = Math.max(maxY, pos.getY(i));
  }
  const span = Math.max(1e-6, maxY - minY);
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - minY) / span;
    const shade = 0.36 + 0.64 * t;
    colors.set([shade, shade, shade], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function paintVertices(geo: THREE.BufferGeometry, tint: THREE.Color, keepShade: boolean, tilePlanarUv = false): void {
  const pos = geo.getAttribute('position');
  const count = pos.count;
  const existing = keepShade ? (geo.getAttribute('color') as THREE.BufferAttribute | undefined) : undefined;
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const shade = existing ? existing.getX(i) : 1;
    out[i * 3] = tint.r * shade;
    out[i * 3 + 1] = tint.g * shade;
    out[i * 3 + 2] = tint.b * shade;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(out, 3));
  if (tilePlanarUv) {
    const uvs = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      uvs[i * 2] = pos.getX(i) * 0.14;
      uvs[i * 2 + 1] = pos.getZ(i) * 0.14;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }
}

/**
 * Summary: Builds every island's multi-layered cliff deck, stepped coastal collar, and craggy
 *          stalactite rock underside as two merged meshes.
 */
function buildMergedIslands(ctx: IWorldModelBuildContext, shared: ISharedAssets, islands: readonly ISkyIsland[]): THREE.Mesh[] {
  const deckThickness = 2.6;
  const deckParts: THREE.BufferGeometry[] = [];
  const rockParts: THREE.BufferGeometry[] = [];
  const unitQuat = new THREE.Quaternion();
  const rotQuat = new THREE.Quaternion();

  for (let idx = 0; idx < islands.length; idx++) {
    const isl = islands[idx];
    const colors = ISLAND_COLORS[isl.id] ?? { deck: 0xd6d3c8, rim: 0xb8b2a2, rock: 0x6b6458 };
    const deckColor = new THREE.Color(colors.deck);
    const rimColor = new THREE.Color(colors.rim);
    const rockColor = new THREE.Color(colors.rock);

    // Top walkable deck disc
    const deck = shared.deckGeo.clone();
    deck.applyMatrix4(
      new THREE.Matrix4().compose(new THREE.Vector3(isl.x, isl.deckY - deckThickness / 2, isl.z), unitQuat, new THREE.Vector3(isl.radius, deckThickness, isl.radius))
    );
    paintVertices(deck, deckColor, false, true);
    deckParts.push(deck);

    // Stepped coastal cliff ledge collar just under the top edge so the island rim looks sculpted and natural
    const collar = shared.deckGeo.clone();
    collar.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(isl.x, isl.deckY - deckThickness * 0.72, isl.z),
        unitQuat,
        new THREE.Vector3(isl.radius * 1.035, deckThickness * 0.65, isl.radius * 1.035)
      )
    );
    paintVertices(collar, rimColor, false, true);
    deckParts.push(collar);

    // Main central inverted rock mass
    const undersideDepth = isl.radius * 1.24;
    const underside = shared.undersideGeo.clone();
    underside.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(isl.x, isl.deckY - deckThickness - undersideDepth / 2, isl.z),
        unitQuat,
        new THREE.Vector3(isl.radius * 0.96, undersideDepth, isl.radius * 0.96)
      )
    );
    paintVertices(underside, rockColor, true);
    rockParts.push(underside);

    // Outer ring of 14 craggy cliff buttresses + inner ring of 8 deep hanging stalactite spires
    const outerSpireCount = 14;
    for (let s = 0; s < outerSpireCount; s++) {
      const ang = (s / outerSpireCount) * Math.PI * 2 + idx * 0.45;
      const dist = isl.radius * (0.68 + (s % 3) * 0.09);
      const spireRadius = isl.radius * (0.22 + (s % 2) * 0.08);
      const spireDepth = isl.radius * (0.58 + ((s * 3) % 4) * 0.22);
      const spire = shared.stalactiteGeo.clone();
      rotQuat.setFromEuler(new THREE.Euler(Math.sin(ang) * 0.09, s * 0.9, -Math.cos(ang) * 0.09));
      spire.applyMatrix4(
        new THREE.Matrix4().compose(
          new THREE.Vector3(isl.x + Math.cos(ang) * dist, isl.deckY - deckThickness * 0.65 - spireDepth / 2, isl.z + Math.sin(ang) * dist),
          rotQuat,
          new THREE.Vector3(spireRadius, spireDepth, spireRadius)
        )
      );
      paintVertices(spire, rockColor, true);
      rockParts.push(spire);
    }

    const innerSpireCount = 8;
    for (let s = 0; s < innerSpireCount; s++) {
      const ang = (s / innerSpireCount) * Math.PI * 2 + idx * 0.8 + 0.3;
      const dist = isl.radius * (0.34 + (s % 2) * 0.14);
      const spireRadius = isl.radius * (0.18 + (s % 3) * 0.06);
      const spireDepth = isl.radius * (0.95 + (s % 3) * 0.25);
      const spire = shared.stalactiteGeo.clone();
      rotQuat.setFromEuler(new THREE.Euler(Math.cos(ang) * 0.06, s * 1.3, Math.sin(ang) * 0.06));
      spire.applyMatrix4(
        new THREE.Matrix4().compose(
          new THREE.Vector3(isl.x + Math.cos(ang) * dist, isl.deckY - deckThickness - spireDepth / 2, isl.z + Math.sin(ang) * dist),
          rotQuat,
          new THREE.Vector3(spireRadius, spireDepth, spireRadius)
        )
      );
      paintVertices(spire, rockColor, true);
      rockParts.push(spire);
    }
  }

  const deckMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: ctx.textures.rockAlbedo,
    bumpMap: ctx.textures.rockBump,
    bumpScale: 0.055,
    roughness: 0.78,
    vertexColors: true,
  });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, bumpMap: ctx.textures.rockBump, bumpScale: 0.12, vertexColors: true });
  ctx.disposableMaterials.push(deckMat, rockMat);

  const deckGeo = mergeGeometries(deckParts, false);
  const rockGeo = mergeGeometries(rockParts, false);
  for (const g of [...deckParts, ...rockParts]) g.dispose();
  if (!deckGeo || !rockGeo) throw new Error('SKYBOUND_ISLAND_MERGE_FAILED: island parts do not share attributes');
  ctx.disposableGeometries.push(deckGeo, rockGeo);

  const deckMesh = new THREE.Mesh(deckGeo, deckMat);
  deckMesh.name = 'skybound-island-decks';
  deckMesh.receiveShadow = !ctx.isSoftwareGl;
  const rockMesh = new THREE.Mesh(rockGeo, rockMat);
  rockMesh.name = 'skybound-island-undersides';
  return [deckMesh, rockMesh];
}

/**
 * Summary: Monumental stepped stone viaduct bridge with horizontal carved stair treads,
 *          under-bridge support arches, open balustrades, lantern piers, and entry/exit portal arches.
 */
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
): THREE.Group {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const horiz = Math.hypot(dx, dz) || 1;
  const length = Math.hypot(horiz, dy);
  const yaw = Math.atan2(-dz, dx);
  const pitch = Math.atan2(dy, horiz);
  const thickness = 0.7;

  const group = new THREE.Group();
  const spanGroup = new THREE.Group();
  spanGroup.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  spanGroup.rotation.order = 'YZX';
  spanGroup.rotation.y = yaw;
  spanGroup.rotation.z = pitch;

  // Main structural viaduct carriage
  const deck = new THREE.Mesh(shared.boxGeo, shared.stoneMat);
  deck.scale.set(length, thickness, halfWidth * 2);
  deck.position.y = -thickness * 0.55;
  deck.receiveShadow = !ctx.isSoftwareGl;
  spanGroup.add(deck);

  // Under-bridge stone support arches & hanging crystal stalactites
  for (const uArch of [-0.3, 0, 0.3]) {
    const underArch = new THREE.Mesh(shared.archGeo, shared.darkStoneMat);
    underArch.scale.set(length * 0.14, 2.8, halfWidth * 1.6);
    underArch.position.set(uArch * length, -thickness - 0.1, 0);
    underArch.rotation.z = Math.PI;
    spanGroup.add(underArch);

    const dropSpire = new THREE.Mesh(shared.stalactiteGeo, shared.darkStoneMat);
    dropSpire.scale.set(0.85, 3.2, 0.85);
    dropSpire.position.set(uArch * length, -thickness - 1.8, 0);
    spanGroup.add(dropSpire);
  }

  // Open stone-and-gold balustrades along both edges of the bridge
  const balusterCount = Math.max(10, Math.floor(length / 1.5));
  for (const side of [-1, 1]) {
    const zOff = side * (halfWidth - 0.14);
    const kerb = new THREE.Mesh(shared.boxGeo, shared.darkStoneMat);
    kerb.scale.set(length, 0.24, 0.26);
    kerb.position.set(0, 0.12, zOff);
    const topRail = new THREE.Mesh(shared.boxGeo, shared.goldMat);
    topRail.scale.set(length, 0.14, 0.22);
    topRail.position.set(0, 0.92, zOff);
    spanGroup.add(kerb, topRail);

    for (let b = 1; b < balusterCount; b++) {
      const u = b / balusterCount - 0.5;
      const post = new THREE.Mesh(shared.boxGeo, shared.stoneMat);
      post.scale.set(0.18, 0.68, 0.18);
      post.position.set(u * length, 0.52, zOff);
      spanGroup.add(post);
    }
  }
  group.add(spanGroup);

  // Horizontal carved stone stair treads + golden runner inlay along the entire bridge span
  const stepCount = Math.max(16, Math.floor(horiz / 0.62));
  const stepDepth = (horiz / stepCount) * 1.15;
  const stepHeight = Math.max(0.16, Math.abs(dy) / stepCount + 0.08);
  for (let i = 0; i < stepCount; i++) {
    const u = (i + 0.5) / stepCount;
    const sx = ax + dx * u;
    const sy = ay + dy * u;
    const sz = az + dz * u;
    const tread = new THREE.Mesh(shared.boxGeo, shared.stoneMat);
    tread.scale.set(stepDepth, stepHeight, halfWidth * 1.82);
    tread.position.set(sx, sy - stepHeight * 0.5, sz);
    tread.rotation.y = yaw;
    const runner = new THREE.Mesh(shared.boxGeo, shared.goldMat);
    runner.scale.set(stepDepth * 0.92, 0.03, 1.15);
    runner.position.set(sx, sy + 0.01, sz);
    runner.rotation.y = yaw;
    group.add(tread, runner);
  }

  // Entry, mid-span, and exit lantern pillars + transition threshold arches on both island rims
  const ux = dx / horiz;
  const uz = dz / horiz;
  const px = -uz;
  const pz = ux;
  for (const [ex, ey, ez] of [
    [ax, ay, az],
    [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2],
    [bx, by, bz],
  ] as const) {
    for (const side of [-1, 1]) {
      const postX = ex + px * side * (halfWidth + 0.48);
      const postZ = ez + pz * side * (halfWidth + 0.48);
      const pillar = new THREE.Mesh(shared.boxGeo, shared.stoneMat);
      pillar.scale.set(0.72, 2.8, 0.72);
      pillar.position.set(postX, ey + 1.4, postZ);
      const cap = new THREE.Mesh(shared.boxGeo, shared.goldMat);
      cap.scale.set(0.92, 0.24, 0.92);
      cap.position.set(postX, ey + 2.88, postZ);
      const crystal = new THREE.Mesh(shared.dripGeo, shared.crystalMat);
      crystal.scale.setScalar(1.45);
      crystal.position.set(postX, ey + 3.32, postZ);
      group.add(pillar, cap, crystal);
    }
  }

  // Approach transition plazas at both bridge ends so the bridge merges cleanly into each island deck
  for (const [ex, ey, ez] of [
    [ax - ux * 1.4, ay, az - uz * 1.4],
    [bx + ux * 1.4, by, bz + uz * 1.4],
  ] as const) {
    const pad = new THREE.Mesh(shared.platformGeo, shared.stoneMat);
    pad.scale.set(halfWidth * 1.25, 0.12, halfWidth * 1.25);
    pad.position.set(ex, ey - 0.03, ez);
    const padRim = new THREE.Mesh(shared.ringGeo, shared.goldMat);
    padRim.scale.setScalar(halfWidth * 1.18);
    padRim.rotation.x = Math.PI / 2;
    padRim.position.set(ex, ey + 0.03, ez);
    group.add(pad, padRim);
  }

  return group;
}

/** Ornate stone rest platform with stalactite underside cluster, golden rim, and 4 corner rim lanterns. */
function buildRestPlatform(shared: ISharedAssets, x: number, y: number, z: number, radius: number): THREE.Group {
  const group = new THREE.Group();
  const thickness = 1.45;
  const platform = new THREE.Mesh(shared.platformGeo, shared.stoneMat);
  platform.scale.set(radius, thickness, radius);
  platform.position.set(x, y - thickness / 2, z);
  const spike = new THREE.Mesh(shared.stalactiteGeo, shared.darkStoneMat);
  spike.scale.set(radius * 0.76, radius * 1.45, radius * 0.76);
  spike.position.set(x, y - thickness - (radius * 1.45) / 2, z);
  const rim = new THREE.Mesh(shared.ringGeo, shared.goldMat);
  rim.scale.setScalar(radius * 0.96);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, y - 0.02, z);
  const innerInlay = new THREE.Mesh(shared.ringGeo, shared.goldMat);
  innerInlay.scale.setScalar(radius * 0.48);
  innerInlay.rotation.x = Math.PI / 2;
  innerInlay.position.set(x, y + 0.01, z);
  group.add(platform, spike, rim, innerInlay);

  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const subSpike = new THREE.Mesh(shared.stalactiteGeo, shared.darkStoneMat);
    subSpike.scale.set(radius * 0.28, radius * 0.85, radius * 0.28);
    subSpike.position.set(x + Math.cos(a) * radius * 0.58, y - thickness * 0.8 - radius * 0.42, z + Math.sin(a) * radius * 0.58);
    group.add(subSpike);
  }
  return group;
}

/**
 * Summary: Adds clean, uncrowded sanctuary accents to Storm Island and Hidden Isle.
 */
function buildStormAndHiddenDressing(ctx: IWorldModelBuildContext, shared: ISharedAssets, group: THREE.Group): void {
  const storm = getSkyIsland('storm-island');
  const hidden = getSkyIsland('hidden-isle');
  const shardGeo = new THREE.OctahedronGeometry(1.0, 0);
  shardGeo.scale(0.55, 1.85, 0.55);
  ctx.disposableGeometries.push(shardGeo);

  if (storm) {
    const sy = storm.deckY;
    // Central Tempest Rune Sanctuary Circle on Storm Island
    const outerRing = new THREE.Mesh(shared.ringGeo, shared.goldMat);
    outerRing.scale.setScalar(8.5);
    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.set(storm.x, sy + 0.03, storm.z);
    const innerRing = new THREE.Mesh(shared.ringGeo, shared.crystalMat);
    innerRing.scale.setScalar(4.2);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.set(storm.x, sy + 0.04, storm.z);
    group.add(outerRing, innerRing);

    // 4 clean perimeter lightning conductor pylons around the outer rim
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const r = storm.radius * 0.8;
      const px = storm.x + Math.cos(a) * r;
      const pz = storm.z + Math.sin(a) * r;

      const pylon = new THREE.Mesh(shared.boxGeo, shared.darkStoneMat);
      pylon.scale.set(0.9, 4.8, 0.9);
      pylon.position.set(px, sy + 2.4, pz);
      pylon.rotation.y = -a;
      const collar = new THREE.Mesh(shared.boxGeo, shared.goldMat);
      collar.scale.set(1.15, 0.28, 1.15);
      collar.position.set(px, sy + 4.75, pz);
      collar.rotation.y = -a;
      const crystal = new THREE.Mesh(shardGeo, shared.crystalMat);
      crystal.scale.setScalar(0.95);
      crystal.position.set(px, sy + 5.9, pz);
      group.add(pylon, collar, crystal);
    }
  }

  if (hidden) {
    const hy = hidden.deckY;
    // Clean, uncrowded Celestial Sanctuary Ring flush with the Hidden Isle deck
    const sanctumRing = new THREE.Mesh(shared.ringGeo, shared.goldMat);
    sanctumRing.scale.setScalar(hidden.radius * 0.78);
    sanctumRing.rotation.x = Math.PI / 2;
    sanctumRing.position.set(hidden.x, hy + 0.03, hidden.z);
    group.add(sanctumRing);
  }
}

/** Ornate vaulted treasure chests at every sky chest. */
function buildChestsAndBed(shared: ISharedAssets, group: THREE.Group): void {
  for (const chest of WORLD_CHESTS) {
    if (!chest.id.startsWith('chest-sky-')) continue;
    if (chest.requiresSkyPuzzle) continue;
    const chestGroup = new THREE.Group();
    chestGroup.position.set(chest.x, chest.y, chest.z);
    if (chest.id === 'chest-sky-windspire-summit') {
      // Face East (+X) toward the Windspire Summit roof entrance (`arrivalAngle = 0`)
      chestGroup.rotation.y = Math.PI / 2;
    }

    const plinth = new THREE.Mesh(shared.boxGeo, shared.darkStoneMat);
    plinth.scale.set(1.65, 0.16, 1.15);
    plinth.position.set(0, 0.08, 0);

    const body = new THREE.Mesh(shared.boxGeo, shared.woodMat);
    body.scale.set(1.45, 0.58, 0.95);
    body.position.set(0, 0.45, 0);

    const lid = new THREE.Mesh(shared.chestLidGeo, shared.woodMat);
    lid.position.set(0, 0.74, 0);

    const band = new THREE.Mesh(shared.boxGeo, shared.goldMat);
    band.scale.set(1.5, 0.12, 1.0);
    band.position.set(0, 0.72, 0);

    const lock = new THREE.Mesh(shared.boxGeo, shared.crystalMat);
    lock.scale.set(0.24, 0.28, 0.18);
    lock.position.set(0, 0.72, 0.46);

    chestGroup.add(plinth, body, lid, band, lock);
    group.add(chestGroup);
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

function animateWindRings(rings: readonly IWindRingVisual[], elapsedSec: number): void {
  const tangent = new THREE.Vector3();
  for (const ring of rings) {
    const active = isWindCurrentActive(ring.current);
    ring.mesh.visible = active;
    if (!active) continue;
    const t = (((elapsedSec / WIND_RING_TRAVEL_SEC + ring.offset) % 1) + 1) % 1;
    const path = ring.current.path;
    const segCount = path.length - 1;
    if (segCount <= 0) continue;
    const segT = t * segCount;
    const s = Math.max(0, Math.min(segCount - 1, Math.floor(segT)));
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
