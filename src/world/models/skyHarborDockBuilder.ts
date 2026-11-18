// ============================================================================
// MODULE: World / Models / Skybound Isles / Sky Harbor Dock
// DESIGN: Placed from the Sky Dock domain data (pier, airship deck, gangplank, crates, crane),
//         enhanced with:
//         1) Raised timber-and-stone quay apron (zero z-fighting) and cliff-anchored diagonal
//            cantilever trusses & stone abutment wall under the pier (no floating posts).
//         2) Renovated Royal Celestial Sky-Galleon airship with sculpted planked hull, golden
//            strakes, bow figurehead, windowed captain's cabin, helm wheel, ribbed dirigible
//            envelope with tail fins, and twin brass engine nacelles with spinning propellers.
//         3) Sky-Bike / Hoverbike Merchant Shop ("חנות אופנועי אוויר") on the dock plaza with
//            a steampunk workshop stall, aviator merchant NPC, and hovering aero-cycles.
// SUMMARY: Builds the Sky Dock, Hoverbike Shop, netted hot-air balloons, and moored airship.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import {
  SKY_HARBOR,
  SKY_DOCK_PIER,
  MOORED_AIRSHIP_DECK,
  AIRSHIP_GANGPLANK,
  DOCK_CRATES,
  DOCK_CRANE,
} from '../domain/landmarksRegistry';
import { addRope, boxMesh, deckSlab, type IHarborMaterials } from './skyHarborShared';
import type { IWorldModelBuildContext } from './types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: Animated parts of the dock, airship, and hoverbike emporium. */
export interface ISkyDockVisual {
  readonly airship: THREE.Group;
  readonly propellers: THREE.Mesh[];
  readonly balloons: THREE.Object3D[];
  readonly hoverbikes: THREE.Group[];
  readonly merchantNpc: THREE.Group;
}

const DECK_Y = SKY_HARBOR.deckY;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Sky Dock
/**
 * Summary: Builds the renovated Sky Dock, Hoverbike Merchant Shop, and Moored Airship into `group`.
 */
export function buildSkyDock(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  group: THREE.Group
): ISkyDockVisual {
  // 1. Raised Stone-Curbed Timber Quay Apron (sits cleanly at DECK_Y + 0.06..0.09, eliminating all z-fighting)
  const apronCx = 804.5;
  const apronCz = -8.5;
  const apronW = 15.6;
  const apronD = 11.6;
  group.add(
    boxMesh(box, mats.stone, apronCx, DECK_Y + 0.035, apronCz, apronW + 0.8, 0.07, apronD + 0.8),
    boxMesh(box, mats.darkStone, apronCx, DECK_Y + 0.055, apronCz - apronD / 2 - 0.2, apronW + 0.8, 0.12, 0.42),
    boxMesh(box, mats.darkStone, apronCx, DECK_Y + 0.055, apronCz + apronD / 2 + 0.2, apronW + 0.8, 0.12, 0.42),
    boxMesh(box, mats.darkStone, apronCx - apronW / 2 - 0.2, DECK_Y + 0.055, apronCz, 0.42, 0.12, apronD + 0.4)
  );
  const plankCount = 12;
  const plankSpanX = apronW / plankCount;
  for (let i = 0; i < plankCount; i++) {
    const px = apronCx - apronW / 2 + (i + 0.5) * plankSpanX;
    group.add(
      boxMesh(
        box,
        i % 2 === 0 ? mats.wood : mats.darkWood,
        px,
        DECK_Y + 0.068,
        apronCz,
        plankSpanX * 0.92,
        0.06,
        apronD - 0.2
      )
    );
  }

  // 2. Renovated Pier Deck & Cliff-Anchored Cantilever Understructure (replacing floating vertical posts)
  const pier = SKY_DOCK_PIER;
  const pierCx = (pier.minX + pier.maxX) / 2;
  const pierCz = (pier.minZ + pier.maxZ) / 2;
  const pierLen = pier.maxX - pier.minX;
  const pierW = pier.maxZ - pier.minZ;

  group.add(
    deckSlab(box, mats.wood, pier, 0.42),
    // Stone quay threshold & heavy cliff-edge masonry abutment wall anchored into Sky Harbor's eastern cliff face
    boxMesh(box, mats.stone, pier.minX + 0.3, DECK_Y + 0.06, pierCz, 1.2, 0.14, pierW + 0.8),
    boxMesh(box, mats.darkStone, pier.minX + 2.2, DECK_Y - 4.2, pierCz, 5.2, 8.0, pierW + 1.4),
    boxMesh(box, mats.stone, pier.minX + 3.0, DECK_Y - 1.6, pierCz, 4.4, 2.6, pierW + 1.8),
    // Twin longitudinal timber-and-brass keel girders running beneath the pier
    boxMesh(box, mats.darkWood, pierCx, DECK_Y - 0.65, pier.minZ + 0.55, pierLen + 0.4, 0.55, 0.55),
    boxMesh(box, mats.darkWood, pierCx, DECK_Y - 0.65, pier.maxZ - 0.55, pierLen + 0.4, 0.55, 0.55),
    boxMesh(box, mats.gold, pierCx, DECK_Y - 0.38, pier.minZ + 0.55, pierLen + 0.5, 0.1, 0.62),
    boxMesh(box, mats.gold, pierCx, DECK_Y - 0.38, pier.maxZ - 0.55, pierLen + 0.5, 0.1, 0.62)
  );

  // Cross-ties + 3 pairs of angled diagonal cantilever struts anchored back into the solid island cliff wall!
  const strutGeo = new THREE.BoxGeometry(1, 0.48, 0.48);
  const buoyCrystalGeo = new THREE.OctahedronGeometry(0.85, 0);
  buoyCrystalGeo.scale(1, 1.6, 1);
  const buoyRingGeo = new THREE.TorusGeometry(1.25, 0.1, 8, 24);
  buoyRingGeo.rotateX(Math.PI / 2);
  ctx.disposableGeometries.push(strutGeo, buoyCrystalGeo, buoyRingGeo);

  for (let x = pier.minX + 3.0; x <= pier.maxX - 1.0; x += 4.2) {
    group.add(boxMesh(box, mats.darkWood, x, DECK_Y - 0.62, pierCz, 0.45, 0.48, pierW - 0.4));
  }

  for (const [topX, botY] of [
    [822.5, DECK_Y - 4.6],
    [828.5, DECK_Y - 6.4],
    [834.5, DECK_Y - 8.2],
  ] as const) {
    const anchorX = 813.8;
    const topY = DECK_Y - 0.65;
    const dx = topX - anchorX;
    const dy = topY - botY;
    const strutLen = Math.hypot(dx, dy);
    const tiltZ = Math.atan2(dy, dx);
    for (const zSide of [pier.minZ + 0.55, pier.maxZ - 0.55]) {
      const strut = new THREE.Mesh(strutGeo, mats.darkWood);
      strut.scale.set(strutLen, 1, 1);
      strut.position.set((anchorX + topX) / 2, (botY + topY) / 2, zSide);
      strut.rotation.z = tiltZ;
      const collar = new THREE.Mesh(strutGeo, mats.gold);
      collar.scale.set(0.55, 1.18, 1.18);
      collar.position.set((anchorX + topX) / 2, (botY + topY) / 2, zSide);
      collar.rotation.z = tiltZ;
      group.add(strut, collar);
    }
  }

  // Glowing Aether Buoyancy Crystal Cradle under the outer pier head
  const buoyCrystal = new THREE.Mesh(buoyCrystalGeo, mats.crystal);
  buoyCrystal.position.set(pier.maxX - 2.2, DECK_Y - 2.1, pierCz);
  const buoyRing = new THREE.Mesh(buoyRingGeo, mats.gold);
  buoyRing.position.set(pier.maxX - 2.2, DECK_Y - 2.1, pierCz);
  group.add(buoyCrystal, buoyRing);

  // Ornate brass-and-timber mooring bollards & dockside lantern posts
  for (const px of [820.0, 832.0]) {
    group.add(
      boxMesh(box, mats.darkWood, px, DECK_Y + 0.5, -5.6, 0.5, 1.0, 0.5),
      boxMesh(box, mats.gold, px, DECK_Y + 1.02, -5.6, 0.62, 0.14, 0.62)
    );
  }
  for (const [lx, lz] of [
    [812.5, pier.minZ + 0.35],
    [812.5, pier.maxZ - 0.35],
    [835.2, pier.minZ + 0.35],
  ] as const) {
    group.add(
      boxMesh(box, mats.darkWood, lx, DECK_Y + 1.25, lz, 0.24, 2.5, 0.24),
      boxMesh(box, mats.gold, lx, DECK_Y + 2.55, lz, 0.44, 0.14, 0.44),
      boxMesh(box, mats.lanternGlow, lx, DECK_Y + 2.82, lz, 0.34, 0.42, 0.34)
    );
  }

  // Cargo crates & crane
  for (const c of DOCK_CRATES) {
    group.add(boxMesh(box, mats.darkWood, c.x, c.top - 0.55, c.z, 1.2, 1.1, 1.2, 0.1));
    group.add(boxMesh(box, mats.gold, c.x, c.top - 0.55, c.z, 1.24, 0.14, 1.24, 0.1));
  }
  const c = DOCK_CRANE;
  group.add(boxMesh(box, mats.darkStone, c.x, DECK_Y + 0.6, c.z, 2.0, 1.2, 2.0));
  group.add(boxMesh(box, mats.darkWood, c.x, DECK_Y + c.height / 2, c.z, 0.7, c.height, 0.7));
  group.add(boxMesh(box, mats.darkWood, c.x + 4.0, DECK_Y + c.height - 0.3, c.z + 2.5, 9.0, 0.5, 0.5, -0.56));
  addRope(group, mats.rope, ctx, [
    new THREE.Vector3(c.x + 7.6, DECK_Y + c.height - 0.3, c.z + 4.8),
    new THREE.Vector3(c.x + 7.6, DECK_Y + 3.5, c.z + 4.8),
  ]);
  group.add(boxMesh(box, mats.gold, c.x + 7.6, DECK_Y + 3.3, c.z + 4.8, 0.4, 0.5, 0.4));

  // 3. Steampunk/Fantasy Netted Hot-Air Balloons
  const balloonGeo = new THREE.SphereGeometry(2.3, 18, 14);
  balloonGeo.scale(1, 1.22, 1);
  const netRingGeo = new THREE.TorusGeometry(2.32, 0.05, 6, 24);
  const portholeGeo = new THREE.CircleGeometry(0.45, 14);
  ctx.disposableGeometries.push(balloonGeo, netRingGeo, portholeGeo);

  const balloons: THREE.Object3D[] = [];
  for (const [bx, bz, h] of [
    [797.0, -19.5, 12.5],
    [801.0, -2.5, 14.5],
  ] as const) {
    const bGroup = new THREE.Group();
    bGroup.position.set(bx, DECK_Y + h, bz);
    bGroup.userData.baseY = DECK_Y + h;

    const envelope = new THREE.Mesh(balloonGeo, mats.canvas);
    bGroup.add(envelope);
    for (let r = 0; r < 4; r++) {
      const net = new THREE.Mesh(netRingGeo, mats.darkWood);
      net.rotation.y = (r / 4) * Math.PI;
      bGroup.add(net);
    }
    const burner = boxMesh(box, mats.lanternGlow, 0, -3.1, 0, 0.65, 0.65, 0.65);
    const gondola = boxMesh(box, mats.darkWood, 0, -4.6, 0, 2.2, 1.1, 1.3);
    const porthole = new THREE.Mesh(portholeGeo, mats.crystal);
    porthole.position.set(0, -4.55, 0.68);
    bGroup.add(burner, gondola, porthole);

    group.add(bGroup);
    balloons.push(bGroup);
    addRope(group, mats.rope, ctx, [new THREE.Vector3(bx, DECK_Y, bz), new THREE.Vector3(bx, DECK_Y + h - 4.8, bz)]);
  }

  // 4. Renovated Royal Celestial Sky-Galleon Airship & Stepped Gangplank
  const { airship, propellers } = buildMooredAirship(ctx, mats, box, portholeGeo);
  group.add(airship);

  const g = AIRSHIP_GANGPLANK;
  const len = Math.hypot(g.bz - g.az, g.by - g.ay);
  const rampPitch = -Math.atan2(g.by - g.ay, g.bz - g.az);
  const gangGroup = new THREE.Group();
  gangGroup.position.set(g.ax, (g.ay + g.by) / 2 - 0.08, (g.az + g.bz) / 2);
  gangGroup.rotation.x = rampPitch;
  gangGroup.add(
    boxMesh(box, mats.wood, 0, 0, 0, g.halfWidth * 2, 0.18, len),
    boxMesh(box, mats.darkWood, -g.halfWidth + 0.1, 0.12, 0, 0.18, 0.14, len),
    boxMesh(box, mats.darkWood, g.halfWidth - 0.1, 0.12, 0, 0.18, 0.14, len)
  );
  for (let cl = -3; cl <= 3; cl++) {
    gangGroup.add(boxMesh(box, mats.gold, 0, 0.1, (cl / 4) * len * 0.85, g.halfWidth * 1.75, 0.05, 0.12));
  }
  group.add(gangGroup);
  for (const side of [-1, 1]) {
    const rx = g.ax + side * (g.halfWidth - 0.1);
    addRope(group, mats.rope, ctx, [
      new THREE.Vector3(rx, g.ay + 0.95, g.az),
      new THREE.Vector3(rx, (g.ay + g.by) / 2 + 0.82, (g.az + g.bz) / 2),
      new THREE.Vector3(rx, g.by + 0.95, g.bz),
    ]);
  }
  for (const px of [820.0, 832.0]) {
    addRope(group, mats.rope, ctx, [
      new THREE.Vector3(px, DECK_Y + 0.9, -5.6),
      new THREE.Vector3(px, MOORED_AIRSHIP_DECK.y + 0.5, MOORED_AIRSHIP_DECK.minZ),
    ]);
  }

  // 5. Sky-Bike / Hoverbike Merchant Shop ("חנות אופנועי אוויר") in the Dock Plaza
  const { hoverbikes, merchantNpc } = buildHoverbikeShop(ctx, mats, box, group);

  return { airship, propellers, balloons, hoverbikes, merchantNpc };
}
// #endregion

// ======================== MOORED ROYAL SKY-GALLEON ======================== \\
// #region Moored Airship
function buildMooredAirship(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  portholeGeo: THREE.CircleGeometry
): { airship: THREE.Group; propellers: THREE.Mesh[] } {
  const d = MOORED_AIRSHIP_DECK;
  const cx = (d.minX + d.maxX) / 2;
  const cz = (d.minZ + d.maxZ) / 2;
  const halfLen = (d.maxX - d.minX) / 2;
  const halfW = (d.maxZ - d.minZ) / 2;

  const airship = new THREE.Group();
  airship.name = 'moored-airship';

  const hullGeo = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const envelopeGeo = new THREE.SphereGeometry(1, 32, 20);
  const beltGeo = new THREE.TorusGeometry(1, 0.032, 8, 28);
  beltGeo.rotateY(Math.PI / 2);
  const bowspritGeo = new THREE.ConeGeometry(0.32, 5.2, 10);
  bowspritGeo.rotateZ(Math.PI / 2);
  const nacelleGeo = new THREE.CylinderGeometry(0.55, 0.42, 3.2, 14);
  nacelleGeo.rotateZ(Math.PI / 2);
  const helmRingGeo = new THREE.TorusGeometry(0.52, 0.06, 8, 18);
  helmRingGeo.rotateY(Math.PI / 2);
  const bladeGeo = new THREE.BoxGeometry(0.12, 3.4, 0.38);
  ctx.disposableGeometries.push(hullGeo, envelopeGeo, beltGeo, bowspritGeo, nacelleGeo, helmRingGeo, bladeGeo);

  const royalBlueMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    emissive: 0x172554,
    emissiveIntensity: 0.25,
    roughness: 0.45,
    metalness: 0.3,
  });
  ctx.disposableMaterials.push(royalBlueMat);

  // 1. Sculpted multi-layered wooden hull + golden strakes + keel fin
  const hull = new THREE.Mesh(hullGeo, mats.darkWood);
  hull.scale.set(halfLen + 1.2, 4.4, halfW + 0.65);
  hull.position.set(cx, d.y - 0.15, cz);
  const upperHull = new THREE.Mesh(hullGeo, mats.wood);
  upperHull.scale.set(halfLen + 1.35, 1.6, halfW + 0.78);
  upperHull.position.set(cx, d.y + 0.05, cz);
  const goldTrimHull = new THREE.Mesh(hullGeo, mats.gold);
  goldTrimHull.scale.set(halfLen + 1.42, 0.55, halfW + 0.84);
  goldTrimHull.position.set(cx, d.y + 0.12, cz);

  airship.add(
    hull,
    upperHull,
    goldTrimHull,
    deckSlab(box, mats.wood, d, 0.34),
    // Deep ventral keel beam under the hull
    boxMesh(box, mats.darkWood, cx, d.y - 4.3, cz, halfLen * 1.45, 0.7, 0.45),
    boxMesh(box, mats.gold, cx, d.y - 4.65, cz, halfLen * 1.48, 0.16, 0.52)
  );

  // Glowing side portholes framed in brass along port & starboard hull flanks
  for (const px of [cx - 6.5, cx - 3.2, cx, cx + 3.2, cx + 6.5]) {
    for (const side of [-1, 1]) {
      const port = new THREE.Mesh(portholeGeo, mats.lanternGlow);
      port.scale.setScalar(0.85);
      port.position.set(px, d.y - 1.1, cz + side * (halfW + 0.58));
      port.rotation.y = side > 0 ? 0 : Math.PI;
      airship.add(port);
    }
  }

  // 2. Ornate Bow Forecastle, Golden Bowsprit & Winged Celestial Figurehead (at minX)
  const bowX = d.minX - 0.8;
  const bowsprit = new THREE.Mesh(bowspritGeo, mats.gold);
  bowsprit.position.set(bowX - 2.1, d.y + 0.55, cz);
  bowsprit.rotation.z = -0.22;
  const figurehead = boxMesh(box, mats.gold, bowX - 0.5, d.y - 0.35, cz, 1.4, 1.1, 0.55);
  const figureWingL = boxMesh(box, mats.gold, bowX - 0.2, d.y + 0.1, cz - 0.65, 1.2, 0.55, 0.12, 0.35);
  const figureWingR = boxMesh(box, mats.gold, bowX - 0.2, d.y + 0.1, cz + 0.65, 1.2, 0.55, 0.12, -0.35);
  const bowCrystal = boxMesh(box, mats.crystal, bowX - 1.35, d.y - 0.15, cz, 0.55, 0.55, 0.55);
  airship.add(bowsprit, figurehead, figureWingL, figureWingR, bowCrystal);

  // Main deck cargo hatch & brass cleats
  airship.add(
    boxMesh(box, mats.darkWood, cx - 3.2, d.y + 0.12, cz, 3.2, 0.22, 2.6),
    boxMesh(box, mats.gold, cx - 3.2, d.y + 0.24, cz, 3.3, 0.06, 2.7)
  );

  // 3. Aft Captain's Cabin, Mullioned Stern Windows & Quarterdeck Helm (`x = 833.5`)
  const cabX = 833.5;
  const cabH = 2.6;
  airship.add(
    boxMesh(box, mats.wood, cabX, d.y + cabH / 2, cz, 5.0, cabH, 4.8),
    boxMesh(box, mats.darkWood, cabX, d.y + 0.2, cz, 5.2, 0.4, 5.0),
    boxMesh(box, mats.gold, cabX, d.y + cabH + 0.12, cz, 5.45, 0.24, 5.25),
    boxMesh(box, royalBlueMat, cabX, d.y + cabH + 0.34, cz, 5.1, 0.22, 4.9),
    // Stern panoramic glowing gallery windows + side cabin windows
    boxMesh(box, mats.lanternGlow, cabX + 2.52, d.y + 1.48, cz, 0.08, 1.05, 3.4),
    boxMesh(box, mats.gold, cabX + 2.55, d.y + 1.48, cz - 0.65, 0.1, 1.12, 0.12),
    boxMesh(box, mats.gold, cabX + 2.55, d.y + 1.48, cz + 0.65, 0.1, 1.12, 0.12),
    boxMesh(box, mats.lanternGlow, cabX, d.y + 1.48, cz - 2.42, 2.8, 0.9, 0.08),
    boxMesh(box, mats.lanternGlow, cabX, d.y + 1.48, cz + 2.42, 2.8, 0.9, 0.08),
    // Twin stern gallery lanterns
    boxMesh(box, mats.lanternGlow, cabX + 2.65, d.y + 2.35, cz - 1.9, 0.38, 0.52, 0.38),
    boxMesh(box, mats.lanternGlow, cabX + 2.65, d.y + 2.35, cz + 1.9, 0.38, 0.52, 0.38)
  );

  // Captain's Helm Wheel & Binnacle Compass on the Quarterdeck Roof (`y = d.y + cabH + 0.45`)
  const qDeckY = d.y + cabH + 0.45;
  const helmStand = boxMesh(box, mats.darkWood, cabX - 1.2, qDeckY + 0.55, cz, 0.35, 1.1, 0.35);
  const helmWheel = new THREE.Mesh(helmRingGeo, mats.gold);
  helmWheel.position.set(cabX - 1.42, qDeckY + 0.95, cz);
  const binnacle = boxMesh(box, mats.gold, cabX - 1.95, qDeckY + 0.45, cz, 0.32, 0.9, 0.32);
  const compassGlow = boxMesh(box, mats.crystal, cabX - 1.95, qDeckY + 0.96, cz, 0.26, 0.18, 0.26);
  airship.add(helmStand, helmWheel, binnacle, compassGlow);

  // 4. Mainmast, Crow's Nest & Colossal Ribbed Dirigible Gas Envelope (`y = d.y + 13.8`)
  const mastX = 826.0;
  airship.add(
    boxMesh(box, mats.darkWood, mastX, d.y + 5.5, cz, 0.8, 11.0, 0.8),
    boxMesh(box, mats.gold, mastX, d.y + 8.2, cz, 1.8, 0.28, 1.8),
    boxMesh(box, mats.darkWood, mastX, d.y + 8.65, cz, 1.6, 0.65, 1.6)
  );

  const envY = d.y + 13.8;
  const envelope = new THREE.Mesh(envelopeGeo, mats.canvas);
  envelope.scale.set(13.8, 4.4, 5.4);
  envelope.position.set(cx, envY, cz);
  const envStripe = new THREE.Mesh(envelopeGeo, royalBlueMat);
  envStripe.scale.set(13.88, 1.35, 5.48);
  envStripe.position.set(cx, envY, cz);
  airship.add(envelope, envStripe);

  // Nose cone & tail stabilizer fins on the dirigible envelope
  airship.add(
    boxMesh(box, mats.gold, cx - 13.8, envY, cz, 1.2, 0.8, 0.8),
    // Dorsal, ventral, port & starboard tail fins at the stern of the balloon
    boxMesh(box, royalBlueMat, cx + 11.6, envY + 2.8, cz, 3.8, 2.4, 0.18, 0),
    boxMesh(box, mats.gold, cx + 11.6, envY + 4.05, cz, 3.9, 0.16, 0.24, 0),
    boxMesh(box, royalBlueMat, cx + 11.6, envY, cz - 4.4, 3.6, 0.18, 2.2, 0),
    boxMesh(box, royalBlueMat, cx + 11.6, envY, cz + 4.4, 3.6, 0.18, 2.2, 0)
  );

  // 5 Golden harness belts around the airship envelope
  for (const ox of [-8.0, -4.0, 0, 4.0, 8.0]) {
    const rScale = 1 - (ox / 15.5) ** 2;
    const belt = new THREE.Mesh(beltGeo, mats.gold);
    belt.scale.set(5.42 * Math.sqrt(rScale), 4.42 * Math.sqrt(rScale), 1);
    belt.position.set(cx + ox, envY, cz);
    airship.add(belt);
  }

  // Suspension rigging cables from hull to envelope
  for (const [ox, oz] of [
    [-9.5, -2.7],
    [-9.5, 2.7],
    [-4.5, -3.1],
    [-4.5, 3.1],
    [0, -3.3],
    [0, 3.3],
    [4.5, -3.1],
    [4.5, 3.1],
    [9.5, -2.7],
    [9.5, 2.7],
  ] as const) {
    addRope(airship, mats.rope, ctx, [
      new THREE.Vector3(cx + ox, d.y + 0.9, cz + oz * 0.88),
      new THREE.Vector3(cx + ox * 0.95, envY - 2.6, cz + oz),
    ]);
  }

  // 5. Twin Articulated Brass Outrigger Engine Nacelles & Multi-Blade Propellers
  const propellers: THREE.Mesh[] = [];
  for (const oz of [-4.4, 4.4]) {
    const nacX = cx - 2.5;
    const nacY = d.y + 0.85;
    const nacZ = cz + oz;
    // Outrigger strut connecting hull to engine nacelle
    airship.add(
      boxMesh(box, mats.darkWood, nacX, nacY, cz + oz * 0.65, 0.55, 0.35, 2.8),
      boxMesh(box, mats.gold, nacX, nacY, cz + oz * 0.65, 0.62, 0.42, 0.8)
    );
    const nacelle = new THREE.Mesh(nacelleGeo, mats.gold);
    nacelle.position.set(nacX, nacY, nacZ);
    const turbineGlow = boxMesh(box, mats.crystal, nacX + 1.62, nacY, nacZ, 0.25, 0.58, 0.58);
    airship.add(nacelle, turbineGlow);

    const prop = new THREE.Mesh(bladeGeo, mats.gold);
    prop.position.set(nacX - 1.72, nacY, nacZ);
    const crossBlade = new THREE.Mesh(bladeGeo, mats.gold);
    crossBlade.rotation.x = Math.PI / 2;
    prop.add(crossBlade);
    airship.add(prop);
    propellers.push(prop);
  }

  return { airship, propellers };
}
// #endregion

// ======================== HOVERBIKE / SKY-BIKE MERCHANT SHOP ======================== \\
// #region Hoverbike Emporium
/**
 * Summary: Builds the Sky-Bike / Hoverbike Merchant Stall ("סדנת אופנועי אוויר") in the dock area
 *          with a friendly Aviator Mechanic NPC and 2 hovering aero-cycles on display pads.
 */
function buildHoverbikeShop(
  ctx: IWorldModelBuildContext,
  mats: IHarborMaterials,
  box: THREE.BoxGeometry,
  group: THREE.Group
): { hoverbikes: THREE.Group[]; merchantNpc: THREE.Group } {
  const shopRoot = new THREE.Group();
  shopRoot.name = 'sky-hoverbike-shop';
  // Positioned on the dockside plaza just west of the crane, facing North-East toward the dock apron
  shopRoot.position.set(792.5, DECK_Y, -14.8);
  shopRoot.rotation.y = 0.38;

  const hoverRingGeo = new THREE.TorusGeometry(0.56, 0.09, 8, 24);
  hoverRingGeo.rotateX(Math.PI / 2);
  const padRingGeo = new THREE.TorusGeometry(1.65, 0.08, 8, 28);
  padRingGeo.rotateX(Math.PI / 2);
  const fuselageGeo = new THREE.CylinderGeometry(0.28, 0.36, 2.2, 12);
  fuselageGeo.rotateZ(Math.PI / 2);
  const noseConeGeo = new THREE.ConeGeometry(0.32, 0.85, 12);
  noseConeGeo.rotateZ(Math.PI / 2);
  const headGeo = new THREE.SphereGeometry(0.24, 12, 10);
  const torsoGeo = new THREE.CylinderGeometry(0.32, 0.26, 0.92, 10);
  ctx.disposableGeometries.push(hoverRingGeo, padRingGeo, fuselageGeo, noseConeGeo, headGeo, torsoGeo);

  const aeroCobaltMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.35,
    roughness: 0.22,
    metalness: 0.78,
  });
  const aeroCrimsonMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0x991b1b,
    emissiveIntensity: 0.3,
    roughness: 0.24,
    metalness: 0.75,
  });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.65 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.55 });
  ctx.disposableMaterials.push(aeroCobaltMat, aeroCrimsonMat, leatherMat, skinMat);

  // 1. Workshop Pavilion Platform, Timber Posts, Vaulted Canopy Roof & Counter
  shopRoot.add(
    // Stepped stone & timber workshop floor
    boxMesh(box, mats.stone, 0, 0.06, 0, 7.2, 0.12, 4.6),
    boxMesh(box, mats.wood, 0, 0.14, 0, 6.8, 0.08, 4.2),
    // 4 Corner timber-and-brass pillars
    boxMesh(box, mats.darkWood, -3.1, 1.85, -1.8, 0.28, 3.5, 0.28),
    boxMesh(box, mats.darkWood, 3.1, 1.85, -1.8, 0.28, 3.5, 0.28),
    boxMesh(box, mats.darkWood, -3.1, 1.85, 1.8, 0.28, 3.5, 0.28),
    boxMesh(box, mats.darkWood, 3.1, 1.85, 1.8, 0.28, 3.5, 0.28),
    // Back workshop tool-wall & spare aether-turbine shelf
    boxMesh(box, mats.darkWood, 0, 1.65, -1.85, 6.2, 2.8, 0.22),
    boxMesh(box, mats.gold, 0, 2.2, -1.7, 5.4, 0.12, 0.35),
    boxMesh(box, mats.crystal, -1.8, 2.48, -1.68, 0.38, 0.44, 0.28),
    boxMesh(box, mats.crystal, 1.8, 2.48, -1.68, 0.38, 0.44, 0.28),
    // Stepped canopy roof with golden cornice & glowing sign board
    boxMesh(box, mats.darkWood, 0, 3.65, 0, 7.6, 0.28, 5.0),
    boxMesh(box, mats.canvas, 0, 3.98, 0, 7.1, 0.42, 4.5),
    boxMesh(box, mats.gold, 0, 4.28, 0, 5.8, 0.22, 3.2),
    // Front sales counter with brass trim & glowing crystal ledger
    boxMesh(box, mats.darkWood, -0.6, 0.68, 1.25, 4.2, 1.05, 0.78),
    boxMesh(box, mats.gold, -0.6, 1.22, 1.25, 4.35, 0.1, 0.88),
    boxMesh(box, mats.crystal, -1.6, 1.38, 1.25, 0.45, 0.24, 0.35),
    // Hanging warm workshop lanterns
    boxMesh(box, mats.lanternGlow, -2.8, 3.25, 1.8, 0.32, 0.44, 0.32),
    boxMesh(box, mats.lanternGlow, 2.8, 3.25, 1.8, 0.32, 0.44, 0.32)
  );

  // Rooftop Iconic Hoverbike Sign Emblem above the shop entrance
  const signBoard = boxMesh(box, mats.darkStone, 0, 4.35, 2.38, 3.8, 0.78, 0.18);
  const signBorder = boxMesh(box, mats.gold, 0, 4.35, 2.39, 3.95, 0.88, 0.14);
  const signBikeIcon = new THREE.Mesh(fuselageGeo, mats.gold);
  signBikeIcon.scale.set(0.55, 0.55, 0.55);
  signBikeIcon.position.set(0, 4.38, 2.5);
  const signWheelF = new THREE.Mesh(hoverRingGeo, mats.crystal);
  signWheelF.scale.setScalar(0.52);
  signWheelF.rotation.x = Math.PI / 2;
  signWheelF.position.set(-0.68, 4.22, 2.5);
  const signWheelR = new THREE.Mesh(hoverRingGeo, mats.crystal);
  signWheelR.scale.setScalar(0.52);
  signWheelR.rotation.x = Math.PI / 2;
  signWheelR.position.set(0.68, 4.22, 2.5);
  shopRoot.add(signBoard, signBorder, signBikeIcon, signWheelF, signWheelR);

  // 2. Friendly Sky-Mechanic Merchant NPC behind the counter
  const merchantNpc = new THREE.Group();
  merchantNpc.position.set(-0.4, 0.18, 0.25);
  const legs = boxMesh(box, leatherMat, 0, 0.42, 0, 0.42, 0.84, 0.28);
  const torso = new THREE.Mesh(torsoGeo, aeroCobaltMat);
  torso.position.y = 1.22;
  const apron = boxMesh(box, leatherMat, 0, 1.15, 0.16, 0.48, 0.78, 0.08);
  const shoulders = boxMesh(box, mats.gold, 0, 1.58, 0, 0.76, 0.18, 0.34);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 1.92;
  // Aviator helmet & glowing brass goggles on forehead
  const cap = boxMesh(box, leatherMat, 0, 2.08, -0.02, 0.46, 0.22, 0.46);
  const goggles = boxMesh(box, mats.crystal, 0, 2.04, 0.22, 0.38, 0.12, 0.1);
  const rightArm = boxMesh(box, aeroCobaltMat, -0.44, 1.38, 0.18, 0.18, 0.62, 0.18, 0.3);
  const leftArm = boxMesh(box, aeroCobaltMat, 0.44, 1.25, 0.22, 0.18, 0.62, 0.18, -0.4);
  merchantNpc.add(legs, torso, apron, shoulders, head, cap, goggles, rightArm, leftArm);
  shopRoot.add(merchantNpc);

  // 3. Two Hovering Sky-Bikes / Aero-Cycles (אופנועי אוויר) on Glowing Display Pads beside the Shop
  const hoverbikes: THREE.Group[] = [];
  const bikeSpecs: ReadonlyArray<{
    readonly x: number;
    readonly z: number;
    readonly yaw: number;
    readonly mat: THREE.Material;
  }> = [
    { x: -2.2, z: 3.9, yaw: 0.32, mat: aeroCobaltMat },
    { x: 2.3, z: 3.9, yaw: -0.28, mat: aeroCrimsonMat },
  ];

  for (const spec of bikeSpecs) {
    // Glowing circular repulsor display pad on the ground
    const padBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.65, 1.82, 0.14, 24),
      mats.darkStone
    );
    ctx.disposableGeometries.push(padBase.geometry);
    padBase.position.set(spec.x, 0.07, spec.z);
    const padRing = new THREE.Mesh(padRingGeo, mats.crystal);
    padRing.position.set(spec.x, 0.15, spec.z);
    shopRoot.add(padBase, padRing);

    // The Hoverbike ("אופנוע אוויר") assembly hovering above the pad
    const bike = new THREE.Group();
    bike.position.set(spec.x, 0.92, spec.z);
    bike.rotation.y = spec.yaw;
    bike.userData.baseY = 0.92;

    // Aerodynamic fuselage & front nose cone
    const body = new THREE.Mesh(fuselageGeo, spec.mat);
    const nose = new THREE.Mesh(noseConeGeo, mats.gold);
    nose.position.set(-1.45, 0.04, 0);
    // Sculpted leather saddle & backrest
    const saddle = boxMesh(box, leatherMat, 0.15, 0.32, 0, 0.95, 0.18, 0.46);
    const backrest = boxMesh(box, leatherMat, 0.62, 0.48, 0, 0.18, 0.28, 0.44);
    // Swept-back brass handlebars, instrument dash & crystal windshield
    const stem = boxMesh(box, mats.gold, -0.68, 0.42, 0, 0.14, 0.48, 0.14, 0);
    const handlebars = boxMesh(box, mats.gold, -0.58, 0.64, 0, 0.14, 0.1, 1.15);
    const gripsL = boxMesh(box, leatherMat, -0.52, 0.64, -0.58, 0.24, 0.12, 0.16);
    const gripsR = boxMesh(box, leatherMat, -0.52, 0.64, 0.58, 0.24, 0.12, 0.16);
    const windshield = boxMesh(box, mats.crystal, -0.92, 0.52, 0, 0.45, 0.38, 0.52);
    windshield.rotation.z = -0.55;

    // Twin front & rear glowing Repulsor Levitation Rings (hover-wheels) + angled aero-forks
    const frontFork = boxMesh(box, mats.gold, -1.15, -0.18, 0, 0.85, 0.14, 0.36);
    frontFork.rotation.z = 0.38;
    const rearFork = boxMesh(box, mats.gold, 1.05, -0.18, 0, 0.85, 0.14, 0.36);
    rearFork.rotation.z = -0.35;

    const frontRepulsor = new THREE.Mesh(hoverRingGeo, mats.crystal);
    frontRepulsor.position.set(-1.38, -0.34, 0);
    const frontRim = new THREE.Mesh(hoverRingGeo, mats.gold);
    frontRim.scale.setScalar(1.14);
    frontRim.position.set(-1.38, -0.34, 0);

    const rearRepulsor = new THREE.Mesh(hoverRingGeo, mats.crystal);
    rearRepulsor.scale.setScalar(1.15);
    rearRepulsor.position.set(1.28, -0.34, 0);
    const rearRim = new THREE.Mesh(hoverRingGeo, mats.gold);
    rearRim.scale.setScalar(1.28);
    rearRim.position.set(1.28, -0.34, 0);

    // Twin rear brass jet thrusters with glowing plasma cores
    for (const tz of [-0.32, 0.32]) {
      bike.add(
        boxMesh(box, mats.gold, 1.05, 0.12, tz, 0.78, 0.22, 0.22),
        boxMesh(box, mats.lanternGlow, 1.48, 0.12, tz, 0.16, 0.18, 0.18)
      );
    }

    bike.add(
      body,
      nose,
      saddle,
      backrest,
      stem,
      handlebars,
      gripsL,
      gripsR,
      windshield,
      frontFork,
      rearFork,
      frontRepulsor,
      frontRim,
      rearRepulsor,
      rearRim
    );
    shopRoot.add(bike);
    hoverbikes.push(bike);
  }

  group.add(shopRoot);
  return { hoverbikes, merchantNpc };
}
// #endregion

