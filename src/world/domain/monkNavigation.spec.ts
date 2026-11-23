import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMonkNavMemory,
  stepMonkWalkWithRerouting,
  type IMonkNavPeer,
} from './monkNavigation';

describe('monkNavigation - head-on passing & dynamic detour re-routing', () => {
  it('steers oncoming monks cleanly onto opposite lanes so neither gets stuck head-on', () => {
    let ax = 0;
    let az = -6;
    let bx = 0;
    let bz = 6;
    const memA = createMonkNavMemory(ax, az);
    const memB = createMonkNavMemory(bx, bz);
    const alwaysSafe = () => true;
    const dt = 0.05;
    const speed = 2.4;

    let minDist = Infinity;
    for (let step = 0; step < 120; step++) {
      const peerB: IMonkNavPeer = { x: bx, y: 30, z: bz, vx: 0, vz: -speed, moving: true };
      const peerA: IMonkNavPeer = { x: ax, y: 30, z: az, vx: 0, vz: speed, moving: true };
      const resA = stepMonkWalkWithRerouting({
        x: ax,
        y: 30,
        z: az,
        targetX: 0,
        targetZ: 6,
        targetKey: 'a',
        speed,
        dt,
        peers: [peerB],
        isSafe: alwaysSafe,
        memory: memA,
      });
      const resB = stepMonkWalkWithRerouting({
        x: bx,
        y: 30,
        z: bz,
        targetX: 0,
        targetZ: -6,
        targetKey: 'b',
        speed,
        dt,
        peers: [peerA],
        isSafe: alwaysSafe,
        memory: memB,
      });
      ax = resA.nextX;
      az = resA.nextZ;
      bx = resB.nextX;
      bz = resB.nextZ;
      minDist = Math.min(minDist, Math.hypot(ax - bx, az - bz));
    }

    assert.ok(az > 5.0, `Expected monk A to reach south target, ended at z=${az.toFixed(2)}`);
    assert.ok(bz < -5.0, `Expected monk B to reach north target, ended at z=${bz.toFixed(2)}`);
    assert.ok(minDist > 0.75, `Expected passing separation > 0.75m, got minDist=${minDist.toFixed(2)}`);
  });

  it('triggers dynamic lateral detour when progress stalls in front of a blocker', () => {
    let x = 0;
    let z = -3;
    const mem = createMonkNavMemory(x, z);
    // Barrier along z = 0 between x = -1.5 and x = +1.5
    const barrierSafe = (cx: number, cz: number) => !(Math.abs(cx) <= 1.5 && Math.abs(cz) <= 0.4);
    const dt = 0.05;

    let maxAbsX = 0;
    for (let i = 0; i < 160; i++) {
      const res = stepMonkWalkWithRerouting({
        x,
        y: 30,
        z,
        targetX: 0,
        targetZ: 5,
        targetKey: 'goal',
        speed: 2.4,
        dt,
        peers: [],
        isSafe: barrierSafe,
        memory: mem,
      });
      x = res.nextX;
      z = res.nextZ;
      maxAbsX = Math.max(maxAbsX, Math.abs(x));
    }

    assert.ok(maxAbsX > 1.5, `Expected monk to detour around barrier laterally (max|x|=${maxAbsX.toFixed(2)})`);
    assert.ok(z > 3.5, `Expected monk to bypass barrier and advance toward z=5, got z=${z.toFixed(2)}`);
  });
});
