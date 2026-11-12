import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generateWorldObstacles, groundHeightAt } from '../../systems/terrainAndBiomeSystem';
import { createInitialPlayerState, stepPlayerPhysics } from '../../systems/playerPhysicsSystem';
import {
  DWARVEN_RIDEABLE_MINECART_LINES,
  isInsideSouthernMine,
  southernMineWalkableHeightAt,
} from '../../systems/dwarvenMineAndCaravanSystem';
import { markOutdoorRoots, OUTDOOR_LAYER } from '../../controllers/undergroundCulling';
import { SOLID_BUILDING_BOXES } from './collisionAndTerraces';
import { SOUTHERN_MINE_POS } from './dwarvenLandmarks';
import {
  MINE_KHAZAD_BRIDGE,
  MINE_MORIA_PILLARS,
  MINE_NW_GALLERY,
  MINE_SOUTH_GALLERY,
  khazadBridgeSegment,
  southGalleryWalkableHeightAt,
} from './dwarvenMineLayout';

function idle(forward: number) {
  return {
    forward,
    right: 0,
    sprint: false,
    relaxed: false,
    jumpPressed: false,
    jumpHeld: false,
    toggleFlyRequested: false,
    toggleMountHorseRequested: false,
    lookYawDelta: 0,
    lookPitchDelta: 0,
  };
}

describe('dwarvenMineGallery - north-west gallery stairs', () => {
  it('should not give the gallery or its steps solid boxes, since they are walkable heights', () => {
    const solid = SOLID_BUILDING_BOXES.filter((b) => b.id.includes('nw-gallery'));
    assert.equal(solid.length, 0);
  });

  it('should let the player walk up the stairs onto the gallery top', () => {
    const obstacles = generateWorldObstacles();
    const gz = SOUTHERN_MINE_POS.entranceZ + MINE_NW_GALLERY.lz;
    const gx = SOUTHERN_MINE_POS.x + MINE_NW_GALLERY.lx;
    const state = createInitialPlayerState();
    state.x = SOUTHERN_MINE_POS.x + MINE_NW_GALLERY.lx - MINE_NW_GALLERY.width / 2 - MINE_NW_GALLERY.stepCount * MINE_NW_GALLERY.stepRun - 3.0;
    state.z = gz;
    state.y = SOUTHERN_MINE_POS.cavernFloorY;
    state.yaw = -Math.PI / 2; // face +x

    for (let i = 0; i < 12 * 60 && state.x < gx; i++) {
      stepPlayerPhysics(state, idle(1), obstacles, 1 / 60);
    }

    assert.ok(
      Math.abs(state.y - MINE_NW_GALLERY.topY) < 0.1,
      `Player should stand on the gallery top ${MINE_NW_GALLERY.topY}, got y ${state.y.toFixed(2)} at x ${state.x.toFixed(2)}`
    );
  });
});

describe('dwarvenMineGallery - Bridge of Khazad-dûm rails & side minecart track', () => {
  it('should have a rail collider on each edge for every deck segment, at the deck height', () => {
    const rails = SOLID_BUILDING_BOXES.filter((b) => b.id.startsWith('southern-mine-khazad-rail-'));
    assert.equal(rails.length, MINE_KHAZAD_BRIDGE.segments * 2);

    for (let s = 0; s < MINE_KHAZAD_BRIDGE.segments; s++) {
      const seg = khazadBridgeSegment(s);
      for (const side of [-1, 1]) {
        const x = SOUTHERN_MINE_POS.x + side * MINE_KHAZAD_BRIDGE.railX;
        const rail = rails.find(
          (b) => Math.abs((b.minX + b.maxX) / 2 - x) < 1e-9 && b.minZ < SOUTHERN_MINE_POS.entranceZ + seg.bz && b.maxZ > SOUTHERN_MINE_POS.entranceZ + seg.bz
        );
        assert.ok(rail, `Missing rail at side ${side} for segment ${s}`);
        assert.equal(rail.minY, seg.deckY);
      }
    }
  });

  it('should route the Moria rideable minecart along the west side of the enlarged bridge', () => {
    const moriaLine = DWARVEN_RIDEABLE_MINECART_LINES.find((l) => l.id === 'minecart-line-moria');
    assert.ok(moriaLine);
    const bridgeWaypoints = moriaLine.localWaypoints.filter(
      ([, , lz]) => lz >= MINE_KHAZAD_BRIDGE.lzStart && lz <= MINE_KHAZAD_BRIDGE.lzEnd
    );
    assert.ok(bridgeWaypoints.length >= 3);
    for (const [lx] of bridgeWaypoints) {
      assert.equal(lx, MINE_KHAZAD_BRIDGE.trackLx);
      assert.ok(Math.abs(lx) < MINE_KHAZAD_BRIDGE.halfW);
    }
  });
});

describe('dwarvenMineGallery - Great Hall expansion, middle staircase, exits & non-protruding hitboxes', () => {
  it('should keep all subterranean mine colliders below the surface terrain above them', () => {
    const subterraneanBoxes = SOLID_BUILDING_BOXES.filter(
      (b) => b.id.startsWith('southern-mine-') && !b.id.startsWith('southern-mine-portal-')
    );
    assert.ok(subterraneanBoxes.length > 40);
    for (const b of subterraneanBoxes) {
      assert.ok(!Number.isNaN(b.minX) && !Number.isNaN(b.maxX) && !Number.isNaN(b.minZ) && !Number.isNaN(b.maxZ), `NaN bounds on ${b.id}`);
      const cx = (b.minX + b.maxX) * 0.5;
      const cz = (b.minZ + b.maxZ) * 0.5;
      const surfaceY = groundHeightAt(cx, cz);
      assert.ok(
        (b.maxY ?? -Infinity) <= surfaceY + 0.05,
        `Mine collider ${b.id} protrudes above ground: maxY=${b.maxY} > surfaceY=${surfaceY.toFixed(2)} at (${cx.toFixed(1)}, ${cz.toFixed(1)})`
      );
    }
  });

  it('should descend 19m in the South Gallery with a flat middle stair landing and taller 24m Moria pillars', () => {
    assert.equal(SOUTHERN_MINE_POS.moriaHallFloorY, -28.35);
    assert.equal(SOUTHERN_MINE_POS.moriaAbyssBottomY, -68.35);
    assert.equal(MINE_MORIA_PILLARS.height, 24.0);
    // Flat landing in the middle of the pedestrian staircase (lz in 126..134)
    assert.equal(southGalleryWalkableHeightAt(4.0, 127.0), MINE_SOUTH_GALLERY.landingY);
    assert.equal(southGalleryWalkableHeightAt(4.0, 133.0), MINE_SOUTH_GALLERY.landingY);
    // Enlarged 68m-long abyss drops to -68.35 off the bridge
    assert.equal(
      southernMineWalkableHeightAt(SOUTHERN_MINE_POS.x + 15.0, SOUTHERN_MINE_POS.entranceZ + 232.0),
      SOUTHERN_MINE_POS.moriaAbyssBottomY
    );
  });

  it('should provide two exits from the Great Hall, with the West exit bifurcating into two chambers', () => {
    const mx = SOUTHERN_MINE_POS.x;
    const mz = SOUTHERN_MINE_POS.entranceZ;
    const y = SOUTHERN_MINE_POS.moriaHallFloorY + 1.0;
    // West Stem & Hub
    assert.equal(isInsideSouthernMine(mx - 85.0, mz + 183.0, y), true);
    assert.equal(isInsideSouthernMine(mx - 116.0, mz + 183.0, y), true);
    // North Branch -> Hall of the Mountain Kings
    assert.equal(isInsideSouthernMine(mx - 118.0, mz + 156.0, y), true);
    assert.equal(isInsideSouthernMine(mx - 129.0, mz + 125.0, y), true);
    // South Branch -> Abyssal Crystal Sanctum
    assert.equal(isInsideSouthernMine(mx - 118.0, mz + 208.0, y), true);
    assert.equal(isInsideSouthernMine(mx - 129.0, mz + 242.0, y), true);
    // East Exit Tunnel -> Dragon-Forge & Titan Anvil Vault
    assert.equal(isInsideSouthernMine(mx + 84.0, mz + 183.0, y), true);
    assert.equal(isInsideSouthernMine(mx + 126.0, mz + 183.0, y), true);
  });

  it('should keep dwarven miners, wildlife, horses, and F3 collider wireframes on Layer 0 when marking outdoor roots', () => {
    const scene = new THREE.Scene();
    const terrain = new THREE.Group();
    terrain.name = 'terrain-chunk';
    const dwarf = new THREE.Group();
    dwarf.name = 'dwarven-miner-0';
    const wildlife = new THREE.Group();
    wildlife.name = 'WildlifeAndFootprintsLayer';
    const wireframes = new THREE.Group();
    wireframes.name = 'ColliderDebugWireframes';
    scene.add(terrain, dwarf, wildlife, wireframes);

    markOutdoorRoots(scene, new Set());
    assert.equal(terrain.layers.test(new THREE.Layers()), false);
    const outdoorLayers = new THREE.Layers();
    outdoorLayers.set(OUTDOOR_LAYER);
    assert.equal(terrain.layers.test(outdoorLayers), true);
    assert.equal(dwarf.layers.test(new THREE.Layers()), true);
    assert.equal(wildlife.layers.test(new THREE.Layers()), true);
    assert.equal(wireframes.layers.test(new THREE.Layers()), true);
  });
});

