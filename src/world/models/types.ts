// ============================================================================
// MODULE: World / Models / Types
// DESIGN: Shared builder context, culled object records, and door pivot handles (SRP)
// SUMMARY: Centralizes dependency injection contracts across modular 3D scene builders.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type * as THREE from 'three';
import type { IWorldTextureSet } from '../proceduralTextures';
import type { IObstacleCylinder } from '../domain/worldTypes';
import type { IArchitecturalSharedAssets } from './architecturalHelpers';
// #endregion

// ======================== SHARED BUILDER INTERFACES ======================== \\
// #region Shared Builder Interfaces
/**
 * Summary: Three.js object entry registered for dynamic distance-based frustum/range culling.
 * Design: Evaluates distance squared from camera to toggle visibility and save draw calls.
 */
export interface IDistanceCulledObject {
  readonly obj: THREE.Object3D;
  readonly cx: number;
  readonly cz: number;
  readonly radius: number;
}
export type DistanceCulledObject = IDistanceCulledObject;

/**
 * Summary: Pivot handle representation for an interactive hinged door mesh.
 * Design: Rotates door mesh about its hinge axis when opened or closed.
 */
export interface IDoorPivotHandle {
  readonly id: string;
  readonly leftPivot: THREE.Group;
  readonly rightPivot: THREE.Group;
  currentAngle: number;
}
export type DoorPivotHandle = IDoorPivotHandle;

/**
 * Summary: Shared context passed down through procedural architectural model generators.
 * Design: Bundles Three.js scene, textures, materials, and distance culling registries.
 */
export interface IWorldModelBuildContext {
  readonly scene: THREE.Scene;
  readonly textures: IWorldTextureSet;
  readonly obstacles: IObstacleCylinder[];
  readonly isSoftwareGl: boolean;
  readonly disposableGeometries: THREE.BufferGeometry[];
  readonly disposableMaterials: THREE.Material[];
  readonly disposableTextures: THREE.Texture[];
  readonly swayMaterials: THREE.MeshStandardMaterial[];
  readonly animatedWaterMaterials: THREE.MeshPhysicalMaterial[];
  readonly lanternLights: THREE.PointLight[];
  readonly mistMaterials: THREE.MeshBasicMaterial[];
  readonly distanceCulledObjects: IDistanceCulledObject[];
  readonly doorPivotHandles: IDoorPivotHandle[];
  archAssets?: IArchitecturalSharedAssets;
  birchBarkTexture?: THREE.CanvasTexture;
}
export type WorldModelBuildContext = IWorldModelBuildContext;
// #endregion
