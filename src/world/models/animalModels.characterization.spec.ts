// ============================================================================
// MODULE: World / Models / Animal Models Characterization Tests
// DESIGN: Golden-master fingerprints of every animal model, independent of storage format
// SUMMARY: Pins vertex/index counts and attribute sums, the skeleton (bones, rest pose,
//          inverse bind matrices) and sampled animation poses per state, so the move from
//          embedded base64 packs to GLB files can be proven lossless.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { before, test } from 'node:test';
import type * as THREE from 'three';
import { assertMatchesGolden } from '../../testSupport/goldenMaster';
import { preloadAnimalModelsForTests } from '../../testSupport/animalModelsForTests';
import { createReadyBear, BEAR_STATES } from './Bear';
import { createReadyCrocodile, CROCODILE_STATES } from './Crocodile';
import { createReadyJaguar, JAGUAR_STATES } from './Jaguar';
import { createReadyWolf, WOLF_STATES } from './Wolf';
import { createReadyRhino, RHINO_STATES } from './Rhino';
import { createReadyDemonDragon } from './DemonDragon';
import { createReadyForestDragon, FOREST_DRAGON_STATES } from './ForestDragon';
import { createReadyDeer, DEER_STATES } from './Deer';
// #endregion

// ======================== FINGERPRINT HELPERS ======================== \\
// #region Fingerprint Helpers
interface IAnimatedModel {
  readonly mesh: THREE.SkinnedMesh;
  setState(state: never): void;
  update(dt: number, turn?: number): void;
}

function sumOf(values: ArrayLike<number>): { readonly count: number; readonly sum: number; readonly absSum: number } {
  let sum = 0;
  let absSum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    absSum += Math.abs(values[i]);
  }
  return { count: values.length, sum, absSum };
}

function poseOf(mesh: THREE.SkinnedMesh): unknown {
  const values: number[] = [];
  for (const bone of mesh.skeleton.bones) {
    values.push(bone.position.x, bone.position.y, bone.position.z);
    values.push(bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  }
  return sumOf(values);
}

function fingerprint(model: IAnimatedModel, states: readonly string[]): unknown {
  const geometry = model.mesh.geometry;
  const attributes: Record<string, unknown> = {};
  for (const name of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight']) {
    const attribute = geometry.getAttribute(name);
    attributes[name] = attribute ? sumOf(attribute.array as ArrayLike<number>) : null;
  }
  const boneInverses: number[] = [];
  for (const matrix of model.mesh.skeleton.boneInverses) boneInverses.push(...matrix.elements);
  const restPose = poseOf(model.mesh);
  const statePoses = states.map((state) => {
    model.setState(state as never);
    for (let i = 0; i < 6; i++) model.update(0.07, 0.2);
    return { state, pose: poseOf(model.mesh) };
  });
  return {
    attributes,
    index: geometry.index ? sumOf(geometry.index.array as ArrayLike<number>) : null,
    bones: model.mesh.skeleton.bones.map((bone) => bone.name),
    boneInverses: sumOf(boneInverses),
    restPose,
    statePoses,
  };
}

function golden(name: string): URL {
  return new URL(`./__golden__/${name}-model.json`, import.meta.url);
}
// #endregion

// ======================== TESTS ======================== \\
// #region Tests
before(async () => {
  await preloadAnimalModelsForTests();
});

test('bearModel_WhenBuiltAndAnimated_ShouldMatchGolden', () => {
  assertMatchesGolden(golden('bear'), fingerprint(createReadyBear({ scale: 1 }) as unknown as IAnimatedModel, BEAR_STATES));
});

test('crocodileModel_WhenBuiltAndAnimated_ShouldMatchGolden', () => {
  assertMatchesGolden(
    golden('crocodile'),
    fingerprint(createReadyCrocodile({ scale: 1 }) as unknown as IAnimatedModel, CROCODILE_STATES)
  );
});

test('jaguarModel_WhenBuiltAndAnimated_ShouldMatchGolden', () => {
  assertMatchesGolden(golden('jaguar'), fingerprint(createReadyJaguar({ scale: 1 }) as unknown as IAnimatedModel, JAGUAR_STATES));
});

test('wolfModel_WhenBuiltAndAnimated_ShouldMatchGolden', () => {
  assertMatchesGolden(golden('wolf'), fingerprint(createReadyWolf({ scale: 1 }) as unknown as IAnimatedModel, WOLF_STATES));
});

test('rhinoModel_WhenBuiltAndAnimated_ShouldMatchGolden', () => {
  assertMatchesGolden(golden('rhino'), fingerprint(createReadyRhino({ scale: 1 }) as unknown as IAnimatedModel, RHINO_STATES));
});

test('demonDragonModel_WhenBuiltAndAnimated_ShouldMatchGolden', () => {
  assertMatchesGolden(
    golden('demon-dragon'),
    fingerprint(createReadyDemonDragon({ scale: 1 }) as unknown as IAnimatedModel, FOREST_DRAGON_STATES)
  );
});

test('forestDragonModel_WhenBuiltAndAnimated_ShouldMatchGolden', () => {
  assertMatchesGolden(
    golden('forest-dragon'),
    fingerprint(createReadyForestDragon({ scale: 1 }) as unknown as IAnimatedModel, FOREST_DRAGON_STATES)
  );
});

test('deerModel_WhenBuiltAndAnimated_ShouldMatchGolden', () => {
  assertMatchesGolden(golden('deer'), fingerprint(createReadyDeer({ scale: 1 }) as unknown as IAnimatedModel, DEER_STATES));
});
// #endregion
