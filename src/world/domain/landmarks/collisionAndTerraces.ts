// ============================================================================
// MODULE: World / Domain / Landmarks / Collision & Terraces
// DESIGN: Axis-aligned collision bounds, building clear zones, and leveled flat terraces (SRP)
// SUMMARY: Exposes SOLID_BUILDING_BOXES for player/projectile obstacle collision,
//          FLAT_BUILDING_TERRACES for procedural terrain leveling, and CLEAR_ZONES
//          to suppress tree and vegetation spawning around structures.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { ICollidableWorldEntity, IHillWatchtowerDef, IObstacleCylinder, ISolidBuildingBox } from '../worldTypes';
import {
  MAGIC_STONE_CIRCLE_POS,
  WATERFALL_CLIFF_POS,
  WATERFALL_POOL_POS,
  VOLCANO_SANCTUM_POS,
  FLOATING_BLOOMING_ISLANDS,
  FLOATING_ISLAND_STAIR_POS,
  SOUTHERN_DRAGON_RUINS_POS,
  DESERT_DRAGON_PASS_POS,
  NORDIC_FROST_SHRINE_POS,
  DESERT_PYRAMID_SANCTUARY_POS,
  SMUGGLER_ISLAND_POS,
  SAILABLE_SHIP_INITIAL_POS,
} from './coreLandmarks';
import {
  HUNTER_LODGE_POS,
  LAKESIDE_TEA_PAVILION_POS,
  RIVERSIDE_WINDMILLS,
  SAKURA_SANCTUARY_POS,
  SAKURA_SANCTUARY_YAW,
  VALLEY_FARMS,
} from './settlementLandmarks';
import {
  HILL_WATCHTOWERS,
  ROPE_BRIDGE_DEF,
} from './highlandBridgeLandmarks';
import {
  DWARVEN_GUARDIAN_STATUES,
  DWARVEN_STONE_HOUSES,
  SOUTHERN_MINE_POS,
} from './dwarvenLandmarks';
import {
  MINE_FLOOR_TORCH_STANDS,
  MINE_HOIST_CRANE,
  DWARVEN_MINECART_ROUTES,
  MINE_CART_BODY,
  MINE_CAVERN_WALLS,
  MINE_KHAZAD_BRIDGE,
  MINE_FOUNDRY_WALLS,
  MINE_LAGOON_WALLS,
  MINE_AMETHYST,
  MINE_BLAST_FURNACES,
  MINE_DOCK_CRATE,
  MINE_LAGOON_BRIDGE,
  MINE_LOOT_CRATE,
  MINE_VAULT_CRATE,
  MINE_WATERFALL_CLIFF,
  mineAmethystEnvelope,
  MINE_CRANE_MAST,
  MINE_MESS_HALL,
  MINE_ORE_ROCK,
  MINE_ORE_ROCK_SITES,
  MINE_MORIA_PILLARS,
  MINE_MORIA_WALLS,
  MINE_ROYAL_CHEST,
  MINE_TUNNEL_WALLS,
  MINE_SHAFT_WALLS,
  MINE_TRESTLE,
  MINE_ROOM1_ARCHES,
  MINE_TIMBER_ARCH,
  mineTunnelArchSites,
  MINE_PORTAL,
  MINE_SOUTH_GALLERY,
  MINE_SUPPLY_CRATES,
  MINE_SCAFFOLD_LEGS,
  MINE_WEST_SPLIT,
  MINE_EAST_FORGE,
  MINE_RAIL_TURNTABLE,
  MINE_WATERFALL_SECRET_CHAMBER,
  MINE_WATERWORKS,
  MINE_STONE_CRUSHER,
  MINE_GOLEM_CHAMBER,
  MINE_ANCIENT_PASSAGE,
  MINE_DRAGON_FORGE_SANCTUM,
  khazadBridgeSegment,
  mineFloorY,
  mineShaftSpan,
  mineShaftTan,
} from './dwarvenMineLayout';
import {
  SOUTHEAST_HARBOR_POS,
  SOUTHWEST_OASIS_POS,
  SOUTHWEST_OASIS_VILLAGE_HOUSES,
  SOUTHWEST_OASIS_STONE_WALLS,
  SOUTHWEST_OASIS_PALMS,
} from './oasisAndHarborLandmarks';
import {
  CHINESE_FORTRESS_POS,
  FORTRESS_Y_OFFSET,
  FORTRESS_Z_OFFSET,
} from './fortressLandmarks';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Constants
const FZ = FORTRESS_Z_OFFSET;
const FY = FORTRESS_Y_OFFSET;
// #endregion

// ======================== SOLID BUILDING BOXES ======================== \\
// #region Solid Building Boxes
/**
 * Summary: The eight Room 1 perimeter wall boxes, from MINE_CAVERN_WALLS, spanning the drawn height.
 */
function cavernWallBoxes(): ISolidBuildingBox[] {
  const W = MINE_CAVERN_WALLS;
  const h = W.thick / 2;
  const minY = SOUTHERN_MINE_POS.cavernFloorY - 0.7;
  const maxY = SOUTHERN_MINE_POS.cavernFloorY + SOUTHERN_MINE_POS.cavernHeight + 0.7;
  const mx = (lx: number) => SOUTHERN_MINE_POS.x + lx;
  const mz = (lz: number) => SOUTHERN_MINE_POS.entranceZ + lz;
  const sideBox = (id: string, sign: number, lz: number, length: number): ISolidBuildingBox => ({
    id, minX: mx(sign * W.sideWallX) - h, maxX: mx(sign * W.sideWallX) + h,
    minZ: mz(lz) - length / 2, maxZ: mz(lz) + length / 2, minY, maxY,
  });
  const flankBox = (id: string, lx: number, lzCentre: number, length: number): ISolidBuildingBox => ({
    id, minX: mx(lx) - length / 2, maxX: mx(lx) + length / 2,
    minZ: mz(lzCentre) - h, maxZ: mz(lzCentre) + h, minY, maxY,
  });
  return [
    sideBox('southern-mine-cavern-west-wall-north', -1, W.sideWallNorthLz, W.sideWallNorthLength),
    sideBox('southern-mine-cavern-west-wall-south', -1, W.sideWallSouthLz, W.sideWallSouthLength),
    sideBox('southern-mine-cavern-east-wall-north', 1, W.sideWallNorthLz, W.sideWallNorthLength),
    sideBox('southern-mine-cavern-east-wall-south', 1, W.sideWallSouthLz, W.sideWallSouthLength),
    flankBox('southern-mine-cavern-north-west-wall', -W.northFlankX, W.northFlankLz, W.northFlankLength),
    flankBox('southern-mine-cavern-north-east-wall', W.northFlankX, W.northFlankLz, W.northFlankLength),
    flankBox('southern-mine-cavern-south-wall-west', -W.southFlankX, W.southFlankLz, W.southFlankLength),
    flankBox('southern-mine-cavern-south-wall-east', W.southFlankX, W.southFlankLz, W.southFlankLength),
  ];
}

/**
 * Summary: The south Moria gallery walls (sloped, segmented) and the Great Hall walls, from MINE_SOUTH_GALLERY and
 *          MINE_MORIA_WALLS. The chasm cliffs are not included: they cross the bridge's ends, and the walkable
 *          height already treats the abyss as a fall.
 */
function moriaAndGalleryWallBoxes(): ISolidBuildingBox[] {
  const G = MINE_SOUTH_GALLERY;
  const M = MINE_MORIA_WALLS;
  const W = MINE_WEST_SPLIT;
  const E = MINE_EAST_FORGE;
  const mx = (lx: number) => SOUTHERN_MINE_POS.x + lx;
  const mz = (lz: number) => SOUTHERN_MINE_POS.entranceZ + lz;
  const moriaY = SOUTHERN_MINE_POS.moriaHallFloorY;
  const midY = (SOUTHERN_MINE_POS.cavernFloorY + moriaY) / 2;
  const tan = (SOUTHERN_MINE_POS.cavernFloorY - moriaY) / (G.lzMax - G.lzMin);
  const gallerySegLen = (G.lzMax - G.lzMin) / G.segments;
  const gallery: ISolidBuildingBox[] = [-1, 1].flatMap((side) =>
    Array.from({ length: G.segments }, (_, j) => {
      const lzc = G.lzMin + (j + 0.5) * gallerySegLen;
      const yc = midY + G.centreDy - (lzc - G.centreLz) * tan;
      const cx = mx(side * G.wallX);
      const t = G.thick / 2;
      return {
        id: `southern-mine-south-gallery-${side < 0 ? 'west' : 'east'}-wall-${j}`,
        minX: cx - t, maxX: cx + t,
        minZ: mz(lzc) - gallerySegLen / 2, maxZ: mz(lzc) + gallerySegLen / 2,
        minY: yc - G.height / 2, maxY: yc + G.height / 2,
      };
    })
  );
  const yWall = moriaY + M.wallCentreDy;
  const t = M.thick / 2;
  const sideFlankBox = (id: string, sign: number, lzCentre: number, len: number): ISolidBuildingBox => ({
    id, minX: mx(sign * M.sideWallX) - t, maxX: mx(sign * M.sideWallX) + t,
    minZ: mz(lzCentre) - len / 2, maxZ: mz(lzCentre) + len / 2,
    minY: yWall - M.sideWallHeight / 2, maxY: yWall + M.sideWallHeight / 2,
  });
  const flankBox = (id: string, sign: number): ISolidBuildingBox => ({
    id, minX: mx(sign * M.northFlankX) - M.northFlankLength / 2, maxX: mx(sign * M.northFlankX) + M.northFlankLength / 2,
    minZ: mz(M.northFlankLz) - t, maxZ: mz(M.northFlankLz) + t,
    minY: moriaY + M.northFlankCentreDy - M.northFlankHeight / 2, maxY: moriaY + M.northFlankCentreDy + M.northFlankHeight / 2,
  });

  const wt = W.thick / 2;
  const yTunnelMax = moriaY + W.tunnelHeight;
  const yHubMax = moriaY + W.hub.height;
  const yKingsMax = moriaY + W.hallOfKings.height;
  const yCrystalMax = moriaY + W.crystalSanctum.height;
  const yForgeMax = moriaY + E.chamber.height;
  const box = (id: string, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number): ISolidBuildingBox =>
    ({ id, minX: mx(x0), maxX: mx(x1), minZ: mz(z0), maxZ: mz(z1), minY: y0, maxY: y1 });

  const westSplitAndSanctums: ISolidBuildingBox[] = [
    // West Stem Tunnel (lx: -102..-65, lz: 176..190)
    box('southern-mine-west-stem-north-wall', W.stem.lxMin, W.stem.lxMax, W.stem.lzCentre - W.stem.halfW - wt, W.stem.lzCentre - W.stem.halfW + wt, moriaY, yTunnelMax),
    box('southern-mine-west-stem-south-wall', W.stem.lxMin, W.stem.lxMax, W.stem.lzCentre + W.stem.halfW - wt, W.stem.lzCentre + W.stem.halfW + wt, moriaY, yTunnelMax),
    // West Split Hub (lx: -130..-102, lz: 168..198) & Central Waystone Obelisk
    box('southern-mine-west-hub-west-wall', W.hub.lxMin - wt, W.hub.lxMin + wt, W.hub.lzMin, W.hub.lzMax, moriaY, yHubMax),
    box('southern-mine-west-hub-east-north-wall', W.hub.lxMax - wt, W.hub.lxMax + wt, W.hub.lzMin, W.stem.lzCentre - W.stem.halfW, moriaY, yHubMax),
    box('southern-mine-west-hub-east-south-wall', W.hub.lxMax - wt, W.hub.lxMax + wt, W.stem.lzCentre + W.stem.halfW, W.hub.lzMax, moriaY, yHubMax),
    box('southern-mine-west-hub-north-east-wall', W.northBranch.lxCentre + W.northBranch.halfW, W.hub.lxMax, W.hub.lzMin - wt, W.hub.lzMin + wt, moriaY, yHubMax),
    box('southern-mine-west-hub-south-east-wall', W.southBranch.lxCentre + W.southBranch.halfW, W.hub.lxMax, W.hub.lzMax - wt, W.hub.lzMax + wt, moriaY, yHubMax),
    box('southern-mine-west-hub-waystone', W.hub.waystoneLx - W.hub.waystoneHalf, W.hub.waystoneLx + W.hub.waystoneHalf, W.hub.waystoneLz - W.hub.waystoneHalf, W.hub.waystoneLz + W.hub.waystoneHalf, moriaY, moriaY + 6.5),
    // North Branch Tunnel (lx: -128..-114, lz: 146..168)
    box('southern-mine-west-north-branch-west-wall', W.northBranch.lxCentre - W.northBranch.halfW - wt, W.northBranch.lxCentre - W.northBranch.halfW + wt, W.northBranch.lzMin, W.northBranch.lzMax, moriaY, yTunnelMax),
    box('southern-mine-west-north-branch-east-wall', W.northBranch.lxCentre + W.northBranch.halfW - wt, W.northBranch.lxCentre + W.northBranch.halfW + wt, W.northBranch.lzMin, W.northBranch.lzMax, moriaY, yTunnelMax),
    // Chamber 5A: Hall of the Mountain Kings (lx: -152..-106, lz: 104..146)
    box('southern-mine-kings-north-wall', W.hallOfKings.lxMin, W.hallOfKings.lxMax, W.hallOfKings.lzMin - wt, W.hallOfKings.lzMin + wt, moriaY, yKingsMax),
    box('southern-mine-kings-west-wall', W.hallOfKings.lxMin - wt, W.hallOfKings.lxMin + wt, W.hallOfKings.lzMin, W.hallOfKings.lzMax, moriaY, yKingsMax),
    box('southern-mine-kings-east-wall', W.hallOfKings.lxMax - wt, W.hallOfKings.lxMax + wt, W.hallOfKings.lzMin, W.hallOfKings.lzMax, moriaY, yKingsMax),
    box('southern-mine-kings-south-west-wall', W.hallOfKings.lxMin, W.northBranch.lxCentre - W.northBranch.halfW, W.hallOfKings.lzMax - wt, W.hallOfKings.lzMax + wt, moriaY, yKingsMax),
    box('southern-mine-kings-south-east-wall', W.northBranch.lxCentre + W.northBranch.halfW, W.hallOfKings.lxMax, W.hallOfKings.lzMax - wt, W.hallOfKings.lzMax + wt, moriaY, yKingsMax),
    box('southern-mine-kings-obsidian-throne', W.hallOfKings.throneLx - W.hallOfKings.throneHalfX, W.hallOfKings.throneLx + W.hallOfKings.throneHalfX, W.hallOfKings.throneLz - W.hallOfKings.throneHalfZ, W.hallOfKings.throneLz + W.hallOfKings.throneHalfZ, moriaY, moriaY + W.hallOfKings.throneHeight),
    ...W.hallOfKings.statues.map((st, idx) =>
      box(`southern-mine-kings-statue-${idx}`, st.lx - W.hallOfKings.statueHalf, st.lx + W.hallOfKings.statueHalf, st.lz - W.hallOfKings.statueHalf, st.lz + W.hallOfKings.statueHalf, moriaY, moriaY + W.hallOfKings.statueHeight)
    ),
    // South Branch Tunnel (lx: -128..-114, lz: 198..220)
    box('southern-mine-west-south-branch-west-wall', W.southBranch.lxCentre - W.southBranch.halfW - wt, W.southBranch.lxCentre - W.southBranch.halfW + wt, W.southBranch.lzMin, W.southBranch.lzMax, moriaY, yTunnelMax),
    box('southern-mine-west-south-branch-east-wall', W.southBranch.lxCentre + W.southBranch.halfW - wt, W.southBranch.lxCentre + W.southBranch.halfW + wt, W.southBranch.lzMin, W.southBranch.lzMax, moriaY, yTunnelMax),
    // Chamber 5B: Abyssal Crystal Sanctum (lx: -152..-106, lz: 220..264)
    box('southern-mine-crystal-south-wall', W.crystalSanctum.lxMin, W.crystalSanctum.lxMax, W.crystalSanctum.lzMax - wt, W.crystalSanctum.lzMax + wt, moriaY, yCrystalMax),
    box('southern-mine-crystal-west-wall', W.crystalSanctum.lxMin - wt, W.crystalSanctum.lxMin + wt, W.crystalSanctum.lzMin, W.crystalSanctum.lzMax, moriaY, yCrystalMax),
    box('southern-mine-crystal-east-wall', W.crystalSanctum.lxMax - wt, W.crystalSanctum.lxMax + wt, W.crystalSanctum.lzMin, W.crystalSanctum.lzMax, moriaY, yCrystalMax),
    box('southern-mine-crystal-north-west-wall', W.crystalSanctum.lxMin, W.southBranch.lxCentre - W.southBranch.halfW, W.crystalSanctum.lzMin - wt, W.crystalSanctum.lzMin + wt, moriaY, yCrystalMax),
    box('southern-mine-crystal-north-east-wall', W.southBranch.lxCentre + W.southBranch.halfW, W.crystalSanctum.lxMax, W.crystalSanctum.lzMin - wt, W.crystalSanctum.lzMin + wt, moriaY, yCrystalMax),
    box('southern-mine-crystal-guardian-statue', W.crystalSanctum.guardianLx - W.crystalSanctum.guardianHalf, W.crystalSanctum.guardianLx + W.crystalSanctum.guardianHalf, W.crystalSanctum.guardianLz - W.crystalSanctum.guardianHalf, W.crystalSanctum.guardianLz + W.crystalSanctum.guardianHalf, moriaY, moriaY + W.crystalSanctum.guardianHeight),
  ];

  const eastTunnelAndDragonForge: ISolidBuildingBox[] = [
    // East Tunnel (lx: 65..102, lz: 176..190)
    box('southern-mine-moria-east-tunnel-north-wall', E.tunnel.lxMin, E.tunnel.lxMax, E.tunnel.lzCentre - E.tunnel.halfW - wt, E.tunnel.lzCentre - E.tunnel.halfW + wt, moriaY, yTunnelMax),
    box('southern-mine-moria-east-tunnel-south-wall', E.tunnel.lxMin, E.tunnel.lxMax, E.tunnel.lzCentre + E.tunnel.halfW - wt, E.tunnel.lzCentre + E.tunnel.halfW + wt, moriaY, yTunnelMax),
    // Chamber 6: Dragon-Forge & Titan Anvil Vault (lx: 102..150, lz: 154..212)
    box('southern-mine-dragon-forge-north-wall', E.chamber.lxMin, E.chamber.lxMax, E.chamber.lzMin - wt, E.chamber.lzMin + wt, moriaY, yForgeMax),
    box('southern-mine-dragon-forge-south-wall', E.chamber.lxMin, E.chamber.lxMax, E.chamber.lzMax - wt, E.chamber.lzMax + wt, moriaY, yForgeMax),
    box('southern-mine-dragon-forge-east-wall', E.chamber.lxMax - wt, E.chamber.lxMax + wt, E.chamber.lzMin, E.chamber.lzMax, moriaY, yForgeMax),
    box('southern-mine-dragon-forge-west-north-wall', E.chamber.lxMin - wt, E.chamber.lxMin + wt, E.chamber.lzMin, E.tunnel.lzCentre - E.tunnel.halfW, moriaY, yForgeMax),
    box('southern-mine-dragon-forge-west-south-wall', E.chamber.lxMin - wt, E.chamber.lxMin + wt, E.tunnel.lzCentre + E.tunnel.halfW, E.chamber.lzMax, moriaY, yForgeMax),
    box('southern-mine-dragon-forge-titan-anvil', E.chamber.anvilLx - E.chamber.anvilHalfX, E.chamber.anvilLx + E.chamber.anvilHalfX, E.chamber.anvilLz - E.chamber.anvilHalfZ, E.chamber.anvilLz + E.chamber.anvilHalfZ, moriaY, moriaY + E.chamber.anvilHeight),
    box('southern-mine-dragon-forge-smelter', E.chamber.dragonSmelterLx - E.chamber.dragonSmelterHalfX, E.chamber.dragonSmelterLx + E.chamber.dragonSmelterHalfX, E.chamber.dragonSmelterLz - E.chamber.dragonSmelterHalfZ, E.chamber.dragonSmelterLz + E.chamber.dragonSmelterHalfZ, moriaY, moriaY + E.chamber.dragonSmelterHeight),
  ];

  // Area 10 & 11: Golem Guardian Chamber, Ancient Stone Passage (lz: 310..346) & Southern Dragon Forge Sanctum (lz: 346..414)
  const GC = MINE_GOLEM_CHAMBER;
  const AP = MINE_ANCIENT_PASSAGE;
  const DF = MINE_DRAGON_FORGE_SANCTUM;
  const apt = AP.thick / 2;
  const dft = DF.thick / 2;
  const dfY = DF.floorY;
  const dfMaxY = dfY + DF.height;
  const golemAndSouthernDragonSanctum: ISolidBuildingBox[] = [
    // Colossal Golem Guardian Left & Right Stone Feet / Legs astride the Ancient Stone Doorway (leaving lx in [-3.2, +3.2] open!)
    box('southern-mine-golem-foot-west', -GC.footOffsetLx - GC.footHalfX, -GC.footOffsetLx + GC.footHalfX, GC.guardianLz - GC.footHalfZ, GC.guardianLz + GC.footHalfZ, moriaY, moriaY + GC.guardianHeight),
    box('southern-mine-golem-foot-east', GC.footOffsetLx - GC.footHalfX, GC.footOffsetLx + GC.footHalfX, GC.guardianLz - GC.footHalfZ, GC.guardianLz + GC.footHalfZ, moriaY, moriaY + GC.guardianHeight),
    // Flanking Golem Chain Pillars
    box('southern-mine-golem-chain-pillar-west', -GC.chainPillarLx - GC.chainPillarRadius, -GC.chainPillarLx + GC.chainPillarRadius, GC.chainPillarLz - GC.chainPillarRadius, GC.chainPillarLz + GC.chainPillarRadius, moriaY, moriaY + GC.chainPillarHeight),
    box('southern-mine-golem-chain-pillar-east', GC.chainPillarLx - GC.chainPillarRadius, GC.chainPillarLx + GC.chainPillarRadius, GC.chainPillarLz - GC.chainPillarRadius, GC.chainPillarLz + GC.chainPillarRadius, moriaY, moriaY + GC.chainPillarHeight),
    // Ancient Stone Passage Side Walls (lz: 310..346, lx = ±7.0)
    box('southern-mine-ancient-passage-west-wall', AP.minLx - apt, AP.minLx + apt, AP.minLz, AP.maxLz, AP.yEnd, AP.yStart + AP.height),
    box('southern-mine-ancient-passage-east-wall', AP.maxLx - apt, AP.maxLx + apt, AP.minLz, AP.maxLz, AP.yEnd, AP.yStart + AP.height),
    // Southern Dragon Forge & Treasure Chamber Walls (lx: -38..+38, lz: 346..414)
    box('southern-mine-dragon-sanctum-north-west-wall', DF.minLx, AP.minLx, DF.minLz - dft, DF.minLz + dft, dfY - 2.0, dfMaxY),
    box('southern-mine-dragon-sanctum-north-east-wall', AP.maxLx, DF.maxLx, DF.minLz - dft, DF.minLz + dft, dfY - 2.0, dfMaxY),
    box('southern-mine-dragon-sanctum-west-wall', DF.minLx - dft, DF.minLx + dft, DF.minLz, DF.maxLz, dfY - 2.0, dfMaxY),
    box('southern-mine-dragon-sanctum-east-wall', DF.maxLx - dft, DF.maxLx + dft, DF.minLz, DF.maxLz, dfY - 2.0, dfMaxY),
    box('southern-mine-dragon-sanctum-south-wall', DF.minLx, DF.maxLx, DF.maxLz - dft, DF.maxLz + dft, dfY - 2.0, dfMaxY),
    // Colossal Architectural Dragon-Head Furnace carved into the southern wall (lx = 0, lz = 406.0)
    box('southern-mine-dragon-sanctum-furnace', DF.dragonFurnace.lx - DF.dragonFurnace.halfX, DF.dragonFurnace.lx + DF.dragonFurnace.halfX, DF.dragonFurnace.lz - DF.dragonFurnace.halfZ, DF.dragonFurnace.lz + DF.dragonFurnace.halfZ, dfY - 2.0, dfY + DF.dragonFurnace.height),
    // Ancient Dwarven Treasure Chest on the raised Treasure Island (lx = 0, lz = 391.0)
    box('southern-mine-chest-dragon-sanctum', DF.treasureChest.lx - DF.treasureChest.halfX, DF.treasureChest.lx + DF.treasureChest.halfX, DF.treasureChest.lz - DF.treasureChest.halfZ, DF.treasureChest.lz + DF.treasureChest.halfZ, DF.treasureIsland.topY, DF.treasureIsland.topY + DF.treasureChest.height),
  ];

  return [
    ...gallery,
    sideFlankBox('southern-mine-moria-west-wall-north', -1, M.sideNorthFlankLz, M.sideNorthFlankLength),
    sideFlankBox('southern-mine-moria-west-wall-south', -1, M.sideSouthFlankLz, M.sideSouthFlankLength),
    sideFlankBox('southern-mine-moria-east-wall-north', 1, M.sideNorthFlankLz, M.sideNorthFlankLength),
    sideFlankBox('southern-mine-moria-east-wall-south', 1, M.sideSouthFlankLz, M.sideSouthFlankLength),
    {
      id: 'southern-mine-moria-south-wall-west',
      minX: mx(-M.backWallHalfX), maxX: mx(-M.southGateHalfW),
      minZ: mz(M.backWallLz) - t, maxZ: mz(M.backWallLz) + t,
      minY: yWall - M.backWallHeight / 2, maxY: yWall + M.backWallHeight / 2,
    },
    {
      id: 'southern-mine-moria-south-wall-east',
      minX: mx(M.southGateHalfW), maxX: mx(M.backWallHalfX),
      minZ: mz(M.backWallLz) - t, maxZ: mz(M.backWallLz) + t,
      minY: yWall - M.backWallHeight / 2, maxY: yWall + M.backWallHeight / 2,
    },
    flankBox('southern-mine-moria-north-wall-west', -1),
    flankBox('southern-mine-moria-north-wall-east', 1),
    ...westSplitAndSanctums,
    ...eastTunnelAndDragonForge,
    ...golemAndSouthernDragonSanctum,
  ];
}

/**
 * Summary: Walls of chamber 2 (lagoon + secret waterfall chamber), chamber 3 (mining galleries & foundry) and the two sloped rail tunnels, from the layout.
 * Design: Straight chamber walls over their floor; tunnel walls split along x so each follows its floor's slope.
 */
function chamberAndTunnelWallBoxes(): ISolidBuildingBox[] {
  const L = MINE_LAGOON_WALLS;
  const F = MINE_FOUNDRY_WALLS;
  const T = MINE_TUNNEL_WALLS;
  const S = MINE_WATERFALL_SECRET_CHAMBER;
  const mx = (lx: number) => SOUTHERN_MINE_POS.x + lx;
  const mz = (lz: number) => SOUTHERN_MINE_POS.entranceZ + lz;
  const lagoonY = mineFloorY('lagoon');
  const foundryY = mineFloorY('foundry');
  const box = (id: string, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number): ISolidBuildingBox =>
    ({ id, minX: x0, maxX: x1, minZ: z0, maxZ: z1, minY: y0, maxY: y1 });
  const hx = (len: number) => len / 2;
  const ht = (thick: number) => thick / 2;
  const lagoonBase = lagoonY + L.centreDy;
  const foundryBase = foundryY + F.centreDy;
  const st = S.thick / 2;
  const lagoon: ISolidBuildingBox[] = [
    // North wall split around the 8m secret waterfall passage (lx in [-122.0, -114.0])
    box('southern-mine-chamber2-north-wall-west', mx(L.northWestFlankLx) - hx(L.northWestFlankLength), mx(L.northWestFlankLx) + hx(L.northWestFlankLength), mz(L.northLz) - ht(L.thick), mz(L.northLz) + ht(L.thick), lagoonBase - L.height / 2, lagoonBase + L.height / 2),
    box('southern-mine-chamber2-north-wall-east', mx(L.northEastFlankLx) - hx(L.northEastFlankLength), mx(L.northEastFlankLx) + hx(L.northEastFlankLength), mz(L.northLz) - ht(L.thick), mz(L.northLz) + ht(L.thick), lagoonBase - L.height / 2, lagoonBase + L.height / 2),
    // Secret Chamber Behind the Waterfall (lx: -126..-110, lz: 22..38) walls & hidden chest
    box('southern-mine-waterfall-secret-north-wall', mx(S.minLx), mx(S.maxLx), mz(S.minLz) - st, mz(S.minLz) + st, S.floorY, S.floorY + S.height),
    box('southern-mine-waterfall-secret-west-wall', mx(S.minLx) - st, mx(S.minLx) + st, mz(S.minLz), mz(S.maxLz), S.floorY, S.floorY + S.height),
    box('southern-mine-waterfall-secret-east-wall', mx(S.maxLx) - st, mx(S.maxLx) + st, mz(S.minLz), mz(S.maxLz), S.floorY, S.floorY + S.height),
    box('southern-mine-chest-waterfall-secret', mx(S.chestLx - S.chestHalfX), mx(S.chestLx + S.chestHalfX), mz(S.chestLz - S.chestHalfZ), mz(S.chestLz + S.chestHalfZ), S.floorY, S.floorY + S.chestHeight),
    box('southern-mine-chamber2-south-wall', mx(L.northSouthLx) - hx(L.northSouthLength), mx(L.northSouthLx) + hx(L.northSouthLength), mz(L.southLz) - ht(L.thick), mz(L.southLz) + ht(L.thick), lagoonBase - L.height / 2, lagoonBase + L.height / 2),
    box('southern-mine-chamber2-west-wall', mx(L.westLx) - ht(L.thick), mx(L.westLx) + ht(L.thick), mz(L.westLz) - hx(L.westLength), mz(L.westLz) + hx(L.westLength), lagoonBase - L.height / 2, lagoonBase + L.height / 2),
    box('southern-mine-chamber2-east-wall-north', mx(L.eastNorthFlank.lx) - ht(L.thick), mx(L.eastNorthFlank.lx) + ht(L.thick), mz(L.eastNorthFlank.lz) - hx(L.eastNorthFlank.length), mz(L.eastNorthFlank.lz) + hx(L.eastNorthFlank.length), lagoonBase - L.height / 2, lagoonBase + L.height / 2),
    box('southern-mine-chamber2-east-wall-south', mx(L.eastSouthFlank.lx) - ht(L.thick), mx(L.eastSouthFlank.lx) + ht(L.thick), mz(L.eastSouthFlank.lz) - hx(L.eastSouthFlank.length), mz(L.eastSouthFlank.lz) + hx(L.eastSouthFlank.length), lagoonBase - L.height / 2, lagoonBase + L.height / 2),
  ];
  const foundry: ISolidBuildingBox[] = [
    box('southern-mine-chamber3-north-wall', mx(F.northSouthLx) - hx(F.northSouthLength), mx(F.northSouthLx) + hx(F.northSouthLength), mz(F.northLz) - ht(F.thick), mz(F.northLz) + ht(F.thick), foundryBase - F.height / 2, foundryBase + F.height / 2),
    box('southern-mine-chamber3-south-wall', mx(F.northSouthLx) - hx(F.northSouthLength), mx(F.northSouthLx) + hx(F.northSouthLength), mz(F.southLz) - ht(F.thick), mz(F.southLz) + ht(F.thick), foundryBase - F.height / 2, foundryBase + F.height / 2),
    box('southern-mine-chamber3-east-wall', mx(F.eastLx) - ht(F.thick), mx(F.eastLx) + ht(F.thick), mz(F.eastLz) - hx(F.eastLength), mz(F.eastLz) + hx(F.eastLength), foundryBase - F.height / 2, foundryBase + F.height / 2),
    box('southern-mine-chamber3-west-wall-north', mx(F.westNorthFlank.lx) - ht(F.thick), mx(F.westNorthFlank.lx) + ht(F.thick), mz(F.westNorthFlank.lz) - hx(F.westNorthFlank.length), mz(F.westNorthFlank.lz) + hx(F.westNorthFlank.length), foundryBase - F.height / 2, foundryBase + F.height / 2),
    box('southern-mine-chamber3-west-wall-south', mx(F.westSouthFlank.lx) - ht(F.thick), mx(F.westSouthFlank.lx) + ht(F.thick), mz(F.westSouthFlank.lz) - hx(F.westSouthFlank.length), mz(F.westSouthFlank.lz) + hx(F.westSouthFlank.length), foundryBase - F.height / 2, foundryBase + F.height / 2),
  ];
  // Tunnel walls: the tunnel floor runs linearly from the cavern floor to the chamber floor over 40 m of x.
  const tunnel = (side: 'west' | 'east'): ISolidBuildingBox[] => {
    const xc = side === 'west' ? T.westX : T.eastX;
    const endY = side === 'west' ? lagoonY : foundryY;
    const endX = side === 'west' ? -88.0 : 88.0;
    const startX = side === 'west' ? -48.0 : 48.0;
    const floorAt = (x: number) => SOUTHERN_MINE_POS.cavernFloorY + ((x - startX) / (endX - startX)) * (endY - SOUTHERN_MINE_POS.cavernFloorY);
    const drop = Math.abs(endY - SOUTHERN_MINE_POS.cavernFloorY);
    const ang = Math.atan2(drop, 40.0);
    const span = ((Math.hypot(40.0, drop) + 3.0) * Math.cos(ang)) / 2;
    const seg = (2 * span) / T.segments;
    const out: ISolidBuildingBox[] = [];
    T.wallLzs.forEach((lz, wi) => {
      for (let j = 0; j < T.segments; j++) {
        const xs = xc - span + (j + 0.5) * seg;
        const yc = floorAt(xs) + T.centreDy;
        out.push(box(`southern-mine-${side}-tunnel-${wi === 0 ? 'north' : 'south'}-wall-${j}`, mx(xs) - seg / 2, mx(xs) + seg / 2, mz(lz) - ht(T.thick), mz(lz) + ht(T.thick), yc - T.height / 2, yc + T.height / 2));
      }
    });
    return out;
  };
  return [...lagoon, ...foundry, ...tunnel('west'), ...tunnel('east')];
}

/**
 * Summary: The two posts of one timber arch, as axis-aligned boxes, rotated by the arch's yaw (the model's own rule).
 */
function archPostBoxes(floorY: number, lx: number, lz: number, yaw: number): ISolidBuildingBox[] {
  const cx = SOUTHERN_MINE_POS.x + lx;
  const cz = SOUTHERN_MINE_POS.entranceZ + lz;
  const h = MINE_TIMBER_ARCH.postHalf;
  return [-1, 1].map((side) => {
    const ox = side * MINE_TIMBER_ARCH.postOffset;
    const wx = cx + ox * Math.cos(yaw);
    const wz = cz - ox * Math.sin(yaw);
    return { id: 'arch-post', minX: wx - h, maxX: wx + h, minZ: wz - h, maxZ: wz + h, minY: floorY, maxY: floorY + MINE_TIMBER_ARCH.postTop };
  });
}

/** Summary: Global collection of axis-aligned 3D obstacle bounding boxes across the entire world. */
export const SOLID_BUILDING_BOXES: ISolidBuildingBox[] = [
  // Hunter's Cabin at (-92, 72, height=2.15, rotated PI in settlementModels.ts): Walls, Chimney, Porch Columns/Rails, and Interior Furniture
  {
    id: 'hunter-lodge-back-wall',
    minX: HUNTER_LODGE_POS.x - 4.9,
    maxX: HUNTER_LODGE_POS.x + 4.9,
    minZ: HUNTER_LODGE_POS.z + 3.6,
    maxZ: HUNTER_LODGE_POS.z + 4.0,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.7,
  },
  {
    id: 'hunter-lodge-west-wall',
    minX: HUNTER_LODGE_POS.x - 4.8,
    maxX: HUNTER_LODGE_POS.x - 4.4,
    minZ: HUNTER_LODGE_POS.z - 2.0,
    maxZ: HUNTER_LODGE_POS.z + 4.0,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.7,
  },
  {
    id: 'hunter-lodge-chimney',
    minX: HUNTER_LODGE_POS.x - 5.85,
    maxX: HUNTER_LODGE_POS.x - 4.35,
    minZ: HUNTER_LODGE_POS.z + 0.4,
    maxZ: HUNTER_LODGE_POS.z + 2.0,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 6.52,
  },
  {
    id: 'hunter-lodge-east-wall',
    minX: HUNTER_LODGE_POS.x + 4.4,
    maxX: HUNTER_LODGE_POS.x + 4.8,
    minZ: HUNTER_LODGE_POS.z - 2.0,
    maxZ: HUNTER_LODGE_POS.z + 4.0,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.7,
  },
  {
    id: 'hunter-lodge-front-left',
    minX: HUNTER_LODGE_POS.x - 4.8,
    maxX: HUNTER_LODGE_POS.x - 0.95,
    minZ: HUNTER_LODGE_POS.z - 2.0,
    maxZ: HUNTER_LODGE_POS.z - 1.6,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.7,
  },
  {
    id: 'hunter-lodge-front-right',
    minX: HUNTER_LODGE_POS.x + 0.95,
    maxX: HUNTER_LODGE_POS.x + 4.8,
    minZ: HUNTER_LODGE_POS.z - 2.0,
    maxZ: HUNTER_LODGE_POS.z - 1.6,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.7,
  },
  {
    id: 'hunter-lodge-front-header',
    minX: HUNTER_LODGE_POS.x - 0.95,
    maxX: HUNTER_LODGE_POS.x + 0.95,
    minZ: HUNTER_LODGE_POS.z - 2.0,
    maxZ: HUNTER_LODGE_POS.z - 1.6,
    minY: HUNTER_LODGE_POS.height + 2.6,
    maxY: HUNTER_LODGE_POS.height + 3.7,
  },
  // Hunter's Cabin 4 Porch Veranda Columns & 2 Porch Rails at z = 72 - 4.1 = 67.9
  ...[-4.8, -1.8, 1.8, 4.8].map((vx, idx) => ({
    id: `hunter-lodge-porch-col-${idx + 1}`,
    minX: HUNTER_LODGE_POS.x + vx - 0.2,
    maxX: HUNTER_LODGE_POS.x + vx + 0.2,
    minZ: HUNTER_LODGE_POS.z - 4.1 - 0.2,
    maxZ: HUNTER_LODGE_POS.z - 4.1 + 0.2,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.5,
  })),
  {
    id: 'hunter-lodge-porch-rail-west',
    minX: HUNTER_LODGE_POS.x - 4.8,
    maxX: HUNTER_LODGE_POS.x - 1.8,
    minZ: HUNTER_LODGE_POS.z - 4.24,
    maxZ: HUNTER_LODGE_POS.z - 3.96,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 1.12,
  },
  {
    id: 'hunter-lodge-porch-rail-east',
    minX: HUNTER_LODGE_POS.x + 1.8,
    maxX: HUNTER_LODGE_POS.x + 4.8,
    minZ: HUNTER_LODGE_POS.z - 4.24,
    maxZ: HUNTER_LODGE_POS.z - 3.96,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 1.12,
  },
  // Hunter's Cabin Interior Furniture: Bed, Dining Table, and Rotated Starter Gear Chest (yaw=0.35)
  {
    id: 'hunter-lodge-bed',
    minX: HUNTER_LODGE_POS.x - 3.2 - 0.88,
    maxX: HUNTER_LODGE_POS.x - 3.2 + 0.88,
    minZ: HUNTER_LODGE_POS.z + 2.4 - 1.18,
    maxZ: HUNTER_LODGE_POS.z + 2.4 + 1.18,
    minY: HUNTER_LODGE_POS.height + 0.18,
    maxY: HUNTER_LODGE_POS.height + 0.9,
  },
  {
    id: 'hunter-lodge-table',
    minX: HUNTER_LODGE_POS.x - 0.2 - 0.9,
    maxX: HUNTER_LODGE_POS.x - 0.2 + 0.9,
    minZ: HUNTER_LODGE_POS.z + 2.55 - 0.55,
    maxZ: HUNTER_LODGE_POS.z + 2.55 + 0.55,
    minY: HUNTER_LODGE_POS.height + 0.18,
    maxY: HUNTER_LODGE_POS.height + 1.1,
  },
  {
    id: 'hunter-lodge-starter-chest',
    minX: HUNTER_LODGE_POS.x + 3.55 - 0.68,
    maxX: HUNTER_LODGE_POS.x + 3.55 + 0.68,
    minZ: HUNTER_LODGE_POS.z + 2.95 - 0.44,
    maxZ: HUNTER_LODGE_POS.z + 2.95 + 0.44,
    minY: HUNTER_LODGE_POS.height + 0.18,
    maxY: HUNTER_LODGE_POS.height + 1.15,
    yaw: 0,
  },
  {
    id: 'hunter-water-trough',
    minX: HUNTER_LODGE_POS.x - 10.9,
    maxX: HUNTER_LODGE_POS.x - 8.1,
    minZ: HUNTER_LODGE_POS.z - 3.96,
    maxZ: HUNTER_LODGE_POS.z - 3.04,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 0.9,
  },
  {
    id: 'hunter-water-pump',
    minX: HUNTER_LODGE_POS.x - 7.95 - 0.18,
    maxX: HUNTER_LODGE_POS.x - 7.95 + 0.18,
    minZ: HUNTER_LODGE_POS.z - 3.5 - 0.18,
    maxZ: HUNTER_LODGE_POS.z - 3.5 + 0.18,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 1.55,
  },
  // 3 Valley Farmhouses (farm-west, farm-south, farm-east): Exterior Walls, Porch Columns, Interior Furniture & Workshop, Wheat Field Fences, Hay Bales, and Perimeter Fence + Gate Archway
  ...VALLEY_FARMS.flatMap((farm, fIdx) => {
    const mapBox = (
      idSuffix: string,
      lx1: number,
      lx2: number,
      lz1: number,
      lz2: number,
      minYOff: number,
      maxYOff: number,
      yaw?: number
    ): ISolidBuildingBox => {
      const wx1 = farm.x + lx1 * farm.dirZ;
      const wx2 = farm.x + lx2 * farm.dirZ;
      const wz1 = farm.z + lz1 * farm.dirZ;
      const wz2 = farm.z + lz2 * farm.dirZ;
      return {
        id: `${farm.id}-${idSuffix}`,
        minX: Math.min(wx1, wx2),
        maxX: Math.max(wx1, wx2),
        minZ: Math.min(wz1, wz2),
        maxZ: Math.max(wz1, wz2),
        minY: farm.height + minYOff,
        maxY: farm.height + maxYOff,
        ...(yaw !== undefined ? { yaw } : {}),
      };
    };

    // Workshop station in farmGroup local coordinates (offset by farmFurniture at (0, 0.18, -2.0), flush against West wall at lz = 0.0)
    const workshopBox =
      fIdx === 0
        ? mapBox('workshop-oven', -4.65, -3.3, -0.95, 0.95, 0.18, 2.65)
        : fIdx === 1
          ? mapBox('workshop-churn', -4.65, -3.3, -0.85, 0.85, 0.18, 1.35)
          : mapBox('workshop-loom', -4.65, -3.45, -0.82, 0.82, 0.18, 1.95);

    return [
      // Farmhouse Exterior Walls & Doorway Lintel Header (capped at exact eaves height 3.58m / front plate 4.04m so hitboxes never protrude above the roof!)
      mapBox('back-wall', -5.1, 5.1, -6.36, -5.94, 0, 3.58),
      mapBox('west-wall', -5.16, -4.74, -6.25, 2.35, 0, 3.58),
      mapBox('east-wall', 4.74, 5.16, -6.25, 2.35, 0, 3.58),
      mapBox('front-left', -5.1, -0.95, 1.99, 2.41, 0, 4.04),
      mapBox('front-right', 0.95, 5.1, 1.99, 2.41, 0, 4.04),
      mapBox('front-header', -0.95, 0.95, 1.99, 2.41, 2.53, 4.04),
      // 4 Veranda Porch Columns at lz = +4.1 (capped at exact veranda header height 3.22m)
      ...[-4.6, -1.6, 1.6, 4.6].map((vx, cIdx) =>
        mapBox(`porch-col-${cIdx + 1}`, vx - 0.2, vx + 0.2, 4.1 - 0.2, 4.1 + 0.2, 0, 3.22)
      ),
      // Farmhouse Interior Furniture (Back Hearth, Dining Table & Benches, Panelled Wardrobe, Country Bed, Storage Chest, Workshop Station)
      mapBox('interior-hearth', -1.1, 1.1, -5.9, -4.94, 0.18, 3.65),
      mapBox('interior-table', 1.8, 3.9, -0.6, 1.3, 0.18, 1.02),
      mapBox('interior-wardrobe', -4.45, -2.85, -5.88, -5.06, 0.18, 2.5),
      mapBox('interior-bed', 2.64, 4.16, -5.92, -3.77, 0.18, 1.25),
      mapBox('interior-chest', 3.82, 4.54, -2.8, -1.6, 0.18, 1.05),
      workshopBox,
      // Wheat Field Border Fences (lz = -8.6 and lz = +7.6 on both field sides) & Rotated Hay Bales
      mapBox('field-fence-left-back', -18.1, -7.1, -8.75, -8.45, 0, 0.88),
      mapBox('field-fence-left-front', -18.1, -7.1, 7.45, 7.75, 0, 0.88),
      mapBox('field-fence-right-back', 7.1, 18.1, -8.75, -8.45, 0, 0.88),
      mapBox('field-fence-right-front', 7.1, 18.1, 7.45, 7.75, 0, 0.88),
      mapBox('hay-bale-left', -6.4 - 0.48, -6.4 + 0.48, 3.2 - 0.33, 3.2 + 0.33, 0.15, 0.75, -0.25),
      mapBox('hay-bale-right', 6.4 - 0.48, 6.4 + 0.48, 3.2 - 0.33, 3.2 + 0.33, 0.15, 0.75, 0.25),
      // Perimeter Compound Fence & Tall Entrance Gate Posts + Crossbeam Arch
      mapBox('perimeter-fence-back', -farm.fenceHalfW - 0.18, farm.fenceHalfW + 0.18, -farm.fenceHalfD - 0.18, -farm.fenceHalfD + 0.18, 0, 1.25),
      mapBox('perimeter-fence-west', -farm.fenceHalfW - 0.18, -farm.fenceHalfW + 0.18, -farm.fenceHalfD - 0.18, farm.fenceHalfD + 0.18, 0, 1.25),
      mapBox('perimeter-fence-east', farm.fenceHalfW - 0.18, farm.fenceHalfW + 0.18, -farm.fenceHalfD - 0.18, farm.fenceHalfD + 0.18, 0, 1.25),
      mapBox('perimeter-fence-front-left', -farm.fenceHalfW - 0.18, -farm.gateHalfW, farm.fenceHalfD - 0.18, farm.fenceHalfD + 0.18, 0, 1.25),
      mapBox('perimeter-fence-front-right', farm.gateHalfW, farm.fenceHalfW + 0.18, farm.fenceHalfD - 0.18, farm.fenceHalfD + 0.18, 0, 1.25),
      mapBox('gate-post-left', -farm.gateHalfW - 0.26, -farm.gateHalfW + 0.26, farm.fenceHalfD - 0.26, farm.fenceHalfD + 0.26, 0, 3.65),
      mapBox('gate-post-right', farm.gateHalfW - 0.26, farm.gateHalfW + 0.26, farm.fenceHalfD - 0.26, farm.fenceHalfD + 0.26, 0, 3.65),
      mapBox('gate-crossbeam', -farm.gateHalfW - 0.7, farm.gateHalfW + 0.7, farm.fenceHalfD - 0.2, farm.fenceHalfD + 0.2, 3.28, 3.65),
    ];
  }),
  // ============================================================================
  // SUBTERRANEAN DWARVEN MINE & MORIA NETWORK HITBOXES (Room 1 + Chambers 2, 3, 4)
  // ============================================================================
  // 1) Entrance Portal Arch Pillars & Header at lz = -0.35
  // Entrance portal: four pillars and two lintels at the drawn positions, from MINE_PORTAL.
  ...[-MINE_PORTAL.pillarX, MINE_PORTAL.pillarX].flatMap((px) =>
    MINE_PORTAL.pillarZs.map((pz) => {
      const cx = SOUTHERN_MINE_POS.x + px;
      const cz = SOUTHERN_MINE_POS.entranceZ + pz;
      const h = MINE_PORTAL.pillarHalf;
      return {
        id: `southern-mine-portal-pillar-${px < 0 ? 'w' : 'e'}${pz < 1 ? 'n' : 's'}`,
        minX: cx - h,
        maxX: cx + h,
        minZ: cz - h,
        maxZ: cz + h,
        minY: SOUTHERN_MINE_POS.entranceY,
        maxY: SOUTHERN_MINE_POS.entranceY + MINE_PORTAL.pillarHeight,
      };
    })
  ),
  ...MINE_PORTAL.pillarZs.map((pz) => {
    const cz = SOUTHERN_MINE_POS.entranceZ + pz;
    return {
      id: `southern-mine-portal-lintel-${pz < 1 ? 'n' : 's'}`,
      minX: SOUTHERN_MINE_POS.x - MINE_PORTAL.lintelHalfW,
      maxX: SOUTHERN_MINE_POS.x + MINE_PORTAL.lintelHalfW,
      minZ: cz - MINE_PORTAL.lintelHalfD,
      maxZ: cz + MINE_PORTAL.lintelHalfD,
      minY: SOUTHERN_MINE_POS.entranceY + MINE_PORTAL.lintelCentreY - MINE_PORTAL.lintelHalfH,
      maxY: SOUTHERN_MINE_POS.entranceY + MINE_PORTAL.lintelCentreY + MINE_PORTAL.lintelHalfH,
    };
  }),
  // 2) Sloped Entrance Shaft Walls & Timber Support Posts (lz = -0.5..34.2, |lx| = 2.95..4.8)
  // 3) Room 1 Perimeter Rock Walls with Tunnel Openings (West/East at lz in [58.5, 69.5], South at lx in [-16.0, 16.0])
  // 4) Room 1 Timber Arch Posts & Mess Hall Dining Tables, Cauldron, and Lootable Supply Crates
  // Mess hall dining tables and stew cauldron, from MINE_MESS_HALL (the model draws the same positions).
  ...MINE_MESS_HALL.tableZs.map((tz, i) => {
    const cx = SOUTHERN_MINE_POS.x + MINE_MESS_HALL.lx;
    const cz = SOUTHERN_MINE_POS.entranceZ + tz;
    return {
      id: i === 0 ? 'southern-mine-mess-table-north' : 'southern-mine-mess-table-south',
      minX: cx - MINE_MESS_HALL.tableHalfLen,
      maxX: cx + MINE_MESS_HALL.tableHalfLen,
      minZ: cz - MINE_MESS_HALL.tableHalfDepth,
      maxZ: cz + MINE_MESS_HALL.tableHalfDepth,
      minY: SOUTHERN_MINE_POS.cavernFloorY,
      maxY: SOUTHERN_MINE_POS.cavernFloorY + MINE_MESS_HALL.tableHeight,
    };
  }),
  {
    id: 'southern-mine-mess-cauldron',
    minX: SOUTHERN_MINE_POS.x + MINE_MESS_HALL.lx - MINE_MESS_HALL.cauldron.halfSize,
    maxX: SOUTHERN_MINE_POS.x + MINE_MESS_HALL.lx + MINE_MESS_HALL.cauldron.halfSize,
    minZ: SOUTHERN_MINE_POS.entranceZ + MINE_MESS_HALL.cauldron.lz - MINE_MESS_HALL.cauldron.halfSize,
    maxZ: SOUTHERN_MINE_POS.entranceZ + MINE_MESS_HALL.cauldron.lz + MINE_MESS_HALL.cauldron.halfSize,
    minY: SOUTHERN_MINE_POS.cavernFloorY,
    maxY: SOUTHERN_MINE_POS.cavernFloorY + MINE_MESS_HALL.cauldron.height,
  },
  // Mess hall supply crates, centred on the model's crate positions (MINE_SUPPLY_CRATES).
  {
    id: 'southern-mine-crate-mess-provisions',
    minX: SOUTHERN_MINE_POS.x + MINE_SUPPLY_CRATES.lx - MINE_SUPPLY_CRATES.halfX,
    maxX: SOUTHERN_MINE_POS.x + MINE_SUPPLY_CRATES.lx + MINE_SUPPLY_CRATES.halfX,
    minZ: SOUTHERN_MINE_POS.entranceZ + MINE_SUPPLY_CRATES.provisions.lz - MINE_SUPPLY_CRATES.provisions.halfZ,
    maxZ: SOUTHERN_MINE_POS.entranceZ + MINE_SUPPLY_CRATES.provisions.lz + MINE_SUPPLY_CRATES.provisions.halfZ,
    minY: SOUTHERN_MINE_POS.cavernFloorY,
    maxY: SOUTHERN_MINE_POS.cavernFloorY + MINE_SUPPLY_CRATES.height,
  },
  {
    id: 'southern-mine-crate-quartermaster',
    minX: SOUTHERN_MINE_POS.x + MINE_SUPPLY_CRATES.lx - MINE_SUPPLY_CRATES.halfX,
    maxX: SOUTHERN_MINE_POS.x + MINE_SUPPLY_CRATES.lx + MINE_SUPPLY_CRATES.halfX,
    minZ: SOUTHERN_MINE_POS.entranceZ + MINE_SUPPLY_CRATES.quartermaster.lz - MINE_SUPPLY_CRATES.quartermaster.halfZ,
    maxZ: SOUTHERN_MINE_POS.entranceZ + MINE_SUPPLY_CRATES.quartermaster.lz + MINE_SUPPLY_CRATES.quartermaster.halfZ,
    minY: SOUTHERN_MINE_POS.cavernFloorY,
    maxY: SOUTHERN_MINE_POS.cavernFloorY + MINE_SUPPLY_CRATES.height,
  },
  {
    id: 'southern-mine-crate-staging-gems',
    minX: SOUTHERN_MINE_POS.x + 10.8,
    maxX: SOUTHERN_MINE_POS.x + 12.45,
    minZ: SOUTHERN_MINE_POS.entranceZ + 59.55,
    maxZ: SOUTHERN_MINE_POS.entranceZ + 62.7,
    minY: SOUTHERN_MINE_POS.cavernFloorY,
    maxY: SOUTHERN_MINE_POS.cavernFloorY + 1.45,
  },
  // 5) Room 1 Hoist Crane Tower on NE Scaffolding Platform & Crane Mast at (16.0, 76.0)
  // Floor torch stands (0.52 plinth) that a player can walk into, from MINE_FLOOR_TORCH_STANDS.
  ...MINE_FLOOR_TORCH_STANDS.map((t, i) => {
    const cx = SOUTHERN_MINE_POS.x + t.lx;
    const cz = SOUTHERN_MINE_POS.entranceZ + t.lz;
    const baseY = mineFloorY(t.floor) + t.lift;
    return {
      id: `southern-mine-floor-torch-${i}`,
      minX: cx - 0.26,
      maxX: cx + 0.26,
      minZ: cz - 0.26,
      maxZ: cz + 0.26,
      minY: baseY,
      maxY: baseY + 2.75,
    };
  }),
  // The north-west gallery and its stairs are walkable heights (southernMineWalkableHeightAt), not boxes:
  // a box above the feet would block the climb. Rails on both edges of the Bridge of Khazad-dûm, one pair per deck segment, from MINE_KHAZAD_BRIDGE.
  ...Array.from({ length: MINE_KHAZAD_BRIDGE.segments }, (_, s) => {
    const seg = khazadBridgeSegment(s);
    const z = SOUTHERN_MINE_POS.entranceZ + seg.bz;
    const half = 2.0;
    return ([-1, 1] as const).map((side) => {
      const x = SOUTHERN_MINE_POS.x + side * MINE_KHAZAD_BRIDGE.railX;
      const t = MINE_KHAZAD_BRIDGE.railHalfThickness;
      return {
        id: `southern-mine-khazad-rail-${side < 0 ? 'w' : 'e'}-${s}`,
        minX: x - t,
        maxX: x + t,
        minZ: z - half,
        maxZ: z + half,
        minY: seg.deckY,
        maxY: seg.deckY + MINE_KHAZAD_BRIDGE.railHeight,
      };
    });
  }).flat(),
  // Shaft walls: each sloped wall split into MINE_SHAFT_WALLS.segments boxes, each on the slope at its own centre.
  ...[-1, 1].flatMap((side) =>
    Array.from({ length: MINE_SHAFT_WALLS.segments }, (_, j) => {
      const span = mineShaftSpan();
      const segLen = (span.lzMax - span.lzMin) / MINE_SHAFT_WALLS.segments;
      const lzc = span.lzMin + (j + 0.5) * segLen;
      const yc = SOUTHERN_MINE_POS.entranceY + ((SOUTHERN_MINE_POS.cavernFloorY - SOUTHERN_MINE_POS.entranceY) / 2) + MINE_SHAFT_WALLS.centreDy - (lzc - MINE_SHAFT_WALLS.midLz) * mineShaftTan();
      const half = MINE_SHAFT_WALLS.height / 2;
      const cx = SOUTHERN_MINE_POS.x + side * MINE_SHAFT_WALLS.xCentre;
      const t = MINE_SHAFT_WALLS.thick / 2;
      return {
        id: `southern-mine-shaft-${side < 0 ? 'west' : 'east'}-wall-${j}`,
        minX: cx - t,
        maxX: cx + t,
        minZ: SOUTHERN_MINE_POS.entranceZ + lzc - segLen / 2,
        maxZ: SOUTHERN_MINE_POS.entranceZ + lzc + segLen / 2,
        minY: yc - half,
        maxY: Math.min(yc + half, SOUTHERN_MINE_POS.entranceY),
      };
    })
  ),
  // Room 1 perimeter walls, from MINE_CAVERN_WALLS (the model draws the same boxes).
  ...cavernWallBoxes(),
  ...moriaAndGalleryWallBoxes(),
  ...chamberAndTunnelWallBoxes(),
  // Timber arch posts: two per arch, at the drawn post spots (MINE_ROOM1_ARCHES and mineTunnelArchSites).
  ...MINE_ROOM1_ARCHES.flatMap((a, i) => {
    const prefix = i === 0 ? 'southern-mine-arch-north-post' : i === 1 ? 'southern-mine-arch-west-post' : 'southern-mine-arch-east-post';
    return archPostBoxes(SOUTHERN_MINE_POS.cavernFloorY, a.lx, a.lz, a.yaw).map((b, k) => ({ ...b, id: `${prefix}-${k}` }));
  }),
  ...mineTunnelArchSites().flatMap((s) =>
    archPostBoxes(s.ly, s.lx, s.lz, s.yaw).map((b, k) => ({ ...b, id: `southern-mine-${s.side}-tunnel-arch-${s.f}-${k}` }))
  ),
  // Stationary ore carts, one box per route, rotated by its yaw (the model draws the same cart body).
  ...DWARVEN_MINECART_ROUTES.map((route, i) => {
    const floorY = SOUTHERN_MINE_POS.cavernFloorY + (route.baseYOffset ?? 0);
    const c = Math.abs(Math.cos(route.yaw));
    const s = Math.abs(Math.sin(route.yaw));
    const hx = c * MINE_CART_BODY.halfX + s * MINE_CART_BODY.halfZ;
    const hz = s * MINE_CART_BODY.halfX + c * MINE_CART_BODY.halfZ;
    const cx = SOUTHERN_MINE_POS.x + route.startLocalX;
    const cz = SOUTHERN_MINE_POS.entranceZ + route.startLocalZ;
    return {
      id: `southern-mine-stationary-cart-${i}`,
      minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz,
      minY: floorY + MINE_CART_BODY.bottomDy,
      maxY: floorY + MINE_CART_BODY.topDy,
    };
  }),
  // Lagoon bridge rope rails, waterfall cliff, amethyst cluster and the two crates, from the layout.
  ...MINE_LAGOON_BRIDGE.lzs.map((lz, i) => {
    const cx = SOUTHERN_MINE_POS.x + MINE_LAGOON_BRIDGE.lx;
    const cz = SOUTHERN_MINE_POS.entranceZ + lz;
    const yc = mineFloorY('lagoon') + MINE_LAGOON_BRIDGE.deckDy + MINE_LAGOON_BRIDGE.ropeDy;
    const r = MINE_LAGOON_BRIDGE.ropeRadius;
    return {
      id: i === 0 ? 'southern-mine-lagoon-bridge-rail-north' : 'southern-mine-lagoon-bridge-rail-south',
      minX: cx - MINE_LAGOON_BRIDGE.ropeLength / 2, maxX: cx + MINE_LAGOON_BRIDGE.ropeLength / 2,
      minZ: cz - r, maxZ: cz + r, minY: yc - r, maxY: yc + r,
    };
  }),
  ...[-1, 1].map((side) => {
    const cx = SOUTHERN_MINE_POS.x + MINE_WATERFALL_CLIFF.lx + side * MINE_WATERFALL_CLIFF.flankOffsetLx;
    const cz = SOUTHERN_MINE_POS.entranceZ + MINE_WATERFALL_CLIFF.lz + MINE_WATERFALL_CLIFF.coreLz;
    return {
      id: `southern-mine-chamber2-waterfall-cliff-${side < 0 ? 'west' : 'east'}`,
      minX: cx - MINE_WATERFALL_CLIFF.flankW / 2,
      maxX: cx + MINE_WATERFALL_CLIFF.flankW / 2,
      minZ: cz - MINE_WATERFALL_CLIFF.coreD / 2,
      maxZ: cz + MINE_WATERFALL_CLIFF.coreD / 2,
      minY: mineFloorY('lagoon') + MINE_WATERFALL_CLIFF.coreY - MINE_WATERFALL_CLIFF.coreH / 2,
      maxY: mineFloorY('lagoon') + MINE_WATERFALL_CLIFF.coreY + MINE_WATERFALL_CLIFF.coreH / 2,
    };
  }),
  {
    id: 'southern-mine-amethyst-cluster-west',
    minX: SOUTHERN_MINE_POS.x + MINE_AMETHYST.lx - mineAmethystEnvelope().radius,
    maxX: SOUTHERN_MINE_POS.x + MINE_AMETHYST.lx + mineAmethystEnvelope().radius,
    minZ: SOUTHERN_MINE_POS.entranceZ + MINE_AMETHYST.lz - mineAmethystEnvelope().radius,
    maxZ: SOUTHERN_MINE_POS.entranceZ + MINE_AMETHYST.lz + mineAmethystEnvelope().radius,
    minY: mineFloorY('lagoon'),
    maxY: mineFloorY('lagoon') + mineAmethystEnvelope().top,
  },
  ...[MINE_DOCK_CRATE, MINE_VAULT_CRATE].map((c, i) => {
    const cx = SOUTHERN_MINE_POS.x + c.lx;
    const cz = SOUTHERN_MINE_POS.entranceZ + c.lz;
    const base = mineFloorY(c.floor) + c.lift;
    return {
      id: i === 0 ? 'southern-mine-crate-lagoon-dock' : 'southern-mine-crate-foundry-vault',
      minX: cx - MINE_LOOT_CRATE.half, maxX: cx + MINE_LOOT_CRATE.half,
      minZ: cz - MINE_LOOT_CRATE.half, maxZ: cz + MINE_LOOT_CRATE.half,
      minY: base, maxY: base + MINE_LOOT_CRATE.height,
    };
  }),
  // Moria trestle rails, one on each deck edge, from MINE_TRESTLE.
  ...[-1, 1].map((side) => {
    const x = SOUTHERN_MINE_POS.x + MINE_TRESTLE.deckLx + side * (MINE_TRESTLE.deckHalfWidth - MINE_TRESTLE.railInset);
    const h = MINE_TRESTLE.railThick / 2;
    return {
      id: `southern-mine-moria-trestle-rail-${side < 0 ? 'west' : 'east'}`,
      minX: x - h,
      maxX: x + h,
      minZ: SOUTHERN_MINE_POS.entranceZ + MINE_TRESTLE.deckLz - MINE_TRESTLE.deckLength / 2,
      maxZ: SOUTHERN_MINE_POS.entranceZ + MINE_TRESTLE.deckLz + MINE_TRESTLE.deckLength / 2,
      minY: SOUTHERN_MINE_POS.moriaHallFloorY,
      maxY: SOUTHERN_MINE_POS.moriaHallFloorY + MINE_TRESTLE.railHeight,
    };
  }),
  // Single objects, from the layout (the model draws the same boxes).
  ...MINE_MORIA_PILLARS.zs.flatMap((pz) =>
    MINE_MORIA_PILLARS.xs.map((px) => ({
      id: `southern-mine-moria-pillar-${px}_${pz}`,
      minX: SOUTHERN_MINE_POS.x + px - MINE_MORIA_PILLARS.radius,
      maxX: SOUTHERN_MINE_POS.x + px + MINE_MORIA_PILLARS.radius,
      minZ: SOUTHERN_MINE_POS.entranceZ + pz - MINE_MORIA_PILLARS.radius,
      maxZ: SOUTHERN_MINE_POS.entranceZ + pz + MINE_MORIA_PILLARS.radius,
      minY: SOUTHERN_MINE_POS.moriaHallFloorY,
      maxY: SOUTHERN_MINE_POS.moriaHallFloorY + MINE_MORIA_PILLARS.height,
    }))
  ),
  ...MINE_MORIA_PILLARS.abyssZs.flatMap((pz) =>
    MINE_MORIA_PILLARS.abyssXs.map((px) => ({
      id: `southern-mine-moria-abyss-pier-${px}_${pz}`,
      minX: SOUTHERN_MINE_POS.x + px - MINE_MORIA_PILLARS.radius,
      maxX: SOUTHERN_MINE_POS.x + px + MINE_MORIA_PILLARS.radius,
      minZ: SOUTHERN_MINE_POS.entranceZ + pz - MINE_MORIA_PILLARS.radius,
      maxZ: SOUTHERN_MINE_POS.entranceZ + pz + MINE_MORIA_PILLARS.radius,
      minY: SOUTHERN_MINE_POS.moriaAbyssBottomY,
      maxY: SOUTHERN_MINE_POS.moriaHallFloorY + MINE_MORIA_PILLARS.height,
    }))
  ),
  {
    id: 'southern-mine-chest-moria-royal',
    minX: SOUTHERN_MINE_POS.x + MINE_ROYAL_CHEST.lx - MINE_ROYAL_CHEST.halfX,
    maxX: SOUTHERN_MINE_POS.x + MINE_ROYAL_CHEST.lx + MINE_ROYAL_CHEST.halfX,
    minZ: SOUTHERN_MINE_POS.entranceZ + MINE_ROYAL_CHEST.lz - MINE_ROYAL_CHEST.halfZ,
    maxZ: SOUTHERN_MINE_POS.entranceZ + MINE_ROYAL_CHEST.lz + MINE_ROYAL_CHEST.halfZ,
    minY: SOUTHERN_MINE_POS.moriaHallFloorY + MINE_ROYAL_CHEST.baseDy,
    maxY: SOUTHERN_MINE_POS.moriaHallFloorY + MINE_ROYAL_CHEST.baseDy + MINE_ROYAL_CHEST.height,
  },
  {
    id: 'southern-mine-crane-mast',
    minX: SOUTHERN_MINE_POS.x + MINE_CRANE_MAST.lx - MINE_CRANE_MAST.half,
    maxX: SOUTHERN_MINE_POS.x + MINE_CRANE_MAST.lx + MINE_CRANE_MAST.half,
    minZ: SOUTHERN_MINE_POS.entranceZ + MINE_CRANE_MAST.lz - MINE_CRANE_MAST.half,
    maxZ: SOUTHERN_MINE_POS.entranceZ + MINE_CRANE_MAST.lz + MINE_CRANE_MAST.half,
    minY: SOUTHERN_MINE_POS.cavernFloorY,
    maxY: SOUTHERN_MINE_POS.cavernFloorY + MINE_CRANE_MAST.height,
  },
  {
    id: 'southern-mine-rail-control-booth',
    minX: SOUTHERN_MINE_POS.x + MINE_RAIL_TURNTABLE.controlBooth.lx - MINE_RAIL_TURNTABLE.controlBooth.halfX,
    maxX: SOUTHERN_MINE_POS.x + MINE_RAIL_TURNTABLE.controlBooth.lx + MINE_RAIL_TURNTABLE.controlBooth.halfX,
    minZ: SOUTHERN_MINE_POS.entranceZ + MINE_RAIL_TURNTABLE.controlBooth.lz - MINE_RAIL_TURNTABLE.controlBooth.halfZ,
    maxZ: SOUTHERN_MINE_POS.entranceZ + MINE_RAIL_TURNTABLE.controlBooth.lz + MINE_RAIL_TURNTABLE.controlBooth.halfZ,
    minY: SOUTHERN_MINE_POS.cavernFloorY,
    maxY: SOUTHERN_MINE_POS.cavernFloorY + MINE_RAIL_TURNTABLE.controlBooth.height,
  },
  {
    id: 'southern-mine-waterwheel-support',
    minX: SOUTHERN_MINE_POS.x + MINE_WATERWORKS.wheelLx - MINE_WATERWORKS.supportHalfX,
    maxX: SOUTHERN_MINE_POS.x + MINE_WATERWORKS.wheelLx + MINE_WATERWORKS.supportHalfX,
    minZ: SOUTHERN_MINE_POS.entranceZ + MINE_WATERWORKS.wheelLz - MINE_WATERWORKS.supportHalfZ,
    maxZ: SOUTHERN_MINE_POS.entranceZ + MINE_WATERWORKS.wheelLz + MINE_WATERWORKS.supportHalfZ,
    minY: SOUTHERN_MINE_POS.westLagoonFloorY,
    maxY: SOUTHERN_MINE_POS.westLagoonFloorY + MINE_WATERWORKS.supportHeight,
  },
  {
    id: 'southern-mine-stone-crusher',
    minX: SOUTHERN_MINE_POS.x + MINE_STONE_CRUSHER.lx - MINE_STONE_CRUSHER.halfX,
    maxX: SOUTHERN_MINE_POS.x + MINE_STONE_CRUSHER.lx + MINE_STONE_CRUSHER.halfX,
    minZ: SOUTHERN_MINE_POS.entranceZ + MINE_STONE_CRUSHER.lz - MINE_STONE_CRUSHER.halfZ,
    maxZ: SOUTHERN_MINE_POS.entranceZ + MINE_STONE_CRUSHER.lz + MINE_STONE_CRUSHER.halfZ,
    minY: SOUTHERN_MINE_POS.eastFoundryFloorY,
    maxY: SOUTHERN_MINE_POS.eastFoundryFloorY + MINE_STONE_CRUSHER.height,
  },
  ...MINE_BLAST_FURNACES.lzs.map((lz, i) => ({
    id: `southern-mine-blast-furnace-${i}`,
    minX: SOUTHERN_MINE_POS.x + MINE_BLAST_FURNACES.lx - MINE_BLAST_FURNACES.radius,
    maxX: SOUTHERN_MINE_POS.x + MINE_BLAST_FURNACES.lx + MINE_BLAST_FURNACES.radius,
    minZ: SOUTHERN_MINE_POS.entranceZ + lz - MINE_BLAST_FURNACES.radius,
    maxZ: SOUTHERN_MINE_POS.entranceZ + lz + MINE_BLAST_FURNACES.radius,
    minY: SOUTHERN_MINE_POS.eastFoundryFloorY,
    maxY: SOUTHERN_MINE_POS.eastFoundryFloorY + MINE_BLAST_FURNACES.height,
  })),
  // Scaffold legs under the catwalk, from MINE_SCAFFOLD_LEGS (the model draws the same positions).
  ...MINE_SCAFFOLD_LEGS.positions.map(([lx, lz], i) => {
    const cx = SOUTHERN_MINE_POS.x + lx;
    const cz = SOUTHERN_MINE_POS.entranceZ + lz;
    const r = MINE_SCAFFOLD_LEGS.radius;
    return {
      id: `southern-mine-scaffold-leg-${i}`,
      minX: cx - r,
      maxX: cx + r,
      minZ: cz - r,
      maxZ: cz + r,
      minY: SOUTHERN_MINE_POS.cavernFloorY,
      maxY: SOUTHERN_MINE_POS.cavernFloorY + MINE_SCAFFOLD_LEGS.height,
    };
  }),
  // Four corner posts of the open crane lattice. One 4.9 m box here blocked the air inside the frame (H6a).
  // Positions and sizes come from MINE_HOIST_CRANE, the same numbers the model uses.
  ...[-MINE_HOIST_CRANE.postSpan, MINE_HOIST_CRANE.postSpan].flatMap((px) =>
    [-MINE_HOIST_CRANE.postSpan, MINE_HOIST_CRANE.postSpan].map((pz) => {
      const cx = SOUTHERN_MINE_POS.x + MINE_HOIST_CRANE.offsetX + px;
      const cz = SOUTHERN_MINE_POS.entranceZ + MINE_HOIST_CRANE.offsetZ + pz;
      const h = MINE_HOIST_CRANE.postHalfSize;
      return {
        id: `southern-mine-hoist-crane-tower-post-${px < 0 ? 'w' : 'e'}${pz < 0 ? 'n' : 's'}`,
        minX: cx - h,
        maxX: cx + h,
        minZ: cz - h,
        maxZ: cz + h,
        minY: SOUTHERN_MINE_POS.catwalkY,
        maxY: SOUTHERN_MINE_POS.catwalkY + MINE_HOIST_CRANE.towerHeight,
      };
    })
  ),
  // 6) Stationary Ore Carts in Room 1 & Chamber 3 (matching DWARVEN_MINECART_ROUTES 1-to-1)
  // 7) West Rail Tunnel & Chamber 2 (Deep Subterranean Waterfall & Bioluminescent Lagoon Cavern: lx in [-148, -88], lz in [38, 112], y = -15.55)
  // 8) East Smelting Tunnel & Chamber 3 (Dwarven Gold & Silver Smelting Foundry: lx in [88, 144], lz in [40, 108], y = -14.35)
  // 9) South Grand Moria Descent Gallery & Chamber 4 (Great Hall of Khazad-dûm: lx in [-64, 64], lz in [145, 255], y = -18.35)
  // West Trestle Bridge Side Guardrails over the Abyss (lx = -14.85 / -8.15, lz in [178, 218])
  // 10) 8 Sculptural Miner Ore Veins in Room 1 (matching DWARVEN_MINER_STATIONS rockLocalX/rockLocalZ 1-to-1!)
  // Eight miner-station ore rocks, from MINE_ORE_ROCK_SITES (the model draws the same rocks).
  ...MINE_ORE_ROCK_SITES.map((r, idx) => {
    const cx = SOUTHERN_MINE_POS.x + r.lx;
    const cz = SOUTHERN_MINE_POS.entranceZ + r.lz;
    const rad = MINE_ORE_ROCK.radius;
    return {
      id: `southern-mine-ore-outcrop-${idx}`,
      minX: cx - rad, maxX: cx + rad, minZ: cz - rad, maxZ: cz + rad,
      minY: SOUTHERN_MINE_POS.cavernFloorY,
      maxY: SOUTHERN_MINE_POS.cavernFloorY + MINE_ORE_ROCK.top,
    };
  }),
  // Hunter's Horse Stable & Corral at world (-104.5, 2.15, 75.5): Back/Side walls, Center Partition, Hay Bale Stack, and West Corral Fence
  {
    id: 'stable-back-wall',
    minX: HUNTER_LODGE_POS.x - 16.3,
    maxX: HUNTER_LODGE_POS.x - 8.7,
    minZ: HUNTER_LODGE_POS.z + 5.85,
    maxZ: HUNTER_LODGE_POS.z + 6.15,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.55,
  },
  {
    id: 'stable-west-wall',
    minX: HUNTER_LODGE_POS.x - 16.28,
    maxX: HUNTER_LODGE_POS.x - 15.92,
    minZ: HUNTER_LODGE_POS.z + 1.1,
    maxZ: HUNTER_LODGE_POS.z + 6.1,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.55,
  },
  {
    id: 'stable-east-wall',
    minX: HUNTER_LODGE_POS.x - 9.08,
    maxX: HUNTER_LODGE_POS.x - 8.72,
    minZ: HUNTER_LODGE_POS.z + 1.1,
    maxZ: HUNTER_LODGE_POS.z + 6.1,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 3.55,
  },
  {
    id: 'stable-center-divider',
    minX: HUNTER_LODGE_POS.x - 12.66,
    maxX: HUNTER_LODGE_POS.x - 12.34,
    minZ: HUNTER_LODGE_POS.z + 1.2,
    maxZ: HUNTER_LODGE_POS.z + 6.0,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 2.05,
  },
  {
    id: 'stable-hay-bales',
    minX: HUNTER_LODGE_POS.x - 15.55,
    maxX: HUNTER_LODGE_POS.x - 13.6,
    minZ: HUNTER_LODGE_POS.z + 4.75,
    maxZ: HUNTER_LODGE_POS.z + 5.55,
    minY: HUNTER_LODGE_POS.height + 0.18,
    maxY: HUNTER_LODGE_POS.height + 1.4,
  },
  {
    id: 'stable-corral-fence-west',
    minX: HUNTER_LODGE_POS.x - 16.25,
    maxX: HUNTER_LODGE_POS.x - 12.35,
    minZ: HUNTER_LODGE_POS.z - 2.28,
    maxZ: HUNTER_LODGE_POS.z - 1.92,
    minY: HUNTER_LODGE_POS.height,
    maxY: HUNTER_LODGE_POS.height + 1.1,
  },
  // 2 Octagonal Riverside Windmills wrapped tightly with 8 tangential OBB facets matching CylinderGeometry(2.3, 2.9, ..., 8)
  ...RIVERSIDE_WINDMILLS.flatMap((wm) =>
    Array.from({ length: 8 }, (_, sIdx) => {
      const segSpan = (Math.PI * 2) / 8;
      const ang = wm.rotY + (sIdx + 0.5) * segSpan;
      const rFace = 2.45;
      const cx = wm.x + Math.sin(ang) * rFace;
      const cz = wm.z + Math.cos(ang) * rFace;
      const halfChord = rFace * Math.sin(segSpan * 0.5) + 0.08;
      const halfThick = 0.26;
      return {
        id: `${wm.id}-seg-${sIdx + 1}`,
        minX: cx - halfChord,
        maxX: cx + halfChord,
        minZ: cz - halfThick,
        maxZ: cz + halfThick,
        minY: wm.height,
        maxY: wm.height + 10.8,
        yaw: ang,
      };
    })
  ),
  // Lakeside Chinese Tea Pavilion at (-126, 48): 4 Crimson Corner Pillars, 3 Perimeter Railings (East pier entrance open), and Low Tea Table
  ...[-3.4, 3.4].flatMap((px, xIdx) =>
    [-3.4, 3.4].map((pz, zIdx) => ({
      id: `tea-pavilion-col-${xIdx * 2 + zIdx + 1}`,
      minX: LAKESIDE_TEA_PAVILION_POS.x + px - 0.2,
      maxX: LAKESIDE_TEA_PAVILION_POS.x + px + 0.2,
      minZ: LAKESIDE_TEA_PAVILION_POS.z + pz - 0.2,
      maxZ: LAKESIDE_TEA_PAVILION_POS.z + pz + 0.2,
      minY: LAKESIDE_TEA_PAVILION_POS.deckHeight,
      maxY: LAKESIDE_TEA_PAVILION_POS.deckHeight + 3.65,
    }))
  ),
  {
    id: 'tea-pavilion-rail-west',
    minX: LAKESIDE_TEA_PAVILION_POS.x - 3.6,
    maxX: LAKESIDE_TEA_PAVILION_POS.x - 3.4,
    minZ: LAKESIDE_TEA_PAVILION_POS.z - 3.7,
    maxZ: LAKESIDE_TEA_PAVILION_POS.z + 3.7,
    minY: LAKESIDE_TEA_PAVILION_POS.deckHeight,
    maxY: LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.85,
  },
  {
    id: 'tea-pavilion-rail-north',
    minX: LAKESIDE_TEA_PAVILION_POS.x - 3.7,
    maxX: LAKESIDE_TEA_PAVILION_POS.x + 3.7,
    minZ: LAKESIDE_TEA_PAVILION_POS.z - 3.6,
    maxZ: LAKESIDE_TEA_PAVILION_POS.z - 3.4,
    minY: LAKESIDE_TEA_PAVILION_POS.deckHeight,
    maxY: LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.85,
  },
  {
    id: 'tea-pavilion-rail-south',
    minX: LAKESIDE_TEA_PAVILION_POS.x - 3.7,
    maxX: LAKESIDE_TEA_PAVILION_POS.x + 3.7,
    minZ: LAKESIDE_TEA_PAVILION_POS.z + 3.4,
    maxZ: LAKESIDE_TEA_PAVILION_POS.z + 3.6,
    minY: LAKESIDE_TEA_PAVILION_POS.deckHeight,
    maxY: LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.85,
  },
  {
    id: 'tea-pavilion-table',
    minX: LAKESIDE_TEA_PAVILION_POS.x - 1.1,
    maxX: LAKESIDE_TEA_PAVILION_POS.x + 1.1,
    minZ: LAKESIDE_TEA_PAVILION_POS.z - 1.1,
    maxZ: LAKESIDE_TEA_PAVILION_POS.z + 1.1,
    minY: LAKESIDE_TEA_PAVILION_POS.deckHeight,
    maxY: LAKESIDE_TEA_PAVILION_POS.deckHeight + 0.55,
  },
  { id: 'main-hall-back-wall', minX: -22.3, maxX: 22.3, minZ: -216.3 + FZ, maxZ: -215.2 + FZ, minY: 26.0 + FY, maxY: 42.5 + FY },
  { id: 'main-hall-west-wall', minX: -22.3, maxX: -21.2, minZ: -216.3 + FZ, maxZ: -189.3 + FZ, minY: 26.0 + FY, maxY: 42.5 + FY },
  { id: 'main-hall-east-wall', minX: 21.2, maxX: 22.3, minZ: -216.3 + FZ, maxZ: -189.3 + FZ, minY: 26.0 + FY, maxY: 42.5 + FY },
  { id: 'main-hall-front-west', minX: -22.3, maxX: -2.2, minZ: -190.3 + FZ, maxZ: -189.3 + FZ, minY: 26.0 + FY, maxY: 32.2 + FY },
  { id: 'main-hall-front-east', minX: 2.2, maxX: 22.3, minZ: -190.3 + FZ, maxZ: -189.3 + FZ, minY: 26.0 + FY, maxY: 32.2 + FY },
  { id: 'main-hall-front-upper-west', minX: -22.3, maxX: -4.5, minZ: -190.3 + FZ, maxZ: -189.3 + FZ, minY: 32.2 + FY, maxY: 42.5 + FY },
  { id: 'main-hall-front-upper-east', minX: 4.5, maxX: 22.3, minZ: -190.3 + FZ, maxZ: -189.3 + FZ, minY: 32.2 + FY, maxY: 42.5 + FY },
  { id: 'main-hall-front-window-sill', minX: -4.5, maxX: 4.5, minZ: -190.3 + FZ, maxZ: -189.3 + FZ, minY: 30.8 + FY, maxY: 32.65 + FY },
  { id: 'main-hall-front-window-header', minX: -4.5, maxX: 4.5, minZ: -190.3 + FZ, maxZ: -189.3 + FZ, minY: 36.55 + FY, maxY: 42.5 + FY },
  { id: 'west-pav-back-wall', minX: -39.3, maxX: -20.7, minZ: -172.0 + FZ, maxZ: -170.9 + FZ, minY: 26.0 + FY, maxY: 38.5 + FY },
  { id: 'west-pav-west-wall', minX: -39.3, maxX: -38.2, minZ: -172.0 + FZ, maxZ: -156.0 + FZ, minY: 26.0 + FY, maxY: 38.5 + FY },
  { id: 'west-pav-east-wall', minX: -21.8, maxX: -20.7, minZ: -172.0 + FZ, maxZ: -156.0 + FZ, minY: 26.0 + FY, maxY: 38.5 + FY },
  { id: 'west-pav-front-left', minX: -39.3, maxX: -31.6, minZ: -157.0 + FZ, maxZ: -156.0 + FZ, minY: 26.0 + FY, maxY: 38.5 + FY },
  { id: 'west-pav-front-right', minX: -28.4, maxX: -20.7, minZ: -157.0 + FZ, maxZ: -156.0 + FZ, minY: 26.0 + FY, maxY: 38.5 + FY },
  { id: 'west-pav-front-upper', minX: -32.2, maxX: -27.8, minZ: -157.0 + FZ, maxZ: -156.0 + FZ, minY: 30.2 + FY, maxY: 38.5 + FY },
  { id: 'east-pav-back-wall', minX: 20.7, maxX: 39.3, minZ: -172.0 + FZ, maxZ: -170.9 + FZ, minY: 26.0 + FY, maxY: 38.5 + FY },
  { id: 'east-pav-west-wall', minX: 20.7, maxX: 21.8, minZ: -172.0 + FZ, maxZ: -156.0 + FZ, minY: 26.0 + FY, maxY: 38.5 + FY },
  { id: 'east-pav-east-wall', minX: 38.2, maxX: 39.3, minZ: -172.0 + FZ, maxZ: -156.0 + FZ, minY: 26.0 + FY, maxY: 38.5 + FY },
  { id: 'east-pav-front-left', minX: 20.7, maxX: 28.4, minZ: -157.0 + FZ, maxZ: -156.0 + FZ, minY: 26.0 + FY, maxY: 38.5 + FY },
  { id: 'east-pav-front-right', minX: 31.6, maxX: 39.3, minZ: -157.0 + FZ, maxZ: -156.0 + FZ, minY: 26.0 + FY, maxY: 38.5 + FY },
  { id: 'east-pav-front-upper', minX: 27.8, maxX: 32.2, minZ: -157.0 + FZ, maxZ: -156.0 + FZ, minY: 30.2 + FY, maxY: 38.5 + FY },
  { id: 'sw-wt-outer-west', minX: -52.2, maxX: -50.4, minZ: -134.5 + FZ, maxZ: -122.5 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'sw-wt-outer-south', minX: -51.5, maxX: -39.6, minZ: -123.6 + FZ, maxZ: -122.0 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'sw-wt-inner-east-courtyard', minX: -40.5, maxX: -39.5, minZ: -134.4 + FZ, maxZ: -126.6 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'sw-wt-inner-east-rampart-f1', minX: -40.5, maxX: -39.5, minZ: -126.6 + FZ, maxZ: -122.8 + FZ, minY: 26.0 + FY, maxY: 30.6 + FY },
  { id: 'sw-wt-inner-east-f3', minX: -40.5, maxX: -39.5, minZ: -134.4 + FZ, maxZ: -122.8 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'sw-wt-door-left-f1', minX: -51.2, maxX: -46.9, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, minY: 26.0 + FY, maxY: 30.6 + FY },
  { id: 'sw-wt-door-right-ladder-wall', minX: -44.1, maxX: -39.5, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'sw-wt-north-upper-parapet', minX: -46.8, maxX: -39.5, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, minY: 30.6 + FY, maxY: 32.15 + FY },
  { id: 'sw-wt-north-f3', minX: -51.2, maxX: -39.5, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'sw-wt-west-f3', minX: -52.2, maxX: -50.4, minZ: -134.5 + FZ, maxZ: -122.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'sw-wt-south-f3', minX: -51.5, maxX: -39.6, minZ: -123.6 + FZ, maxZ: -122.0 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'se-wt-outer-east', minX: 50.4, maxX: 52.2, minZ: -134.5 + FZ, maxZ: -122.5 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'se-wt-outer-south', minX: 39.6, maxX: 51.5, minZ: -123.6 + FZ, maxZ: -122.0 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'se-wt-inner-west-courtyard', minX: 39.5, maxX: 40.5, minZ: -134.4 + FZ, maxZ: -126.6 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'se-wt-inner-west-rampart-f1', minX: 39.5, maxX: 40.5, minZ: -126.6 + FZ, maxZ: -122.8 + FZ, minY: 26.0 + FY, maxY: 30.6 + FY },
  { id: 'se-wt-inner-west-f3', minX: 39.5, maxX: 40.5, minZ: -134.4 + FZ, maxZ: -122.8 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'se-wt-door-left-ladder-wall', minX: 39.5, maxX: 44.1, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'se-wt-door-right-f1', minX: 46.9, maxX: 51.2, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, minY: 26.0 + FY, maxY: 30.6 + FY },
  { id: 'se-wt-north-upper-parapet', minX: 39.5, maxX: 46.8, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, minY: 30.6 + FY, maxY: 32.15 + FY },
  { id: 'se-wt-north-f3', minX: 39.5, maxX: 51.2, minZ: -134.5 + FZ, maxZ: -133.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'se-wt-east-f3', minX: 50.4, maxX: 52.2, minZ: -134.5 + FZ, maxZ: -122.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'se-wt-south-f3', minX: 39.6, maxX: 51.5, minZ: -123.6 + FZ, maxZ: -122.0 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'nw-wt-outer-west', minX: -52.2, maxX: -50.4, minZ: -219.5 + FZ, maxZ: -207.5 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'nw-wt-outer-north', minX: -51.5, maxX: -39.6, minZ: -220.0 + FZ, maxZ: -218.4 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'nw-wt-inner-east-courtyard', minX: -40.5, maxX: -39.5, minZ: -215.4 + FZ, maxZ: -207.6 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'nw-wt-inner-east-rampart-f1', minX: -40.5, maxX: -39.5, minZ: -219.2 + FZ, maxZ: -215.4 + FZ, minY: 26.0 + FY, maxY: 30.6 + FY },
  { id: 'nw-wt-inner-east-f3', minX: -40.5, maxX: -39.5, minZ: -219.2 + FZ, maxZ: -207.6 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'nw-wt-door-left-f1', minX: -51.2, maxX: -46.9, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, minY: 26.0 + FY, maxY: 30.6 + FY },
  { id: 'nw-wt-door-right-ladder-wall', minX: -44.1, maxX: -39.5, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'nw-wt-south-upper-parapet', minX: -46.8, maxX: -39.5, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, minY: 30.6 + FY, maxY: 32.15 + FY },
  { id: 'nw-wt-south-f3', minX: -51.2, maxX: -39.5, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'nw-wt-west-f3', minX: -52.2, maxX: -50.4, minZ: -219.5 + FZ, maxZ: -207.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'nw-wt-north-f3', minX: -51.5, maxX: -39.6, minZ: -220.0 + FZ, maxZ: -218.4 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'ne-wt-outer-east', minX: 50.4, maxX: 52.2, minZ: -219.5 + FZ, maxZ: -207.5 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'ne-wt-outer-north', minX: 39.6, maxX: 51.5, minZ: -220.0 + FZ, maxZ: -218.4 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'ne-wt-inner-west-courtyard', minX: 39.5, maxX: 40.5, minZ: -215.4 + FZ, maxZ: -207.6 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'ne-wt-inner-west-rampart-f1', minX: 39.5, maxX: 40.5, minZ: -219.2 + FZ, maxZ: -215.4 + FZ, minY: 26.0 + FY, maxY: 30.6 + FY },
  { id: 'ne-wt-inner-west-f3', minX: 39.5, maxX: 40.5, minZ: -219.2 + FZ, maxZ: -207.6 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'ne-wt-door-left-ladder-wall', minX: 39.5, maxX: 44.1, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'ne-wt-door-right-f1', minX: 46.9, maxX: 51.2, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, minY: 26.0 + FY, maxY: 30.6 + FY },
  { id: 'ne-wt-south-upper-parapet', minX: 39.5, maxX: 46.8, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, minY: 30.6 + FY, maxY: 32.15 + FY },
  { id: 'ne-wt-south-f3', minX: 39.5, maxX: 51.2, minZ: -208.5 + FZ, maxZ: -207.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'ne-wt-east-f3', minX: 50.4, maxX: 52.2, minZ: -219.5 + FZ, maxZ: -207.5 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'ne-wt-north-f3', minX: 39.6, maxX: 51.5, minZ: -220.0 + FZ, maxZ: -218.4 + FZ, minY: 35.2 + FY, maxY: 36.95 + FY },
  { id: 'fortress-thick-wall-south-west', minX: -40.0, maxX: -4.2, minZ: -126.2 + FZ, maxZ: -121.8 + FZ, minY: 26.0 + FY, maxY: 30.7 + FY },
  { id: 'fortress-thick-wall-south-east', minX: 4.2, maxX: 40.0, minZ: -126.2 + FZ, maxZ: -121.8 + FZ, minY: 26.0 + FY, maxY: 30.7 + FY },
  { id: 'fortress-thick-wall-west', minX: -52.2, maxX: -47.8, minZ: -208.0 + FZ, maxZ: -134.0 + FZ, minY: 26.0 + FY, maxY: 30.7 + FY },
  { id: 'fortress-thick-wall-east', minX: 47.8, maxX: 52.2, minZ: -208.0 + FZ, maxZ: -134.0 + FZ, minY: 26.0 + FY, maxY: 30.7 + FY },
  { id: 'fortress-thick-wall-north', minX: -40.0, maxX: 40.0, minZ: -220.2 + FZ, maxZ: -215.8 + FZ, minY: 26.0 + FY, maxY: 30.7 + FY },
  { id: 'rampart-outer-west', minX: -52.8, maxX: -51.4, minZ: -220.8 + FZ, maxZ: -121.5 + FZ, minY: 30.5 + FY, maxY: 32.15 + FY },
  { id: 'rampart-outer-east', minX: 51.4, maxX: 52.8, minZ: -220.8 + FZ, maxZ: -121.5 + FZ, minY: 30.5 + FY, maxY: 32.15 + FY },
  { id: 'rampart-outer-north', minX: -52.8, maxX: 52.8, minZ: -220.8 + FZ, maxZ: -219.4 + FZ, minY: 30.5 + FY, maxY: 32.15 + FY },
  { id: 'rampart-outer-south-west', minX: -52.8, maxX: -4.2, minZ: -122.6 + FZ, maxZ: -121.4 + FZ, minY: 30.5 + FY, maxY: 32.15 + FY },
  { id: 'rampart-outer-south-east', minX: 4.2, maxX: 52.8, minZ: -122.6 + FZ, maxZ: -121.4 + FZ, minY: 30.5 + FY, maxY: 32.15 + FY },
  { id: 'rampart-stair-top-fence-north-west', minX: -48.0, maxX: -44.0, minZ: -157.0 + FZ, maxZ: -156.2 + FZ, minY: 28.0 + FY, maxY: 32.15 + FY },
  { id: 'rampart-stair-top-fence-north-east', minX: 44.0, maxX: 48.0, minZ: -157.0 + FZ, maxZ: -156.2 + FZ, minY: 28.0 + FY, maxY: 32.15 + FY },
  { id: 'rampart-stair-side-fence-west', minX: -44.6, maxX: -43.9, minZ: -157.0 + FZ, maxZ: -142.2 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'rampart-stair-side-fence-east', minX: 43.9, maxX: 44.6, minZ: -157.0 + FZ, maxZ: -142.2 + FZ, minY: 26.0 + FY, maxY: 32.15 + FY },
  { id: 'mid-terrace-fence-front-west', minX: -14.8, maxX: -3.95, minZ: -104.35 + FZ, maxZ: -103.65 + FZ, minY: 21.0 + FY, maxY: 23.0 + FY },
  { id: 'mid-terrace-fence-front-east', minX: 3.95, maxX: 14.8, minZ: -104.35 + FZ, maxZ: -103.65 + FZ, minY: 21.0 + FY, maxY: 23.0 + FY },
  { id: 'mid-terrace-fence-side-west', minX: -14.9, maxX: -14.1, minZ: -114.4 + FZ, maxZ: -103.6 + FZ, minY: 21.0 + FY, maxY: 23.0 + FY },
  { id: 'mid-terrace-fence-side-east', minX: 14.1, maxX: 14.9, minZ: -114.4 + FZ, maxZ: -103.6 + FZ, minY: 21.0 + FY, maxY: 23.0 + FY },
  { id: 'mid-terrace-fence-back-west', minX: -14.8, maxX: -3.95, minZ: -114.4 + FZ, maxZ: -113.7 + FZ, minY: 21.0 + FY, maxY: 23.0 + FY },
  { id: 'mid-terrace-fence-back-east', minX: 3.95, maxX: 14.8, minZ: -114.4 + FZ, maxZ: -113.7 + FZ, minY: 21.0 + FY, maxY: 23.0 + FY },
  { id: 'fortress-stair-rail-west-lower', minX: -4.7, maxX: -3.85, minZ: -104.2 + FZ, maxZ: -77.8 + FZ, minY: 11.0 + FY, maxY: 23.0 + FY },
  { id: 'fortress-stair-rail-east-lower', minX: 3.85, maxX: 4.7, minZ: -104.2 + FZ, maxZ: -77.8 + FZ, minY: 11.0 + FY, maxY: 23.0 + FY },
  { id: 'fortress-stair-rail-west-upper', minX: -4.7, maxX: -3.85, minZ: -122.2 + FZ, maxZ: -113.8 + FZ, minY: 21.0 + FY, maxY: 27.0 + FY },
  { id: 'fortress-stair-rail-east-upper', minX: 3.85, maxX: 4.7, minZ: -122.2 + FZ, maxZ: -113.8 + FZ, minY: 21.0 + FY, maxY: 27.0 + FY },
  { id: 'fortress-incense-west', minX: -9.1, maxX: -7.3, minZ: -133.4 + FZ, maxZ: -131.6 + FZ, minY: 26.0 + FY, maxY: 27.65 + FY },
  { id: 'fortress-incense-east', minX: 7.3, maxX: 9.1, minZ: -133.4 + FZ, maxZ: -131.6 + FZ, minY: 26.0 + FY, maxY: 27.65 + FY },
  // 4 Courtyard Huabiao Dragon Pillars
  ...[-9.5, 9.5].flatMap((hx) =>
    [-138.0 + FZ, -176.0 + FZ].map((hz) => ({
      id: `fortress-huabiao-${hx < 0 ? 'w' : 'e'}-${Math.round(hz - FZ)}`,
      minX: hx - 1.05,
      maxX: hx + 1.05,
      minZ: hz - 1.05,
      maxZ: hz + 1.05,
      minY: 26.0 + FY,
      maxY: 34.2 + FY,
    }))
  ),
  // 4 CourtyardKung-Fu Wooden Training Dummies
  ...[
    [-14.5, -143.5 + FZ],
    [14.5, -143.5 + FZ],
    [-14.5, -159.5 + FZ],
    [14.5, -159.5 + FZ],
  ].map(([dx, dz], idx) => ({
    id: `fortress-courtyard-dummy-${idx}`,
    minX: dx - 0.58,
    maxX: dx + 0.58,
    minZ: dz - 0.58,
    maxZ: dz + 0.58,
    minY: 26.0 + FY,
    maxY: 27.85 + FY,
  })),
  // 4 Courtyard Wooden Benches (rotated ±PI/2 so 2.1m length is along Z and 0.68m depth is along X)
  ...[
    [-11.2, -152.0 + FZ],
    [11.2, -152.0 + FZ],
    [-11.2, -168.0 + FZ],
    [11.2, -168.0 + FZ],
  ].map(([bx, bz], idx) => ({
    id: `fortress-courtyard-bench-${idx}`,
    minX: bx - 0.36,
    maxX: bx + 0.36,
    minZ: bz - 1.05,
    maxZ: bz + 1.05,
    minY: 26.0 + FY,
    maxY: 26.52 + FY,
  })),
  // Main Hall 1F Interior Objects: Grand Banquet Table, Kitchen Wok Stove, Prep Counter, Wine Jars, 6 Interior Pillars & 2 Shrine Prayer Benches
  {
    id: 'palace-banquet-table',
    minX: 0.5 - 6.85,
    maxX: 0.5 + 6.85,
    minZ: -201.3 + FZ - 1.35,
    maxZ: -201.3 + FZ + 1.35,
    minY: 26.35 + FY,
    maxY: 27.45 + FY,
  },
  {
    id: 'palace-kitchen-wok-stove',
    minX: -16.6 - 2.85,
    maxX: -16.6 + 2.85,
    minZ: -214.55 + FZ - 0.98,
    maxZ: -214.55 + FZ + 0.98,
    minY: 26.35 + FY,
    maxY: 27.65 + FY,
  },
  {
    id: 'palace-kitchen-prep-counter',
    minX: -20.4 - 0.72,
    maxX: -20.4 + 0.72,
    minZ: -204.3 + FZ - 3.25,
    maxZ: -204.3 + FZ + 3.25,
    minY: 26.35 + FY,
    maxY: 27.38 + FY,
  },
  ...[-14.0, -7.0, 7.0].flatMap((px) =>
    [-196.5 + FZ, -209.0 + FZ].map((pz) => ({
      id: `palace-main-hall-pillar-${px}-${Math.round(pz - FZ)}`,
      minX: px - 0.46,
      maxX: px + 0.46,
      minZ: pz - 0.46,
      maxZ: pz + 0.46,
      minY: 26.35 + FY,
      maxY: 39.5 + FY,
    }))
  ),
  ...[-3.2, 3.2].map((bx, idx) => ({
    id: `palace-shrine-bench-${idx}`,
    minX: bx - 1.05,
    maxX: bx + 1.05,
    minZ: -203.5 + FZ - 0.36,
    maxZ: -203.5 + FZ + 0.36,
    minY: 26.35 + FY,
    maxY: 26.88 + FY,
  })),
  // Main Hall 2F Dojo Objects: 6 Wooden Dummies, 4 Weapon Racks & Bronze Gong Frame
  ...[
    [-17.8, -206.3 + FZ],
    [-17.8, -199.3 + FZ],
    [-7.5, -206.3 + FZ],
    [-2.5, -206.3 + FZ],
    [3.2, -206.3 + FZ],
    [8.0, -206.3 + FZ],
  ].map(([dx, dz], idx) => ({
    id: `palace-dojo-dummy-${idx}`,
    minX: dx - 0.56,
    maxX: dx + 0.56,
    minZ: dz - 0.56,
    maxZ: dz + 0.56,
    minY: 34.15 + FY,
    maxY: 36.0 + FY,
  })),
  ...[-16.0, -9.5, 0.5, 7.0].map((wrX, idx) => ({
    id: `palace-dojo-weapon-rack-${idx}`,
    minX: wrX - 1.32,
    maxX: wrX + 1.32,
    minZ: -215.25 + FZ - 0.35,
    maxZ: -215.25 + FZ + 0.35,
    minY: 34.15 + FY,
    maxY: 36.7 + FY,
  })),
  {
    id: 'palace-dojo-gong-frame',
    minX: -5.0 - 1.22,
    maxX: -5.0 + 1.22,
    minZ: -214.95 + FZ - 0.28,
    maxZ: -214.95 + FZ + 0.28,
    minY: 34.15 + FY,
    maxY: 36.75 + FY,
  },
  // West & East Pagoda Pavilions 1F & 2F Interior Furniture (Tea Table, Wardrobes, Straw Beds)
  ...[-30.0, 30.0].flatMap((px) => {
    const isWest = px < 0;
    const innerDir = isWest ? 1 : -1;
    const tag = isWest ? 'west' : 'east';
    const pavF1 = 26.3 + FY;
    const pavF2 = 31.6 + FY;
    return [
      {
        id: `palace-${tag}-pav-table-1f`,
        minX: px + innerDir * 8.05 - 0.72,
        maxX: px + innerDir * 8.05 + 0.72,
        minZ: -163.2 + FZ - 1.08,
        maxZ: -163.2 + FZ + 1.08,
        minY: pavF1,
        maxY: pavF1 + 0.92,
      },
      {
        id: `palace-${tag}-pav-wardrobe-1f`,
        minX: px + innerDir * 8.22 - 0.45,
        maxX: px + innerDir * 8.22 + 0.45,
        minZ: -167.7 + FZ - 0.78,
        maxZ: -167.7 + FZ + 0.78,
        minY: pavF1,
        maxY: pavF1 + 2.4,
      },
      {
        id: `palace-${tag}-pav-wardrobes-2f`,
        minX: Math.min(px + innerDir * -1.95, px + innerDir * 7.45),
        maxX: Math.max(px + innerDir * -1.95, px + innerDir * 7.45),
        minZ: -157.22 + FZ - 0.42,
        maxZ: -157.22 + FZ + 0.42,
        minY: pavF2,
        maxY: pavF2 + 2.4,
      },
    ];
  }),
  // 4 Corner Watchtower 1F Supply Crate Stacks
  ...[
    ['sw', -48.9, -125.1 + FZ, 1],
    ['se', 48.9, -125.1 + FZ, -1],
    ['nw', -48.9, -216.9 + FZ, 1],
    ['ne', 48.9, -216.9 + FZ, -1],
  ].map(([tag, cx, cz, dir]) => ({
    id: `palace-${tag}-wt-supply-crates`,
    minX: Math.min((cx as number) - 0.65, (cx as number) + (dir as number) * 1.85),
    maxX: Math.max((cx as number) + 0.65, (cx as number) + (dir as number) * 1.85),
    minZ: (cz as number) - 0.65,
    maxZ: (cz as number) + 0.75,
    minY: 26.35 + FY,
    maxY: 28.65 + FY,
  })),
  // Palace & Sakura Sanctuary Statue Low Pedestal Hitboxes (statue figures above pedestal are handled by checkArrowHitTempleStatue / checkSwordHitTempleStatue so arrows never get blocked by an outer wall box!)
  {
    id: 'palace-golden-statue-pedestal',
    minX: -1.95,
    maxX: 1.95,
    minZ: -210.8 + FZ - 1.95,
    maxZ: -210.8 + FZ + 1.95,
    minY: 26.35 + FY,
    maxY: 27.65 + FY,
  },
  {
    id: 'sakura-buddha-pedestal',
    minX: SAKURA_SANCTUARY_POS.x + Math.sin(SAKURA_SANCTUARY_YAW) * -14.0 - 1.85,
    maxX: SAKURA_SANCTUARY_POS.x + Math.sin(SAKURA_SANCTUARY_YAW) * -14.0 + 1.85,
    minZ: SAKURA_SANCTUARY_POS.z + Math.cos(SAKURA_SANCTUARY_YAW) * -14.0 - 1.85,
    maxZ: SAKURA_SANCTUARY_POS.z + Math.cos(SAKURA_SANCTUARY_YAW) * -14.0 + 1.85,
    minY: SAKURA_SANCTUARY_POS.height,
    maxY: SAKURA_SANCTUARY_POS.height + 1.55,
  },
  { id: 'harbor-tavern-back-wall', minX: 215.8, maxX: 232.2, minZ: 223.75, maxZ: 224.25, minY: 3.2, maxY: 8.6 },
  { id: 'harbor-tavern-west-wall', minX: 215.75, maxX: 216.25, minZ: 223.8, maxZ: 236.2, minY: 3.2, maxY: 8.6 },
  { id: 'harbor-tavern-east-wall', minX: 231.75, maxX: 232.25, minZ: 223.8, maxZ: 236.2, minY: 3.2, maxY: 8.6 },
  { id: 'harbor-tavern-front-left', minX: 215.95, maxX: 222.7, minZ: 235.75, maxZ: 236.25, minY: 3.2, maxY: 8.6 },
  { id: 'harbor-tavern-front-right', minX: 225.3, maxX: 232.05, minZ: 235.75, maxZ: 236.25, minY: 3.2, maxY: 8.6 },
  { id: 'harbor-tavern-bar', minX: 216.7, maxX: 226.3, minZ: 226.25, maxZ: 227.35, minY: 3.35, maxY: 4.5 },
  { id: 'harbor-tavern-hearth', minX: 227.4, maxX: 230.2, minZ: 224.2, maxZ: 225.4, minY: 3.35, maxY: 12.8 },
  { id: 'harbor-tavern-barrels', minX: 217.2, maxX: 223.9, minZ: 224.4, maxZ: 225.4, minY: 3.35, maxY: 5.3 },
  { id: 'harbor-tavern-table-nw', minX: 218.45, maxX: 220.55, minZ: 230.57, maxZ: 231.83, minY: 3.35, maxY: 4.25 },
  { id: 'harbor-tavern-table-sw', minX: 218.45, maxX: 220.55, minZ: 233.17, maxZ: 234.43, minY: 3.35, maxY: 4.25 },
  { id: 'harbor-tavern-table-ne', minX: 227.15, maxX: 229.25, minZ: 230.57, maxZ: 231.83, minY: 3.35, maxY: 4.25 },
  { id: 'harbor-tavern-table-se', minX: 227.15, maxX: 229.25, minZ: 233.17, maxZ: 234.43, minY: 3.35, maxY: 4.25 },
  ...[216.25, 221.65, 226.35, 231.75].map((px, idx) => ({
    id: `harbor-tavern-porch-post-${idx + 1}`,
    minX: px - 0.16,
    maxX: px + 0.16,
    minZ: 238.2 - 0.16,
    maxZ: 238.2 + 0.16,
    minY: 3.2,
    maxY: 6.8,
  })),
  { id: 'harbor-wall-west-north', minX: 198.8, maxX: 201.2, minZ: 214.0, maxZ: 236.0, minY: 3.2, maxY: 10.75 },
  { id: 'harbor-gate-tower-north-base', minX: 197.2, maxX: 202.8, minZ: 235.2, maxZ: 240.8, minY: 3.2, maxY: 5.8 },
  { id: 'harbor-gate-tower-north', minX: 197.5, maxX: 202.5, minZ: 235.5, maxZ: 240.5, minY: 5.8, maxY: 16.8 },
  { id: 'harbor-gate-tower-south-base', minX: 197.2, maxX: 202.8, minZ: 247.2, maxZ: 252.8, minY: 3.2, maxY: 5.8 },
  { id: 'harbor-gate-tower-south', minX: 197.5, maxX: 202.5, minZ: 247.5, maxZ: 252.5, minY: 5.8, maxY: 16.8 },
  { id: 'harbor-gate-overhead-arch', minX: 197.6, maxX: 202.4, minZ: 240.8, maxZ: 247.2, minY: 8.8, maxY: 14.0 },
  { id: 'harbor-wall-west-south', minX: 198.8, maxX: 201.2, minZ: 252.0, maxZ: 312.0, minY: 3.2, maxY: 10.75 },
  { id: 'harbor-wall-north-west', minX: 200.0, maxX: 235.0, minZ: 212.8, maxZ: 215.2, minY: 3.2, maxY: 10.75 },
  { id: 'harbor-wall-north-east', minX: 241.0, maxX: 255.4, minZ: 212.8, maxZ: 215.2, minY: 3.2, maxY: 10.75 },
  { id: 'harbor-wall-north-arch', minX: 235.0, maxX: 241.0, minZ: 212.7, maxZ: 215.3, minY: 8.0, maxY: 10.2 },
  { id: 'harbor-wall-south', minX: 200.0, maxX: 255.4, minZ: 310.8, maxZ: 313.2, minY: 3.2, maxY: 10.75 },
  // 4 Octagonal Corner Castle Bastion Towers wrapped tightly with 8 tangential OBB facets (matching CylinderGeometry(3.4, 3.8, 13.0, 8))
  ...(
    [
      ['nw', 200.0, 214.0],
      ['sw', 200.0, 312.0],
      ['ne', 255.2, 214.0],
      ['se', 255.2, 312.0],
    ] as const
  ).flatMap(([tag, bx, bz]) =>
    Array.from({ length: 8 }, (_, sIdx) => {
      const segSpan = (Math.PI * 2) / 8;
      const ang = (sIdx + 0.5) * segSpan;
      const rFace = 3.18;
      const cx = bx + Math.sin(ang) * rFace;
      const cz = bz + Math.cos(ang) * rFace;
      const halfChord = rFace * Math.sin(segSpan * 0.5) + 0.08;
      const halfThick = 0.28;
      return {
        id: `harbor-bastion-${tag}-seg-${sIdx + 1}`,
        minX: cx - halfChord,
        maxX: cx + halfChord,
        minZ: cz - halfThick,
        maxZ: cz + halfThick,
        minY: 3.2,
        maxY: 16.5,
        yaw: ang,
      };
    })
  ),
  // Harbor Quayside Cannons & Cannonball Stacks positioned in the embrasure gaps between merlons
  ...[221.0, 239.0, 263.0, 275.0, 293.0].flatMap((cz, idx) => [
    {
      id: `harbor-cannon-${idx + 1}`,
      minX: 253.12,
      maxX: 255.18,
      minZ: cz - 0.36,
      maxZ: cz + 0.36,
      minY: 3.2,
      maxY: 4.06,
    },
    {
      id: `harbor-cannon-balls-${idx + 1}`,
      minX: 253.27,
      maxX: 254.0,
      minZ: cz + 0.52,
      maxZ: cz + 0.9,
      minY: 3.2,
      maxY: 3.84,
    },
  ]),
  // Harbor Quayside Sea-Wall Stone Parapet Merlons (x = 255.1, y = 3.2..3.98, skipping pierZ = 252 and boarding jetty at z = 282)
  ...[218, 224, 230, 236, 242, 260, 266, 272, 278, 290, 296, 302, 308].map((bz, idx) => ({
    id: `harbor-seawall-merlon-${idx + 1}`,
    minX: 254.55,
    maxX: 255.65,
    minZ: bz - 1.3,
    maxZ: bz + 1.3,
    minY: 3.2,
    maxY: 4.0,
  })),
  // Harbor Wooden Pier Pilings (px = 256.0..270.0 step 3.5, pz = 249.4 / 254.6, y = 0.0..5.06)
  ...[256.0, 259.5, 263.0, 266.5, 270.0].flatMap((px, pIdx) =>
    [249.4, 254.6].map((pz, sIdx) => ({
      id: `harbor-pier-piling-${pIdx * 2 + sIdx + 1}`,
      minX: px - 0.28,
      maxX: px + 0.28,
      minZ: pz - 0.28,
      maxZ: pz + 0.28,
      minY: 0.0,
      maxY: 5.06,
    }))
  ),
  // Harbor Sailable Ship Boarding Jetty Pilings (exact match with atlantisAndShipModels.ts: jx = [256.5, 261.5, 266.5, 272.0], jz = SAILABLE_SHIP_INITIAL_POS.homeZ ± 2.4 = [279.6, 284.4])
  ...[256.5, 261.5, 266.5, 272.0].flatMap((jx, jIdx) =>
    [SAILABLE_SHIP_INITIAL_POS.homeZ - 2.4, SAILABLE_SHIP_INITIAL_POS.homeZ + 2.4].map((jz, sIdx) => ({
      id: `harbor-jetty-piling-${jIdx * 2 + sIdx + 1}`,
      minX: jx - 0.28,
      maxX: jx + 0.28,
      minZ: jz - 0.28,
      maxZ: jz + 0.28,
      minY: 0.0,
      maxY: 3.6,
    }))
  ),
  // Harbor Fountain central sculpted spire (outer rim & basin are climbable in walkableHeightAt!)
  { id: 'harbor-fountain-center-spire', minX: 231.1, maxX: 232.9, minZ: 251.1, maxZ: 252.9, minY: 3.2, maxY: 7.95 },
  { id: 'harbor-warehouse-south-wall', minX: 209.3, maxX: 226.7, minZ: 282.25, maxZ: 282.75, minY: 3.2, maxY: 9.0 },
  { id: 'harbor-warehouse-west-wall', minX: 209.25, maxX: 209.75, minZ: 271.3, maxZ: 282.7, minY: 3.2, maxY: 9.0 },
  { id: 'harbor-warehouse-east-wall', minX: 226.25, maxX: 226.75, minZ: 271.3, maxZ: 282.7, minY: 3.2, maxY: 9.0 },
  { id: 'harbor-warehouse-north-left', minX: 209.4, maxX: 216.6, minZ: 271.25, maxZ: 271.75, minY: 3.2, maxY: 9.0 },
  { id: 'harbor-warehouse-north-right', minX: 219.4, maxX: 226.6, minZ: 271.25, maxZ: 271.75, minY: 3.2, maxY: 9.0 },
  { id: 'harbor-warehouse-crates-west', minX: 211.8, maxX: 214.4, minZ: 274.2, maxZ: 278.6, minY: 3.35, maxY: 6.85 },
  { id: 'harbor-warehouse-crates-east', minX: 221.6, maxX: 224.2, minZ: 274.2, maxZ: 278.6, minY: 3.35, maxY: 6.85 },
  { id: 'harbor-warehouse-rack-west', minX: 210.3, maxX: 214.9, minZ: 278.5, maxZ: 279.9, minY: 3.35, maxY: 6.55 },
  { id: 'harbor-warehouse-rack-east', minX: 221.1, maxX: 225.7, minZ: 278.5, maxZ: 279.9, minY: 3.35, maxY: 6.55 },
  { id: 'harbor-warehouse-grain-sacks', minX: 215.2, maxX: 219.3, minZ: 278.4, maxZ: 279.2, minY: 3.35, maxY: 4.55 },
  { id: 'harbor-warehouse-barrels-south', minX: 213.0, maxX: 222.8, minZ: 280.8, maxZ: 281.8, minY: 3.35, maxY: 5.3 },
  { id: 'harbor-warehouse-qm-desk', minX: 216.95, maxX: 219.05, minZ: 275.17, maxZ: 276.43, minY: 3.35, maxY: 4.2 },
  // Harbor Portmaster's House & Maritime Chandlery (at 243.0, 277.0) + Quayside Crane
  { id: 'harbor-shed-south-wall', minX: 236.8, maxX: 249.2, minZ: 281.25, maxZ: 281.75, minY: 3.2, maxY: 7.85 },
  { id: 'harbor-shed-west-wall', minX: 236.75, maxX: 237.25, minZ: 272.3, maxZ: 281.7, minY: 3.2, maxY: 7.85 },
  { id: 'harbor-shed-east-wall', minX: 248.75, maxX: 249.25, minZ: 272.3, maxZ: 281.7, minY: 3.2, maxY: 7.85 },
  { id: 'harbor-shed-north-left', minX: 236.8, maxX: 241.6, minZ: 272.25, maxZ: 272.75, minY: 3.2, maxY: 7.85 },
  { id: 'harbor-shed-north-right', minX: 244.4, maxX: 249.2, minZ: 272.25, maxZ: 272.75, minY: 3.2, maxY: 7.85 },
  { id: 'harbor-shed-crates-west', minX: 238.2, maxX: 239.4, minZ: 274.2, maxZ: 279.8, minY: 3.3, maxY: 5.9 },
  { id: 'harbor-shed-crates-east', minX: 246.6, maxX: 247.8, minZ: 274.2, maxZ: 279.8, minY: 3.3, maxY: 5.9 },
  { id: 'harbor-quayside-crane-pedestal', minX: 250.05, maxX: 251.55, minZ: 273.75, maxZ: 275.25, minY: 3.2, maxY: 10.0 },
  { id: 'harbor-quayside-crane-crate', minX: 253.2, maxX: 254.4, minZ: 273.9, maxZ: 275.1, minY: 3.2, maxY: 4.45 },
  // Harbor Quayside Mooring Bollards (exact match with harborModels.ts: x = 254.35, bz = [220, 232, 245.5, 258.5, 271, 285, 301], y = 3.2..4.4)
  ...[220.0, 232.0, 245.5, 258.5, 271.0, 285.0, 301.0].map((bz, idx) => ({
    id: `harbor-quayside-bollard-${idx + 1}`,
    minX: 254.35 - 0.42,
    maxX: 254.35 + 0.42,
    minZ: bz - 0.42,
    maxZ: bz + 0.42,
    minY: 3.2,
    maxY: 4.4,
  })),
  // Harbor Wrought-Iron Streetlamps (exact 6 positions from harborModels.ts: y = 3.2..7.6)
  ...[
    [206.5, 238.5],
    [206.5, 250.5],
    [252.8, 246.8],
    [252.8, 257.2],
    [225.0, 242.0],
    [239.0, 242.0],
  ].map(([lx, lz], idx) => ({
    id: `harbor-lamp-post-${idx + 1}`,
    minX: lx - 0.22,
    maxX: lx + 0.22,
    minZ: lz - 0.22,
    maxZ: lz + 0.22,
    minY: 3.2,
    maxY: 7.6,
  })),
  // Harbor Marble Amphitheater Arena Stage (centered at 226.0, 294.0, r=6.6m, y=3.2..3.56m)
  { id: 'harbor-amphitheater-stage-core', minX: 221.6, maxX: 230.4, minZ: 289.6, maxZ: 298.4, minY: 3.2, maxY: 3.56 },
  ...Array.from({ length: 12 }, (_, i) => {
    const segSpan = (Math.PI * 2) / 12;
    const ang = (i + 0.5) * segSpan;
    const rStage = 6.25;
    const cx = 226.0 + Math.sin(ang) * rStage;
    const cz = 294.0 + Math.cos(ang) * rStage;
    const halfChord = rStage * Math.sin(segSpan * 0.5) + 0.1;
    const halfThick = 0.42;
    return {
      id: `harbor-amphitheater-stage-seg-${i + 1}`,
      minX: cx - halfChord,
      maxX: cx + halfChord,
      minZ: cz - halfThick,
      maxZ: cz + halfThick,
      minY: 3.2,
      maxY: 3.56,
      yaw: ang,
    };
  }),
  // Harbor Marble Amphitheater 5 Semicircular Seating Tiers (tier=0..4, rad=7.8 + tier*1.65, 9 curved OBB segments each)
  ...[0, 1, 2, 3, 4].flatMap((tier) => {
    const rad = 7.8 + tier * 1.65;
    const tierMaxY = 3.2 + 0.55 + tier * 0.56;
    const segs = 9;
    return Array.from({ length: segs }, (_, s) => {
      const ang = -Math.PI * 0.42 + ((s + 0.5) / segs) * (Math.PI * 0.84);
      const segW = ((rad * (Math.PI * 0.84)) / segs) * 1.06;
      const cx = 226.0 + Math.sin(ang) * rad;
      const cz = 294.0 + Math.cos(ang) * rad;
      const halfW = segW * 0.5;
      const halfDepth = 0.825;
      return {
        id: `harbor-amphitheater-tier-${tier + 1}-seg-${s + 1}`,
        minX: cx - halfW,
        maxX: cx + halfW,
        minZ: cz - halfDepth,
        maxZ: cz + halfDepth,
        minY: 3.2,
        maxY: tierMaxY,
        yaw: ang,
      };
    });
  }),
  // Harbor Marble Amphitheater Colonnade Pillars (6 grounded columns along r=15.6m arc around 226, 294)
  ...[0, 1, 2, 3, 4, 5].map((c) => {
    const ang = -Math.PI * 0.4 + (c / 5) * (Math.PI * 0.8);
    const cx = 226.0 + Math.sin(ang) * 15.6;
    const cz = 294.0 + Math.cos(ang) * 15.6;
    return {
      id: `harbor-amphitheater-col-${c + 1}`,
      minX: cx - 0.45,
      maxX: cx + 0.45,
      minZ: cz - 0.45,
      maxZ: cz + 0.45,
      minY: 3.2,
      maxY: 11.5,
      yaw: ang,
    };
  }),
  // Cylindrical Harbor Lighthouse (centered at 252.0, 202.0, radius 4.05m, 14 tangential OBB wall segments leaving South doorway open at +Z)
  ...Array.from({ length: 14 }, (_, i) => {
    const startAng = 0.36;
    const endAng = Math.PI * 2 - 0.36;
    const segSpan = (endAng - startAng) / 14;
    const ang = startAng + (i + 0.5) * segSpan;
    const rWall = 4.0;
    const cx = SOUTHEAST_HARBOR_POS.lighthouseX + Math.sin(ang) * rWall;
    const cz = SOUTHEAST_HARBOR_POS.lighthouseZ + Math.cos(ang) * rWall;
    const halfChord = rWall * Math.sin(segSpan * 0.5) + 0.14;
    const halfThick = 0.32;
    return {
      id: `harbor-lighthouse-wall-seg-${i + 1}`,
      minX: cx - halfChord,
      maxX: cx + halfChord,
      minZ: cz - halfThick,
      maxZ: cz + halfThick,
      minY: SOUTHEAST_HARBOR_POS.lighthouseBaseY,
      maxY: 25.4,
      yaw: ang,
    };
  }),
  // Cylindrical Harbor Lighthouse Top Observation Gallery Railing (16 tangential OBB segments at r=4.45m, y=25.0..26.5)
  ...Array.from({ length: 16 }, (_, i) => {
    const segSpan = (Math.PI * 2) / 16;
    const ang = (i + 0.5) * segSpan;
    const rRail = 4.45;
    const cx = SOUTHEAST_HARBOR_POS.lighthouseX + Math.sin(ang) * rRail;
    const cz = SOUTHEAST_HARBOR_POS.lighthouseZ + Math.cos(ang) * rRail;
    const halfChord = rRail * Math.sin(segSpan * 0.5) + 0.1;
    const halfThick = 0.22;
    return {
      id: `harbor-lighthouse-top-rail-seg-${i + 1}`,
      minX: cx - halfChord,
      maxX: cx + halfChord,
      minZ: cz - halfThick,
      maxZ: cz + halfThick,
      minY: 25.0,
      maxY: 26.5,
      yaw: ang,
    };
  }),
  // Cylindrical Harbor Lighthouse Central Glass Lantern Room on Top Deck (r=1.55m, leaving North ladder hatch completely unobstructed)
  {
    id: 'harbor-lighthouse-lantern-core',
    minX: SOUTHEAST_HARBOR_POS.lighthouseX - 1.45,
    maxX: SOUTHEAST_HARBOR_POS.lighthouseX + 1.45,
    minZ: SOUTHEAST_HARBOR_POS.lighthouseZ - 1.45,
    maxZ: SOUTHEAST_HARBOR_POS.lighthouseZ + 1.45,
    minY: 25.4,
    maxY: 30.0,
  },
  // Royal Galleon Ship Hull below deck + Stepped Bulwark Railings (Main Deck y=3.65..4.75 vs Quarterdeck y=3.65..7.75) + Cabin Walls + Stepped Stair Stringers + Deck Cannons + Masts + Helm + Shipwright Naval Office
  { id: 'galleon-lower-hull', minX: 275.6, maxX: 288.4, minZ: 233.5, maxZ: 270.5, minY: -0.4, maxY: 3.62 },
  { id: 'galleon-rail-port-bow', minX: 275.68, maxX: 276.02, minZ: 231.8, maxZ: 249.4, minY: 3.65, maxY: 4.75 },
  { id: 'galleon-rail-port-mid', minX: 275.68, maxX: 276.02, minZ: 254.0, maxZ: 259.5, minY: 3.65, maxY: 4.75 },
  { id: 'galleon-rail-port-stern', minX: 275.68, maxX: 276.02, minZ: 259.5, maxZ: 272.8, minY: 3.65, maxY: 7.75 },
  { id: 'galleon-rail-starboard-bow', minX: 287.98, maxX: 288.32, minZ: 231.8, maxZ: 259.5, minY: 3.65, maxY: 4.75 },
  { id: 'galleon-rail-starboard-stern', minX: 287.98, maxX: 288.32, minZ: 259.5, maxZ: 272.8, minY: 3.65, maxY: 7.75 },
  { id: 'galleon-rail-bow', minX: 275.7, maxX: 288.3, minZ: 231.21, maxZ: 231.59, minY: 3.65, maxY: 4.78 },
  { id: 'galleon-rail-stern', minX: 275.7, maxX: 288.3, minZ: 272.4, maxZ: 272.85, minY: 3.65, maxY: 7.75 },
  // Cabin front walls trimmed to the inner span between the Port stairs (x=276.25..278.65) and Starboard stairs (x=285.35..287.75) so they never block the top of the stairs!
  { id: 'galleon-cabin-front-left', minX: 278.65, maxX: 280.8, minZ: 259.29, maxZ: 259.71, minY: 3.65, maxY: 6.65 },
  { id: 'galleon-cabin-front-right', minX: 283.2, maxX: 285.35, minZ: 259.29, maxZ: 259.71, minY: 3.65, maxY: 6.65 },
  // Stepped inner stair side stringers matching the 3D stair slope from z=254.5 (y=3.65) to z=259.5 (y=6.65)
  { id: 'galleon-port-stair-side-low', minX: 278.55, maxX: 278.85, minZ: 254.5, maxZ: 256.2, minY: 3.65, maxY: 4.65 },
  { id: 'galleon-port-stair-side-mid', minX: 278.55, maxX: 278.85, minZ: 256.2, maxZ: 257.85, minY: 3.65, maxY: 5.65 },
  { id: 'galleon-port-stair-side-high', minX: 278.55, maxX: 278.85, minZ: 257.85, maxZ: 259.5, minY: 3.65, maxY: 6.65 },
  { id: 'galleon-stbd-stair-side-low', minX: 285.15, maxX: 285.45, minZ: 254.5, maxZ: 256.2, minY: 3.65, maxY: 4.65 },
  { id: 'galleon-stbd-stair-side-mid', minX: 285.15, maxX: 285.45, minZ: 256.2, maxZ: 257.85, minY: 3.65, maxY: 5.65 },
  { id: 'galleon-stbd-stair-side-high', minX: 285.15, maxX: 285.45, minZ: 257.85, maxZ: 259.5, minY: 3.65, maxY: 6.65 },
  { id: 'galleon-quarterdeck-front-center-rail', minX: 278.7, maxX: 285.3, minZ: 259.41, maxZ: 259.69, minY: 6.65, maxY: 7.95 },
  // 5 Broadside Deck Cannons on the Royal Galleon Main Deck (harborModels.ts lines 2245-2258)
  ...[
    [-5.2, -13.5, -1],
    [5.2, -13.5, 1],
    [-5.2, -7.5, -1],
    [5.2, -7.5, 1],
    [5.2, -1.5, 1],
  ].map(([lx, lz, side], idx) => ({
    id: `galleon-deck-cannon-${idx + 1}`,
    minX: SOUTHEAST_HARBOR_POS.shipX + lx + (side === 1 ? -0.68 : -1.35),
    maxX: SOUTHEAST_HARBOR_POS.shipX + lx + (side === 1 ? 1.35 : 0.68),
    minZ: SOUTHEAST_HARBOR_POS.shipZ + lz - 0.36,
    maxZ: SOUTHEAST_HARBOR_POS.shipZ + lz + 0.36,
    minY: 3.65,
    maxY: 4.5,
  })),
  { id: 'hall-interior-stair-rail-w', minX: 13.2, maxX: 13.55, minZ: -206.0 + FZ, maxZ: -194.2 + FZ, minY: 26.35 + FY, maxY: 35.8 + FY },
  { id: 'west-pavilion-stair-rail-inner', minX: -35.15, maxX: -34.8, minZ: -167.4 + FZ, maxZ: -159.6 + FZ, minY: 26.3 + FY, maxY: 32.8 + FY },
  { id: 'east-pavilion-stair-rail-inner', minX: 34.8, maxX: 35.15, minZ: -167.4 + FZ, maxZ: -159.6 + FZ, minY: 26.3 + FY, maxY: 32.8 + FY },
  { id: 'mine-catwalk-stair-rail-e', minX: SOUTHERN_MINE_POS.x + 12.35, maxX: SOUTHERN_MINE_POS.x + 12.7, minZ: SOUTHERN_MINE_POS.entranceZ + 49.0, maxZ: SOUTHERN_MINE_POS.entranceZ + 57.5, minY: SOUTHERN_MINE_POS.cavernFloorY, maxY: SOUTHERN_MINE_POS.cavernFloorY + 4.95 },
  { id: 'mine-catwalk-stair-rail-w', minX: SOUTHERN_MINE_POS.x + 8.3, maxX: SOUTHERN_MINE_POS.x + 8.65, minZ: SOUTHERN_MINE_POS.entranceZ + 49.0, maxZ: SOUTHERN_MINE_POS.entranceZ + 57.5, minY: SOUTHERN_MINE_POS.cavernFloorY, maxY: SOUTHERN_MINE_POS.cavernFloorY + 4.95 },
  { id: 'galleon-mast-fore', minX: 281.6, maxX: 282.4, minZ: 235.4, maxZ: 236.2, minY: 3.65, maxY: 25.3 },
  { id: 'galleon-mast-main', minX: 281.6, maxX: 282.4, minZ: 243.4, maxZ: 244.2, minY: 3.65, maxY: 29.0 },
  { id: 'galleon-mast-mizzen', minX: 281.6, maxX: 282.4, minZ: 251.0, maxZ: 251.8, minY: 3.65, maxY: 24.8 },
  { id: 'galleon-helm-wheel-stand', minX: 281.25, maxX: 282.75, minZ: 260.2, maxZ: 261.6, minY: 6.65, maxY: 8.65 },
  { id: 'galleon-quarterdeck-chest', minX: 285.05, maxX: 286.55, minZ: 268.97, maxZ: 270.03, minY: 6.65, maxY: 7.75 },
  // Royal Galleon Shipwright's Naval Office inside Captain's Cabin (centered at 282.0, 267.6)
  { id: 'galleon-office-desk', minX: 280.25, maxX: 283.75, minZ: 266.82, maxZ: 268.38, minY: 3.65, maxY: 4.65 },
  { id: 'galleon-office-chair-npc', minX: 281.55, maxX: 282.45, minZ: 268.4, maxZ: 269.3, minY: 3.65, maxY: 5.35 },
  { id: 'galleon-office-bookshelf-port', minX: 276.42, maxX: 277.28, minZ: 261.9, maxZ: 268.1, minY: 3.65, maxY: 6.22 },
  { id: 'galleon-office-drafting-stbd', minX: 286.67, maxX: 287.63, minZ: 262.1, maxZ: 267.9, minY: 3.65, maxY: 4.95 },
  { id: 'galleon-office-strongbox', minX: 277.45, maxX: 278.95, minZ: 269.87, maxZ: 270.93, minY: 3.65, maxY: 4.75 },
  { id: 'galleon-office-globe', minX: 285.25, maxX: 286.35, minZ: 269.65, maxZ: 270.75, minY: 3.65, maxY: 5.48 },
  // Southwest Oasis Domed Adobe Citadel & Watchtower (observatoryX/Z) + Enterable West Adobe Merchant House (pavilionX/Z)
  { id: 'sw-observatory-north-wall', minX: SOUTHWEST_OASIS_POS.observatoryX - 4.8, maxX: SOUTHWEST_OASIS_POS.observatoryX + 4.8, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 5.1, maxZ: SOUTHWEST_OASIS_POS.observatoryZ - 4.5, minY: SOUTHWEST_OASIS_POS.terraceY, maxY: 19.6 },
  { id: 'sw-observatory-west-wall', minX: SOUTHWEST_OASIS_POS.observatoryX - 5.1, maxX: SOUTHWEST_OASIS_POS.observatoryX - 4.5, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 4.9, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 4.9, minY: SOUTHWEST_OASIS_POS.terraceY, maxY: 19.6 },
  { id: 'sw-observatory-east-wall', minX: SOUTHWEST_OASIS_POS.observatoryX + 4.5, maxX: SOUTHWEST_OASIS_POS.observatoryX + 5.1, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 4.9, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 4.9, minY: SOUTHWEST_OASIS_POS.terraceY, maxY: 19.6 },
  { id: 'sw-observatory-south-left', minX: SOUTHWEST_OASIS_POS.observatoryX - 4.8, maxX: SOUTHWEST_OASIS_POS.observatoryX - 1.35, minZ: SOUTHWEST_OASIS_POS.observatoryZ + 4.5, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.1, minY: SOUTHWEST_OASIS_POS.terraceY, maxY: 19.6 },
  { id: 'sw-observatory-south-right', minX: SOUTHWEST_OASIS_POS.observatoryX + 1.35, maxX: SOUTHWEST_OASIS_POS.observatoryX + 4.8, minZ: SOUTHWEST_OASIS_POS.observatoryZ + 4.5, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.1, minY: SOUTHWEST_OASIS_POS.terraceY, maxY: 19.6 },
  { id: 'sw-observatory-top-rail-n', minX: SOUTHWEST_OASIS_POS.observatoryX - 5.0, maxX: SOUTHWEST_OASIS_POS.observatoryX + 5.0, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 5.2, maxZ: SOUTHWEST_OASIS_POS.observatoryZ - 4.75, minY: 19.4, maxY: 20.65 },
  { id: 'sw-observatory-top-rail-s', minX: SOUTHWEST_OASIS_POS.observatoryX - 5.0, maxX: SOUTHWEST_OASIS_POS.observatoryX + 5.0, minZ: SOUTHWEST_OASIS_POS.observatoryZ + 4.75, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.2, minY: 19.4, maxY: 20.65 },
  { id: 'sw-observatory-top-rail-w', minX: SOUTHWEST_OASIS_POS.observatoryX - 5.2, maxX: SOUTHWEST_OASIS_POS.observatoryX - 4.75, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 5.2, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.2, minY: 19.4, maxY: 20.65 },
  { id: 'sw-observatory-top-rail-e', minX: SOUTHWEST_OASIS_POS.observatoryX + 4.75, maxX: SOUTHWEST_OASIS_POS.observatoryX + 5.2, minZ: SOUTHWEST_OASIS_POS.observatoryZ - 5.2, maxZ: SOUTHWEST_OASIS_POS.observatoryZ + 5.2, minY: 19.4, maxY: 20.65 },
  { id: 'sw-alchemist-west-wall', minX: SOUTHWEST_OASIS_POS.pavilionX - 5.4, maxX: SOUTHWEST_OASIS_POS.pavilionX - 4.85, minZ: SOUTHWEST_OASIS_POS.pavilionZ - 6.5, maxZ: SOUTHWEST_OASIS_POS.pavilionZ + 6.5, minY: SOUTHWEST_OASIS_POS.terraceY, maxY: 10.6 },
  { id: 'sw-alchemist-north-wall', minX: SOUTHWEST_OASIS_POS.pavilionX - 5.3, maxX: SOUTHWEST_OASIS_POS.pavilionX + 5.3, minZ: SOUTHWEST_OASIS_POS.pavilionZ - 6.6, maxZ: SOUTHWEST_OASIS_POS.pavilionZ - 6.05, minY: SOUTHWEST_OASIS_POS.terraceY, maxY: 10.6 },
  { id: 'sw-alchemist-south-wall', minX: SOUTHWEST_OASIS_POS.pavilionX - 5.3, maxX: SOUTHWEST_OASIS_POS.pavilionX + 5.3, minZ: SOUTHWEST_OASIS_POS.pavilionZ + 6.05, maxZ: SOUTHWEST_OASIS_POS.pavilionZ + 6.6, minY: SOUTHWEST_OASIS_POS.terraceY, maxY: 10.6 },
  { id: 'sw-alchemist-east-north', minX: SOUTHWEST_OASIS_POS.pavilionX + 4.85, maxX: SOUTHWEST_OASIS_POS.pavilionX + 5.4, minZ: SOUTHWEST_OASIS_POS.pavilionZ - 6.5, maxZ: SOUTHWEST_OASIS_POS.pavilionZ - 1.35, minY: SOUTHWEST_OASIS_POS.terraceY, maxY: 10.6 },
  { id: 'sw-alchemist-east-south', minX: SOUTHWEST_OASIS_POS.pavilionX + 4.85, maxX: SOUTHWEST_OASIS_POS.pavilionX + 5.4, minZ: SOUTHWEST_OASIS_POS.pavilionZ + 1.35, maxZ: SOUTHWEST_OASIS_POS.pavilionZ + 6.5, minY: SOUTHWEST_OASIS_POS.terraceY, maxY: 10.6 },
  // Market Stall solid counters & full Oriented Bounding Box (OBB) booth frames (all 6 Harbor Market Stalls rotated toward Harbor Fountain)
  {
    id: 'market-stall-counter-harbor-1',
    minX: 212.0 - 2.15,
    maxX: 212.0 + 2.15,
    minZ: 254.0 - 1.65,
    maxZ: 254.0 + 1.65,
    minY: 3.2,
    maxY: 6.2,
    yaw: Math.atan2(SOUTHEAST_HARBOR_POS.fountainX - 212.0, SOUTHEAST_HARBOR_POS.fountainZ - 254.0),
  },
  {
    id: 'market-stall-counter-harbor-2',
    minX: 212.0 - 2.15,
    maxX: 212.0 + 2.15,
    minZ: 263.0 - 1.65,
    maxZ: 263.0 + 1.65,
    minY: 3.2,
    maxY: 6.2,
    yaw: Math.atan2(SOUTHEAST_HARBOR_POS.fountainX - 212.0, SOUTHEAST_HARBOR_POS.fountainZ - 263.0),
  },
  {
    id: 'market-stall-counter-harbor-3',
    minX: 224.0 - 2.15,
    maxX: 224.0 + 2.15,
    minZ: 263.0 - 1.65,
    maxZ: 263.0 + 1.65,
    minY: 3.2,
    maxY: 6.2,
    yaw: Math.atan2(SOUTHEAST_HARBOR_POS.fountainX - 224.0, SOUTHEAST_HARBOR_POS.fountainZ - 263.0),
  },
  {
    id: 'market-stall-counter-harbor-4',
    minX: 240.0 - 2.15,
    maxX: 240.0 + 2.15,
    minZ: 263.0 - 1.65,
    maxZ: 263.0 + 1.65,
    minY: 3.2,
    maxY: 6.2,
    yaw: Math.atan2(SOUTHEAST_HARBOR_POS.fountainX - 240.0, SOUTHEAST_HARBOR_POS.fountainZ - 263.0),
  },
  {
    id: 'market-stall-counter-harbor-5',
    minX: 246.0 - 2.15,
    maxX: 246.0 + 2.15,
    minZ: 238.0 - 1.65,
    maxZ: 238.0 + 1.65,
    minY: 3.2,
    maxY: 6.2,
    yaw: Math.atan2(SOUTHEAST_HARBOR_POS.fountainX - 246.0, SOUTHEAST_HARBOR_POS.fountainZ - 238.0),
  },
  {
    id: 'market-stall-counter-harbor-6',
    minX: 246.0 - 2.15,
    maxX: 246.0 + 2.15,
    minZ: 246.0 - 1.65,
    maxZ: 246.0 + 1.65,
    minY: 3.2,
    maxY: 6.2,
    yaw: Math.atan2(SOUTHEAST_HARBOR_POS.fountainX - 246.0, SOUTHEAST_HARBOR_POS.fountainZ - 246.0),
  },
  ...DWARVEN_GUARDIAN_STATUES.flatMap((st) => [
    {
      id: `${st.id}-pedestal`,
      minX: st.x - 2.32,
      maxX: st.x + 2.32,
      minZ: st.z - 2.32,
      maxZ: st.z + 2.32,
      minY: st.baseY - 0.4,
      maxY: st.baseY + 3.05,
    },
    {
      id: `${st.id}-statue-body`,
      minX: st.x - 1.35,
      maxX: st.x + 1.35,
      minZ: st.z - 1.35,
      maxZ: st.z + 1.35,
      minY: st.baseY + 3.05,
      maxY: st.baseY + 9.45,
    },
  ]),
  ...DWARVEN_STONE_HOUSES.flatMap((dh) => {
    const backWallX = dh.x - dh.dirX * dh.halfW;
    const frontWallX = dh.x + dh.dirX * dh.halfW;
    return [
      {
        id: `${dh.id}-back-wall`,
        minX: backWallX - 0.35,
        maxX: backWallX + 0.35,
        minZ: dh.z - dh.halfD - 0.25,
        maxZ: dh.z + dh.halfD + 0.25,
        minY: dh.terraceY - 0.3,
        maxY: dh.terraceY + 6.2,
      },
      {
        id: `${dh.id}-north-wall`,
        minX: dh.x - dh.halfW - 0.25,
        maxX: dh.x + dh.halfW + 0.25,
        minZ: dh.z - dh.halfD - 0.35,
        maxZ: dh.z - dh.halfD + 0.35,
        minY: dh.terraceY - 0.3,
        maxY: dh.terraceY + 6.2,
      },
      {
        id: `${dh.id}-south-wall`,
        minX: dh.x - dh.halfW - 0.25,
        maxX: dh.x + dh.halfW + 0.25,
        minZ: dh.z + dh.halfD - 0.35,
        maxZ: dh.z + dh.halfD + 0.35,
        minY: dh.terraceY - 0.3,
        maxY: dh.terraceY + 6.2,
      },
      {
        id: `${dh.id}-front-north`,
        minX: frontWallX - 0.35,
        maxX: frontWallX + 0.35,
        minZ: dh.z - dh.halfD - 0.25,
        maxZ: dh.z - 1.15,
        minY: dh.terraceY - 0.3,
        maxY: dh.terraceY + 6.2,
      },
      {
        id: `${dh.id}-front-south`,
        minX: frontWallX - 0.35,
        maxX: frontWallX + 0.35,
        minZ: dh.z + 1.15,
        maxZ: dh.z + dh.halfD + 0.25,
        minY: dh.terraceY - 0.3,
        maxY: dh.terraceY + 6.2,
      },
      {
        id: `${dh.id}-door-header`,
        minX: frontWallX - 0.35,
        maxX: frontWallX + 0.35,
        minZ: dh.z - 1.15,
        maxZ: dh.z + 1.15,
        minY: dh.terraceY + 2.95,
        maxY: dh.terraceY + 6.2,
      },
      // Interior Hearth, Back Storage Chest, 2 Beds, Oak Table & 2 Benches, plus Outdoor Porch Bench & Anvil
      {
        id: `${dh.id}-hearth`,
        minX: dh.x - dh.dirX * 2.8 - 1.05,
        maxX: dh.x - dh.dirX * 2.8 + 1.05,
        minZ: dh.z - 1.8 - 1.05,
        maxZ: dh.z - 1.8 + 1.05,
        minY: dh.floorY,
        maxY: dh.floorY + 1.65,
      },
      {
        id: `${dh.id}-back-chest`,
        minX: dh.x - dh.dirX * 4.2 - 0.42,
        maxX: dh.x - dh.dirX * 4.2 + 0.42,
        minZ: dh.z + 0.2 - 0.68,
        maxZ: dh.z + 0.2 + 0.68,
        minY: dh.floorY,
        maxY: dh.floorY + 0.85,
      },
      {
        id: `${dh.id}-bed-west`,
        minX: dh.x - 2.0 - 0.82,
        maxX: dh.x - 2.0 + 0.82,
        minZ: dh.z + 2.55 - 1.18,
        maxZ: dh.z + 2.55 + 1.18,
        minY: dh.floorY,
        maxY: dh.floorY + 0.95,
      },
      {
        id: `${dh.id}-bed-east`,
        minX: dh.x + 2.0 - 0.82,
        maxX: dh.x + 2.0 + 0.82,
        minZ: dh.z + 2.55 - 1.18,
        maxZ: dh.z + 2.55 + 1.18,
        minY: dh.floorY,
        maxY: dh.floorY + 0.95,
      },
      {
        id: `${dh.id}-oak-table`,
        minX: dh.x + dh.dirX * 1.55 - 1.08,
        maxX: dh.x + dh.dirX * 1.55 + 1.08,
        minZ: dh.z - 1.65 - 0.46,
        maxZ: dh.z - 1.65 + 0.46,
        minY: dh.floorY,
        maxY: dh.floorY + 0.88,
      },
      {
        id: `${dh.id}-bench-north`,
        minX: dh.x + dh.dirX * 1.55 - 0.95,
        maxX: dh.x + dh.dirX * 1.55 + 0.95,
        minZ: dh.z - 2.55 - 0.3,
        maxZ: dh.z - 2.55 + 0.3,
        minY: dh.floorY,
        maxY: dh.floorY + 0.78,
      },
      {
        id: `${dh.id}-bench-south`,
        minX: dh.x + dh.dirX * 1.55 - 0.95,
        maxX: dh.x + dh.dirX * 1.55 + 0.95,
        minZ: dh.z - 0.75 - 0.3,
        maxZ: dh.z - 0.75 + 0.3,
        minY: dh.floorY,
        maxY: dh.floorY + 0.78,
      },
      {
        id: `${dh.id}-porch-bench`,
        minX: dh.x + dh.dirX * (dh.halfW + 1.35) - 0.32,
        maxX: dh.x + dh.dirX * (dh.halfW + 1.35) + 0.32,
        minZ: dh.z - 2.45 - 0.95,
        maxZ: dh.z - 2.45 + 0.95,
        minY: dh.terraceY,
        maxY: dh.terraceY + 0.78,
      },
      {
        id: `${dh.id}-outdoor-anvil`,
        minX: dh.x + dh.dirX * (dh.halfW + 1.8) - 0.52,
        maxX: dh.x + dh.dirX * (dh.halfW + 1.8) + 0.52,
        minZ: dh.z + 2.8 - 0.32,
        maxZ: dh.z + 2.8 + 0.32,
        minY: dh.terraceY,
        maxY: dh.terraceY + 0.85,
      },
    ];
  }),
  // Grand Southern River Bridge North & South Stone Parapet Guardrails
  {
    id: 'southern-river-bridge-rail-north',
    minX: 154.0,
    maxX: 202.0,
    minZ: 374.55,
    maxZ: 375.0,
    minY: 1.8,
    maxY: 6.2,
  },
  {
    id: 'southern-river-bridge-rail-south',
    minX: 154.0,
    maxX: 202.0,
    minZ: 381.0,
    maxZ: 381.45,
    minY: 1.8,
    maxY: 6.2,
  },
  // Subterranean Mountain Bear Caves: Entrance Tunnel walls (lz: -5.5..+5.5, |lx|=3.8..5.4)
  // and wide Subterranean Cavern walls (lz: -24.5..-5.5, |lx|=10.0..12.2).
  // Baffle rock pillars removed and throat widened to 7.6m so large bears can exit freely!
  // 1) Cave NW Forest (cx=-85, cz=-76, yaw=0: lx = x - (-85), lz = z - (-76))
  { id: 'cave-nw-tunnel-west', minX: -90.6, maxX: -88.8, minZ: -81.5, maxZ: -70.5, maxY: 8.6 },
  { id: 'cave-nw-tunnel-east', minX: -81.2, maxX: -79.4, minZ: -81.5, maxZ: -70.5, maxY: 8.6 },
  { id: 'cave-nw-shoulder-west', minX: -96.5, maxX: -88.8, minZ: -82.5, maxZ: -80.8, maxY: 11.0 },
  { id: 'cave-nw-shoulder-east', minX: -81.2, maxX: -73.5, minZ: -82.5, maxZ: -80.8, maxY: 11.0 },
  { id: 'cave-nw-cavern-west', minX: -97.2, maxX: -95.0, minZ: -100.5, maxZ: -81.5, maxY: 11.0 },
  { id: 'cave-nw-cavern-east', minX: -75.0, maxX: -72.8, minZ: -100.5, maxZ: -81.5, maxY: 11.0 },
  { id: 'cave-nw-cavern-back', minX: -96.5, maxX: -73.5, minZ: -102.2, maxZ: -100.0, maxY: 11.0 },

  // 2) Cave West Ridge (cx=-186, cz=-45, yaw=PI/2: lx = -(z - (-45)), lz = x - (-186))
  { id: 'cave-west-tunnel-south', minX: -191.5, maxX: -180.5, minZ: -41.2, maxZ: -39.4, maxY: 8.8 },
  { id: 'cave-west-tunnel-north', minX: -191.5, maxX: -180.5, minZ: -50.6, maxZ: -48.8, maxY: 8.8 },
  { id: 'cave-west-shoulder-south', minX: -192.5, maxX: -190.8, minZ: -41.2, maxZ: -33.5, maxY: 11.5 },
  { id: 'cave-west-shoulder-north', minX: -192.5, maxX: -190.8, minZ: -56.5, maxZ: -48.8, maxY: 11.5 },
  { id: 'cave-west-cavern-south', minX: -210.5, maxX: -191.5, minZ: -35.0, maxZ: -32.8, maxY: 11.5 },
  { id: 'cave-west-cavern-north', minX: -210.5, maxX: -191.5, minZ: -57.2, maxZ: -55.0, maxY: 11.5 },
  { id: 'cave-west-cavern-back', minX: -212.2, maxX: -210.0, minZ: -56.5, maxZ: -33.5, maxY: 11.5 },

  // 3) Cave South Forest (cx=38, cz=294, yaw=PI: lx = -(x - 38), lz = -(z - 294))
  { id: 'cave-south-tunnel-west', minX: 32.4, maxX: 34.2, minZ: 288.5, maxZ: 299.5, maxY: 8.8 },
  { id: 'cave-south-tunnel-east', minX: 41.8, maxX: 43.6, minZ: 288.5, maxZ: 299.5, maxY: 8.8 },
  { id: 'cave-south-shoulder-west', minX: 26.5, maxX: 34.2, minZ: 298.8, maxZ: 300.5, maxY: 11.5 },
  { id: 'cave-south-shoulder-east', minX: 41.8, maxX: 49.5, minZ: 298.8, maxZ: 300.5, maxY: 11.5 },
  { id: 'cave-south-cavern-west', minX: 25.8, maxX: 28.0, minZ: 299.5, maxZ: 318.5, maxY: 11.5 },
  { id: 'cave-south-cavern-east', minX: 48.0, maxX: 50.2, minZ: 299.5, maxZ: 318.5, maxY: 11.5 },
  { id: 'cave-south-cavern-back', minX: 26.5, maxX: 49.5, minZ: 318.0, maxZ: 320.2, maxY: 11.5 },

  // Ancient Dragon Citadel Ruins at SOUTHERN_DRAGON_RUINS_POS — Shattered curtain walls (+/-37m) with wide breach gaps, gateways & altar
  { id: 'south-ruins-arch-west', minX: SOUTHERN_DRAGON_RUINS_POS.x - 6.2, maxX: SOUTHERN_DRAGON_RUINS_POS.x - 3.2, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 38.5, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.5, maxY: 11.2 },
  { id: 'south-ruins-arch-east', minX: SOUTHERN_DRAGON_RUINS_POS.x + 3.2, maxX: SOUTHERN_DRAGON_RUINS_POS.x + 6.2, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 38.5, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.5, maxY: 11.2 },
  { id: 'south-ruins-wall-nw-outer', minX: SOUTHERN_DRAGON_RUINS_POS.x - 35.0, maxX: SOUTHERN_DRAGON_RUINS_POS.x - 24.5, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 38.4, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.6, maxY: 9.2 },
  { id: 'south-ruins-wall-nw-inner', minX: SOUTHERN_DRAGON_RUINS_POS.x - 17.5, maxX: SOUTHERN_DRAGON_RUINS_POS.x - 7.5, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 38.4, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.6, maxY: 8.6 },
  { id: 'south-ruins-wall-ne-inner', minX: SOUTHERN_DRAGON_RUINS_POS.x + 7.5, maxX: SOUTHERN_DRAGON_RUINS_POS.x + 17.5, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 38.4, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.6, maxY: 8.6 },
  { id: 'south-ruins-wall-ne-outer', minX: SOUTHERN_DRAGON_RUINS_POS.x + 24.5, maxX: SOUTHERN_DRAGON_RUINS_POS.x + 35.0, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 38.4, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.6, maxY: 9.2 },
  { id: 'south-ruins-wall-west-n', minX: SOUTHERN_DRAGON_RUINS_POS.x - 38.4, maxX: SOUTHERN_DRAGON_RUINS_POS.x - 35.6, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.0, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 20.0, maxY: 9.5 },
  { id: 'south-ruins-wall-west-mid', minX: SOUTHERN_DRAGON_RUINS_POS.x - 38.4, maxX: SOUTHERN_DRAGON_RUINS_POS.x - 35.6, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 12.5, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 2.5, maxY: 8.2 },
  { id: 'south-ruins-wall-west-s', minX: SOUTHERN_DRAGON_RUINS_POS.x - 38.4, maxX: SOUTHERN_DRAGON_RUINS_POS.x - 35.6, minZ: SOUTHERN_DRAGON_RUINS_POS.z + 19.0, maxZ: SOUTHERN_DRAGON_RUINS_POS.z + 34.5, maxY: 9.5 },
  { id: 'south-ruins-wall-east-n', minX: SOUTHERN_DRAGON_RUINS_POS.x + 35.6, maxX: SOUTHERN_DRAGON_RUINS_POS.x + 38.4, minZ: SOUTHERN_DRAGON_RUINS_POS.z - 35.0, maxZ: SOUTHERN_DRAGON_RUINS_POS.z - 20.0, maxY: 9.5 },
  { id: 'south-ruins-wall-east-s', minX: SOUTHERN_DRAGON_RUINS_POS.x + 35.6, maxX: SOUTHERN_DRAGON_RUINS_POS.x + 38.4, minZ: SOUTHERN_DRAGON_RUINS_POS.z + 19.0, maxZ: SOUTHERN_DRAGON_RUINS_POS.z + 34.5, maxY: 9.5 },
  { id: 'south-ruins-wall-south-w', minX: SOUTHERN_DRAGON_RUINS_POS.x - 35.0, maxX: SOUTHERN_DRAGON_RUINS_POS.x - 20.0, minZ: SOUTHERN_DRAGON_RUINS_POS.z + 35.6, maxZ: SOUTHERN_DRAGON_RUINS_POS.z + 38.4, maxY: 9.8 },
  { id: 'south-ruins-wall-south-e', minX: SOUTHERN_DRAGON_RUINS_POS.x + 20.0, maxX: SOUTHERN_DRAGON_RUINS_POS.x + 35.0, minZ: SOUTHERN_DRAGON_RUINS_POS.z + 35.6, maxZ: SOUTHERN_DRAGON_RUINS_POS.z + 38.4, maxY: 9.8 },
  { id: 'south-ruins-altar', minX: SOUTHERN_DRAGON_RUINS_POS.x - 3.6, maxX: SOUTHERN_DRAGON_RUINS_POS.x + 3.6, minZ: SOUTHERN_DRAGON_RUINS_POS.z + 17.5, maxZ: SOUTHERN_DRAGON_RUINS_POS.z + 22.5, maxY: 4.8 },

  // Colossal Volcano Sanctum (centered at VOLCANO_SANCTUM_POS: -620, 115, chamberRadius = 30.0m)
  // 3 Cardinal Entrance Corridors (East +X, North -Z, South +Z) with Chicane Baffle Walls at r = 54.5..59.5m
  // 1) East Corridor (+X: dx in 28..96, pocket at dx in 46..68, baffle wall at dx in 54.5..59.5, |dz| <= 5.8)
  { id: 'volcano-east-inner-wall-n', minX: VOLCANO_SANCTUM_POS.x + 27.5, maxX: VOLCANO_SANCTUM_POS.x + 46.5, minZ: VOLCANO_SANCTUM_POS.z - 6.8, maxZ: VOLCANO_SANCTUM_POS.z - 4.8, maxY: 16.5 },
  { id: 'volcano-east-inner-wall-s', minX: VOLCANO_SANCTUM_POS.x + 27.5, maxX: VOLCANO_SANCTUM_POS.x + 46.5, minZ: VOLCANO_SANCTUM_POS.z + 4.8, maxZ: VOLCANO_SANCTUM_POS.z + 6.8, maxY: 16.5 },
  { id: 'volcano-east-pocket-wall-n', minX: VOLCANO_SANCTUM_POS.x + 45.5, maxX: VOLCANO_SANCTUM_POS.x + 68.5, minZ: VOLCANO_SANCTUM_POS.z - 13.2, maxZ: VOLCANO_SANCTUM_POS.z - 11.2, maxY: 16.5 },
  { id: 'volcano-east-pocket-wall-s', minX: VOLCANO_SANCTUM_POS.x + 45.5, maxX: VOLCANO_SANCTUM_POS.x + 68.5, minZ: VOLCANO_SANCTUM_POS.z + 11.2, maxZ: VOLCANO_SANCTUM_POS.z + 13.2, maxY: 16.5 },
  { id: 'volcano-east-outer-wall-n', minX: VOLCANO_SANCTUM_POS.x + 67.5, maxX: VOLCANO_SANCTUM_POS.x + 96.0, minZ: VOLCANO_SANCTUM_POS.z - 6.8, maxZ: VOLCANO_SANCTUM_POS.z - 4.8, maxY: 16.5 },
  { id: 'volcano-east-outer-wall-s', minX: VOLCANO_SANCTUM_POS.x + 67.5, maxX: VOLCANO_SANCTUM_POS.x + 96.0, minZ: VOLCANO_SANCTUM_POS.z + 4.8, maxZ: VOLCANO_SANCTUM_POS.z + 6.8, maxY: 16.5 },
  { id: 'volcano-baffle-east', minX: VOLCANO_SANCTUM_POS.x + 54.5, maxX: VOLCANO_SANCTUM_POS.x + 59.5, minZ: VOLCANO_SANCTUM_POS.z - 5.8, maxZ: VOLCANO_SANCTUM_POS.z + 5.8, maxY: 16.5 },

  // 2) North Corridor (-Z: dz in -96..-28, pocket at dz in -68..-46, baffle wall at dz in -59.5..-54.5, |dx| <= 5.8)
  { id: 'volcano-north-inner-wall-w', minX: VOLCANO_SANCTUM_POS.x - 6.8, maxX: VOLCANO_SANCTUM_POS.x - 4.8, minZ: VOLCANO_SANCTUM_POS.z - 46.5, maxZ: VOLCANO_SANCTUM_POS.z - 27.5, maxY: 16.5 },
  { id: 'volcano-north-inner-wall-e', minX: VOLCANO_SANCTUM_POS.x + 4.8, maxX: VOLCANO_SANCTUM_POS.x + 6.8, minZ: VOLCANO_SANCTUM_POS.z - 46.5, maxZ: VOLCANO_SANCTUM_POS.z - 27.5, maxY: 16.5 },
  { id: 'volcano-north-pocket-wall-w', minX: VOLCANO_SANCTUM_POS.x - 13.2, maxX: VOLCANO_SANCTUM_POS.x - 11.2, minZ: VOLCANO_SANCTUM_POS.z - 68.5, maxZ: VOLCANO_SANCTUM_POS.z - 45.5, maxY: 16.5 },
  { id: 'volcano-north-pocket-wall-e', minX: VOLCANO_SANCTUM_POS.x + 11.2, maxX: VOLCANO_SANCTUM_POS.x + 13.2, minZ: VOLCANO_SANCTUM_POS.z - 68.5, maxZ: VOLCANO_SANCTUM_POS.z - 45.5, maxY: 16.5 },
  { id: 'volcano-north-outer-wall-w', minX: VOLCANO_SANCTUM_POS.x - 6.8, maxX: VOLCANO_SANCTUM_POS.x - 4.8, minZ: VOLCANO_SANCTUM_POS.z - 96.0, maxZ: VOLCANO_SANCTUM_POS.z - 67.5, maxY: 16.5 },
  { id: 'volcano-north-outer-wall-e', minX: VOLCANO_SANCTUM_POS.x + 4.8, maxX: VOLCANO_SANCTUM_POS.x + 6.8, minZ: VOLCANO_SANCTUM_POS.z - 96.0, maxZ: VOLCANO_SANCTUM_POS.z - 67.5, maxY: 16.5 },
  { id: 'volcano-baffle-north', minX: VOLCANO_SANCTUM_POS.x - 5.8, maxX: VOLCANO_SANCTUM_POS.x + 5.8, minZ: VOLCANO_SANCTUM_POS.z - 59.5, maxZ: VOLCANO_SANCTUM_POS.z - 54.5, maxY: 16.5 },

  // 3) South Corridor (+Z: dz in 28..96, pocket at dz in 46..68, baffle wall at dz in 54.5..59.5, |dx| <= 5.8)
  { id: 'volcano-south-inner-wall-w', minX: VOLCANO_SANCTUM_POS.x - 6.8, maxX: VOLCANO_SANCTUM_POS.x - 4.8, minZ: VOLCANO_SANCTUM_POS.z + 27.5, maxZ: VOLCANO_SANCTUM_POS.z + 46.5, maxY: 16.5 },
  { id: 'volcano-south-inner-wall-e', minX: VOLCANO_SANCTUM_POS.x + 4.8, maxX: VOLCANO_SANCTUM_POS.x + 6.8, minZ: VOLCANO_SANCTUM_POS.z + 27.5, maxZ: VOLCANO_SANCTUM_POS.z + 46.5, maxY: 16.5 },
  { id: 'volcano-south-pocket-wall-w', minX: VOLCANO_SANCTUM_POS.x - 13.2, maxX: VOLCANO_SANCTUM_POS.x - 11.2, minZ: VOLCANO_SANCTUM_POS.z + 45.5, maxZ: VOLCANO_SANCTUM_POS.z + 68.5, maxY: 16.5 },
  { id: 'volcano-south-pocket-wall-e', minX: VOLCANO_SANCTUM_POS.x + 11.2, maxX: VOLCANO_SANCTUM_POS.x + 13.2, minZ: VOLCANO_SANCTUM_POS.z + 45.5, maxZ: VOLCANO_SANCTUM_POS.z + 68.5, maxY: 16.5 },
  { id: 'volcano-south-outer-wall-w', minX: VOLCANO_SANCTUM_POS.x - 6.8, maxX: VOLCANO_SANCTUM_POS.x - 4.8, minZ: VOLCANO_SANCTUM_POS.z + 67.5, maxZ: VOLCANO_SANCTUM_POS.z + 96.0, maxY: 16.5 },
  { id: 'volcano-south-outer-wall-e', minX: VOLCANO_SANCTUM_POS.x + 4.8, maxX: VOLCANO_SANCTUM_POS.x + 6.8, minZ: VOLCANO_SANCTUM_POS.z + 67.5, maxZ: VOLCANO_SANCTUM_POS.z + 96.0, maxY: 16.5 },
  { id: 'volcano-baffle-south', minX: VOLCANO_SANCTUM_POS.x - 5.8, maxX: VOLCANO_SANCTUM_POS.x + 5.8, minZ: VOLCANO_SANCTUM_POS.z + 54.5, maxZ: VOLCANO_SANCTUM_POS.z + 59.5, maxY: 16.5 },

  // 4) Inner Boss Chamber Perimeter Walls (30m radius with openings at East, North, South corridors)
  { id: 'volcano-chamber-west-wall', minX: VOLCANO_SANCTUM_POS.x - 31.5, maxX: VOLCANO_SANCTUM_POS.x - 28.5, minZ: VOLCANO_SANCTUM_POS.z - 29.0, maxZ: VOLCANO_SANCTUM_POS.z + 29.0, maxY: 22.0 },
  { id: 'volcano-chamber-north-west', minX: VOLCANO_SANCTUM_POS.x - 29.5, maxX: VOLCANO_SANCTUM_POS.x - 4.8, minZ: VOLCANO_SANCTUM_POS.z - 31.5, maxZ: VOLCANO_SANCTUM_POS.z - 28.5, maxY: 22.0 },
  { id: 'volcano-chamber-north-east', minX: VOLCANO_SANCTUM_POS.x + 4.8, maxX: VOLCANO_SANCTUM_POS.x + 29.5, minZ: VOLCANO_SANCTUM_POS.z - 31.5, maxZ: VOLCANO_SANCTUM_POS.z - 28.5, maxY: 22.0 },
  { id: 'volcano-chamber-south-west', minX: VOLCANO_SANCTUM_POS.x - 29.5, maxX: VOLCANO_SANCTUM_POS.x - 4.8, minZ: VOLCANO_SANCTUM_POS.z + 28.5, maxZ: VOLCANO_SANCTUM_POS.z + 31.5, maxY: 22.0 },
  { id: 'volcano-chamber-south-east', minX: VOLCANO_SANCTUM_POS.x + 4.8, maxX: VOLCANO_SANCTUM_POS.x + 29.5, minZ: VOLCANO_SANCTUM_POS.z + 28.5, maxZ: VOLCANO_SANCTUM_POS.z + 31.5, maxY: 22.0 },
  { id: 'volcano-chamber-east-north', minX: VOLCANO_SANCTUM_POS.x + 28.5, maxX: VOLCANO_SANCTUM_POS.x + 31.5, minZ: VOLCANO_SANCTUM_POS.z - 29.0, maxZ: VOLCANO_SANCTUM_POS.z - 4.8, maxY: 22.0 },
  { id: 'volcano-chamber-east-south', minX: VOLCANO_SANCTUM_POS.x + 28.5, maxX: VOLCANO_SANCTUM_POS.x + 31.5, minZ: VOLCANO_SANCTUM_POS.z + 4.8, maxZ: VOLCANO_SANCTUM_POS.z + 29.0, maxY: 22.0 },

  // 5) Southern Cliffside Mountain Pass Guardrail Fence & Mountain Retaining Wall (40 sloped 4m segments along z = 516..676)
  ...Array.from({ length: 40 }, (_, segIdx) => {
    const z0 = 516.0 + segIdx * 4.0;
    const z1 = z0 + 4.0;
    const evalPassH = (z: number): number => {
      if (z <= 512.0 || z >= 682.0) return 2.15;
      const tN = Math.max(0, Math.min(1, (z - 512.0) / 44.0));
      const northClimb = tN * tN * (3 - 2 * tN);
      const tS = Math.max(0, Math.min(1, (z - 638.0) / 44.0));
      const southDescent = 1.0 - tS * tS * (3 - 2 * tS);
      const passArch = Math.sin(Math.max(0, Math.min(1, (z - 550.0) / 94.0)) * Math.PI) * 1.15;
      return 2.15 + northClimb * southDescent * (9.25 + passArch);
    };
    const py0 = evalPassH(z0);
    const py1 = evalPassH(z1);
    const minY = Math.min(py0, py1);
    const maxY = Math.max(py0, py1);
    return [
      {
        id: segIdx === 0 ? 'southern-cliff-pass-guardrail' : `southern-cliff-pass-guardrail-seg-${segIdx}`,
        minX: 101.2,
        maxX: 101.5,
        minZ: z0,
        maxZ: z1,
        minY: minY - 0.1,
        maxY: maxY + 1.28,
      },
      {
        id: `southern-cliff-pass-mountain-wall-seg-${segIdx}`,
        minX: 93.65,
        maxX: 94.65,
        minZ: z0,
        maxZ: z1,
        minY: minY - 0.2,
        maxY: maxY + 3.65,
      },
    ];
  }).flat(),

  // 6) Desert Sun Pyramid Twin Obelisks & Guardian Sphinx Pedestal
  { id: 'desert-pyramid-obelisk-north', minX: DESERT_PYRAMID_SANCTUARY_POS.x + 28.0 - 1.4, maxX: DESERT_PYRAMID_SANCTUARY_POS.x + 28.0 + 1.4, minZ: DESERT_PYRAMID_SANCTUARY_POS.z - 10.5 - 1.4, maxZ: DESERT_PYRAMID_SANCTUARY_POS.z - 10.5 + 1.4, maxY: 18.5 },
  { id: 'desert-pyramid-obelisk-south', minX: DESERT_PYRAMID_SANCTUARY_POS.x + 28.0 - 1.4, maxX: DESERT_PYRAMID_SANCTUARY_POS.x + 28.0 + 1.4, minZ: DESERT_PYRAMID_SANCTUARY_POS.z + 10.5 - 1.4, maxZ: DESERT_PYRAMID_SANCTUARY_POS.z + 10.5 + 1.4, maxY: 18.5 },
  { id: 'desert-pyramid-sphinx', minX: DESERT_PYRAMID_SANCTUARY_POS.sphinxX - 5.2, maxX: DESERT_PYRAMID_SANCTUARY_POS.sphinxX + 5.2, minZ: DESERT_PYRAMID_SANCTUARY_POS.sphinxZ - 14.0 - 2.4, maxZ: DESERT_PYRAMID_SANCTUARY_POS.sphinxZ - 14.0 + 2.4, maxY: 10.5 },

  // 7) Southwest Oasis Sandstone Adobe Village Houses, Low Stone Courtyard Walls, and Date Palm Trunks (oasisModels.ts)
  ...SOUTHWEST_OASIS_VILLAGE_HOUSES.flatMap((h) => {
    const boxes: ISolidBuildingBox[] = [
      {
        id: h.id,
        minX: h.x - h.w * 0.5,
        maxX: h.x + h.w * 0.5,
        minZ: h.z - h.d * 0.5,
        maxZ: h.z + h.d * 0.5,
        minY: SOUTHWEST_OASIS_POS.terraceY,
        maxY: SOUTHWEST_OASIS_POS.terraceY + h.h,
      },
    ];
    if (h.secondStory) {
      const s = h.secondStory;
      boxes.push({
        id: `${h.id}-upper`,
        minX: h.x + s.offsetX - s.w * 0.5,
        maxX: h.x + s.offsetX + s.w * 0.5,
        minZ: h.z + s.offsetZ - s.d * 0.5,
        maxZ: h.z + s.offsetZ + s.d * 0.5,
        minY: SOUTHWEST_OASIS_POS.terraceY + h.h,
        maxY: SOUTHWEST_OASIS_POS.terraceY + h.h + s.h,
      });
    }
    return boxes;
  }),
  ...SOUTHWEST_OASIS_STONE_WALLS.map((w) => ({
    id: w.id,
    minX: w.x - w.w * 0.5,
    maxX: w.x + w.w * 0.5,
    minZ: w.z - w.d * 0.5,
    maxZ: w.z + w.d * 0.5,
    minY: SOUTHWEST_OASIS_POS.terraceY,
    maxY: SOUTHWEST_OASIS_POS.terraceY + w.h,
  })),
  ...SOUTHWEST_OASIS_PALMS.map((p) => {
    const wx = SOUTHWEST_OASIS_POS.x + p.dx;
    const wz = SOUTHWEST_OASIS_POS.z + p.dz;
    const r = 0.42 * p.scale;
    return {
      id: p.id,
      minX: wx - r,
      maxX: wx + r,
      minZ: wz - r,
      maxZ: wz + r,
      minY: SOUTHWEST_OASIS_POS.terraceY,
      maxY: SOUTHWEST_OASIS_POS.terraceY + 8.8 * p.scale,
    };
  }),

  // 8) Sakura Sanctuary Blossom Trees (sanctuaryAndDragonModels.ts)
  ...[
    [-10.5, 14.0, 1.15],
    [10.5, 14.0, 1.15],
    [-16.0, 4.0, 1.25],
    [16.0, 4.0, 1.25],
    [-18.0, -7.0, 1.1],
    [18.0, -7.0, 1.1],
    [-14.0, -18.0, 1.3],
    [14.0, -18.0, 1.3],
    [-6.0, -22.0, 1.05],
    [6.0, -22.0, 1.05],
    [-22.0, 12.0, 0.95],
    [22.0, 12.0, 0.95],
    [-24.0, -2.0, 1.0],
    [24.0, -2.0, 1.0],
  ].map(([lx, lz, sc], idx) => {
    const cosY = Math.cos(SAKURA_SANCTUARY_YAW);
    const sinY = Math.sin(SAKURA_SANCTUARY_YAW);
    const wx = SAKURA_SANCTUARY_POS.x + lx * cosY + lz * sinY;
    const wz = SAKURA_SANCTUARY_POS.z - lx * sinY + lz * cosY;
    const r = 0.48 * sc;
    return {
      id: `sakura-tree-${idx + 1}`,
      minX: wx - r,
      maxX: wx + r,
      minZ: wz - r,
      maxZ: wz + r,
      minY: SAKURA_SANCTUARY_POS.height,
      maxY: SAKURA_SANCTUARY_POS.height + 6.8 * sc,
    };
  }),

  // 9) Floating Blooming Islands Architecture: Twin Watchtowers, Temple Pavilion Columns, Barracks Columns/Chest, North Citadel, East Chest
  ...[-5.2, 5.2].map((zOff, idx) => ({
    id: `floating-sky-watchtower-${idx + 1}`,
    minX: FLOATING_ISLAND_STAIR_POS.topX + 5.5 - 1.45,
    maxX: FLOATING_ISLAND_STAIR_POS.topX + 5.5 + 1.45,
    minZ: FLOATING_ISLAND_STAIR_POS.z + zOff - 1.45,
    maxZ: FLOATING_ISLAND_STAIR_POS.z + zOff + 1.45,
    minY: 68.0,
    maxY: 75.5,
  })),
  ...Array.from({ length: 8 }, (_, c) => {
    const ang = (c / 8) * Math.PI * 2;
    const cx = FLOATING_BLOOMING_ISLANDS[0].x + Math.cos(ang) * 5.2;
    const cz = FLOATING_BLOOMING_ISLANDS[0].z + Math.sin(ang) * 5.2;
    return {
      id: `floating-temple-col-${c + 1}`,
      minX: cx - 0.35,
      maxX: cx + 0.35,
      minZ: cz - 0.35,
      maxZ: cz + 0.35,
      minY: 68.0,
      maxY: 74.2,
    };
  }),
  ...[-4.0, -1.35, 1.35, 4.0].flatMap((bx, bIdx) =>
    [-2.4, 2.4].map((bz, sIdx) => ({
      id: `floating-barracks-col-${bIdx * 2 + sIdx + 1}`,
      minX: FLOATING_BLOOMING_ISLANDS[0].x + bx - 0.32,
      maxX: FLOATING_BLOOMING_ISLANDS[0].x + bx + 0.32,
      minZ: FLOATING_BLOOMING_ISLANDS[0].z + 19.5 + bz - 0.32,
      maxZ: FLOATING_BLOOMING_ISLANDS[0].z + 19.5 + bz + 0.32,
      minY: 68.0,
      maxY: 72.5,
    }))
  ),
  {
    id: 'floating-barracks-chest',
    minX: FLOATING_BLOOMING_ISLANDS[0].x - 0.65,
    maxX: FLOATING_BLOOMING_ISLANDS[0].x + 0.65,
    minZ: FLOATING_BLOOMING_ISLANDS[0].z + 19.5 - 0.45,
    maxZ: FLOATING_BLOOMING_ISLANDS[0].z + 19.5 + 0.45,
    minY: 68.0,
    maxY: 69.2,
  },
  // Floating North Island Citadel Back/Side Walls & 6 Columns (at 228.0, 71.0, -93.5)
  {
    id: 'floating-north-citadel-back-wall',
    minX: FLOATING_BLOOMING_ISLANDS[1].x - 5.2,
    maxX: FLOATING_BLOOMING_ISLANDS[1].x + 5.2,
    minZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 - 3.45,
    maxZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 - 2.95,
    minY: 71.0,
    maxY: 76.2,
  },
  {
    id: 'floating-north-citadel-west-wall',
    minX: FLOATING_BLOOMING_ISLANDS[1].x - 5.25,
    maxX: FLOATING_BLOOMING_ISLANDS[1].x - 4.75,
    minZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 - 3.2,
    maxZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 + 1.2,
    minY: 71.0,
    maxY: 76.2,
  },
  {
    id: 'floating-north-citadel-east-wall',
    minX: FLOATING_BLOOMING_ISLANDS[1].x + 4.75,
    maxX: FLOATING_BLOOMING_ISLANDS[1].x + 5.25,
    minZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 - 3.2,
    maxZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 + 1.2,
    minY: 71.0,
    maxY: 76.2,
  },
  ...[-4.6, 0, 4.6].flatMap((cx, cIdx) =>
    [-2.8, 2.8].map((cz, sIdx) => ({
      id: `floating-north-citadel-col-${cIdx * 2 + sIdx + 1}`,
      minX: FLOATING_BLOOMING_ISLANDS[1].x + cx - 0.35,
      maxX: FLOATING_BLOOMING_ISLANDS[1].x + cx + 0.35,
      minZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 + cz - 0.35,
      maxZ: FLOATING_BLOOMING_ISLANDS[1].z - 1.5 + cz + 0.35,
      minY: 71.0,
      maxY: 76.0,
    }))
  ),
  {
    id: 'floating-east-island-chest',
    minX: FLOATING_BLOOMING_ISLANDS[2].x + 5.5 - 0.65,
    maxX: FLOATING_BLOOMING_ISLANDS[2].x + 5.5 + 0.65,
    minZ: FLOATING_BLOOMING_ISLANDS[2].z - 0.45,
    maxZ: FLOATING_BLOOMING_ISLANDS[2].z + 0.45,
    minY: 70.0,
    maxY: 71.2,
  },
];
// #endregion

// ======================== FLAT BUILDING TERRACES ======================== \\
// #region Flat Building Terraces
/** Summary: Leveled terrace targets ensuring 100% flat ground beneath all architecture. */
export const FLAT_BUILDING_TERRACES = [
  { x: HUNTER_LODGE_POS.x, z: HUNTER_LODGE_POS.z, innerR: 21.0, outerR: 32.0, targetH: HUNTER_LODGE_POS.height },
  { x: RIVERSIDE_WINDMILLS[0].x, z: RIVERSIDE_WINDMILLS[0].z, innerR: 8.5, outerR: 15.0, targetH: RIVERSIDE_WINDMILLS[0].height },
  { x: RIVERSIDE_WINDMILLS[1].x, z: RIVERSIDE_WINDMILLS[1].z, innerR: 8.5, outerR: 15.0, targetH: RIVERSIDE_WINDMILLS[1].height },
  { x: 30.0, z: -26.0, innerR: 6.5, outerR: 14.0, targetH: 6.4 },
  { x: -34.0, z: -16.0, innerR: 6.5, outerR: 13.0, targetH: 2.35 },
  { x: MAGIC_STONE_CIRCLE_POS.x, z: MAGIC_STONE_CIRCLE_POS.z, innerR: MAGIC_STONE_CIRCLE_POS.topFlatRadius, outerR: 16.5, targetH: MAGIC_STONE_CIRCLE_POS.height },
  { x: SOUTHERN_MINE_POS.x, z: SOUTHERN_MINE_POS.entranceZ - 6.0, innerR: 16.0, outerR: 25.0, targetH: SOUTHERN_MINE_POS.entranceFloorY },
  { x: SOUTHERN_MINE_POS.x, z: 380.0, innerR: 28.0, outerR: 42.0, targetH: SOUTHERN_MINE_POS.entranceFloorY },
  ...DWARVEN_STONE_HOUSES.map((dh) => ({
    x: dh.x,
    z: dh.z,
    innerR: 10.5,
    outerR: 17.5,
    targetH: dh.terraceY,
  })),
  { x: 0.0, z: 32.0, innerR: 5.0, outerR: 11.0, targetH: 1.95 },
  { x: 0.0, z: -73.0 + FZ, innerR: 10.0, outerR: 24.0, targetH: CHINESE_FORTRESS_POS.stairBaseHeight },
  { x: SAKURA_SANCTUARY_POS.x, z: SAKURA_SANCTUARY_POS.z, innerR: 32.0, outerR: 46.0, targetH: SAKURA_SANCTUARY_POS.height },
  { x: VALLEY_FARMS[0].x, z: VALLEY_FARMS[0].z, innerR: 25.0, outerR: 36.0, targetH: VALLEY_FARMS[0].height },
  { x: VALLEY_FARMS[1].x, z: VALLEY_FARMS[1].z, innerR: 25.0, outerR: 36.0, targetH: VALLEY_FARMS[1].height },
  { x: VALLEY_FARMS[2].x, z: VALLEY_FARMS[2].z, innerR: 25.0, outerR: 36.0, targetH: VALLEY_FARMS[2].height },
  { x: SOUTHEAST_HARBOR_POS.lighthouseX, z: SOUTHEAST_HARBOR_POS.lighthouseZ, innerR: 8.5, outerR: 18.0, targetH: SOUTHEAST_HARBOR_POS.lighthouseBaseY },
  { x: SOUTHWEST_OASIS_POS.x, z: SOUTHWEST_OASIS_POS.z + 12.0, innerR: 54.0, outerR: 74.0, targetH: SOUTHWEST_OASIS_POS.terraceY },
  { x: 152.0, z: 378.0, innerR: 6.5, outerR: 14.0, targetH: 1.85 },
  { x: 204.0, z: 378.0, innerR: 6.5, outerR: 14.0, targetH: 1.85 },
  { x: 105.0, z: 715.0, innerR: 12.0, outerR: 20.0, targetH: 2.15 },
  { x: SOUTHERN_DRAGON_RUINS_POS.x, z: SOUTHERN_DRAGON_RUINS_POS.z, innerR: 54.0, outerR: 68.0, targetH: SOUTHERN_DRAGON_RUINS_POS.height },
  { x: VOLCANO_SANCTUM_POS.entranceX + 8.0, z: VOLCANO_SANCTUM_POS.entranceZ, innerR: 14.0, outerR: 26.0, targetH: VOLCANO_SANCTUM_POS.floorY },
  { x: VOLCANO_SANCTUM_POS.x, z: VOLCANO_SANCTUM_POS.z - 103.0, innerR: 12.0, outerR: 24.0, targetH: VOLCANO_SANCTUM_POS.floorY },
  { x: VOLCANO_SANCTUM_POS.x, z: VOLCANO_SANCTUM_POS.z + 103.0, innerR: 12.0, outerR: 24.0, targetH: VOLCANO_SANCTUM_POS.floorY },
  { x: FLOATING_ISLAND_STAIR_POS.waterfallX - 5.0, z: FLOATING_ISLAND_STAIR_POS.z, innerR: 22.0, outerR: 34.0, targetH: 3.25 },
  { x: NORDIC_FROST_SHRINE_POS.x, z: NORDIC_FROST_SHRINE_POS.z, innerR: 28.0, outerR: 42.0, targetH: NORDIC_FROST_SHRINE_POS.floorY },
  { x: DESERT_PYRAMID_SANCTUARY_POS.x + 8.0, z: DESERT_PYRAMID_SANCTUARY_POS.z, innerR: 42.0, outerR: 58.0, targetH: DESERT_PYRAMID_SANCTUARY_POS.baseY },
] as const;
// #endregion

// ======================== VEGETATION CLEAR ZONES ======================== \\
// #region Vegetation Clear Zones
/** Summary: Spatial exclusion circles suppressing procedural tree and rock generation. */
export const CLEAR_ZONES = [
  { x: 0, z: 32, r: 6.5 },
  { x: -5.5, z: 29.5, r: 5.5 },
  { x: -11.5, z: 16.5, r: 9.5 },
  { x: 18.0, z: 2.0, r: 12.5 },
  { x: 30.0, z: -26.0, r: 8.0 },
  { x: -34.0, z: -16.0, r: 7.5 },
  { x: HUNTER_LODGE_POS.x, z: HUNTER_LODGE_POS.z, r: 19.5 },
  { x: -113.0, z: 48.0, r: 12.0 },
  { x: 78.0, z: -35.0, r: 14.0 },
  { x: RIVERSIDE_WINDMILLS[0].x, z: RIVERSIDE_WINDMILLS[0].z, r: 9.5 },
  { x: RIVERSIDE_WINDMILLS[1].x, z: RIVERSIDE_WINDMILLS[1].z, r: 9.5 },
  { x: MAGIC_STONE_CIRCLE_POS.x, z: MAGIC_STONE_CIRCLE_POS.z, r: 11.2 },
  { x: SOUTHERN_MINE_POS.x, z: SOUTHERN_MINE_POS.entranceZ - 5.0, r: 18.0 },
  { x: SOUTHERN_MINE_POS.x, z: 380.0, r: 34.0 },
  ...DWARVEN_STONE_HOUSES.map((dh) => ({ x: dh.x, z: dh.z, r: 12.0 })),
  { x: HILL_WATCHTOWERS[0].x, z: HILL_WATCHTOWERS[0].z, r: 10.5 },
  { x: HILL_WATCHTOWERS[1].x, z: HILL_WATCHTOWERS[1].z, r: 10.5 },
  { x: HILL_WATCHTOWERS[2].x, z: HILL_WATCHTOWERS[2].z, r: 10.5 },
  { x: ROPE_BRIDGE_DEF.mx, z: ROPE_BRIDGE_DEF.mz, r: 6.5 },
  { x: -55.0, z: -225.0, r: 9.0 },
  { x: 0.0, z: -171.0 + FZ, r: 78.0 },
  { x: 0.0, z: -102.0 + FZ, r: 26.0 },
  { x: WATERFALL_CLIFF_POS.x, z: WATERFALL_CLIFF_POS.z, r: 12.0 },
  { x: WATERFALL_POOL_POS.x, z: WATERFALL_POOL_POS.z, r: 13.5 },
  { x: SAKURA_SANCTUARY_POS.x, z: SAKURA_SANCTUARY_POS.z, r: 42.0 },
  { x: VALLEY_FARMS[0].x, z: VALLEY_FARMS[0].z, r: VALLEY_FARMS[0].clearRadius },
  { x: VALLEY_FARMS[1].x, z: VALLEY_FARMS[1].z, r: VALLEY_FARMS[1].clearRadius },
  { x: VALLEY_FARMS[2].x, z: VALLEY_FARMS[2].z, r: VALLEY_FARMS[2].clearRadius },
  { x: 232.0, z: 262.0, r: 68.0 },
  { x: SOUTHEAST_HARBOR_POS.lighthouseX, z: SOUTHEAST_HARBOR_POS.lighthouseZ, r: 22.0 },
  { x: SOUTHWEST_OASIS_POS.x, z: SOUTHWEST_OASIS_POS.z, r: SOUTHWEST_OASIS_POS.clearRadius },
  { x: 154.0, z: 378.0, r: 14.0 },
  { x: 178.0, z: 378.0, r: 26.0 },
  { x: 202.0, z: 378.0, r: 14.0 },
  { x: 132.0, z: 475.0, r: 30.0 },
  { x: 99.0, z: 512.0, r: 18.0 },
  { x: 99.0, z: 528.0, r: 18.0 },
  { x: 99.0, z: 544.0, r: 18.0 },
  { x: 99.0, z: 560.0, r: 18.0 },
  { x: 99.0, z: 576.0, r: 18.0 },
  { x: 99.0, z: 592.0, r: 18.0 },
  { x: 99.0, z: 608.0, r: 18.0 },
  { x: 99.0, z: 624.0, r: 18.0 },
  { x: 99.0, z: 640.0, r: 18.0 },
  { x: 99.0, z: 656.0, r: 18.0 },
  { x: 99.0, z: 672.0, r: 18.0 },
  { x: 99.0, z: 686.0, r: 18.0 },
  { x: 105.0, z: 715.0, r: 22.0 },
  { x: SOUTHERN_DRAGON_RUINS_POS.x, z: SOUTHERN_DRAGON_RUINS_POS.z, r: 62.0 },
  { x: DESERT_DRAGON_PASS_POS.entryX, z: DESERT_DRAGON_PASS_POS.entryZ, r: 16.0 },
  { x: DESERT_DRAGON_PASS_POS.gorgeX, z: DESERT_DRAGON_PASS_POS.gorgeZ, r: 16.0 },
  { x: DESERT_DRAGON_PASS_POS.exitX, z: DESERT_DRAGON_PASS_POS.exitZ, r: 16.0 },
  { x: -85.0, z: -76.0, r: 16.0 },
  { x: -85.0, z: -90.0, r: 18.0 },
  { x: -85.0, z: -60.0, r: 14.0 },
  { x: -186.0, z: -45.0, r: 16.0 },
  { x: -200.0, z: -45.0, r: 18.0 },
  { x: -170.0, z: -45.0, r: 14.0 },
  { x: 38.0, z: 294.0, r: 16.0 },
  { x: 38.0, z: 308.0, r: 18.0 },
  { x: 38.0, z: 278.0, r: 14.0 },
  { x: VOLCANO_SANCTUM_POS.x, z: VOLCANO_SANCTUM_POS.z, r: VOLCANO_SANCTUM_POS.outerRadius + 8.0 },
  { x: VOLCANO_SANCTUM_POS.entranceX + 10.0, z: VOLCANO_SANCTUM_POS.entranceZ, r: 24.0 },
  { x: VOLCANO_SANCTUM_POS.x, z: VOLCANO_SANCTUM_POS.z - 105.0, r: 24.0 },
  { x: VOLCANO_SANCTUM_POS.x, z: VOLCANO_SANCTUM_POS.z + 105.0, r: 24.0 },
  { x: FLOATING_ISLAND_STAIR_POS.waterfallX - 5.0, z: FLOATING_ISLAND_STAIR_POS.z, r: 36.0 },
  ...FLOATING_BLOOMING_ISLANDS.map((isl) => ({ x: isl.x, z: isl.z, r: isl.radius + 6.0 })),
  { x: NORDIC_FROST_SHRINE_POS.x, z: NORDIC_FROST_SHRINE_POS.z, r: 36.0 },
  { x: DESERT_PYRAMID_SANCTUARY_POS.x + 8.0, z: DESERT_PYRAMID_SANCTUARY_POS.z, r: 48.0 },
  { x: SMUGGLER_ISLAND_POS.x, z: SMUGGLER_ISLAND_POS.z, r: 34.0 },
];
// #endregion

// ======================== ORIENTED BOUNDING BOX (OBB) COLLISION & ENTITY CONTRACT ======================== \\
// #region OBB Collision Helpers & Collidable Entity Registry
/**
 * Summary: Canonical registry of world structures and props implementing `ICollidableWorldEntity`.
 * Design: Enforces that every world object either binds to valid `SOLID_BUILDING_BOXES` IDs or declares an explicit exemption reason.
 */
export const COLLIDABLE_WORLD_ENTITY_REGISTRY: readonly ICollidableWorldEntity[] = [
  {
    entityId: 'harbor-market-stalls',
    category: 'stall',
    collidable: true,
    solidBoxIds: [
      'market-stall-counter-harbor-1',
      'market-stall-counter-harbor-2',
      'market-stall-counter-harbor-3',
      'market-stall-counter-harbor-4',
      'market-stall-counter-harbor-5',
      'market-stall-counter-harbor-6',
    ],
  },
  {
    entityId: 'harbor-cylindrical-lighthouse',
    category: 'tower',
    collidable: true,
    solidBoxIds: [
      ...Array.from({ length: 14 }, (_, i) => `harbor-lighthouse-wall-seg-${i + 1}`),
      ...Array.from({ length: 16 }, (_, i) => `harbor-lighthouse-top-rail-seg-${i + 1}`),
      'harbor-lighthouse-lantern-core',
    ],
  },
  {
    entityId: 'harbor-perimeter-castle',
    category: 'wall',
    collidable: true,
    solidBoxIds: [
      'harbor-wall-west-north',
      'harbor-gate-tower-north-base',
      'harbor-gate-tower-north',
      'harbor-gate-tower-south-base',
      'harbor-gate-tower-south',
      'harbor-wall-west-south',
      'harbor-wall-north-west',
      'harbor-wall-north-east',
      'harbor-wall-south',
      ...(['nw', 'sw', 'ne', 'se'] as const).flatMap((tag) =>
        Array.from({ length: 8 }, (_, sIdx) => `harbor-bastion-${tag}-seg-${sIdx + 1}`)
      ),
    ],
  },
  {
    entityId: 'harbor-marble-amphitheater',
    category: 'building',
    collidable: true,
    solidBoxIds: [
      'harbor-amphitheater-stage-core',
      ...Array.from({ length: 12 }, (_, i) => `harbor-amphitheater-stage-seg-${i + 1}`),
      ...[0, 1, 2, 3, 4].flatMap((tier) =>
        Array.from({ length: 9 }, (_, s) => `harbor-amphitheater-tier-${tier + 1}-seg-${s + 1}`)
      ),
      ...Array.from({ length: 6 }, (_, i) => `harbor-amphitheater-col-${i + 1}`),
    ],
  },
  {
    entityId: 'harbor-royal-galleon-and-office',
    category: 'ship',
    collidable: true,
    solidBoxIds: [
      'galleon-lower-hull',
      'galleon-cabin-front-left',
      'galleon-cabin-front-right',
      'galleon-office-desk',
      'galleon-office-bookshelf-port',
      'galleon-office-drafting-stbd',
      'galleon-office-strongbox',
      'galleon-office-globe',
    ],
  },
  {
    entityId: 'harbor-portmaster-house',
    category: 'building',
    collidable: true,
    solidBoxIds: [
      'harbor-shed-south-wall',
      'harbor-shed-west-wall',
      'harbor-shed-east-wall',
      'harbor-shed-north-left',
      'harbor-shed-north-right',
    ],
  },
  {
    entityId: 'harbor-warehouse',
    category: 'building',
    collidable: true,
    solidBoxIds: [
      'harbor-warehouse-south-wall',
      'harbor-warehouse-west-wall',
      'harbor-warehouse-east-wall',
      'harbor-warehouse-north-left',
      'harbor-warehouse-north-right',
    ],
  },
  {
    entityId: 'harbor-tavern',
    category: 'building',
    collidable: true,
    solidBoxIds: [
      'harbor-tavern-back-wall',
      'harbor-tavern-west-wall',
      'harbor-tavern-east-wall',
      'harbor-tavern-front-left',
      'harbor-tavern-front-right',
    ],
  },
  {
    entityId: 'harbor-plaza-cobblestone-pavement',
    category: 'walkable_surface',
    collidable: false,
    exemptionReason: 'walkable_floor_or_stair',
  },
  {
    entityId: 'harbor-fountain-water-jets',
    category: 'water_or_particle_fx' as 'prop',
    collidable: false,
    exemptionReason: 'water_or_particle_fx',
  },
  {
    entityId: 'hunter-lodge-and-stable-compound',
    category: 'building',
    collidable: true,
    solidBoxIds: [
      'hunter-lodge-back-wall',
      'hunter-lodge-west-wall',
      'hunter-lodge-chimney',
      'hunter-lodge-east-wall',
      'hunter-lodge-front-left',
      'hunter-lodge-front-right',
      'hunter-lodge-front-header',
      'hunter-lodge-porch-col-1',
      'hunter-lodge-porch-col-2',
      'hunter-lodge-porch-col-3',
      'hunter-lodge-porch-col-4',
      'hunter-lodge-porch-rail-west',
      'hunter-lodge-porch-rail-east',
      'hunter-lodge-bed',
      'hunter-lodge-table',
      'hunter-lodge-starter-chest',
      'hunter-water-trough',
      'hunter-water-pump',
      'stable-back-wall',
      'stable-west-wall',
      'stable-east-wall',
      'stable-center-divider',
      'stable-hay-bales',
      'stable-corral-fence-west',
    ],
  },
  {
    entityId: 'valley-farmhouses-and-compounds',
    category: 'building',
    collidable: true,
    solidBoxIds: VALLEY_FARMS.flatMap((f, idx) => [
      `${f.id}-back-wall`,
      `${f.id}-west-wall`,
      `${f.id}-east-wall`,
      `${f.id}-front-left`,
      `${f.id}-front-right`,
      `${f.id}-front-header`,
      `${f.id}-porch-col-1`,
      `${f.id}-porch-col-2`,
      `${f.id}-porch-col-3`,
      `${f.id}-porch-col-4`,
      `${f.id}-interior-hearth`,
      `${f.id}-interior-table`,
      `${f.id}-interior-wardrobe`,
      `${f.id}-interior-bed`,
      `${f.id}-interior-chest`,
      idx === 0 ? `${f.id}-workshop-oven` : idx === 1 ? `${f.id}-workshop-churn` : `${f.id}-workshop-loom`,
      `${f.id}-field-fence-left-back`,
      `${f.id}-field-fence-left-front`,
      `${f.id}-field-fence-right-back`,
      `${f.id}-field-fence-right-front`,
      `${f.id}-hay-bale-left`,
      `${f.id}-hay-bale-right`,
      `${f.id}-perimeter-fence-back`,
      `${f.id}-perimeter-fence-west`,
      `${f.id}-perimeter-fence-east`,
      `${f.id}-perimeter-fence-front-left`,
      `${f.id}-perimeter-fence-front-right`,
      `${f.id}-gate-post-left`,
      `${f.id}-gate-post-right`,
      `${f.id}-gate-crossbeam`,
    ]),
  },
  {
    entityId: 'riverside-windmills',
    category: 'tower',
    collidable: true,
    solidBoxIds: RIVERSIDE_WINDMILLS.flatMap((wm) =>
      Array.from({ length: 8 }, (_, sIdx) => `${wm.id}-seg-${sIdx + 1}`)
    ),
  },
] as const;

/**
 * Summary: Validates that every registered `ICollidableWorldEntity` either references existing `SOLID_BUILDING_BOXES`
 *          or provides a valid `NonCollidableExemptionReason`.
 */
export function validateWorldEntityColliders(): { valid: boolean; errors: string[] } {
  const boxIdSet = new Set(SOLID_BUILDING_BOXES.map((b) => b.id));
  const errors: string[] = [];
  for (const entity of COLLIDABLE_WORLD_ENTITY_REGISTRY) {
    if (entity.collidable) {
      if (!entity.solidBoxIds || entity.solidBoxIds.length === 0) {
        errors.push(`Collidable entity '${entity.entityId}' has no solidBoxIds.`);
      } else {
        for (const boxId of entity.solidBoxIds) {
          if (!boxIdSet.has(boxId)) {
            errors.push(`Collidable entity '${entity.entityId}' references missing boxId '${boxId}'.`);
          }
        }
      }
    } else if (!entity.exemptionReason) {
      errors.push(`Non-collidable entity '${entity.entityId}' is missing a required exemptionReason.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Summary: Computes the exact 3D collision cylinder radius and vertical trunk/pillar/rock height for an `IObstacleCylinder`.
 * Design: Ensures 100% agreement between 3D procedural meshes (`vegetationModels.ts`), projectile/sword collision (`combatAndInventorySystem.ts`),
 *         and the `[H]` debug collider wireframe overlay (`colliderDebugBuilder.ts`).
 */
export function getObstacleColliderMetrics(obs: IObstacleCylinder): {
  readonly radius: number;
  readonly height: number;
} {
  if (obs.treeVariant) {
    switch (obs.treeVariant) {
      case 'pinetree':
        return { radius: obs.radius, height: 14.5 * obs.scale };
      case 'oakgreen':
        return { radius: obs.radius, height: 11.0 * obs.scale };
      case 'oakyellow':
        return { radius: obs.radius, height: 10.8 * obs.scale };
      case 'animtree':
        return { radius: obs.radius, height: 10.0 * obs.scale };
      case 'animtree_wide':
        return { radius: obs.radius, height: 8.8 * obs.scale };
      case 'animtree_compact':
        return { radius: obs.radius, height: 7.9 * obs.scale };
    }
  }
  switch (obs.kind) {
    case 'pine':
      return { radius: obs.radius, height: 12.4 * obs.scale };
    case 'birch':
      return { radius: obs.radius, height: 9.4 * obs.scale };
    case 'palm':
      return { radius: obs.radius, height: 9.2 * obs.scale };
    case 'oak':
      return { radius: obs.radius, height: 8.6 * obs.scale };
    case 'acacia':
      return { radius: obs.radius, height: 7.4 * obs.scale };
    case 'boulder':
      return { radius: obs.radius, height: 1.25 * obs.scale };
    case 'pillar':
      return { radius: obs.radius, height: 3.5 * obs.scale };
  }
}

// ======================== HILL WATCHTOWER WALLS ======================== \
// #region Hill Watchtower Walls
/** Summary: An axis-aligned wall in a watchtower's local frame (before its yaw is applied). */
export interface ILocalWallBox {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly maxY?: number;
}

/**
 * Summary: Walls of one hill watchtower, in its local frame, for the given deck and door state.
 * Design: Single source for the physics and the F3 collider overlay, so the drawn walls are the ones that block the player.
 */
export function getHillWatchtowerLocalWalls(
  tower: Pick<IHillWatchtowerDef, 'doorSideLocalZ' | 'bridgeSideLocalZ' | 'baseY' | 'deckY'>,
  onUpperDeck: boolean,
  doorOpen: boolean
): ILocalWallBox[] {
  const walls: ILocalWallBox[] = [];
  if (!onUpperDeck) {
    walls.push(
      { minX: -3.75, maxX: -3.25, minZ: -3.7, maxZ: 3.7, maxY: tower.baseY + 5.2 },
      { minX: 3.25, maxX: 3.75, minZ: -3.7, maxZ: 3.7, maxY: tower.baseY + 5.2 }
    );
    const backZ = -tower.doorSideLocalZ * 3.5;
    const doorZ = tower.doorSideLocalZ * 3.5;
    walls.push({ minX: -3.7, maxX: 3.7, minZ: backZ - 0.25, maxZ: backZ + 0.25, maxY: tower.baseY + 5.2 });
    walls.push(
      { minX: -3.7, maxX: -1.15, minZ: doorZ - 0.25, maxZ: doorZ + 0.25, maxY: tower.baseY + 5.2 },
      { minX: 1.15, maxX: 3.7, minZ: doorZ - 0.25, maxZ: doorZ + 0.25, maxY: tower.baseY + 5.2 }
    );
    if (!doorOpen) {
      walls.push({ minX: -1.15, maxX: 1.15, minZ: doorZ - 0.22, maxZ: doorZ + 0.22, maxY: tower.baseY + 3.8 });
    }
  } else {
    const pMaxY = tower.deckY + 0.96;
    walls.push(
      { minX: -3.65, maxX: -3.35, minZ: -3.6, maxZ: 3.6, maxY: pMaxY },
      { minX: 3.35, maxX: 3.65, minZ: -3.6, maxZ: 3.6, maxY: pMaxY }
    );
    for (const sideZ of [-1, 1] as const) {
      const zCenter = sideZ * 3.5;
      if (tower.bridgeSideLocalZ === sideZ) {
        walls.push(
          { minX: -3.6, maxX: -1.65, minZ: zCenter - 0.18, maxZ: zCenter + 0.18, maxY: pMaxY },
          { minX: 1.65, maxX: 3.6, minZ: zCenter - 0.18, maxZ: zCenter + 0.18, maxY: pMaxY }
        );
      } else {
        walls.push({ minX: -3.6, maxX: 3.6, minZ: zCenter - 0.18, maxZ: zCenter + 0.18, maxY: pMaxY });
      }
    }
  }
  return walls;
}
// #endregion
