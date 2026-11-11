import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveWorldSnapshot,
  loadWorldSnapshot,
  clearWorldSave,
  getDefaultWorldBaseline,
  getWorldSaveStorageKey,
  IWorldSaveSnapshot
} from './worldSaveManager.js';

describe('worldSaveManager - Survival vs Creative Isolation', () => {
  it('should generate distinct storage keys for survival and creative', () => {
    assert.strictEqual(getWorldSaveStorageKey('survival'), 'THE_MAN_WORLD_SAVE_SURVIVAL');
    assert.strictEqual(getWorldSaveStorageKey('creative'), 'THE_MAN_WORLD_SAVE_CREATIVE');
  });

  it('should return default baselines tailored for each mode', () => {
    const survivalBase = getDefaultWorldBaseline('survival');
    const creativeBase = getDefaultWorldBaseline('creative');

    assert.strictEqual(survivalBase.mode, 'survival');
    assert.strictEqual(creativeBase.mode, 'creative');
    assert.strictEqual(survivalBase.player.health, 100);
    assert.strictEqual(creativeBase.player.health, 500);
  });

  it('should save and load isolated state snapshots without bleeding', () => {
    clearWorldSave('survival');
    clearWorldSave('creative');

    const survivalSnap: IWorldSaveSnapshot = {
      version: 1,
      mode: 'survival',
      savedAt: Date.now(),
      player: {
        x: 100,
        y: 10,
        z: 200,
        yaw: 1.5,
        pitch: 0.1,
        health: 85,
        maxHealth: 100,
        stamina: 90,
        hunger: 70,
        isMounted: false,
        gold: 34,
        arrows: 12
      },
      ship: {
        x: 1050,
        y: 0.1,
        z: 200,
        yaw: 0,
        speed: 0,
        rudderAngle: 0,
        sailTrim: 1,
        hasSteeringControl: false
      },
      animals: [{ id: 'wolf-1', species: 'wolf', x: 102, y: 10, z: 205, yaw: 0, hp: 50, maxHp: 50, isTamed: false }],
      openDoors: ['gate-1']
    };

    const creativeSnap: IWorldSaveSnapshot = {
      version: 1,
      mode: 'creative',
      savedAt: Date.now(),
      player: {
        x: 3500,
        y: 5,
        z: 5000,
        yaw: 3.14,
        pitch: -0.2,
        health: 500,
        maxHealth: 500,
        stamina: 100,
        hunger: 100,
        isMounted: true,
        mountedAnimalId: 'lion-boss',
        gold: 99999,
        arrows: 9999
      },
      ship: {
        x: 3450,
        y: 0.2,
        z: 4980,
        yaw: 1.2,
        speed: 8.5,
        rudderAngle: 0.2,
        sailTrim: 1,
        hasSteeringControl: true
      },
      animals: [{ id: 'lion-boss', species: 'lion', x: 3500, y: 5, z: 5000, yaw: 3.14, hp: 1200, maxHp: 1200, isTamed: true, customName: 'Volcano King' }],
      openDoors: ['atlantis-gate']
    };

    saveWorldSnapshot('survival', survivalSnap);
    saveWorldSnapshot('creative', creativeSnap);

    const loadedSurvival = loadWorldSnapshot('survival');
    const loadedCreative = loadWorldSnapshot('creative');

    assert.ok(loadedSurvival);
    assert.ok(loadedCreative);

    assert.strictEqual(loadedSurvival.player.x, 100);
    assert.strictEqual(loadedSurvival.player.health, 85);
    assert.strictEqual(loadedSurvival.animals?.[0].id, 'wolf-1');
    assert.strictEqual(loadedSurvival.animals?.[0].isTamed, false);

    assert.strictEqual(loadedCreative.player.x, 3500);
    assert.strictEqual(loadedCreative.player.health, 500);
    assert.strictEqual(loadedCreative.animals?.[0].id, 'lion-boss');
    assert.strictEqual(loadedCreative.animals?.[0].isTamed, true);
    assert.strictEqual(loadedCreative.animals?.[0].customName, 'Volcano King');
    assert.strictEqual(loadedCreative.ship?.x, 3450);

    // Verify modifying one does not affect the other
    loadedSurvival.player.x = 999;
    saveWorldSnapshot('survival', loadedSurvival);

    const reloadedCreative = loadWorldSnapshot('creative');
    assert.strictEqual(reloadedCreative?.player.x, 3500);
  });

  it('should capture and restore live entities without state leakage', async () => {
    const { applyWorldSnapshotToLiveSystems, captureCurrentWorldSnapshot } = await import('./worldSaveManager.js');

    const mockPlayer = {
      x: 10,
      y: 2,
      z: 20,
      yaw: 0.5,
      pitch: 0,
      health: 90,
      maxHealth: 100,
      stamina: 80,
      hunger: 70,
      isMounted: false,
      mountedHorseId: null,
      isMountedShip: false,
      gold: 45,
      arrows: 18,
      openedChestIds: ['chest-1']
    } as any;

    const mockHorses = [
      { id: 'horse-white', x: 200, y: 1, z: 220, yaw: 0, speed: 0, gaitPhase: 0 }
    ] as any;

    const mockAnimals = [
      { id: 'lion-volcano-boss', species: 'lion', x: 600, y: 10, z: -100, yaw: 0, hp: 1200, maxHp: 1200, isTamed: false, isBoss: true }
    ] as any;

    const mockDoors = new Set<string>(['door-1']);

    // Capture survival snapshot
    const snap1 = captureCurrentWorldSnapshot('survival', mockPlayer, mockHorses, mockAnimals, mockDoors, 14.5);
    assert.strictEqual(snap1.player.health, 90);
    assert.strictEqual(snap1.animals?.[0].isTamed, false);

    // Tame the boss in creative
    const creativeSnap: IWorldSaveSnapshot = {
      version: 1,
      mode: 'creative',
      savedAt: Date.now(),
      player: {
        x: 800,
        y: 15,
        z: 400,
        yaw: 1.2,
        pitch: 0,
        health: 500,
        maxHealth: 500,
        stamina: 100,
        hunger: 100,
        isMounted: true,
        mountedAnimalId: 'mount-lion-lion-volcano-boss',
        gold: 9999,
        arrows: 999
      },
      animals: [
        { id: 'lion-volcano-boss', species: 'lion', x: 800, y: 15, z: 400, yaw: 1.2, hp: 1200, maxHp: 1200, isTamed: true, customName: 'Creative King' }
      ],
      openDoors: ['creative-gate'],
      openedChests: ['chest-creative']
    };

    // Apply creative
    applyWorldSnapshotToLiveSystems(creativeSnap, mockPlayer, mockHorses, mockAnimals, mockDoors);
    assert.strictEqual(mockPlayer.health, 500);
    assert.strictEqual(mockAnimals[0].isTamed, true);
    assert.strictEqual(mockAnimals[0].customName, 'Creative King');
    assert.strictEqual(mockDoors.has('creative-gate'), true);
    assert.strictEqual(mockDoors.has('door-1'), false);

    // Switch back to survival snapshot: lion MUST return to untamed!
    applyWorldSnapshotToLiveSystems(snap1, mockPlayer, mockHorses, mockAnimals, mockDoors);
    assert.strictEqual(mockPlayer.health, 90);
    assert.strictEqual(mockAnimals[0].isTamed, false);
    assert.strictEqual(mockAnimals[0].customName, undefined);
    assert.strictEqual(mockDoors.has('door-1'), true);
    assert.strictEqual(mockDoors.has('creative-gate'), false);
  });
});

describe('worldSaveManager - load validation', () => {
  it('should refuse a save whose player position is not a finite number', () => {
    clearWorldSave('survival');
    const broken = { ...getDefaultWorldBaseline('survival'), player: { ...getDefaultWorldBaseline('survival').player, x: Number.NaN } };
    saveWorldSnapshot('survival', broken as IWorldSaveSnapshot);
    assert.strictEqual(loadWorldSnapshot('survival'), null);
  });

  it('should refuse a save with no player record', () => {
    clearWorldSave('survival');
    const noPlayer = { ...getDefaultWorldBaseline('survival'), player: undefined };
    saveWorldSnapshot('survival', noPlayer as unknown as IWorldSaveSnapshot);
    assert.strictEqual(loadWorldSnapshot('survival'), null);
  });

  it('should still load a valid save', () => {
    clearWorldSave('survival');
    saveWorldSnapshot('survival', getDefaultWorldBaseline('survival'));
    const loaded = loadWorldSnapshot('survival');
    assert.ok(loaded);
    assert.strictEqual(loaded.mode, 'survival');
    clearWorldSave('survival');
  });
});
