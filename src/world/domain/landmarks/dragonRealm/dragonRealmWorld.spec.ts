import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DRAGON_PORTAL_SHRINE_POS,
  DRAGON_REALM_ARRIVAL_DAIS,
  DRAGON_REALM_GUARDIAN_SPAWNS,
  DRAGON_REALM_NORTH_THRONE,
  DRAGON_REALM_ORIGIN,
  DRAGON_REALM_PLAZA,
  DRAGON_REALM_SPAWN_POS,
  DRAGON_SURFACE_RETURN_POS,
} from './dragonRealmLayout';
import {
  DRAGON_REALM_COLLIDER_BOXES,
  clampInsideDragonRealmBounds,
  dragonRealmWalkableHeightAt,
  getDragonPortalDebugOverride,
  getRealmReturnMirrorPortalWorldPos,
  getSurfaceDragonMirrorPortalWorldPos,
  isGreenDragonDefeated,
  isInsideDragonRealm,
  isInsideNorthernShrineGliderThermal,
  isPlayerInsideRealmReturnThreshold,
  isPlayerInsideSurfacePortalThreshold,
  isPlayerNearRealmReturnPortal,
  isPlayerNearSurfaceDragonPortal,
  isSurfaceDragonPortalActive,
  resetDragonPortalDebugOverride,
  setDragonPortalDebugOverride,
  surfaceDragonShrineHeightAt,
  toggleDragonPortalDebug,
} from './dragonRealmWorld';

import {
  createInitialWildlifeState,
  getAnimalMaxHp,
  getAnimalSpeciesName,
  stepBoidsAndWildlife,
} from '../../../systems/boidsAndWildlifeSystem';
import {
  createInitialPlayerState,
  createInitialRideableHorses,
  stepPlayerPhysics,
} from '../../../systems/playerPhysicsSystem';
import { getEffectiveEntityHitbox, WILDLIFE_SPECIES_TO_ENTITY_ID } from '../../hitboxOverrides';

describe('dragonRealmWorld', () => {
  it('isolates the Dragon Realm well outside main playable world', () => {
    assert.ok(DRAGON_REALM_ORIGIN.x > 1400);
    assert.equal(isInsideDragonRealm(0, 32, 2), false);
    assert.equal(isInsideDragonRealm(DRAGON_PORTAL_SHRINE_POS.x, DRAGON_PORTAL_SHRINE_POS.z, 2), false);
    assert.equal(
      isInsideDragonRealm(DRAGON_REALM_SPAWN_POS.x, DRAGON_REALM_SPAWN_POS.z, DRAGON_REALM_SPAWN_POS.y),
      true
    );
  });

  it('provides continuous walkable terrain from arrival dais across bridge to plaza, flanking daises, and north throne', () => {
    const arrivalH = dragonRealmWalkableHeightAt(
      DRAGON_REALM_ORIGIN.x + DRAGON_REALM_ARRIVAL_DAIS.lx,
      DRAGON_REALM_ORIGIN.z + DRAGON_REALM_ARRIVAL_DAIS.lz,
      DRAGON_REALM_ORIGIN.y
    );
    assert.ok(arrivalH !== null && Math.abs(arrivalH - DRAGON_REALM_ORIGIN.y) < 0.01);

    const bridgeMidH = dragonRealmWalkableHeightAt(DRAGON_REALM_ORIGIN.x, DRAGON_REALM_ORIGIN.z + 28);
    assert.ok(bridgeMidH !== null && bridgeMidH > DRAGON_REALM_ORIGIN.y + 1.0);

    const plazaH = dragonRealmWalkableHeightAt(
      DRAGON_REALM_ORIGIN.x + DRAGON_REALM_PLAZA.lx,
      DRAGON_REALM_ORIGIN.z + DRAGON_REALM_PLAZA.lz
    );
    assert.ok(plazaH !== null && Math.abs(plazaH - (DRAGON_REALM_ORIGIN.y + DRAGON_REALM_PLAZA.topLy)) < 0.01);

    const skelGround = dragonRealmWalkableHeightAt(
      DRAGON_REALM_GUARDIAN_SPAWNS.skeletonDragon.x,
      DRAGON_REALM_GUARDIAN_SPAWNS.skeletonDragon.z
    );
    const hydraGround = dragonRealmWalkableHeightAt(
      DRAGON_REALM_GUARDIAN_SPAWNS.hydraDragon.x,
      DRAGON_REALM_GUARDIAN_SPAWNS.hydraDragon.z
    );
    assert.equal(skelGround, DRAGON_REALM_GUARDIAN_SPAWNS.skeletonDragon.y);
    assert.equal(hydraGround, DRAGON_REALM_GUARDIAN_SPAWNS.hydraDragon.y);

    const throneH = dragonRealmWalkableHeightAt(
      DRAGON_REALM_ORIGIN.x + DRAGON_REALM_NORTH_THRONE.lx,
      DRAGON_REALM_ORIGIN.z + DRAGON_REALM_NORTH_THRONE.lz
    );
    assert.ok(
      throneH !== null &&
        Math.abs(throneH - (DRAGON_REALM_ORIGIN.y + DRAGON_REALM_NORTH_THRONE.topLy)) < 0.01
    );
  });

  it('places massive 80m northern monument with NO surface stairs and glider-only thermal access', () => {
    assert.ok(DRAGON_PORTAL_SHRINE_POS.z <= -650);
    assert.ok(DRAGON_PORTAL_SHRINE_POS.statueScale >= 75);

    const yaw = DRAGON_PORTAL_SHRINE_POS.shrineYaw;
    const atLocal = (lx: number, lz: number) => ({
      wx: DRAGON_PORTAL_SHRINE_POS.x + lx * Math.cos(yaw) + lz * Math.sin(yaw),
      wz: DRAGON_PORTAL_SHRINE_POS.z - lx * Math.sin(yaw) + lz * Math.cos(yaw),
    });

    // Plinth center returns only ground-level plinth height (targetH + plinthHeight)
    const plinthH = surfaceDragonShrineHeightAt(DRAGON_PORTAL_SHRINE_POS.x, DRAGON_PORTAL_SHRINE_POS.z);
    assert.ok(
      plinthH !== null &&
        Math.abs(plinthH - (DRAGON_PORTAL_SHRINE_POS.targetH + DRAGON_PORTAL_SHRINE_POS.plinthHeight)) < 0.01
    );

    // No stairs or sky-deck anywhere in front of plinth or in mid-air
    const outsideFront = atLocal(0, DRAGON_PORTAL_SHRINE_POS.plinthRadius + 8);
    assert.equal(surfaceDragonShrineHeightAt(outsideFront.wx, outsideFront.wz, DRAGON_PORTAL_SHRINE_POS.targetH + 40), null);
    const frontPlinth = atLocal(0, 12);
    const frontH = surfaceDragonShrineHeightAt(frontPlinth.wx, frontPlinth.wz, DRAGON_PORTAL_SHRINE_POS.targetH + 49);
    assert.ok(
      frontH !== null &&
        Math.abs(frontH - (DRAGON_PORTAL_SHRINE_POS.targetH + DRAGON_PORTAL_SHRINE_POS.plinthHeight)) < 0.01
    );

    // Astral Wind Thermal covers its column and requires wind_glider in physics to ascend
    const thermalPos = atLocal(DRAGON_PORTAL_SHRINE_POS.thermalLocal.lx, DRAGON_PORTAL_SHRINE_POS.thermalLocal.lz);
    const basePlinthY = DRAGON_PORTAL_SHRINE_POS.targetH + DRAGON_PORTAL_SHRINE_POS.plinthHeight;
    assert.equal(isInsideNorthernShrineGliderThermal(thermalPos.wx, basePlinthY, thermalPos.wz), true);
    assert.equal(isInsideNorthernShrineGliderThermal(0, basePlinthY, 32), false);

    // Player WITHOUT wind_glider cannot ascend inside thermal
    const noGliderPlayer = createInitialPlayerState();
    noGliderPlayer.x = thermalPos.wx;
    noGliderPlayer.y = basePlinthY;
    noGliderPlayer.z = thermalPos.wz;
    noGliderPlayer.ownedItemIds = ['bow', 'sword'];
    const horses = createInitialRideableHorses();
    for (let i = 0; i < 120; i++) {
      stepPlayerPhysics(
        noGliderPlayer,
        {
          forward: 0,
          right: 0,
          sprint: false,
          relaxed: false,
          jumpPressed: i === 0,
          jumpHeld: true,
          toggleFlyRequested: false,
          toggleMountHorseRequested: false,
          lookYawDelta: 0,
          lookPitchDelta: 0,
        },
        [],
        1 / 60,
        new Set(),
        horses
      );
    }
    assert.ok(noGliderPlayer.y < basePlinthY + 6.0);

    // Player WITH wind_glider holding jump smoothly rides the thermal up toward mirror aperture
    const gliderPlayer = createInitialPlayerState();
    gliderPlayer.x = thermalPos.wx;
    gliderPlayer.y = basePlinthY;
    gliderPlayer.z = thermalPos.wz;
    gliderPlayer.ownedItemIds = ['bow', 'sword', 'wind_glider'];
    for (let i = 0; i < 360; i++) {
      stepPlayerPhysics(
        gliderPlayer,
        {
          forward: 0,
          right: 0,
          sprint: false,
          relaxed: false,
          jumpPressed: i === 0,
          jumpHeld: true,
          toggleFlyRequested: false,
          toggleMountHorseRequested: false,
          lookYawDelta: 0,
          lookPitchDelta: 0,
        },
        [],
        1 / 60,
        new Set(),
        horses
      );
    }
    assert.equal(gliderPlayer.isGliding, true);
    assert.ok(gliderPlayer.y > DRAGON_PORTAL_SHRINE_POS.targetH + 38.0);

    // Dragon Realm Return Ramp climbs cleanly to elevated Return Mirror Gate
    const returnMidH = dragonRealmWalkableHeightAt(DRAGON_REALM_ORIGIN.x, DRAGON_REALM_ORIGIN.z + 45.15, DRAGON_REALM_ORIGIN.y + 4.1);
    const returnDeckH = dragonRealmWalkableHeightAt(DRAGON_REALM_ORIGIN.x, DRAGON_REALM_ORIGIN.z + 52.0, DRAGON_REALM_ORIGIN.y + 8.8);
    assert.ok(returnMidH !== null && returnMidH > DRAGON_REALM_ORIGIN.y + 3.0);
    assert.ok(returnDeckH !== null && Math.abs(returnDeckH - (DRAGON_REALM_ORIGIN.y + 8.8)) < 0.05);
  });

  it('activates the Northern Mirror Gate only when the Green Dragon is defeated, with God Mode Map override', () => {
    resetDragonPortalDebugOverride();
    assert.equal(getDragonPortalDebugOverride(), 'auto');

    const { animals } = createInitialWildlifeState();
    const greenDragon = animals.find((a) => a.species === 'dragon');
    assert.ok(greenDragon, 'World should contain the Green Dragon');

    // Alive Green Dragon -> portal stays locked/hidden
    greenDragon.isDead = false;
    assert.equal(isGreenDragonDefeated(animals), false);
    assert.equal(isSurfaceDragonPortalActive(animals), false);

    // Map debug button toggles ON even while Green Dragon lives
    const toggledOn = toggleDragonPortalDebug(animals);
    assert.equal(toggledOn, true);
    assert.equal(getDragonPortalDebugOverride(), 'open');
    assert.equal(isSurfaceDragonPortalActive(animals), true);

    // Map debug button toggles OFF
    const toggledOff = toggleDragonPortalDebug(animals);
    assert.equal(toggledOff, false);
    assert.equal(getDragonPortalDebugOverride(), 'closed');
    assert.equal(isSurfaceDragonPortalActive(animals), false);

    // Resetting override returns to auto mode: slaying the Green Dragon activates the gate
    setDragonPortalDebugOverride('auto');
    greenDragon.isDead = true;
    assert.equal(isGreenDragonDefeated(animals), true);
    assert.equal(isSurfaceDragonPortalActive(animals), true);

    resetDragonPortalDebugOverride();
    greenDragon.isDead = false;
  });

  it('triggers portal entry ONLY when physically inside the mirror circle aperture', () => {
    const surfacePortal = getSurfaceDragonMirrorPortalWorldPos();

    // Base of statue (plinth level ~49m below mirror) must NOT trigger portal!
    assert.equal(
      isPlayerInsideSurfacePortalThreshold(
        surfacePortal.x,
        DRAGON_PORTAL_SHRINE_POS.targetH + DRAGON_PORTAL_SHRINE_POS.plinthHeight,
        surfacePortal.z
      ),
      false
    );
    assert.equal(
      isPlayerNearSurfaceDragonPortal(
        surfacePortal.x,
        DRAGON_PORTAL_SHRINE_POS.targetH + DRAGON_PORTAL_SHRINE_POS.plinthHeight,
        surfacePortal.z
      ),
      false
    );

    // Outside mirror circle laterally must NOT trigger
    assert.equal(
      isPlayerInsideSurfacePortalThreshold(
        surfacePortal.x + DRAGON_PORTAL_SHRINE_POS.mirrorRadius + 2.5,
        surfacePortal.y - 1.05,
        surfacePortal.z
      ),
      false
    );

    // Passing inside the elevated mirror circle aperture triggers entry
    assert.equal(
      isPlayerInsideSurfacePortalThreshold(surfacePortal.x, surfacePortal.y - 1.05, surfacePortal.z),
      true
    );
    assert.equal(
      isPlayerNearSurfaceDragonPortal(surfacePortal.x, surfacePortal.y - 1.05, surfacePortal.z),
      true
    );

    // Returning from Dragon Realm lands safely on solid plinth outside trigger zone
    assert.equal(
      isPlayerInsideSurfacePortalThreshold(
        DRAGON_SURFACE_RETURN_POS.x,
        DRAGON_SURFACE_RETURN_POS.y,
        DRAGON_SURFACE_RETURN_POS.z
      ),
      false
    );
    const returnFloorH = surfaceDragonShrineHeightAt(DRAGON_SURFACE_RETURN_POS.x, DRAGON_SURFACE_RETURN_POS.z);
    assert.ok(
      returnFloorH !== null &&
        Math.abs(returnFloorH - (DRAGON_PORTAL_SHRINE_POS.targetH + DRAGON_PORTAL_SHRINE_POS.plinthHeight)) < 0.05
    );

    // Entering Dragon Realm spawn must NOT immediately re-trigger return portal
    assert.equal(
      isPlayerInsideRealmReturnThreshold(
        DRAGON_REALM_SPAWN_POS.x,
        DRAGON_REALM_SPAWN_POS.y,
        DRAGON_REALM_SPAWN_POS.z
      ),
      false
    );

    // Walking inside elevated Dragon Realm return mirror aperture triggers return
    const realmGate = getRealmReturnMirrorPortalWorldPos();
    assert.equal(isPlayerInsideRealmReturnThreshold(realmGate.x, DRAGON_REALM_ORIGIN.y, realmGate.z), false);
    assert.equal(isPlayerInsideRealmReturnThreshold(realmGate.x, realmGate.y - 1.05, realmGate.z), true);
    assert.equal(isPlayerNearRealmReturnPortal(realmGate.x, realmGate.y - 1.05, realmGate.z), true);
  });

  it('provides valid surface clearing and non-empty collider list', () => {
    assert.equal(surfaceDragonShrineHeightAt(0, 32), null);
    assert.ok(DRAGON_REALM_COLLIDER_BOXES.length >= 16);
    assert.equal(
      DRAGON_REALM_COLLIDER_BOXES.some((b) => b.id.startsWith('dragon-shrine-rail-')),
      false
    );

    const clamped = clampInsideDragonRealmBounds(DRAGON_REALM_ORIGIN.x + 250, DRAGON_REALM_ORIGIN.z);
    assert.ok(clamped.x <= DRAGON_REALM_ORIGIN.x + 96.01);
  });

  it('registers Skeleton Dragon & Astral Hydra bosses inside Dragon Realm with hitboxes and reactive AI', () => {
    assert.equal(getAnimalSpeciesName('skeleton_dragon'), 'Skeletal Dragon');
    assert.equal(getAnimalSpeciesName('hydra_dragon'), 'Astral Hydra');
    assert.ok(getAnimalMaxHp('skeleton_dragon', 16, true) >= 4000);
    assert.ok(getAnimalMaxHp('hydra_dragon', 18, true) >= 5000);

    const skelHitbox = getEffectiveEntityHitbox(WILDLIFE_SPECIES_TO_ENTITY_ID.skeleton_dragon);
    const hydraHitbox = getEffectiveEntityHitbox(WILDLIFE_SPECIES_TO_ENTITY_ID.hydra_dragon);
    assert.ok(skelHitbox.radius >= 3.0 && skelHitbox.height >= 4.0);
    assert.ok(hydraHitbox.radius >= 3.0 && hydraHitbox.height >= 4.0);

    const { birds, animals } = createInitialWildlifeState();
    const horses = createInitialRideableHorses();
    const skel = animals.find((a) => a.species === 'skeleton_dragon');
    const hydra = animals.find((a) => a.species === 'hydra_dragon');
    assert.ok(skel && hydra);
    assert.equal(skel.isBoss, true);
    assert.equal(hydra.isBoss, true);
    assert.equal(isInsideDragonRealm(skel.x, skel.z, skel.y), true);
    assert.equal(isInsideDragonRealm(hydra.x, hydra.z, hydra.y), true);

    const player = createInitialPlayerState();
    player.x = DRAGON_REALM_ORIGIN.x;
    player.y = DRAGON_REALM_ORIGIN.y + 0.8;
    player.z = DRAGON_REALM_ORIGIN.z - 10;
    for (let i = 0; i < 60; i++) {
      stepBoidsAndWildlife(1 / 60, 10 + i / 60, birds, animals, player, horses, 1.0, 0);
    }
    assert.ok(dragonRealmWalkableHeightAt(skel.x, skel.z) !== null);
    assert.ok(dragonRealmWalkableHeightAt(hydra.x, hydra.z) !== null);
    assert.ok(['charging', 'stalking', 'roaring', 'attacking'].includes(skel.aiBehavior ?? ''));
    assert.ok(['charging', 'stalking', 'roaring', 'attacking'].includes(hydra.aiBehavior ?? ''));
  });
});
