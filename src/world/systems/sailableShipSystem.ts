// ============================================================================
// MODULE: World / Systems / Sailable Ship System
// DESIGN: Pure kinematic naval locomotion, passenger/animal transport, and deck collision (SRP)
// SUMMARY: Manages the Sailable Royal Explorer Flagship state, deck height resolution,
//          horse & animal deck transport, wave pitch/roll dynamics, and dock disembarkation.
// ============================================================================

import type { IPlayerInput, IPlayerState, IRideableHorseState } from '../domain/worldTypes';
import {
  PLAYABLE_RADIUS,
  RUINED_ATLANTIS_POS,
  SAILABLE_SHIP_INITIAL_POS,
  SOUTHEAST_HARBOR_POS,
} from '../domain/landmarksRegistry';

export interface ISailableShipState {
  id: string;
  name: string;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  deckY: number;
  halfW: number;
  halfL: number;
  rollAngle: number;
  pitchAngle: number;
  wheelAngle: number;
  wakePhase: number;
}

export interface IShipPassengerEntity {
  x: number;
  y: number;
  z: number;
  yaw: number;
  vx?: number;
  vy?: number;
  vz?: number;
  speed?: number;
  homeX?: number;
  homeZ?: number;
  inWater?: boolean;
  species?: string;
  isDead?: boolean;
}

const activeSailableShip: ISailableShipState = {
  id: SAILABLE_SHIP_INITIAL_POS.id,
  name: SAILABLE_SHIP_INITIAL_POS.name,
  x: SAILABLE_SHIP_INITIAL_POS.homeX,
  z: SAILABLE_SHIP_INITIAL_POS.homeZ,
  yaw: SAILABLE_SHIP_INITIAL_POS.homeYaw,
  speed: 0,
  deckY: SAILABLE_SHIP_INITIAL_POS.deckY,
  halfW: SAILABLE_SHIP_INITIAL_POS.halfW,
  halfL: SAILABLE_SHIP_INITIAL_POS.halfL,
  rollAngle: 0,
  pitchAngle: 0,
  wheelAngle: 0,
  wakePhase: 0,
};

/**
 * Summary: Returns the live mutable state of the Sailable Royal Explorer Flagship.
 */
export function getActiveSailableShip(): ISailableShipState {
  return activeSailableShip;
}

/**
 * Summary: Resets the sailable ship back to its home Harbor Pier mooring.
 */
export function resetSailableShipState(): ISailableShipState {
  activeSailableShip.x = SAILABLE_SHIP_INITIAL_POS.homeX;
  activeSailableShip.z = SAILABLE_SHIP_INITIAL_POS.homeZ;
  activeSailableShip.yaw = SAILABLE_SHIP_INITIAL_POS.homeYaw;
  activeSailableShip.speed = 0;
  activeSailableShip.rollAngle = 0;
  activeSailableShip.pitchAngle = 0;
  activeSailableShip.wheelAngle = 0;
  activeSailableShip.wakePhase = 0;
  return activeSailableShip;
}

/**
 * Summary: Checks whether an entity (horse, animal, or player) at world (x, y, z)
 *          is standing on the Sailable Ship's deck.
 */
export function isEntityOnSailableShipDeck(
  x: number,
  z: number,
  y?: number,
  ship: ISailableShipState = activeSailableShip,
  margin = 0.85
): boolean {
  if (y !== undefined && Math.abs(y - ship.deckY) > 3.6) {
    return false;
  }
  const dx = x - ship.x;
  const dz = z - ship.z;
  if (dx * dx + dz * dz > 240.0) {
    return false;
  }
  const cosY = Math.cos(ship.yaw);
  const sinY = Math.sin(ship.yaw);
  const lx = dx * cosY - dz * sinY;
  const lz = dx * sinY + dz * cosY;
  return Math.abs(lx) <= ship.halfW + margin && Math.abs(lz) <= ship.halfL + margin;
}

/**
 * Summary: Evaluates the walkable wooden deck height of the Sailable Ship at world (x, z),
 *          including the raised aft helm quarterdeck, Harbor boarding jetty, and Atlantis gangplank.
 */
export function sailableShipDeckHeightAt(
  x: number,
  z: number,
  currentY?: number,
  ship: ISailableShipState = activeSailableShip
): number | null {
  // 1) Harbor Southern Royal Ship Pier (x: 254.0..274.8, z: 278.8..285.2) connecting Harbor Plaza to Ship's home berth
  if (
    x >= 254.0 &&
    x <= 274.8 &&
    Math.abs(z - SAILABLE_SHIP_INITIAL_POS.homeZ) <= 3.2 &&
    (currentY === undefined || currentY >= 2.0)
  ) {
    const tPier = Math.max(0, Math.min(1, (x - 254.5) / 19.0));
    return (
      SOUTHEAST_HARBOR_POS.plazaY * (1 - tPier) +
      SAILABLE_SHIP_INITIAL_POS.deckY * tPier
    );
  }

  // 2) Live Sailable Ship Hull Deck & Raised Aft Quarterdeck
  const dx = x - ship.x;
  const dz = z - ship.z;
  if (dx * dx + dz * dz <= 225.0) {
    const cosY = Math.cos(ship.yaw);
    const sinY = Math.sin(ship.yaw);
    const lx = dx * cosY - dz * sinY;
    const lz = dx * sinY + dz * cosY;

    if (Math.abs(lx) <= ship.halfW && Math.abs(lz) <= ship.halfL) {
      let targetDeckY = ship.deckY;
      if (lz >= 2.6) {
        const tQuarter = Math.max(0, Math.min(1, (lz - 2.6) / 2.0));
        targetDeckY = ship.deckY + tQuarter * 0.55;
      }
      if (currentY === undefined || currentY >= ship.deckY - 1.5) {
        return targetDeckY;
      }
    }
  }

  // 3) Automatic Atlantis Boarding Gangplank when moored near Ruined Atlantis Western Dock
  const distShipToAtlantisDock = Math.hypot(
    ship.x - RUINED_ATLANTIS_POS.dockX,
    ship.z - RUINED_ATLANTIS_POS.dockZ
  );
  if (distShipToAtlantisDock <= 24.0 && (currentY === undefined || currentY >= 1.4)) {
    const ax = ship.x;
    const az = ship.z;
    const bx = RUINED_ATLANTIS_POS.dockX + 2.0;
    const bz = RUINED_ATLANTIS_POS.dockZ;
    const vx = bx - ax;
    const vz = bz - az;
    const lenSq = vx * vx + vz * vz;
    if (lenSq > 0.01) {
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / lenSq));
      const px = ax + t * vx;
      const pz = az + t * vz;
      if (Math.hypot(x - px, z - pz) <= 3.4) {
        return ship.deckY * (1 - t) + RUINED_ATLANTIS_POS.dockY * t;
      }
    }
  }

  return null;
}

/**
 * Summary: Transports any horses or animals standing on the Sailable Ship deck so they move and rotate
 *          rigidly with the ship as it sails across the ocean, clamping them safely inside the deck rails.
 */
export function carryPassengersOnSailableShip(
  prevX: number,
  prevZ: number,
  prevYaw: number,
  ship: ISailableShipState = activeSailableShip,
  horses?: readonly IRideableHorseState[],
  worldAnimals?: readonly IShipPassengerEntity[]
): void {
  const cosPrev = Math.cos(prevYaw);
  const sinPrev = Math.sin(prevYaw);
  const cosNew = Math.cos(ship.yaw);
  const sinNew = Math.sin(ship.yaw);
  const deltaYaw = Math.atan2(Math.sin(ship.yaw - prevYaw), Math.cos(ship.yaw - prevYaw));

  const maxLx = Math.max(1.2, ship.halfW - 0.75);
  const maxLz = Math.max(2.5, ship.halfL - 1.15);

  const transformPassenger = (p: IShipPassengerEntity) => {
    if (p.species === 'dragon') return;
    const dx = p.x - prevX;
    const dz = p.z - prevZ;
    if (dx * dx + dz * dz > 240.0) return;
    if (Math.abs(p.y - ship.deckY) > 3.6) return;

    const lx = dx * cosPrev - dz * sinPrev;
    const lz = dx * sinPrev + dz * cosPrev;
    if (Math.abs(lx) <= ship.halfW + 0.95 && Math.abs(lz) <= ship.halfL + 0.95) {
      const clampedLx = Math.max(-maxLx, Math.min(maxLx, lx));
      const clampedLz = Math.max(-maxLz, Math.min(maxLz, lz));
      // Inverse of (lx = dx*cos - dz*sin, lz = dx*sin + dz*cos) is:
      // dx = lx*cos + lz*sin, dz = -lx*sin + lz*cos
      const newX = ship.x + clampedLx * cosNew + clampedLz * sinNew;
      const newZ = ship.z - clampedLx * sinNew + clampedLz * cosNew;
      p.x = newX;
      p.z = newZ;
      p.yaw = Math.atan2(Math.sin(p.yaw + deltaYaw), Math.cos(p.yaw + deltaYaw));
      p.y = sailableShipDeckHeightAt(newX, newZ, p.y, ship) ?? ship.deckY;
      if (p.vx !== undefined) p.vx = 0;
      if (p.vy !== undefined) p.vy = 0;
      if (p.vz !== undefined) p.vz = 0;
      if (p.speed !== undefined) p.speed = 0;
      if (p.homeX !== undefined) p.homeX = newX;
      if (p.homeZ !== undefined) p.homeZ = newZ;
      if (p.inWater !== undefined) p.inWater = false;
    }
  };

  if (horses) {
    for (let i = 0; i < horses.length; i++) {
      const h = horses[i];
      if (h.id === ship.id) continue;
      transformPassenger(h);
    }
  }

  if (worldAnimals) {
    for (let i = 0; i < worldAnimals.length; i++) {
      transformPassenger(worldAnimals[i]);
    }
  }
}

/**
 * Summary: Teleports or re-orients the sailable ship to specific ocean coordinates,
 *          carrying any onboard horses and animals along with the ship.
 */
export function setSailableShipTransform(
  x: number,
  z: number,
  yaw?: number,
  horses?: readonly IRideableHorseState[],
  worldAnimals?: readonly IShipPassengerEntity[]
): void {
  const prevX = activeSailableShip.x;
  const prevZ = activeSailableShip.z;
  const prevYaw = activeSailableShip.yaw;
  activeSailableShip.x = x;
  activeSailableShip.z = z;
  if (yaw !== undefined) {
    activeSailableShip.yaw = yaw;
  }
  activeSailableShip.speed = 0;
  carryPassengersOnSailableShip(prevX, prevZ, prevYaw, activeSailableShip, horses, worldAnimals);
}

/**
 * Summary: Places a horse or mount neatly inside the ship's Midships Animal Cargo Stall
 *          so it rides securely with the ship during ocean voyages.
 */
export function stationMountInSailableShipStall(
  mount: IShipPassengerEntity,
  slotIndex = 0,
  ship: ISailableShipState = activeSailableShip
): void {
  const cosY = Math.cos(ship.yaw);
  const sinY = Math.sin(ship.yaw);
  const stallLx = (slotIndex % 2 === 0 ? -1 : 1) * 1.45;
  const stallLz = -2.8 - Math.floor(slotIndex / 2) * 2.4;
  mount.x = ship.x + stallLx * cosY + stallLz * sinY;
  mount.z = ship.z - stallLx * sinY + stallLz * cosY;
  mount.y = ship.deckY;
  mount.yaw = ship.yaw;
  if (mount.vx !== undefined) mount.vx = 0;
  if (mount.vy !== undefined) mount.vy = 0;
  if (mount.vz !== undefined) mount.vz = 0;
  if (mount.speed !== undefined) mount.speed = 0;
  if (mount.homeX !== undefined) mount.homeX = mount.x;
  if (mount.homeZ !== undefined) mount.homeZ = mount.z;
  if (mount.inWater !== undefined) mount.inWater = false;
}

/**
 * Summary: Computes the safest disembark position when the player presses [F] to leave the helm.
 *          Prioritizes the Ruined Atlantis Western Dock or Harbor Pier when moored nearby,
 *          or places the player on the ship's main deck next to the animal stall when anchored at sea.
 */
export function findSailableShipDisembarkPoint(
  ship: ISailableShipState = activeSailableShip
): { x: number; y: number; z: number } {
  const distToAtlantisDock = Math.hypot(
    ship.x - RUINED_ATLANTIS_POS.dockX,
    ship.z - RUINED_ATLANTIS_POS.dockZ
  );
  if (distToAtlantisDock <= 24.0) {
    return {
      x: RUINED_ATLANTIS_POS.dockX + 3.0,
      y: RUINED_ATLANTIS_POS.dockY,
      z: RUINED_ATLANTIS_POS.dockZ,
    };
  }

  const distToHarborPier = Math.hypot(
    ship.x - SAILABLE_SHIP_INITIAL_POS.homeX,
    ship.z - SAILABLE_SHIP_INITIAL_POS.homeZ
  );
  if (distToHarborPier <= 22.0) {
    return {
      x: 268.0,
      y: 3.02,
      z: SAILABLE_SHIP_INITIAL_POS.homeZ,
    };
  }

  return {
    x: ship.x,
    y: ship.deckY,
    z: ship.z,
  };
}

/**
 * Summary: Steps naval sailing physics for the Sailable Ship while helmed by the player,
 *          and transports all onboard horses & animals along with the moving hull.
 */
export function stepSailableShipPhysics(
  state: IPlayerState,
  input: IPlayerInput,
  dt: number,
  isNavigableWaterAt: (x: number, z: number) => boolean,
  ship: ISailableShipState = activeSailableShip,
  horses?: readonly IRideableHorseState[],
  worldAnimals?: readonly IShipPassengerEntity[]
): void {
  const prevX = ship.x;
  const prevZ = ship.z;
  const prevYaw = ship.yaw;

  // 1) Rudder steering (A/D or Left/Right)
  const steerInput = input.right;
  const speedFactor = 0.45 + 0.55 * Math.min(1.0, Math.abs(ship.speed) / 10.0);
  const reverseSign = ship.speed < -0.5 ? -1.0 : 1.0;
  const turnRate = 1.25 * speedFactor * reverseSign;
  const yawDelta = -steerInput * turnRate * dt;

  ship.yaw = Math.atan2(Math.sin(ship.yaw + yawDelta), Math.cos(ship.yaw + yawDelta));
  state.yaw = Math.atan2(Math.sin(state.yaw + yawDelta), Math.cos(state.yaw + yawDelta));
  state.mountedHorseYaw = ship.yaw;

  // Spin the ship's helm wheel proportionally to steering input
  const targetWheel = -steerInput * 1.85;
  ship.wheelAngle += (targetWheel - ship.wheelAngle) * (1.0 - Math.exp(-8.0 * dt));

  // 2) Sail throttle propulsion (W/S + Shift for Full Royal Wind)
  const maxForwardSpeed = input.sprint ? 32.0 : 20.5;
  const maxReverseSpeed = 8.5;
  let targetSpeed = 0;
  if (input.forward > 0.05) {
    targetSpeed = input.forward * maxForwardSpeed;
  } else if (input.forward < -0.05) {
    targetSpeed = input.forward * maxReverseSpeed;
  }

  const accelRate = Math.abs(targetSpeed) > Math.abs(ship.speed) ? 3.8 : 2.6;
  ship.speed += (targetSpeed - ship.speed) * (1.0 - Math.exp(-accelRate * dt));
  if (Math.abs(targetSpeed) < 0.01 && Math.abs(ship.speed) < 0.04) {
    ship.speed = 0;
  }

  // 3) Advance position along ship heading (-sin(yaw), -cos(yaw)) with coastal collision sliding
  const fwdX = -Math.sin(ship.yaw);
  const fwdZ = -Math.cos(ship.yaw);
  const vx = fwdX * ship.speed;
  const vz = fwdZ * ship.speed;

  let nextX = ship.x + vx * dt;
  let nextZ = ship.z + vz * dt;

  if (!isNavigableWaterAt(nextX, nextZ)) {
    const canSlideX = isNavigableWaterAt(nextX, ship.z);
    const canSlideZ = isNavigableWaterAt(ship.x, nextZ);
    if (canSlideX && !canSlideZ) {
      nextZ = ship.z;
      ship.speed *= 0.85;
    } else if (canSlideZ && !canSlideX) {
      nextX = ship.x;
      ship.speed *= 0.85;
    } else {
      nextX = ship.x;
      nextZ = ship.z;
      ship.speed = 0;
    }
  }

  const distFromCenter = Math.hypot(nextX, nextZ);
  if (distFromCenter > PLAYABLE_RADIUS - 12.0) {
    const scaleBack = (PLAYABLE_RADIUS - 12.0) / distFromCenter;
    nextX *= scaleBack;
    nextZ *= scaleBack;
  }

  const stepDist = Math.hypot(nextX - ship.x, nextZ - ship.z);
  ship.x = nextX;
  ship.z = nextZ;
  ship.wakePhase += (1.8 + Math.abs(ship.speed) * 0.35) * dt;

  // Wave pitch and turn banking roll
  const targetRoll =
    steerInput * Math.min(0.085, (Math.abs(ship.speed) / 22.0) * 0.085) +
    Math.sin(ship.wakePhase * 0.9) * 0.018;
  const targetPitch =
    Math.cos(ship.wakePhase * 1.1) * 0.022 +
    Math.min(0.035, Math.max(-0.02, ship.speed * 0.0014));
  ship.rollAngle += (targetRoll - ship.rollAngle) * (1.0 - Math.exp(-6.0 * dt));
  ship.pitchAngle += (targetPitch - ship.pitchAngle) * (1.0 - Math.exp(-6.0 * dt));

  // 4) Carry all horses & animals standing on the ship's deck along with the ship!
  carryPassengersOnSailableShip(prevX, prevZ, prevYaw, ship, horses, worldAnimals);

  // 5) Sync player state to the raised aft quarterdeck helm behind the ship's wheel (local z = +3.85)
  const helmLz = 3.85;
  state.x = ship.x + helmLz * Math.sin(ship.yaw);
  state.z = ship.z + helmLz * Math.cos(ship.yaw);
  state.y = ship.deckY + 0.66;
  state.vx = vx;
  state.vz = vz;
  state.vy = 0;
  state.onGround = true;
  state.isSwimming = false;
  state.inWater = false;
  state.isFlying = false;
  state.distanceWalked += stepDist;
  state.walkPace = input.sprint ? 'fast' : 'normal';
  state.bobPhase = ship.wakePhase;
  state.bobAmount = Math.min(0.45, Math.abs(ship.speed) / 24.0);
}
