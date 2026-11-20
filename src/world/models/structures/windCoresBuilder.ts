// ============================================================================
// MODULE: World / Models / Skybound Isles / Wind Cores
// DESIGN: Each core is a stone cradle with a floating orb. An active core's orb burns bright
//         and a beam of light runs from it to the Windspire crystal, so from anywhere in the
//         archipelago the player can see which islands are already done.
// SUMMARY: Builds and animates the four Wind Cores and their beams to the Windspire.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import * as THREE from 'three';
import { SKY_HARBOR, WINDSPIRE, WIND_CORES, isWindCoreActive } from '../../domain/landmarksRegistry';
import type { IWorldModelBuildContext } from '../types';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: What the Wind Cores builder hands back to the frame loop. */
export interface IWindCoresBuildResult {
  readonly group: THREE.Group;
  /** Lights active cores and their beams; call once per frame while nearby. */
  readonly update: (elapsedSec: number) => void;
}

interface ICoreVisual {
  readonly id: string;
  readonly orb: THREE.Mesh;
  readonly beam: THREE.Mesh;
  readonly baseY: number;
}
// #endregion

// #region Tuning
/** Height (m) of the orb above the cradle's floor. */
const ORB_HEIGHT_M = 1.6;
/** Where the beams end: the Windspire crystal. */
const BEAM_TARGET = new THREE.Vector3(SKY_HARBOR.x, SKY_HARBOR.deckY + WINDSPIRE.height + 10.0, SKY_HARBOR.z);
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Build
/**
 * Summary: Builds the Wind Cores and returns their frame update.
 * @param ctx Shared build context.
 * @returns The root group (not yet added to the scene) and the per-frame update.
 */
export function buildWindCores(ctx: IWorldModelBuildContext): IWindCoresBuildResult {
  const group = new THREE.Group();
  group.name = 'wind-cores';
  const cradleGeo = new THREE.CylinderGeometry(0.35, 0.5, 0.9, 8);
  const orbGeo = new THREE.IcosahedronGeometry(0.45, 1);
  const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 1, 6, 1, true);
  beamGeo.translate(0, 0.5, 0);
  beamGeo.rotateX(Math.PI / 2);
  const cradleMat = new THREE.MeshStandardMaterial({ color: 0x6b6458, roughness: 0.85 });
  const dimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, emissive: 0x1e293b, emissiveIntensity: 0.3, roughness: 0.4 });
  const litMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, emissive: 0x38bdf8, emissiveIntensity: 2.6, roughness: 0.15 });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.45, depthWrite: false });
  ctx.disposableGeometries.push(cradleGeo, orbGeo, beamGeo);
  ctx.disposableMaterials.push(cradleMat, dimMat, litMat, beamMat);

  const cores: ICoreVisual[] = WIND_CORES.map((c) => {
    const cradle = new THREE.Mesh(cradleGeo, cradleMat);
    cradle.position.set(c.x, c.y + 0.45, c.z);
    const orb = new THREE.Mesh(orbGeo, dimMat);
    const baseY = c.y + ORB_HEIGHT_M;
    orb.position.set(c.x, baseY, c.z);
    // The beam runs from the orb to the Windspire crystal (unit length along +z, scaled to fit).
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.copy(orb.position);
    beam.lookAt(BEAM_TARGET);
    beam.scale.set(1, 1, orb.position.distanceTo(BEAM_TARGET));
    beam.visible = false;
    group.add(cradle, orb, beam);
    return { id: c.id, orb, beam, baseY };
  });

  return {
    group,
    update: (elapsedSec: number) => {
      litMat.emissiveIntensity = 2.4 + Math.sin(elapsedSec * 3) * 0.5;
      beamMat.opacity = 0.35 + Math.sin(elapsedSec * 2) * 0.1;
      cores.forEach((core, i) => {
        const active = isWindCoreActive(core.id);
        core.orb.material = active ? litMat : dimMat;
        core.orb.rotation.y = elapsedSec * (active ? 1.4 : 0.3);
        core.orb.position.y = core.baseY + Math.sin(elapsedSec * 1.2 + i) * 0.12;
        core.beam.visible = active;
      });
    },
  };
}
// #endregion
