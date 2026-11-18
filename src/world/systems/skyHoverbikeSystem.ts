// ============================================================================
// MODULE: World / Systems / Sky-Harbor Aether Hoverbike System
// DESIGN: Pure state & 3D flight/hover physics for the Sky-Harbor Aether Hoverbike
//         ("אופנוע אוויר אתרי") sold by the Aviator Mechanic on the Sky Harbor Dock.
//         Supports 1 hoverbike model type, interactive merchant purchase/recall,
//         repulsor ground-hover driving ([W/S/A/D] + mouse steer), and full 3D aerial
//         flight ([Space] ascend, [C]/[Ctrl] descend, [Shift] aether afterburner boost).
// ============================================================================

import type { IPlayerInput, IPlayerState } from '../domain/worldTypes';

export const SKY_HOVERBIKE_ID = 'sky-hoverbike' as const;
export const SKY_HOVERBIKE_PRICE_GOLD = 150;

/**
 * Summary: World-space placement of the Hoverbike Shop Pavilion on the raised timber dock apron
 *          leading to the Sky Harbor pier, oriented with its front (`+Z`) facing inward toward
 *          the interior of Sky Harbor (`(780, -35)`).
 */
export const SKY_HOVERBIKE_SHOP_POS = {
  /** Center of the shop pavilion on the southern side of the raised timber dock apron. */
  x: 805.6,
  y: 68.08,
  z: -3.6,
  /** Rotation around Y so local +Z (open front counter & merchant) faces NW toward (780, -35). */
  yaw: -2.42,
  /** World-space position of the Aviator Merchant NPC behind the front counter. */
  merchantX: 805.65,
  merchantY: 68.08,
  merchantZ: -4.15,
  /** World-space position of the front sales counter where the player stands to interact. */
  counterX: 805.2,
  counterY: 68.08,
  counterZ: -4.9,
  /** World-space position of the glowing Hoverbike Launch Pad on the timber dock apron in front of the shop. */
  padX: 800.6,
  padY: 68.1,
  padZ: -7.8,
  /** Initial heading of the spawned hoverbike on the dock launch pad (facing West into Sky Harbor). */
  padYaw: -Math.PI / 2,
} as const;

export interface ISkyHoverbikeState {
  readonly id: typeof SKY_HOVERBIKE_ID;
  readonly modelId: 'aether-mk1';
  readonly name: string;
  readonly nameHe: string;
  readonly priceGold: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Heading angle in radians (`0` = +Z, `Math.PI` = -Z, `-Math.PI/2` = -X, matching horse/player convention). */
  yaw: number;
  /** Visual nose pitch in radians (positive = nose up during climb). */
  pitch: number;
  /** Visual bank roll in radians during turns. */
  roll: number;
  /** Current forward ground/air speed (m/s). */
  speed: number;
  /** True once purchased/spawned from the Sky Dock Hoverbike Merchant. */
  spawned: boolean;
  /** True once purchased at least once in this session. */
  purchased: boolean;
  /** True when flying above the ground repulsor cushion. */
  isAirborne: boolean;
  /** Continuous phase timer for idle repulsor bobbing and thruster pulse. */
  hoverPhase: number;
}

function createDefaultSkyHoverbikeState(): ISkyHoverbikeState {
  return {
    id: SKY_HOVERBIKE_ID,
    modelId: 'aether-mk1',
    name: 'Sky-Harbor Aether Hoverbike',
    nameHe: 'אופנוע אוויר אתרי (דגם רקיע א׳)',
    priceGold: SKY_HOVERBIKE_PRICE_GOLD,
    x: SKY_HOVERBIKE_SHOP_POS.padX,
    y: SKY_HOVERBIKE_SHOP_POS.padY + 0.55,
    z: SKY_HOVERBIKE_SHOP_POS.padZ,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: SKY_HOVERBIKE_SHOP_POS.padYaw,
    pitch: 0,
    roll: 0,
    speed: 0,
    spawned: false,
    purchased: false,
    isAirborne: false,
    hoverPhase: 0,
  };
}

const activeSkyHoverbike: ISkyHoverbikeState = createDefaultSkyHoverbikeState();

/**
 * Summary: Returns the live singleton state of the Sky-Harbor Aether Hoverbike.
 */
export function getActiveSkyHoverbike(): ISkyHoverbikeState {
  return activeSkyHoverbike;
}

/**
 * Summary: Resets the Sky-Harbor Hoverbike to its initial unspawned state at the dock launch pad.
 */
export function resetSkyHoverbikeState(): ISkyHoverbikeState {
  const fresh = createDefaultSkyHoverbikeState();
  Object.assign(activeSkyHoverbike, fresh);
  return activeSkyHoverbike;
}

/**
 * Summary: Checks whether a world position `(px, py, pz)` is within interaction range of the
 *          Hoverbike Merchant NPC / counter on the Sky Harbor dock apron.
 */
export function isNearSkyHoverbikeMerchant(
  px: number,
  py: number,
  pz: number,
  maxRadius = 4.6
): boolean {
  if (Math.abs(py - SKY_HOVERBIKE_SHOP_POS.y) > 3.2) return false;
  const distToCounter = Math.hypot(
    px - SKY_HOVERBIKE_SHOP_POS.counterX,
    pz - SKY_HOVERBIKE_SHOP_POS.counterZ
  );
  const distToMerchant = Math.hypot(
    px - SKY_HOVERBIKE_SHOP_POS.merchantX,
    pz - SKY_HOVERBIKE_SHOP_POS.merchantZ
  );
  return Math.min(distToCounter, distToMerchant) <= maxRadius;
}

/**
 * Summary: Checks whether `(px, py, pz)` is within mounting range of the spawned Sky-Harbor Hoverbike.
 */
export function isNearSpawnedSkyHoverbike(
  px: number,
  py: number,
  pz: number,
  maxRadius = 4.2
): boolean {
  if (!activeSkyHoverbike.spawned) return false;
  const horiz = Math.hypot(px - activeSkyHoverbike.x, pz - activeSkyHoverbike.z);
  const vert = Math.abs(py - activeSkyHoverbike.y);
  return horiz <= maxRadius && vert <= 3.2;
}

/**
 * Summary: Purchases (or recalls to the dock launch pad if already owned) the single Sky-Harbor
 *          Aether Hoverbike model from the dock merchant.
 */
export function buyOrSpawnHoverbikeFromMerchant(
  player: IPlayerState,
  godMode = false
): {
  ok: boolean;
  alreadyPurchased: boolean;
  message: string;
  bike: ISkyHoverbikeState;
} {
  const wasPurchased = activeSkyHoverbike.purchased;
  if (!wasPurchased && !godMode) {
    const currentGold = player.goldCoins ?? 0;
    if (currentGold >= SKY_HOVERBIKE_PRICE_GOLD) {
      player.goldCoins = currentGold - SKY_HOVERBIKE_PRICE_GOLD;
    }
  }

  activeSkyHoverbike.purchased = true;
  activeSkyHoverbike.spawned = true;
  activeSkyHoverbike.x = SKY_HOVERBIKE_SHOP_POS.padX;
  activeSkyHoverbike.y = SKY_HOVERBIKE_SHOP_POS.padY + 0.55;
  activeSkyHoverbike.z = SKY_HOVERBIKE_SHOP_POS.padZ;
  activeSkyHoverbike.vx = 0;
  activeSkyHoverbike.vy = 0;
  activeSkyHoverbike.vz = 0;
  activeSkyHoverbike.yaw = SKY_HOVERBIKE_SHOP_POS.padYaw;
  activeSkyHoverbike.pitch = 0;
  activeSkyHoverbike.roll = 0;
  activeSkyHoverbike.speed = 0;
  activeSkyHoverbike.isAirborne = false;

  const message = wasPurchased
    ? 'אופנוע האוויר האתרי הוחזר למשטח השיגור ברציף! לחץ [F] או [E] עליו לרכיבה וטיסה.'
    : 'רכשת אופנוע אוויר אתרי! הוא מוכן על משטח השיגור מול החנות — לחץ [F] או [E] לרכיבה וטיסה ([W/S] נסיעה, [Space] המראה, [C] הנמכה).';

  player.lastLootNotification = {
    text: message,
    timer: 5.0,
  };

  return {
    ok: true,
    alreadyPurchased: wasPurchased,
    message,
    bike: activeSkyHoverbike,
  };
}

/**
 * Summary: Advances the 3D hover & flight physics of the Sky-Harbor Aether Hoverbike when ridden
 *          by the player (`state.mountedHorseId === 'sky-hoverbike'`).
 */
export function stepSkyHoverbikePhysics(
  state: IPlayerState,
  input: IPlayerInput,
  dt: number,
  walkableHeightAt: (x: number, z: number, refY?: number) => number,
  waterSurfaceHeightAt?: (x: number, z: number) => number | null
): { steppedFoot: boolean; landedImpact: number } {
  const bike = activeSkyHoverbike;
  bike.spawned = true;
  bike.hoverPhase += dt;

  // Apply mouse look to player camera angles
  state.yaw += input.lookYawDelta;
  state.pitch = Math.max(-1.42, Math.min(1.42, state.pitch + input.lookPitchDelta));

  let bikeYaw = state.mountedHorseYaw ?? bike.yaw ?? state.yaw;

  // 1. Steering: [A/D] turns directly, and when thrusting forward/back, smoothly banking toward camera look yaw
  const turnRate = 2.65;
  const steerInput = -input.right;
  bikeYaw += steerInput * turnRate * dt;

  if (Math.abs(input.forward) > 0.08) {
    // Camera-assisted steering: gently align bike heading toward where the player is looking
    let yawDiff = (state.yaw + Math.PI) - bikeYaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    bikeYaw += yawDiff * Math.min(1, dt * 3.2);
  }

  // Forward unit vector for `bikeYaw` (matches horse convention: sin(yaw), cos(yaw))
  const fwdX = Math.sin(bikeYaw);
  const fwdZ = Math.cos(bikeYaw);

  // 2. Forward / Reverse Repulsor Thrust ([W/S] + [Shift] Boost)
  const maxForwardSpeed = input.sprint ? 36.0 : 22.0;
  const maxReverseSpeed = 12.0;
  const targetSpeed =
    input.forward >= 0
      ? input.forward * maxForwardSpeed
      : input.forward * maxReverseSpeed;

  const accelRate = Math.abs(targetSpeed) > Math.abs(bike.speed) ? 7.5 : 5.5;
  bike.speed += (targetSpeed - bike.speed) * Math.min(1, dt * accelRate);
  if (Math.abs(targetSpeed) < 0.01 && Math.abs(bike.speed) < 0.08) {
    bike.speed = 0;
  }

  bike.vx = fwdX * bike.speed;
  bike.vz = fwdZ * bike.speed;

  const nextX = Math.max(-1850, Math.min(1850, bike.x + bike.vx * dt));
  const nextZ = Math.max(-1850, Math.min(1850, bike.z + bike.vz * dt));

  // 3. Vertical Hover Cushion & Full 3D Aerial Flight ([Space] to Ascend, [C]/relaxed to Descend, plus pitch climb)
  const terrainY = walkableHeightAt(nextX, nextZ, bike.y);
  const waterY = waterSurfaceHeightAt ? (waterSurfaceHeightAt(nextX, nextZ) ?? -Infinity) : -Infinity;
  const surfaceY = Math.max(terrainY, waterY);
  const hoverCushionY = surfaceY + 0.58;

  const ascendHeld = Boolean(input.jumpHeld || input.jumpPressed);
  const descendHeld = Boolean(input.relaxed);
  const climbSpeed = input.sprint ? 21.0 : 14.5;
  const descendSpeed = 13.5;

  let targetVy = 0;
  if (ascendHeld) {
    targetVy = climbSpeed;
    bike.isAirborne = true;
  } else if (descendHeld) {
    targetVy = -descendSpeed;
  } else if (bike.isAirborne || bike.y > hoverCushionY + 0.45) {
    // When airborne and holding [W], allow camera pitch to climb/descend smoothly in 3D space!
    if (input.forward > 0.1 && Math.abs(state.pitch) > 0.12) {
      targetVy = Math.sin(state.pitch) * Math.abs(bike.speed) * 0.58;
    } else {
      // Gentle aether-levitation hold (slow drift down only if very high, otherwise holds altitude)
      targetVy = -0.35;
    }
  } else {
    // Smooth repulsor spring tracking ground/deck height when hovering low
    const heightError = hoverCushionY - bike.y;
    targetVy = Math.max(-10.0, Math.min(12.0, heightError * 8.0));
  }

  bike.vy += (targetVy - bike.vy) * Math.min(1, dt * 7.0);
  let nextY = bike.y + bike.vy * dt;

  // Prevent sinking below the walkable surface / water repulsor cushion
  if (nextY <= hoverCushionY) {
    nextY = hoverCushionY;
    if (bike.vy < 0) bike.vy = 0;
    bike.isAirborne = false;
  } else if (nextY > hoverCushionY + 0.65) {
    bike.isAirborne = true;
  }

  // Clamp maximum sky altitude
  if (nextY > 360) {
    nextY = 360;
    if (bike.vy > 0) bike.vy = 0;
  }

  bike.x = nextX;
  bike.y = nextY;
  bike.z = nextZ;
  bike.yaw = bikeYaw;

  // 4. Visual Pitch & Bank Roll for responsive aero-cycle feel
  const targetPitch = Math.max(
    -0.38,
    Math.min(0.38, (bike.vy / 22.0) * 0.35 - (bike.speed / 36.0) * 0.08)
  );
  const targetRoll = Math.max(-0.42, Math.min(0.42, steerInput * 0.32));
  bike.pitch += (targetPitch - bike.pitch) * Math.min(1, dt * 8.0);
  bike.roll += (targetRoll - bike.roll) * Math.min(1, dt * 8.0);

  // Sync player state to the hoverbike cockpit
  state.x = bike.x;
  state.y = bike.y;
  state.z = bike.z;
  state.vx = bike.vx;
  state.vy = bike.vy;
  state.vz = bike.vz;
  state.mountedHorseYaw = bikeYaw;
  state.mountedHorsePitch = bike.pitch;
  state.onGround = !bike.isAirborne;
  state.isJumping = bike.isAirborne;
  state.isSwimming = false;
  state.walkPace = input.sprint && Math.abs(bike.speed) >= 0.4 ? 'fast' : 'normal';

  return { steppedFoot: false, landedImpact: 0 };
}
