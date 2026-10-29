// ============================================================================
// MODULE: World / Models / Types
// DESIGN: Shared builder context, culled object records, and door pivot handles (SRP)
// SUMMARY: Centralizes dependency injection contracts across modular 3D scene builders.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type * as THREE from 'three';
import type { WorldTextureSet } from '../proceduralTextures';
import type { ObstacleCylinder } from '../domain/worldTypes';
import type { IArchitecturalSharedAssets } from './architecturalHelpers';
// #endregion

// ======================== SHARED BUILDER INTERFACES ======================== \\
// #region Shared Builder Interfaces
export interface IDistanceCulledObject {
  readonly obj: THREE.Object3D;
  readonly cx: number;
  readonly cz: number;
  readonly radius: number;
}
export type DistanceCulledObject = IDistanceCulledObject;

export interface IDoorPivotHandle {
  readonly id: string;
  readonly leftPivot: THREE.Group;
  readonly rightPivot: THREE.Group;
  currentAngle: number;
}
export type DoorPivotHandle = IDoorPivotHandle;

export interface IWorldModelBuildContext {
  readonly scene: THREE.Scene;
  readonly textures: WorldTextureSet;
  readonly obstacles: ObstacleCylinder[];
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
