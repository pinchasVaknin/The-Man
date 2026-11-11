import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateWorldObstacles } from '../../systems/terrainAndBiomeSystem';
import { createInitialPlayerState, stepPlayerPhysics } from '../../systems/playerPhysicsSystem';
import { SOLID_BUILDING_BOXES } from './collisionAndTerraces';
import { SOUTHERN_MINE_POS } from './dwarvenLandmarks';
import { MINE_KHAZAD_BRIDGE, MINE_NW_GALLERY, khazadBridgeSegment } from './dwarvenMineLayout';

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

describe('dwarvenMineGallery - Bridge of Khazad-dûm rails', () => {
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
});
