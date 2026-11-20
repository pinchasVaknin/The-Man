// ============================================================================
// MODULE: World / Models / Statues / Static Statue
// DESIGN: The only place outside the creature and character systems that may use an animated model.
//         It freezes the model in a base pose and hands back an object that cannot be animated, so a
//         statue can never turn into a moving creature without behavior (see creatureBoundary.spec.ts).
// SUMMARY: Creates lifeless statues from the dwarf and monk rigs and posed, frozen dragon rigs for
//          baking heads. The caller applies the stone or metal material. Owns no gameplay or animation.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type * as THREE from 'three';
import { createReadyDwarfWarrior, type DwarfWarriorState } from '../Characters/DwarfWarrior_Complete';
import { createReadyWarriorMonk, type WarriorMonkState } from '../Characters/WarriorMonk_Complete';
import { createReadyDemonDragon } from '../DemonDragon';
import { createReadyForestDragon } from '../ForestDragon';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
interface IStatueLook {
  readonly scale?: number;
  readonly tintHex?: number;
  readonly weaponVisible?: boolean;
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
}

/** Summary: A request for a statue made from one of the character rigs, frozen at a point of a clip. */
export type IStaticStatueRequest =
  | (IStatueLook & { readonly kind: 'dwarf-warrior'; readonly pose: IStatuePose<DwarfWarriorState> })
  | (IStatueLook & { readonly kind: 'warrior-monk'; readonly pose: IStatuePose<WarriorMonkState> });

/** Summary: Which animation clip to freeze on, and how far into it. */
export interface IStatuePose<TClip> {
  readonly clip: TClip;
  /** Seconds into the clip. */
  readonly atSeconds: number;
  /** Blend time passed to the rig when it switches to the clip (default 0). */
  readonly blendSeconds?: number;
}

/**
 * Summary: A frozen character statue. It exposes the object and the skinned mesh (for materials,
 *          shadows and attaching details to bones) and nothing that can animate it.
 */
export interface IStaticStatue {
  readonly group: THREE.Group;
  readonly skinnedMesh: THREE.SkinnedMesh;
}

/** Summary: A frozen, posed creature rig meant for baking part of it (a head) into static geometry. */
export interface IStaticCreaturePose {
  readonly object: THREE.Group;
  readonly mesh: THREE.SkinnedMesh;
  /** Releases the rig's own resources once the baked geometry has been taken. */
  readonly dispose: () => void;
}

export type StaticDragonKind = 'demon-dragon' | 'forest-dragon';

/** Summary: Overrides one bone's rotation after the rig is reset to its rest pose. */
export interface IBonePoseOverride {
  readonly bone: number;
  readonly quaternion: readonly [x: number, y: number, z: number, w: number];
}
// #endregion

// ======================== PUBLIC STATUES ======================== \\
// #region Create Static Statue
/**
 * Summary: Creates a lifeless statue from a character rig, frozen in a base pose.
 * Design: The rig is switched to the requested clip, advanced once, its skeleton updated, and then only
 *         its group and mesh are returned: the controller that could animate it stays inside.
 * @param request Which character, which pose, and the look (scale, tint, shadows).
 * @returns The statue's group and skinned mesh.
 * @throws InfrastructureCorruptedException when the character model was not loaded yet.
 */
export function createStaticStatue(request: IStaticStatueRequest): IStaticStatue {
  const options = {
    driveRootMotion: false,
    weaponVisible: request.weaponVisible,
    tintHex: request.tintHex,
    scale: request.scale,
    castShadow: request.castShadow,
    receiveShadow: request.receiveShadow,
  };
  const rig = request.kind === 'dwarf-warrior' ? createReadyDwarfWarrior(options) : createReadyWarriorMonk(options);
  rig.driveRootMotion = false;
  rig.setState(request.pose.clip as never, request.pose.blendSeconds ?? 0);
  rig.update(request.pose.atSeconds);
  rig.group.updateMatrixWorld(true);
  rig.skinnedMesh.skeleton.update();
  return { group: rig.group, skinnedMesh: rig.skinnedMesh };
}
// #endregion

// #region Create Static Dragon Pose
/**
 * Summary: Creates a dragon rig at its rest pose with some bones rotated, frozen, for baking.
 * Design: Used to bake a dragon head into static geometry. Returns no animator.
 * @param kind Which dragon.
 * @param overrides Bone rotations applied after the reset (for example an open jaw).
 * @throws InfrastructureCorruptedException when the dragon model was not loaded yet.
 */
export function createStaticDragonPose(kind: StaticDragonKind, overrides: readonly IBonePoseOverride[] = []): IStaticCreaturePose {
  const dragon = kind === 'demon-dragon' ? createReadyDemonDragon() : createReadyForestDragon();
  dragon.rig.resetToRest();
  for (const { bone, quaternion } of overrides) {
    dragon.rig.bones[bone]?.quaternion.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]).normalize();
  }
  dragon.object.updateMatrixWorld(true);
  dragon.mesh.skeleton.update();
  return { object: dragon.object, mesh: dragon.mesh, dispose: () => dragon.dispose() };
}
// #endregion
