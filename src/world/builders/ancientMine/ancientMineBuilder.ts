// ============================================================================
// MODULE: World / Builders / Ancient Mine
// DESIGN: Turns the pure greybox buffers and layout data into THREE objects under one group.
//         Landmarks are clean placeholders sized from the layout, ready to be replaced by
//         detailed models without moving anything. Lights are hidden candidates for the
//         existing nearest-8 mine light pool.
// SUMMARY: Builds the Ancient Dwarven Mine scene group (named 'southern-mine' so culling and
//          atmosphere keep treating it as the mine) and its per-frame animation.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  ANCIENT_MINE_ORIGIN,
  GUARD_RAIL_HEIGHT,
  HERO_STATUES,
  LAVA_POOL,
  LAVA_STEPPING_STONES,
  MINE_GUARD_RAILS,
  MINE_LEVEL_Y,
  MINE_POI,
  MINE_SOLID_FIXTURES,
  MINE_SURFACES,
  MINE_WATERFALLS,
  TREASURE_ISLAND,
  type IMineSurface,
} from '../../domain/landmarks/ancientMine/ancientMineLayout';
import { sampleAncientMineFloor } from '../../domain/landmarks/ancientMine/ancientMineFloor';
import { ALL_MINE_PROPS } from '../../domain/landmarks/ancientMine/ancientMineProps';
import { buildAncientMineGreybox, type IGreyboxBuffers } from './ancientMineGreybox';
import { addMineProps, addRockDressing } from './mineDressing';
import { mergeStaticChildren } from './staticMeshMerger';
import { MINE_PALETTE } from './propGeometries';
import { buildDeepLevelSetPieces } from './deepLevelSetPieces';
import { buildLowerLevelSetPieces } from './lowerLevelSetPieces';
import { buildMineDwarvesAi } from './mineDwarvesAi';
import { buildUpperLevelSetPieces } from './upperLevelSetPieces';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the mine builder needs from the world build. */
export interface IAncientMineBuildContext {
  readonly disposableGeometries: THREE.BufferGeometry[];
  readonly disposableMaterials: THREE.Material[];
  readonly disposableTextures: THREE.Texture[];
  readonly lanternLights: THREE.PointLight[];
  /** Summary: Rock albedo used on floors, walls and boulders (cloned, tiled per meter). */
  readonly rockTexture: THREE.Texture;
  /** Summary: Wood albedo used on timber set pieces (cloned). */
  readonly timberTexture: THREE.Texture;
}

/** Summary: The built mine and its per-frame update. */
export interface IAncientMineHandle {
  readonly group: THREE.Group;
  readonly update: (elapsedTime: number) => void;
}
// #endregion

// #region Constants
/** Summary: Name the culling and atmosphere controllers use to recognise the mine root. */
const MINE_GROUP_NAME = 'southern-mine';

/** Summary: Placeholder lights per area: position (local), colour and intensity. */
const AREA_LIGHTS: ReadonlyArray<{ lx: number; y: number; lz: number; color: number; intensity: number }> = [
  { lx: 0, y: MINE_LEVEL_Y.overlook + 3, lz: 10, color: 0xffb060, intensity: 6 },
  { lx: 0, y: MINE_LEVEL_Y.upperCavern + 6, lz: 70, color: 0xffa040, intensity: 8 },
  { lx: -35, y: MINE_LEVEL_Y.upperCavern + 4, lz: 102, color: 0xff9030, intensity: 6 },
  { lx: -80, y: MINE_LEVEL_Y.upperCavern + 5, lz: 72, color: 0x60d0ff, intensity: 7 },
  { lx: 90, y: MINE_LEVEL_Y.upperCavern + 5, lz: 60, color: 0xffc070, intensity: 6 },
  { lx: 88, y: MINE_LEVEL_Y.upperCavern + 4, lz: 128, color: 0xff6a1a, intensity: 9 },
  { lx: 0, y: MINE_LEVEL_Y.descentLanding1 + 3, lz: 142, color: 0xffa040, intensity: 6 },
  { lx: 0, y: MINE_LEVEL_Y.chasmLedge + 4, lz: 198, color: 0x8aa0c8, intensity: 7 },
  { lx: 0, y: MINE_LEVEL_Y.chasmLedge + 3, lz: 250, color: 0xffa040, intensity: 6 },
  { lx: -102, y: MINE_LEVEL_Y.heroesMidLanding + 4, lz: 252, color: 0xffcc66, intensity: 7 },
  { lx: 0, y: MINE_LEVEL_Y.kingBalcony + 4, lz: 299, color: 0xffd080, intensity: 8 },
  { lx: 0, y: MINE_LEVEL_Y.chasmLedge + 6, lz: 334, color: 0x4aa8ff, intensity: 8 },
  { lx: 0, y: MINE_LEVEL_Y.forgeFloor + 6, lz: 368, color: 0xff8a3a, intensity: 6 },
  { lx: 0, y: MINE_LEVEL_Y.forgeFloor + 5, lz: 432, color: 0xff4a10, intensity: 12 },
  { lx: 12, y: MINE_LEVEL_Y.vaultFloor + 6, lz: 490, color: 0xffd258, intensity: 10 },
];
// #endregion

// ======================== PUBLIC BUILD ======================== \\
// #region Build Ancient Mine
/**
 * Summary: Builds the greybox Ancient Dwarven Mine and returns its group and frame update.
 * Design: Two merged greybox meshes (floors, rock) carry almost all geometry in two draw calls.
 *         Repeated pieces (rails, stones) are instanced. Everything is in the local frame under
 *         a group placed at ANCIENT_MINE_ORIGIN.
 * @param ctx Disposal lists and the mine light candidate list.
 * @returns The mine group (not yet added to the scene) and its update function.
 */
export function buildAncientMine(ctx: IAncientMineBuildContext): IAncientMineHandle {
  const group = new THREE.Group();
  group.name = MINE_GROUP_NAME;
  group.position.set(ANCIENT_MINE_ORIGIN.x, 0, ANCIENT_MINE_ORIGIN.z);

  const own = <T extends THREE.BufferGeometry>(g: T): T => (ctx.disposableGeometries.push(g), g);
  const mat = <T extends THREE.Material>(m: T): T => (ctx.disposableMaterials.push(m), m);

  const tiled = (source: THREE.Texture): THREE.Texture => {
    const t = source.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 1);
    t.needsUpdate = true;
    ctx.disposableTextures.push(t);
    return t;
  };
  const rockMap = tiled(ctx.rockTexture);
  const timberMap = tiled(ctx.timberTexture);

  // Floors and rock from the layout data, textured with world-scaled UVs.
  const greybox = buildAncientMineGreybox();
  const floorMat = mat(new THREE.MeshStandardMaterial({ vertexColors: true, map: rockMap, roughness: 0.92, side: THREE.DoubleSide }));
  const rockMat = mat(new THREE.MeshStandardMaterial({ vertexColors: true, map: rockMap, roughness: 1.0, side: THREE.DoubleSide }));
  group.add(meshFromBuffers(own(geometryFromBuffers(greybox.floors)), floorMat, 'ancient-mine-floors'));
  group.add(meshFromBuffers(own(geometryFromBuffers(greybox.rock)), rockMat, 'ancient-mine-rock'));

  const torchFlameGeo = own(new THREE.ConeGeometry(0.16, 0.5, 6));
  const emberMat = mat(new THREE.MeshBasicMaterial({ color: MINE_PALETTE.ember }));
  const addTorch = (x: number, y: number, z: number, color = 0xff9a30, intensity = 5.5): void => {
    const flame = new THREE.Mesh(torchFlameGeo, emberMat);
    flame.position.set(x, y, z);
    group.add(flame);
    addCandidateLight(group, ctx.lanternLights, x, y + 0.4, z, color, intensity);
  };

  const setPieceMaterials = {
    stone: mat(new THREE.MeshStandardMaterial({ color: MINE_PALETTE.granite, map: rockMap, roughness: 0.9 })),
    darkStone: mat(new THREE.MeshStandardMaterial({ color: MINE_PALETTE.darkGranite, map: rockMap, roughness: 0.95 })),
    iron: mat(new THREE.MeshStandardMaterial({ color: MINE_PALETTE.iron, metalness: 0.6, roughness: 0.5 })),
    wood: mat(new THREE.MeshStandardMaterial({ color: 0xb08a68, map: timberMap, roughness: 0.85 })),
    gold: mat(new THREE.MeshStandardMaterial({ color: MINE_PALETTE.gold, emissive: 0x3a2400, metalness: 0.8, roughness: 0.35 })),
    ember: emberMat,
    molten: mat(new THREE.MeshStandardMaterial({ color: 0xff8a20, emissive: 0xff5a00, emissiveIntensity: 1.8 })),
    void: mat(new THREE.MeshBasicMaterial({ color: 0x050404 })),
    water: mat(new THREE.MeshStandardMaterial({ color: 0x2fa8c0, transparent: true, opacity: 0.75 })),
    statue: mat(new THREE.MeshStandardMaterial({ vertexColors: true, map: rockMap, roughness: 0.85 })),
  };
  const setPieceContext = {
    group,
    materials: setPieceMaterials,
    own,
    ownMaterial: (...materials: THREE.Material[]): void => {
      for (const m of materials) mat(m);
    },
    addTorch,
    addLight: (x: number, y: number, z: number, color: number, intensity: number): void =>
      addCandidateLight(group, ctx.lanternLights, x, y, z, color, intensity),
  };
  const updateUpperLevel = buildUpperLevelSetPieces(setPieceContext);
  const updateLowerLevel = buildLowerLevelSetPieces(setPieceContext);
  const updateDeepLevel = buildDeepLevelSetPieces(setPieceContext, ctx.disposableTextures);
  const updateMineDwarvesAi = buildMineDwarvesAi(setPieceContext);

  const dressing = {
    group,
    own,
    propMaterial: mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.15 })),
    glowPropMaterial: mat(
      new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.3 })
    ),
    rockMaterial: mat(new THREE.MeshStandardMaterial({ color: 0x6a625a, map: rockMap, roughness: 1.0, side: THREE.DoubleSide })),
    addTorch,
  };
  addMineProps(dressing, ALL_MINE_PROPS);
  addRockDressing(dressing, greybox.wallFeet);

  addKingBalcony(group, own, mat);
  const fallMap = addWaterAndLava(group, own, mat, ctx.disposableTextures);
  addGuardRails(group, own, mat);
  addFixturePlaceholders(group, own, mat);
  addLights(group, ctx.lanternLights);
  // Bake the many static set-piece meshes into one draw call per material.
  mergeStaticChildren(group, own);

  const update = (elapsedTime: number): void => {
    updateUpperLevel(elapsedTime);
    updateLowerLevel(elapsedTime);
    fallMap.offset.y = -elapsedTime * 0.9;
    updateDeepLevel(elapsedTime);
    updateMineDwarvesAi(elapsedTime);
  };

  return { group, update };
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Greybox Meshes
function geometryFromBuffers(b: IGreyboxBuffers): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(b.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(b.normals, 3));
  g.setAttribute('color', new THREE.BufferAttribute(b.colors, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(b.uvs, 2));
  g.computeBoundingSphere();
  return g;
}

function meshFromBuffers(g: THREE.BufferGeometry, m: THREE.Material, name: string): THREE.Mesh {
  const mesh = new THREE.Mesh(g, m);
  mesh.name = name;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  return mesh;
}

type Own = <T extends THREE.BufferGeometry>(g: T) => T;
type Mat = <T extends THREE.Material>(m: T) => T;

function rectOf(surface: IMineSurface): { minLx: number; maxLx: number; minLz: number; maxLz: number } {
  if (surface.footprint.kind !== 'rect') throw new Error(`MINE_SURFACE_NOT_RECT: ${surface.id}`);
  return surface.footprint;
}

/** Summary: Layer-1 floors (the king balcony) as solid slabs; the greybox only meshes layer 0. */
function addKingBalcony(group: THREE.Group, own: Own, mat: Mat): void {
  const slabMat = mat(new THREE.MeshStandardMaterial({ color: 0x9e8c62, roughness: 0.85 }));
  for (const surface of MINE_SURFACES) {
    if (surface.layer !== 1 || surface.height.kind !== 'flat') continue;
    const r = rectOf(surface);
    const thickness = 1.0;
    const slab = new THREE.Mesh(own(new THREE.BoxGeometry(r.maxLx - r.minLx, thickness, r.maxLz - r.minLz)), slabMat);
    slab.position.set((r.minLx + r.maxLx) / 2, surface.height.y - thickness / 2, (r.minLz + r.maxLz) / 2);
    group.add(slab);
  }
}
// #endregion

// #region Water And Lava
/** Summary: Vertical streak texture that scrolls down the waterfall sheets. */
function createFallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  if (c !== null) {
    c.fillStyle = 'rgba(190,235,250,0.55)';
    c.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = 'rgba(255,255,255,' + (0.15 + ((i * 37) % 50) / 100) + ')';
      c.fillRect((i * 23) % 64, (i * 41) % 128, 2 + (i % 3), 18 + (i % 5) * 8);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  return texture;
}

/** Summary: Water planes, lagoon foam and scrolling waterfall sheets; returns the fall texture to animate. */
function addWaterAndLava(group: THREE.Group, own: Own, mat: Mat, textures: THREE.Texture[]): THREE.Texture {
  const waterMat = mat(
    new THREE.MeshStandardMaterial({ color: 0x2fa8c0, emissive: 0x0a3c48, transparent: true, opacity: 0.78, roughness: 0.2 })
  );
  for (const surface of MINE_SURFACES) {
    if (surface.material !== 'water' || surface.waterSurfaceY === undefined) continue;
    const fp = surface.footprint;
    let plane: THREE.Mesh;
    if (fp.kind === 'ellipse') {
      plane = new THREE.Mesh(own(new THREE.CircleGeometry(1, 48)), waterMat);
      plane.scale.set(fp.rx, fp.rz, 1);
      plane.position.set(fp.lx, surface.waterSurfaceY, fp.lz);
    } else {
      const r = rectOf(surface);
      plane = new THREE.Mesh(own(new THREE.PlaneGeometry(r.maxLx - r.minLx, r.maxLz - r.minLz)), waterMat);
      plane.position.set((r.minLx + r.maxLx) / 2, surface.waterSurfaceY, (r.minLz + r.maxLz) / 2);
    }
    plane.rotation.x = -Math.PI / 2;
    plane.name = `ancient-mine-water-${surface.id}`;
    group.add(plane);
  }

  const fallMap = createFallTexture();
  textures.push(fallMap);
  const fallMat = mat(
    new THREE.MeshBasicMaterial({ map: fallMap, color: 0xd8f4ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
  );
  const foamMat = mat(new THREE.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.45, depthWrite: false }));
  for (const fall of MINE_WATERFALLS) {
    const height = fall.topY - fall.bottomY;
    const sheet = new THREE.Mesh(own(new THREE.PlaneGeometry(fall.width, height)), fallMat);
    sheet.position.set(fall.lx, fall.bottomY + height / 2, fall.lz);
    // Falls on the side walls face across the chasm; the others face north toward the player.
    sheet.rotation.y = Math.abs(fall.lx) > 90 ? Math.PI / 2 : 0;
    sheet.name = `ancient-mine-fall-${fall.id}`;
    group.add(sheet);
    if (fall.bottomY > MINE_LEVEL_Y.abyssBottom) {
      const foam = new THREE.Mesh(own(new THREE.CircleGeometry(fall.width * 0.7, 20)), foamMat);
      foam.rotation.x = -Math.PI / 2;
      foam.position.set(fall.lx + 1.5, fall.bottomY + 0.03, fall.lz);
      group.add(foam);
    }
  }
  return fallMap;
}
// #endregion

// #region Rails
/** Summary: Length of one drawn parapet piece, meters; short enough to follow a stair flight. */
const RAIL_SEGMENT_LENGTH = 1.0;

/**
 * Summary: All guard rails as one instanced mesh of parapet pieces.
 * Design: Each rail is cut into RAIL_SEGMENT_LENGTH pieces whose top follows the higher floor
 *         beside it, so rails along stairs step down with the treads instead of floating level.
 */
function addGuardRails(group: THREE.Group, own: Own, mat: Mat): void {
  const railMat = mat(new THREE.MeshStandardMaterial({ color: 0x6d655a, roughness: 0.9 }));
  const pieces: Array<{ x: number; z: number; topY: number; lengthX: number; lengthZ: number }> = [];
  for (const rail of MINE_GUARD_RAILS) {
    const count = Math.max(1, Math.ceil((rail.to - rail.from) / RAIL_SEGMENT_LENGTH));
    const step = (rail.to - rail.from) / count;
    const isAcrossX = rail.axis === 'lx';
    for (let k = 0; k < count; k++) {
      const along = rail.from + (k + 0.5) * step;
      const x = isAcrossX ? rail.at : along;
      const z = isAcrossX ? along : rail.at;
      const side = isAcrossX ? [0.3, 0] : [0, 0.3];
      // The protected floor is the higher of the two sides that lies within the rail's band.
      const floorY = Math.max(
        floorWithin(x - side[0], z - side[1], rail.minY, rail.maxY),
        floorWithin(x + side[0], z + side[1], rail.minY, rail.maxY)
      );
      if (floorY === -Infinity) continue;
      pieces.push({ x, z, topY: floorY + GUARD_RAIL_HEIGHT, lengthX: isAcrossX ? 0.4 : step, lengthZ: isAcrossX ? step : 0.4 });
    }
  }
  const rails = new THREE.InstancedMesh(own(new THREE.BoxGeometry(1, 1, 1)), railMat, pieces.length);
  const dummy = new THREE.Object3D();
  pieces.forEach((p, i) => {
    dummy.position.set(p.x, p.topY - GUARD_RAIL_HEIGHT / 2, p.z);
    dummy.scale.set(p.lengthX, GUARD_RAIL_HEIGHT, p.lengthZ);
    dummy.updateMatrix();
    rails.setMatrixAt(i, dummy.matrix);
  });
  rails.instanceMatrix.needsUpdate = true;
  rails.name = 'ancient-mine-guard-rails';
  group.add(rails);
}

/** Summary: Floor height at a point among the floors inside a rail's band, or -Infinity. */
function floorWithin(lx: number, lz: number, minY: number, maxY: number): number {
  const top = maxY - GUARD_RAIL_HEIGHT;
  const sample = sampleAncientMineFloor(lx, lz, top);
  return sample !== null && sample.height >= minY && sample.height <= top + 0.01 ? sample.height : -Infinity;
}
// #endregion

// #region Fixture Placeholders
/**
 * Summary: Placeholder boxes for solid fixtures that no set-piece builder draws yet.
 * Design: Fixtures marked 'custom' are drawn by the level set pieces; anything else still gets a
 *         correctly sized box so its collider is never invisible.
 */
function addFixturePlaceholders(group: THREE.Group, own: Own, mat: Mat): void {
  const looks = {
    stone: mat(new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.9 })),
    darkStone: mat(new THREE.MeshStandardMaterial({ color: 0x3c3532, roughness: 0.95 })),
    iron: mat(new THREE.MeshStandardMaterial({ color: 0x3a3a40, metalness: 0.6, roughness: 0.5 })),
    wood: mat(new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.9 })),
    gold: mat(new THREE.MeshStandardMaterial({ color: 0xd8a640, metalness: 0.8, roughness: 0.35 })),
  } as const;
  for (const f of MINE_SOLID_FIXTURES) {
    if (f.look === 'custom') continue;
    const mesh = new THREE.Mesh(own(new THREE.BoxGeometry(f.halfX * 2, f.height, f.halfZ * 2)), looks[f.look]);
    mesh.position.set(f.lx, f.baseY + f.height / 2, f.lz);
    group.add(mesh);
  }
}
// #endregion

// #region Lights
/** Summary: Hidden candidate lights; the existing mine light pool enables the nearest ones. */
function addLights(group: THREE.Group, lanternLights: THREE.PointLight[]): void {
  for (const l of AREA_LIGHTS) addCandidateLight(group, lanternLights, l.lx, l.y, l.lz, l.color, l.intensity);
}

/** Summary: One hidden candidate light for the nearest-lights mine pool. */
function addCandidateLight(
  group: THREE.Group,
  lanternLights: THREE.PointLight[],
  x: number,
  y: number,
  z: number,
  color: number,
  intensity: number
): void {
  const light = new THREE.PointLight(color, intensity, 40, 1.1);
  light.visible = false;
  light.position.set(x, y, z);
  light.userData.isUndergroundMineLight = true;
  light.userData.baseIntensity = intensity;
  group.add(light);
  lanternLights.push(light);
}
// #endregion
