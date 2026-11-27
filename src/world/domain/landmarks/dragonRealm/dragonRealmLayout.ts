// ============================================================================
// MODULE: World / Domain / Landmarks / Dragon Realm Layout
// DESIGN: Spatial constants and pure layout descriptors for the Surface Dragon
//         Mirror Gate and the isolated Dragon Mirror Sanctum dimension (SRP)
// SUMMARY: Defines coordinates, platform geometry, portal triggers, return landing
//          points, and dragon arena anchors with zero runtime dependencies.
// ============================================================================

// ======================== SURFACE DRAGON MIRROR SHRINE ======================== \\
// #region Surface Dragon Mirror Shrine
/**
 * Summary: World position and terrace profile for the colossal Dragon Mirror Gate
 *          on a distant snowy northern plateau (-240, -760), facing south-southeast.
 */
export const DRAGON_PORTAL_SHRINE_POS = {
  x: -240.0,
  z: -760.0,
  targetH: 29.5,
  innerRadius: 42.0,
  outerRadius: 76.0,
  clearRadius: 76.0,
  plinthRadius: 26.0,
  plinthTopRadius: 19.5,
  plinthHeight: 2.5,
  /** Colossal 80-meter statue towering across the northern snow plains. */
  statueScale: 80.0,
  /** Yaw angle facing SSE toward central valley & spawn (0, 32) from (-240, -760). */
  shrineYaw: Math.atan2(0 - -240.0, 32 - -760.0),
  /** Additional local Y rotation offset for the statue base. */
  statueLocalYawOffset: 0,
  /**
   * Local center, radius, and face yaw tilt of the statue's central black mirror disc
   * in scaled shrine space (measured from the GLB circle mesh; statue base sits at plinthHeight).
   */
  mirrorCenterLocal: { x: 1.56, y: 49.28, z: 5.15 },
  mirrorRadius: 4.68,
  mirrorOvalScaleY: 1.045,
  mirrorYawOffset: 0.16,
  /** Astral Wind Thermal rising in front of the mirror ONLY when Wind Glider is owned. */
  thermalLocal: {
    lx: 1.56,
    lz: 18.5,
    radius: 7.5,
    maxHeightAboveTarget: 62.0,
  },
  interactRadius: 11.5,
  portalPlaneDepthTol: 2.6,
  portalApertureTolerance: 0.96,
} as const;

/**
 * Summary: Landing point on the obsidian plinth when returning from the Dragon Realm.
 * Placed safely on solid plinth ground in front of the 80m statue.
 */
export const DRAGON_SURFACE_RETURN_POS = {
  x: DRAGON_PORTAL_SHRINE_POS.x + Math.sin(DRAGON_PORTAL_SHRINE_POS.shrineYaw) * 13.5,
  y: DRAGON_PORTAL_SHRINE_POS.targetH + DRAGON_PORTAL_SHRINE_POS.plinthHeight + 0.1,
  z: DRAGON_PORTAL_SHRINE_POS.z + Math.cos(DRAGON_PORTAL_SHRINE_POS.shrineYaw) * 13.5,
  yaw: DRAGON_PORTAL_SHRINE_POS.shrineYaw,
} as const;
// #endregion

// ======================== DRAGON REALM DIMENSION ======================== \\
// #region Dragon Realm Dimension
/**
 * Summary: Origin of the isolated Dragon Mirror Sanctum dimension.
 * Located well outside PLAYABLE_RADIUS (1260m) and well above the ocean floor so
 * outdoor terrain, water, and sky are completely isolated.
 */
export const DRAGON_REALM_ORIGIN = {
  x: 1600,
  y: 120,
  z: 0,
} as const;

/** Summary: Spatial containment bounds for the Dragon Mirror Sanctum. */
export const DRAGON_REALM_BOUNDS = {
  minX: DRAGON_REALM_ORIGIN.x - 140,
  maxX: DRAGON_REALM_ORIGIN.x + 140,
  minZ: DRAGON_REALM_ORIGIN.z - 150,
  maxZ: DRAGON_REALM_ORIGIN.z + 130,
  minY: DRAGON_REALM_ORIGIN.y - 30,
  maxY: DRAGON_REALM_ORIGIN.y + 110,
  fallRecoveryY: DRAGON_REALM_ORIGIN.y - 16,
  maxArenaRadius: 96,
} as const;

/** Summary: Arrival & Return Dais inside the Dragon Realm (south edge looking north). */
export const DRAGON_REALM_ARRIVAL_DAIS = {
  lx: 0,
  lz: 48,
  radius: 11.5,
  topLy: 0.0,
} as const;

/** Summary: Player teleport landing point inside the Dragon Realm facing the sanctuary & dragons. */
export const DRAGON_REALM_SPAWN_POS = {
  x: DRAGON_REALM_ORIGIN.x + 0,
  y: DRAGON_REALM_ORIGIN.y + 0.12,
  z: DRAGON_REALM_ORIGIN.z + 37.5,
  yaw: 0.0, // Facing -Z (north toward the Astral Causeway and Sanctuary Plaza)
  pitch: -0.04,
} as const;

/** Summary: Return Mirror Gate positioned behind the arrival pad inside the Dragon Realm with a walk-in ramp. */
export const DRAGON_REALM_RETURN_GATE = {
  lx: 0,
  ly: 0.0,
  lz: 53.5,
  statueScale: 16.0,
  mirrorCenterLx: 0.31,
  mirrorCenterLy: 9.86,
  mirrorCenterLz: 1.03,
  mirrorRadius: 0.94,
  mirrorOvalScaleY: 1.045,
  mirrorYawOffset: 0.16,
  rampStartLz: 39.5,
  rampTopLz: 50.8,
  deckEndLz: 55.2,
  bridgeHalfWidth: 2.4,
  bridgeTopLy: 8.8,
  interactRadius: 5.5,
  portalPlaneDepthTol: 1.45,
} as const;

/** Summary: Glowing Astral Causeway Bridge connecting Arrival Dais to Sanctuary Plaza. */
export const DRAGON_REALM_CAUSEWAY = {
  halfWidth: 4.2,
  minLz: 18.0,
  maxLz: 38.0,
  baseLy: 0.0,
  plazaLy: 0.8,
  archHeight: 1.15,
} as const;

/** Summary: Central Obsidian Sanctuary Plaza hosting the astral sigil and flanking dragon arenas. */
export const DRAGON_REALM_PLAZA = {
  lx: 0,
  lz: -10.0,
  radius: 32.0,
  topLy: 0.8,
} as const;

/** Summary: Western Necropolis Bone Dais where the Skeleton Dragon dwells. */
export const DRAGON_REALM_WEST_DAIS = {
  lx: -21.0,
  lz: -12.0,
  radius: 10.5,
  rampOuterRadius: 14.5,
  topLy: 1.8,
} as const;

/** Summary: Eastern Abyssal Crystal Basin Dais where the Hydra Dragon dwells. */
export const DRAGON_REALM_EAST_DAIS = {
  lx: 21.0,
  lz: -12.0,
  radius: 10.5,
  rampOuterRadius: 14.5,
  topLy: 1.8,
} as const;

/** Summary: Northern Astral Crown Spire staircase and elevated astrolabe dais. */
export const DRAGON_REALM_NORTH_THRONE = {
  lx: 0,
  lz: -51.0,
  radius: 12.0,
  topLy: 4.8,
  stairHalfWidth: 4.6,
  stairStartLz: -35.0,
  stairEndLz: -43.0,
} as const;

/** Summary: Decorative floating crystal islands around the perimeter of the Other World. */
export const DRAGON_REALM_FLOATING_ISLANDS = [
  { id: 'isle-nw', lx: -46, ly: 8.5, lz: -48, radius: 9.5, height: 11.0, phase: 0.2 },
  { id: 'isle-ne', lx: 46, ly: 10.2, lz: -46, radius: 10.2, height: 12.5, phase: 1.4 },
  { id: 'isle-w-outer', lx: -56, ly: 3.5, lz: 12, radius: 8.2, height: 9.5, phase: 2.3 },
  { id: 'isle-e-outer', lx: 56, ly: 4.8, lz: 10, radius: 8.8, height: 10.0, phase: 3.1 },
  { id: 'isle-sw', lx: -34, ly: -3.2, lz: 46, radius: 7.4, height: 8.4, phase: 4.0 },
  { id: 'isle-se', lx: 34, ly: -2.4, lz: 46, radius: 7.4, height: 8.4, phase: 4.9 },
  { id: 'isle-north-apex', lx: 0, ly: 18.0, lz: -84, radius: 13.5, height: 18.0, phase: 5.5 },
] as const;

/** Summary: World coordinates where the two new dragons spawn inside the Dragon Realm. */
export const DRAGON_REALM_GUARDIAN_SPAWNS = {
  skeletonDragon: {
    x: DRAGON_REALM_ORIGIN.x + DRAGON_REALM_WEST_DAIS.lx,
    y: DRAGON_REALM_ORIGIN.y + DRAGON_REALM_WEST_DAIS.topLy,
    z: DRAGON_REALM_ORIGIN.z + DRAGON_REALM_WEST_DAIS.lz,
    yaw: Math.PI * 0.42,
    patrolRadius: 16.0,
    level: 16,
  },
  hydraDragon: {
    x: DRAGON_REALM_ORIGIN.x + DRAGON_REALM_EAST_DAIS.lx,
    y: DRAGON_REALM_ORIGIN.y + DRAGON_REALM_EAST_DAIS.topLy,
    z: DRAGON_REALM_ORIGIN.z + DRAGON_REALM_EAST_DAIS.lz,
    yaw: -Math.PI * 0.42,
    patrolRadius: 16.0,
    level: 18,
  },
} as const;

/** Summary: Cooldown in seconds before a player can automatically re-trigger portal traversal. */
export const DRAGON_PORTAL_TELEPORT_COOLDOWN_SEC = 2.4;
// #endregion
