// ============================================================================
// MODULE: World / Models / Placed Trap 3D Models
// DESIGN: Procedural Three.js meshes for placed hunting traps & Trapper's Workbench (SRP)
// SUMMARY: Builds detailed 3D meshes for Small Cage Trap, Wire Snare, Bear Jaw Trap,
//          Baited Bird Net Trap, Woven Fish Trap, Bear Paw Clamped Trap, and Trapper's Workbench.
// ============================================================================

import * as THREE from 'three';
import type { IPlacedTrap, TrapKind } from '../systems/animalTrapsSystem';

/**
 * Summary: Builds a 3D mesh for a caught squirrel or rabbit inside a Cage Trap or Wire Snare.
 */
function buildCaughtSmallCritterMesh(species: string | undefined): THREE.Group {
  const critterGroup = new THREE.Group();
  const isSquirrel = species === 'squirrel';
  const furMat = new THREE.MeshStandardMaterial({
    color: isSquirrel ? 0x9a4b26 : 0x7c583b,
    roughness: 0.9,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: isSquirrel ? 0xe7c8a0 : 0xd6c7b2,
    roughness: 0.9,
  });

  // Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), furMat);
  body.scale.set(0.95, 0.85, 1.35);
  body.position.set(0, 0.12, 0);
  body.castShadow = true;
  critterGroup.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), furMat);
  head.position.set(0, 0.19, 0.14);
  head.castShadow = true;
  critterGroup.add(head);

  if (isSquirrel) {
    // Rounded squirrel ears
    for (const ex of [-0.045, 0.045]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), furMat);
      ear.scale.set(0.7, 1.3, 0.6);
      ear.position.set(ex, 0.27, 0.13);
      critterGroup.add(ear);
    }
    // Large bushy S-curved squirrel tail
    const tailLow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), furMat);
    tailLow.scale.set(0.85, 1.45, 0.95);
    tailLow.position.set(0, 0.21, -0.17);
    tailLow.rotation.x = 0.35;
    critterGroup.add(tailLow);

    const tailHigh = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), furMat);
    tailHigh.scale.set(0.9, 1.35, 0.9);
    tailHigh.position.set(0, 0.33, -0.19);
    tailHigh.rotation.x = -0.25;
    critterGroup.add(tailHigh);
  } else {
    // Long upright rabbit ears
    for (const ex of [-0.038, 0.038]) {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, 0.13, 8), furMat);
      ear.position.set(ex, 0.29, 0.13);
      ear.rotation.z = ex * -1.4;
      critterGroup.add(ear);
    }
    // Cotton tail
    const cottonTail = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), bellyMat);
    cottonTail.position.set(0, 0.13, -0.18);
    critterGroup.add(cottonTail);
  }

  return critterGroup;
}

/**
 * Summary: Builds a 3D mesh for a Small Cage Trap (wooden slatted box with drop door and caught critter visual).
 */
function buildCageTrapMesh(trap: IPlacedTrap): THREE.Group {
  const isSprung = trap.status === 'sprung' || Boolean(trap.sprung);
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x432818, roughness: 0.9 });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.7,
    roughness: 0.35,
  });
  const baitMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
  const seedMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });

  // Base floor plank
  const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.05, 0.92), darkWoodMat);
  floorMesh.position.y = 0.025;
  floorMesh.castShadow = true;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // Corner posts
  const postPositions: [number, number][] = [
    [-0.31, -0.42],
    [0.31, -0.42],
    [-0.31, 0.42],
    [0.31, 0.42],
  ];
  for (const [px, pz] of postPositions) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.06), darkWoodMat);
    post.position.set(px, 0.26, pz);
    post.castShadow = true;
    group.add(post);
  }

  // Side & top wooden slats
  for (let i = -3; i <= 3; i++) {
    const zPos = i * 0.12;
    const topSlat = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.035, 0.06), woodMat);
    topSlat.position.set(0, 0.49, zPos);
    topSlat.castShadow = true;
    group.add(topSlat);
  }

  for (let h = 0; h < 3; h++) {
    const yPos = 0.14 + h * 0.14;
    const leftSlat = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.88), woodMat);
    leftSlat.position.set(-0.32, yPos, 0);
    leftSlat.castShadow = true;
    group.add(leftSlat);

    const rightSlat = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.88), woodMat);
    rightSlat.position.set(0.32, yPos, 0);
    rightSlat.castShadow = true;
    group.add(rightSlat);

    const backSlat = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.05, 0.035), woodMat);
    backSlat.position.set(0, yPos, -0.43);
    backSlat.castShadow = true;
    group.add(backSlat);
  }

  // Front trapdoor (propped open if armed, dropped shut if sprung)
  const doorGroup = new THREE.Group();
  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.42, 0.04), ironMat);
  doorMesh.castShadow = true;
  doorGroup.add(doorMesh);

  if (!isSprung) {
    doorGroup.position.set(0, 0.56, 0.54);
    doorGroup.rotation.x = -Math.PI * 0.34;
    // Prop stick
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.48, 6), woodMat);
    stick.position.set(0, 0.28, 0.44);
    stick.rotation.x = 0.22;
    group.add(stick);

    // Berry & seed bait inside
    for (let b = 0; b < 3; b++) {
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), baitMat);
      berry.position.set((b - 1) * 0.06, 0.07, -0.1 + (b % 2) * 0.05);
      group.add(berry);
    }
    for (let s = 0; s < 4; s++) {
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), seedMat);
      seed.position.set((s - 1.5) * 0.04, 0.06, 0.02);
      group.add(seed);
    }
  } else {
    doorGroup.position.set(0, 0.25, 0.43);
    doorGroup.rotation.x = 0;

    // Caught critter inside the cage!
    const critterGroup = buildCaughtSmallCritterMesh(trap.caughtSpecies);
    critterGroup.name = 'caughtCritter';
    group.add(critterGroup);
  }

  group.add(doorGroup);
  return group;
}

/**
 * Summary: Builds a 3D mesh for a Wire Snare Trap (wooden stake, bent sapling pole, wire noose, and caught critter when sprung).
 */
function buildSnareTrapMesh(trap: IPlacedTrap): THREE.Group {
  const isSprung = trap.status === 'sprung' || Boolean(trap.sprung);
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
  const wireMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.85,
    roughness: 0.2,
  });
  const berryMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
  const seedMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });

  // Driven wooden anchor stake
  const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.42, 8), woodMat);
  stake.position.set(-0.28, 0.18, 0);
  stake.rotation.z = 0.18;
  stake.castShadow = true;
  group.add(stake);

  // Sapling tension pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.85, 8), woodMat);
  if (!isSprung) {
    pole.position.set(-0.12, 0.34, 0);
    pole.rotation.z = -0.58;
  } else {
    pole.position.set(-0.22, 0.44, 0);
    pole.rotation.z = -0.12;
  }
  pole.castShadow = true;
  group.add(pole);

  // Wire snare loop
  const loopRadius = !isSprung ? 0.24 : 0.11;
  const loopMesh = new THREE.Mesh(new THREE.TorusGeometry(loopRadius, 0.012, 8, 24), wireMat);
  loopMesh.position.set(0.06, !isSprung ? 0.24 : 0.22, 0);
  loopMesh.castShadow = true;
  group.add(loopMesh);

  if (!isSprung) {
    // Scent bait cluster (berries & seeds) right beside the wire loop to lure squirrels & rabbits through the snare!
    for (let i = 0; i < 3; i++) {
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), berryMat);
      berry.position.set(0.06 + (i - 1) * 0.05, 0.03, (i % 2 === 0 ? 1 : -1) * 0.04);
      group.add(berry);
    }
    for (let i = 0; i < 3; i++) {
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), seedMat);
      seed.position.set(0.06 + (i - 1) * 0.04, 0.022, 0);
      group.add(seed);
    }
  } else {
    // Caught squirrel or rabbit held in the tightened wire snare!
    const caughtCritter = buildCaughtSmallCritterMesh(trap.caughtSpecies);
    caughtCritter.name = 'caughtCritter';
    caughtCritter.position.set(0.06, 0.04, 0);
    group.add(caughtCritter);
  }

  return group;
}

/**
 * Summary: Builds a 3D mesh for a Heavy Steel Bear Jaw Trap on the ground.
 */
function buildBearJawTrapMesh(trap: IPlacedTrap): THREE.Group {
  const isSprung = trap.status === 'sprung' || Boolean(trap.sprung);
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.85,
    roughness: 0.3,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.4,
  });
  const baitMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.65 });

  // Central trigger pan
  const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 16), steelMat);
  pan.position.y = 0.04;
  pan.castShadow = true;
  group.add(pan);

  // Meat bait on the trigger pan when armed
  if (!isSprung) {
    const meatChunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.085, 1), baitMat);
    meatChunk.scale.set(1.2, 0.65, 0.95);
    meatChunk.position.set(0, 0.08, 0);
    meatChunk.castShadow = true;
    group.add(meatChunk);
  }

  // Base frame bar
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.035, 0.14), darkIronMat);
  bar.position.y = 0.02;
  bar.castShadow = true;
  group.add(bar);

  // Two serrated half-circle jaws
  const jawAngle = !isSprung ? 0.12 : 1.25;
  for (const side of [-1, 1]) {
    const jawPivot = new THREE.Group();
    jawPivot.position.set(0, 0.04, 0);

    const jawArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.028, 8, 20, Math.PI),
      steelMat
    );
    jawArc.rotation.x = Math.PI * 0.5;
    jawArc.rotation.z = side > 0 ? 0 : Math.PI;
    jawArc.castShadow = true;
    jawPivot.add(jawArc);

    // Serrated teeth along the arc
    for (let t = 1; t <= 5; t++) {
      const ang = (t / 6) * Math.PI;
      const tx = Math.cos(ang) * 0.33;
      const tz = Math.sin(ang) * 0.33 * side;
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.075, 4), steelMat);
      tooth.position.set(tx, 0.04, tz);
      jawPivot.add(tooth);
    }

    jawPivot.rotation.x = side * jawAngle;
    group.add(jawPivot);
  }

  return group;
}

/**
 * Summary: Builds a closed steel Bear-Jaw Trap 3D mesh that clamps onto a bear's front paw
 *          and follows its leg bone movements while the bear roars on all fours!
 */
export function buildBearPawClampedTrapMesh(): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.88,
    roughness: 0.26,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.82,
    roughness: 0.36,
  });

  // Base plate under the paw
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.04, 0.16), darkIronMat);
  bar.position.set(0, 0.02, 0);
  bar.castShadow = true;
  group.add(bar);

  const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 14), steelMat);
  pan.position.set(0, 0.04, 0);
  group.add(pan);

  // Jaws snapped tightly shut around the bear's lower leg / paw
  for (const side of [-1, 1]) {
    const jawPivot = new THREE.Group();
    jawPivot.position.set(0, 0.05, 0);

    const jawArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.27, 0.028, 8, 18, Math.PI),
      steelMat
    );
    jawArc.rotation.x = Math.PI * 0.5;
    jawArc.rotation.z = side > 0 ? 0 : Math.PI;
    jawArc.castShadow = true;
    jawPivot.add(jawArc);

    for (let t = 1; t <= 5; t++) {
      const ang = (t / 6) * Math.PI;
      const tx = Math.cos(ang) * 0.26;
      const tz = Math.sin(ang) * 0.26 * side;
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.068, 4), steelMat);
      tooth.position.set(tx, 0.038, tz);
      jawPivot.add(tooth);
    }

    jawPivot.rotation.x = side * 1.15;
    group.add(jawPivot);
  }

  // Trailing broken iron chain links hanging off the trap
  for (let c = 0; c < 4; c++) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12), darkIronMat);
    link.position.set(-0.34 - c * 0.065, 0.03, (c % 2) * 0.02);
    link.rotation.x = (c % 2) * Math.PI * 0.5;
    group.add(link);
  }

  return group;
}

/**
 * Summary: Builds a 3D mesh for a Baited Bird Net Trap (flat woven net with a seed & berry bait tray when armed,
 *          or a cinched net dome containing a captured Wild Dove when sprung).
 */
function buildNetTrapMesh(trap: IPlacedTrap): THREE.Group {
  const isSprung = trap.status === 'sprung' || Boolean(trap.sprung);
  const group = new THREE.Group();
  const netMat = new THREE.MeshStandardMaterial({
    color: 0xa16207,
    roughness: 0.9,
    wireframe: true,
  });
  const stakeMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
  const trayMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const seedMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const berryMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });

  if (!isSprung) {
    // Flat woven net circle on ground
    const netCircle = new THREE.Mesh(new THREE.CircleGeometry(0.66, 16), netMat);
    netCircle.rotation.x = -Math.PI * 0.5;
    netCircle.position.y = 0.025;
    group.add(netCircle);

    // 4 perimeter pegs
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.22, 6), stakeMat);
      peg.position.set(Math.cos(ang) * 0.62, 0.1, Math.sin(ang) * 0.62);
      peg.castShadow = true;
      group.add(peg);
    }

    // Wooden bird-bait tray in the center filled with golden grain seeds and red forest berries!
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.035, 14), trayMat);
    tray.position.set(0, 0.025, 0);
    tray.receiveShadow = true;
    group.add(tray);

    for (let s = 0; s < 10; s++) {
      const r = (s % 3) * 0.045;
      const a = s * 1.15;
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), seedMat);
      seed.scale.set(1.2, 0.65, 0.9);
      seed.position.set(Math.cos(a) * r, 0.048, Math.sin(a) * r);
      group.add(seed);
    }
    for (let b = 0; b < 5; b++) {
      const a = (b / 5) * Math.PI * 2;
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), berryMat);
      berry.position.set(Math.cos(a) * 0.075, 0.054, Math.sin(a) * 0.075);
      group.add(berry);
    }
  } else {
    // Sprung net dome enclosing the captured bird!
    const netDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
      netMat
    );
    netDome.position.y = 0.03;
    group.add(netDome);

    // Captured Wild Dove 3D figure inside the net dome!
    const doveGroup = new THREE.Group();
    doveGroup.name = 'caughtCritter';
    const featherMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });

    const doveBody = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), featherMat);
    doveBody.scale.set(0.95, 0.85, 1.45);
    doveBody.position.set(0, 0.13, 0);
    doveBody.castShadow = true;
    doveGroup.add(doveBody);

    const doveHead = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 8), featherMat);
    doveHead.position.set(0, 0.23, 0.13);
    doveGroup.add(doveHead);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.065, 6), beakMat);
    beak.rotation.x = Math.PI * 0.5;
    beak.position.set(0, 0.225, 0.21);
    doveGroup.add(beak);

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), wingMat);
      wing.scale.set(0.35, 0.75, 1.35);
      wing.position.set(side * 0.11, 0.14, -0.02);
      doveGroup.add(wing);
    }

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.14), wingMat);
    tail.position.set(0, 0.12, -0.2);
    tail.rotation.x = 0.22;
    doveGroup.add(tail);

    group.add(doveGroup);
  }

  return group;
}

/**
 * Summary: Builds a 3D mesh for a Woven Fish Trap (`trap_fish`) — a conical willow-reed funnel basket
 *          placed in shallow water with a red/gold marker float, swimming fish when armed, and caught fish when sprung.
 */
function buildFishTrapMesh(trap: IPlacedTrap): THREE.Group {
  const isSprung = trap.status === 'sprung' || Boolean(trap.sprung);
  const group = new THREE.Group();

  const reedMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.88 });
  const hoopMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.75 });
  const floatRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
  const floatGoldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const fishScaleMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.55,
    roughness: 0.28,
  });
  const fishBellyMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    metalness: 0.4,
    roughness: 0.35,
  });

  // Woven cylindrical basket body lying horizontally in shallow water
  const basketGroup = new THREE.Group();
  basketGroup.position.set(0, 0.12, 0);

  // Ribbed willow hoops along the basket length
  for (let i = -2; i <= 2; i++) {
    const zPos = i * 0.18;
    const radius = i === 2 || i === -2 ? 0.21 : 0.25;
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 8, 20), hoopMat);
    hoop.position.set(0, 0, zPos);
    hoop.castShadow = true;
    basketGroup.add(hoop);
  }

  // Longitudinal woven reed slats around the circumference
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    const slat = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.76, 6), reedMat);
    slat.rotation.x = Math.PI * 0.5;
    slat.position.set(Math.cos(ang) * 0.23, Math.sin(ang) * 0.23, 0);
    slat.castShadow = true;
    basketGroup.add(slat);
  }

  // Conical inward funnel throat at the front (+Z)
  const funnel = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.26, 12, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.9,
      side: THREE.DoubleSide,
      wireframe: true,
    })
  );
  funnel.rotation.x = -Math.PI * 0.5;
  funnel.position.set(0, 0, 0.24);
  basketGroup.add(funnel);

  group.add(basketGroup);

  // Floating cork/painted buoy marker on top of the water
  const buoyGroup = new THREE.Group();
  buoyGroup.name = 'fishTrapBuoy';
  buoyGroup.position.set(0, 0.38, 0);
  const buoyBody = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), floatRedMat);
  buoyBody.scale.set(1, 1.35, 1);
  buoyGroup.add(buoyBody);
  const buoyBand = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.014, 6, 14), floatGoldMat);
  buoyBand.rotation.x = Math.PI * 0.5;
  buoyGroup.add(buoyBand);
  group.add(buoyGroup);

  const buildFishFigure = (scale = 1.0): THREE.Group => {
    const fish = new THREE.Group();
    const fBody = new THREE.Mesh(new THREE.SphereGeometry(0.11 * scale, 10, 8), fishScaleMat);
    fBody.scale.set(0.55, 0.85, 2.1);
    fish.add(fBody);

    const fBelly = new THREE.Mesh(new THREE.SphereGeometry(0.095 * scale, 8, 8), fishBellyMat);
    fBelly.scale.set(0.5, 0.7, 1.9);
    fBelly.position.y = -0.015 * scale;
    fish.add(fBelly);

    const tailFin = new THREE.Mesh(
      new THREE.ConeGeometry(0.08 * scale, 0.14 * scale, 4),
      fishScaleMat
    );
    tailFin.rotation.x = Math.PI * 0.5;
    tailFin.scale.set(0.35, 1.0, 1.2);
    tailFin.position.set(0, 0, -0.24 * scale);
    fish.add(tailFin);
    return fish;
  };

  if (!isSprung) {
    // Golden grain bait pouch inside the basket
    const baitPouch = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), floatGoldMat);
    baitPouch.position.set(0, 0.11, -0.05);
    group.add(baitPouch);

    // 2 small river fish circling outside the funnel entrance, attracted to the bait!
    const swimmersGroup = new THREE.Group();
    swimmersGroup.name = 'swimmingFishGroup';
    for (let f = 0; f < 2; f++) {
      const swimmer = buildFishFigure(0.68);
      const ang = f * Math.PI;
      swimmer.position.set(Math.cos(ang) * 0.48, 0.08, Math.sin(ang) * 0.48);
      swimmer.rotation.y = -ang;
      swimmersGroup.add(swimmer);
    }
    group.add(swimmersGroup);
  } else {
    // Caught plump River Trout / Silver Salmon flopping inside the woven basket!
    const caughtFish = buildFishFigure(1.18);
    caughtFish.name = 'caughtCritter';
    caughtFish.position.set(0, 0.13, 0);
    group.add(caughtFish);
  }

  return group;
}

/**
 * Summary: Builds a 3D mesh for any placed trap based on its kind and armed/sprung status.
 */
export function buildPlacedTrapMesh(trap: IPlacedTrap): THREE.Group {
  let mesh: THREE.Group;
  switch (trap.kind) {
    case 'trap_cage_small':
      mesh = buildCageTrapMesh(trap);
      break;
    case 'trap_snare':
      mesh = buildSnareTrapMesh(trap);
      break;
    case 'trap_bear_jaw':
      mesh = buildBearJawTrapMesh(trap);
      break;
    case 'trap_net':
      mesh = buildNetTrapMesh(trap);
      break;
    case 'trap_fish':
      mesh = buildFishTrapMesh(trap);
      break;
    default:
      mesh = buildCageTrapMesh(trap);
      break;
  }

  // Add a subtle floating golden/emerald beacon ring over sprung traps so the player can spot catches easily
  const isSprung = trap.status === 'sprung' || Boolean(trap.sprung);
  if (isSprung) {
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const beaconRing = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.25, 20), ringMat);
    beaconRing.position.set(0, 0.82, 0);
    beaconRing.rotation.x = Math.PI * 0.5;
    beaconRing.name = 'sprungBeaconRing';
    mesh.add(beaconRing);
  }

  mesh.position.set(trap.x, trap.y, trap.z);
  mesh.rotation.y = trap.yaw;
  mesh.userData.trapId = trap.id;
  mesh.userData.trapStatus = trap.status;
  return mesh;
}

/**
 * Summary: Animates a placed trap 3D group (pulsing beacon ring, wiggling caught critter/bird/fish, or swimming fish around armed fish trap).
 */
export function animatePlacedTrapMesh(group: THREE.Group, elapsedSeconds: number): void {
  const beacon = group.getObjectByName('sprungBeaconRing');
  if (beacon) {
    beacon.position.y = 0.82 + Math.sin(elapsedSeconds * 3.5) * 0.08;
    beacon.rotation.z = elapsedSeconds * 1.8;
  }

  const critter = group.getObjectByName('caughtCritter');
  if (critter) {
    critter.rotation.y = Math.sin(elapsedSeconds * 5.2) * 0.22;
    critter.position.y = 0.11 + Math.abs(Math.sin(elapsedSeconds * 4.5)) * 0.03;
  }

  const swimmers = group.getObjectByName('swimmingFishGroup');
  if (swimmers) {
    swimmers.rotation.y = elapsedSeconds * 1.45;
  }

  const buoy = group.getObjectByName('fishTrapBuoy');
  if (buoy) {
    buoy.position.y = 0.37 + Math.sin(elapsedSeconds * 2.8) * 0.035;
  }
}

/**
 * Summary: Builds the 3D Trapper's Workbench table inside the starting Hunter's Lodge cabin.
 */
export function buildTrapperWorkbenchMesh(): THREE.Group {
  const group = new THREE.Group();
  const tableWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.82 });
  const plankWoodMat = new THREE.MeshStandardMaterial({ color: 0x7c4d2b, roughness: 0.78 });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.8,
    roughness: 0.35,
  });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.9 });
  const berryMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });

  // Heavy tabletop (1.9m wide x 0.95m deep)
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.95), plankWoodMat);
  top.position.set(0, 0.88, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // 4 sturdy legs
  const legOffsets: [number, number][] = [
    [-0.82, -0.38],
    [0.82, -0.38],
    [-0.82, 0.38],
    [0.82, 0.38],
  ];
  for (const [lx, lz] of legOffsets) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.86, 0.11), tableWoodMat);
    leg.position.set(lx, 0.43, lz);
    leg.castShadow = true;
    group.add(leg);
  }

  // Lower storage shelf
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.05, 0.76), tableWoodMat);
  shelf.position.set(0, 0.24, 0);
  shelf.castShadow = true;
  group.add(shelf);

  // Back tool rack upright board
  const rackBoard = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.65, 0.06), tableWoodMat);
  rackBoard.position.set(0, 1.24, -0.44);
  rackBoard.castShadow = true;
  group.add(rackBoard);

  // Sample small cage trap on left of workbench
  const sampleCage = buildCageTrapMesh({
    id: 'wb-sample-cage',
    kind: 'trap_cage_small',
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    status: 'armed',
    armedDuration: 0,
  });
  sampleCage.scale.setScalar(0.55);
  sampleCage.position.set(-0.56, 0.93, 0.02);
  sampleCage.rotation.y = 0.35;
  group.add(sampleCage);

  // Sample steel bear trap on right of workbench
  const sampleBearTrap = buildBearJawTrapMesh({
    id: 'wb-sample-bear',
    kind: 'trap_bear_jaw',
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    status: 'armed',
    armedDuration: 0,
  });
  sampleBearTrap.scale.setScalar(0.58);
  sampleBearTrap.position.set(0.52, 0.93, 0.06);
  group.add(sampleBearTrap);

  // Coiled twine rope spool in center
  const spool = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.045, 10, 20), ropeMat);
  spool.rotation.x = Math.PI * 0.5;
  spool.position.set(0.02, 0.96, -0.08);
  spool.castShadow = true;
  group.add(spool);

  // Bowl of red bait berries
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.07, 12), tableWoodMat);
  bowl.position.set(-0.08, 0.96, 0.22);
  group.add(bowl);
  for (let b = 0; b < 5; b++) {
    const berry = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), berryMat);
    berry.position.set(-0.08 + (b - 2) * 0.025, 1.0, 0.22 + ((b % 2) - 0.5) * 0.03);
    group.add(berry);
  }

  // Hanging iron pliers/hammer on the back tool rack
  const toolBar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 0.04), ironMat);
  toolBar.position.set(0, 1.38, -0.39);
  group.add(toolBar);

  return group;
}

export const createPlacedTrapMesh = buildPlacedTrapMesh;

export interface ITrapPlacementPreviewGhost {
  readonly group: THREE.Group;
  readonly kind: TrapKind;
  setValid: (valid: boolean) => void;
}

/**
 * Summary: Builds a 3D hologram placement preview mesh for the trap currently held in the player's hands.
 *          Tints the entire 3D trap model and its ground placement ring Emerald Green (#22c55e) when
 *          placement is valid, or Crimson Red (#ef4444) when placement is blocked/invalid.
 */
export function buildTrapPlacementPreviewGhost(kind: TrapKind): ITrapPlacementPreviewGhost {
  const group = new THREE.Group();
  const model = buildPlacedTrapMesh({
    id: `preview-${kind}`,
    kind,
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    status: 'armed',
    armedDuration: 0,
  });
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  group.add(model);

  const ringGeo = new THREE.RingGeometry(0.54, 0.64, 28);
  ringGeo.rotateX(-Math.PI * 0.5);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 0.75,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.set(0, 0.02, 0);
  group.add(ringMesh);

  const ghostMaterials: THREE.MeshStandardMaterial[] = [ringMat];
  model.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.material) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      const clonedMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x16a34a,
        emissiveIntensity: 0.6,
        roughness: 0.35,
        metalness: 0.15,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        wireframe: Boolean((mesh.material as THREE.MeshStandardMaterial).wireframe),
      });
      mesh.material = clonedMat;
      ghostMaterials.push(clonedMat);
    }
  });

  let lastValid: boolean | null = null;
  const setValid = (valid: boolean) => {
    if (lastValid === valid) return;
    lastValid = valid;
    const hexColor = valid ? 0x22c55e : 0xef4444;
    const hexEmissive = valid ? 0x16a34a : 0xdc2626;
    for (let i = 0; i < ghostMaterials.length; i++) {
      ghostMaterials[i].color.setHex(hexColor);
      ghostMaterials[i].emissive.setHex(hexEmissive);
    }
  };
  setValid(true);

  return { group, kind, setValid };
}


