// ============================================================================
// MODULE: Lab / Interactive Hitbox Preview Builder
// DESIGN: 3D Studio Preview (Real GLB Models + Architectural Meshes) + Live Collider Overlays
// SUMMARY: Renders the selected hitbox target alongside glowing cyan/amber translucent
//          and wireframe hitbox volumes that update instantaneously as values change.
// ============================================================================

import * as THREE from 'three';
import type { IHitboxOverridesPayload } from '../config/savedHitboxOverrides';
import {
  ATLANTIS_DEAD_KING_STATUE_POS,
} from '../world/domain/landmarksRegistry';
import { ARCHERY_TARGETS, ARCHERY_TARGET_DIMENSIONS } from '../world/domain/landmarks/fortressLandmarks';
import {
  createArcheryTargetModelInstance,
  loadArcheryTargetModel,
} from '../world/models/equipment/archeryTargetAssets';
import {
  createStatueModelInstance,
  loadStatueModel,
} from '../world/models/statues/statueAssets';
import {
  SHIP_GLB_BASE_SCALE,
  createShipModelInstance,
  loadShipModel,
} from '../world/models/vehicles/shipAssets';
import { getLabEntityById } from './labCatalog';
import {
  getDefaultBoxesForTarget,
  getEffectiveBoxesForTarget,
  getEffectiveEntityForTarget,
  getEffectiveObstacleForTarget,
  type ILabHitboxTargetDef,
} from './labHitboxCatalog';
import { buildLabEntityRig } from './labModelFactory';

export interface ILabHitboxRig {
  readonly root: THREE.Group;
  readonly stats: { readonly meshCount: number; readonly triangleCount: number };
  readonly updateOverlays: (
    overrides: IHitboxOverridesPayload,
    selectedPartId: string | null
  ) => void;
  readonly setWireframe: (enabled: boolean) => void;
  readonly dispose: () => void;
}

function buildWoodShipFallbackMesh(): THREE.Group {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x4b2e1a, roughness: 0.78 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x7c5333, roughness: 0.72 });
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xf4ebd6, roughness: 0.85, side: THREE.DoubleSide });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.2, 17.2), hullMat);
  hull.position.set(0, -1.1, 2.2);
  g.add(hull);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.25, 16.4), deckMat);
  deck.position.set(0, -0.05, 2.2);
  g.add(deck);

  const qd = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.82, 3.8), deckMat);
  qd.position.set(0, 0.91, 9.3);
  g.add(qd);

  const foreMast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 13.5, 10), hullMat);
  foreMast.position.set(0, 6.75, -1.68);
  g.add(foreMast);

  const mainMast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 15.0, 10), hullMat);
  mainMast.position.set(0, 7.5, 4.75);
  g.add(mainMast);

  const sail1 = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.2), sailMat);
  sail1.position.set(0, 8.2, -1.65);
  g.add(sail1);

  const sail2 = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 5.8), sailMat);
  sail2.position.set(0, 9.0, 4.78);
  g.add(sail2);
  return g;
}

function buildBoardingLadderVisual(): THREE.Group {
  const g = new THREE.Group();
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x926239, roughness: 0.85 });
  const rungMat = new THREE.MeshStandardMaterial({ color: 0x784421, roughness: 0.76 });
  for (const side of [-1, 1] as const) {
    const ladder = new THREE.Group();
    ladder.position.set(side * 3.48, 0, 1.75);
    for (const rz of [-0.36, 0.36]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.95, 8), ropeMat);
      rail.position.set(0, -1.35, rz);
      ladder.add(rail);
    }
    for (let r = 0; r < 8; r++) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.74, 8), rungMat);
      rung.rotation.x = Math.PI / 2;
      rung.position.set(0, -2.55 + r * 0.35, 0);
      ladder.add(rung);
    }
    g.add(ladder);
  }
  return g;
}

function buildObstacleVisual(obstacleKey: string, radius: number, height: number): THREE.Group {
  const g = new THREE.Group();
  if (obstacleKey === 'boulder') {
    const mat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 1), mat);
    mesh.scale.set(1.0, height / Math.max(0.4, radius * 1.4), 1.0);
    mesh.position.y = height * 0.45;
    g.add(mesh);
    return g;
  }
  if (obstacleKey === 'pillar') {
    const mat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.85, radius, height, 10), mat);
    shaft.position.y = height * 0.5;
    g.add(shaft);
    return g;
  }
  const barkColor = obstacleKey === 'birch' ? 0xd6d3d1 : 0x5c4033;
  const leafColor =
    obstacleKey === 'oakyellow'
      ? 0xd97706
      : obstacleKey === 'palm'
        ? 0x4d7c0f
        : obstacleKey === 'acacia'
          ? 0x65a30d
          : 0x166534;
  const trunkMat = new THREE.MeshStandardMaterial({ color: barkColor, roughness: 0.88 });
  const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.78 });
  const trunkH = height * 0.48;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.65, radius, trunkH, 10), trunkMat);
  trunk.position.y = trunkH * 0.5;
  g.add(trunk);

  const canopyR = Math.max(radius * 3.4, height * 0.24);
  if (obstacleKey === 'pine' || obstacleKey === 'pinetree') {
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(canopyR * (1 - i * 0.22), height * 0.28, 8),
        leafMat
      );
      cone.position.y = trunkH * 0.8 + i * height * 0.18;
      g.add(cone);
    }
  } else {
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(canopyR, 1), leafMat);
    crown.position.y = trunkH + canopyR * 0.55;
    g.add(crown);
  }
  return g;
}

function buildBoxArchitectureVisual(target: ILabHitboxTargetDef): THREE.Group {
  const g = new THREE.Group();
  const defaults = getDefaultBoxesForTarget(target);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c4a26, roughness: 0.76 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.72 });

  for (let i = 0; i < defaults.length; i++) {
    const b = defaults[i];
    const w = Math.max(0.08, b.maxX - b.minX);
    const d = Math.max(0.08, b.maxZ - b.minZ);
    const minY = (b.minY ?? 0) - target.anchor.y;
    const maxY = (b.maxY ?? 2) - target.anchor.y;
    const h = Math.max(0.08, maxY - minY);
    const cx = (b.minX + b.maxX) * 0.5 - target.anchor.x;
    const cz = (b.minZ + b.maxZ) * 0.5 - target.anchor.z;
    const cy = (minY + maxY) * 0.5;
    const mat =
      b.id.includes('rail') || b.id.includes('stair') || b.id.includes('mast') || b.id.includes('table')
        ? woodMat
        : b.id.includes('banner') || b.id.includes('roof') || b.id.includes('lantern') || b.id.includes('hearth')
          ? accentMat
          : stoneMat;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(cx, cy, cz);
    if (b.yaw) m.rotation.y = b.yaw;
    g.add(m);
  }
  return g;
}

function createTargetWireOverlayBox(
  w: number,
  h: number,
  d: number,
  isSelected: boolean
): THREE.Group {
  const holder = new THREE.Group();
  const boxGeo = new THREE.BoxGeometry(w, h, d);
  const fillMat = new THREE.MeshBasicMaterial({
    color: isSelected ? 0x22d3ee : 0xf59e0b,
    transparent: true,
    opacity: isSelected ? 0.28 : 0.08,
    depthWrite: false,
  });
  const fillMesh = new THREE.Mesh(boxGeo, fillMat);
  fillMesh.userData.isHitboxOverlay = true;
  holder.add(fillMesh);

  const edgesGeo = new THREE.EdgesGeometry(boxGeo);
  const edgesMat = new THREE.LineBasicMaterial({
    color: isSelected ? 0x67e8f9 : 0xfbbf24,
    transparent: true,
    opacity: isSelected ? 1.0 : 0.72,
  });
  const edges = new THREE.LineSegments(edgesGeo, edgesMat);
  edges.userData.isHitboxOverlay = true;
  holder.add(edges);
  return holder;
}

function createCylinderOverlay(
  radius: number,
  height: number,
  colorHex: number,
  fillOpacity: number
): THREE.Group {
  const holder = new THREE.Group();
  const cylGeo = new THREE.CylinderGeometry(radius, radius, height, 24, 1, false);
  const fillMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: fillOpacity,
    depthWrite: false,
  });
  const fillMesh = new THREE.Mesh(cylGeo, fillMat);
  fillMesh.position.y = height * 0.5;
  fillMesh.userData.isHitboxOverlay = true;
  holder.add(fillMesh);

  const wireGeo = new THREE.CylinderGeometry(radius, radius, height, 20, 1, true);
  const edgesGeo = new THREE.EdgesGeometry(wireGeo);
  wireGeo.dispose();
  const edges = new THREE.LineSegments(
    edgesGeo,
    new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.96 })
  );
  edges.position.y = height * 0.5;
  edges.userData.isHitboxOverlay = true;
  holder.add(edges);
  return holder;
}

function disposeOverlayGroup(group: THREE.Group): void {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    child.traverse((obj) => {
      const m = obj as THREE.Mesh | THREE.LineSegments;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material;
      if (Array.isArray(mat)) {
        for (const sub of mat) sub.dispose();
      } else if (mat) {
        mat.dispose();
      }
    });
  }
}

/**
 * Summary: Builds a complete 3D hitbox inspection rig (3D model + live hitbox overlays).
 */
export function buildLabHitboxPreviewRig(
  target: ILabHitboxTargetDef,
  initialOverrides: IHitboxOverridesPayload,
  initialSelectedPartId: string | null,
  onAsyncModelReady?: () => void
): ILabHitboxRig {
  const root = new THREE.Group();
  root.name = `lab-hitbox-preview-${target.id}`;

  const modelGroup = new THREE.Group();
  const overlayGroup = new THREE.Group();
  root.add(modelGroup, overlayGroup);

  let disposed = false;
  let entityRigDispose: (() => void) | null = null;
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];

  const collectOwnedResources = (obj: THREE.Object3D) => {
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) {
        ownedGeos.push(mesh.geometry);
        if (Array.isArray(mesh.material)) {
          for (const m of mesh.material) ownedMats.push(m);
        } else if (mesh.material) {
          ownedMats.push(mesh.material);
        }
      }
    });
  };

  if (target.previewType === 'sailable_ship') {
    const fallback = buildWoodShipFallbackMesh();
    const ladders = buildBoardingLadderVisual();
    modelGroup.add(fallback, ladders);
    collectOwnedResources(fallback);
    collectOwnedResources(ladders);
    void loadShipModel()
      .then((asset) => {
        if (disposed) return;
        fallback.visible = false;
        const shipMesh = createShipModelInstance(asset, { scale: SHIP_GLB_BASE_SCALE });
        modelGroup.add(shipMesh);
        onAsyncModelReady?.();
      })
      .catch(() => {
        // Fallback procedural hull remains visible
      });
  } else if (target.previewType === 'archery_target') {
    const fallback = buildBoxArchitectureVisual(target);
    modelGroup.add(fallback);
    collectOwnedResources(fallback);
    void loadArcheryTargetModel()
      .then((asset) => {
        if (disposed) return;
        fallback.visible = false;
        for (let i = 0; i < ARCHERY_TARGETS.length; i++) {
          const tgt = ARCHERY_TARGETS[i];
          const inst = createArcheryTargetModelInstance(asset, {
            scale: ARCHERY_TARGET_DIMENSIONS.scale,
          });
          inst.position.set(tgt.x - target.anchor.x, 0, tgt.z - target.anchor.z);
          inst.rotation.y = tgt.yaw;
          modelGroup.add(inst);
        }
        onAsyncModelReady?.();
      })
      .catch(() => {
        // Fallback stands remain visible
      });
  } else if (target.previewType === 'atlantis_statue') {
    const fallback = buildBoxArchitectureVisual(target);
    modelGroup.add(fallback);
    collectOwnedResources(fallback);
    void loadStatueModel('ded_king_skelton')
      .then((asset) => {
        if (disposed) return;
        fallback.visible = false;
        const plinth = new THREE.Mesh(
          new THREE.BoxGeometry(
            ATLANTIS_DEAD_KING_STATUE_POS.pedestalHalfExtent * 2,
            ATLANTIS_DEAD_KING_STATUE_POS.pedestalHeight,
            ATLANTIS_DEAD_KING_STATUE_POS.pedestalHalfExtent * 2
          ),
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78 })
        );
        plinth.position.y = ATLANTIS_DEAD_KING_STATUE_POS.pedestalHeight * 0.5;
        ownedGeos.push(plinth.geometry);
        ownedMats.push(plinth.material);
        const statue = createStatueModelInstance(asset, {
          scale: ATLANTIS_DEAD_KING_STATUE_POS.statueScale,
        });
        statue.position.y = ATLANTIS_DEAD_KING_STATUE_POS.pedestalHeight;
        statue.rotation.y = ATLANTIS_DEAD_KING_STATUE_POS.facingYaw;
        modelGroup.add(plinth, statue);
        onAsyncModelReady?.();
      })
      .catch(() => {
        // Fallback blocks remain visible
      });
  } else if (target.kind === 'obstacle') {
    const effObs = getEffectiveObstacleForTarget(target, initialOverrides);
    const treeMesh = buildObstacleVisual(
      target.obstacleKey ?? 'oakgreen',
      effObs.baseRadius,
      effObs.baseHeight
    );
    modelGroup.add(treeMesh);
    collectOwnedResources(treeMesh);
  } else if (target.kind === 'entity') {
    const entityId = target.entityId ?? 'ranger_third_person';
    const entityDef = getLabEntityById(entityId);
    const rig = buildLabEntityRig(entityDef.id, entityDef.skins[0]);
    rig.applyAnimation('none', 0, 0);
    modelGroup.add(rig.root);
    entityRigDispose = rig.dispose;
  } else {
    const arch = buildBoxArchitectureVisual(target);
    modelGroup.add(arch);
    collectOwnedResources(arch);
  }

  let meshCount = 0;
  let triangleCount = 0;
  modelGroup.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      meshCount += 1;
      const geo = mesh.geometry;
      triangleCount += geo.index
        ? Math.floor(geo.index.count / 3)
        : Math.floor((geo.attributes.position?.count ?? 0) / 3);
    }
  });

  const updateOverlays = (
    overrides: IHitboxOverridesPayload,
    selectedPartId: string | null
  ) => {
    disposeOverlayGroup(overlayGroup);

    if (target.kind === 'ship_boxes' || target.kind === 'world_boxes') {
      const boxes = getEffectiveBoxesForTarget(target, overrides);
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        const w = Math.max(0.05, b.maxX - b.minX);
        const d = Math.max(0.05, b.maxZ - b.minZ);
        const minY = (b.minY ?? 0) - target.anchor.y;
        const maxY = (b.maxY ?? 2) - target.anchor.y;
        const h = Math.max(0.05, maxY - minY);
        const cx = (b.minX + b.maxX) * 0.5 - target.anchor.x;
        const cy = (minY + maxY) * 0.5;
        const cz = (b.minZ + b.maxZ) * 0.5 - target.anchor.z;
        const isSel = selectedPartId === b.id;
        const boxOverlay = createTargetWireOverlayBox(w, h, d, isSel);
        boxOverlay.position.set(cx, cy, cz);
        if (b.yaw) boxOverlay.rotation.y = b.yaw;
        overlayGroup.add(boxOverlay);
      }
      return;
    }

    if (target.kind === 'obstacle') {
      const eff = getEffectiveObstacleForTarget(target, overrides);
      const cyl = createCylinderOverlay(eff.radius, eff.height, 0x22d3ee, 0.24);
      overlayGroup.add(cyl);
      return;
    }

    if (target.kind === 'entity') {
      const { effective } = getEffectiveEntityForTarget(target, overrides);
      const combatCyl = createCylinderOverlay(effective.radius, effective.height, 0x22d3ee, 0.20);
      overlayGroup.add(combatCyl);
      const bodyRadius = effective.bodyRadius ?? effective.radius;
      const bodyCyl = createCylinderOverlay(bodyRadius, Math.max(0.4, effective.height * 0.72), 0x34d399, 0.14);
      overlayGroup.add(bodyCyl);
    }
  };

  updateOverlays(initialOverrides, initialSelectedPartId);

  const setWireframe = (enabled: boolean) => {
    modelGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && !mesh.userData.isHitboxOverlay) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (m && 'wireframe' in m) {
            (m as THREE.MeshStandardMaterial).wireframe = enabled;
          }
        }
      }
    });
  };

  const dispose = () => {
    disposed = true;
    disposeOverlayGroup(overlayGroup);
    entityRigDispose?.();
    for (const g of ownedGeos) g.dispose();
    for (const m of ownedMats) m.dispose();
  };

  return {
    root,
    stats: { meshCount, triangleCount },
    updateOverlays,
    setWireframe,
    dispose,
  };
}
