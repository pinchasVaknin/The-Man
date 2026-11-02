// ============================================================================
// MODULE: World / Models / Deferred Animal Model Tests
// DESIGN: AAA tests for the loading proxy, using a fake built model
// SUMMARY: Verifies that calls before loading are remembered and replayed, that the model
//          attaches into the stable scene object, and that a failed download is logged.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DeferredAnimalModel, type IAnimatedAnimalModel } from './deferredAnimalModel';
import { preloadAnimalModelsForTests } from '../../testSupport/animalModelsForTests';
import type { ILogger } from '../../core/ILogger';
// #endregion

// ======================== FAKES ======================== \\
// #region Fakes
class FakeModel implements IAnimatedAnimalModel<string> {
  public readonly object = new THREE.Group();
  public readonly mesh = new THREE.SkinnedMesh();
  public readonly rig = { bones: [new THREE.Bone()] };
  public readonly states: string[] = [];
  public updates = 0;
  public moveSpeed = 0;
  public setState(state: string): void {
    this.states.push(state);
  }
  public update(): void {
    this.updates++;
  }
}

class RecordingLogger implements ILogger {
  public readonly warnings: string[] = [];
  public debug(): void {}
  public info(): void {}
  public warn(message: string): void {
    this.warnings.push(message);
  }
  public error(): void {}
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
// #endregion

// ======================== TESTS ======================== \\
// #region Tests
test('deferredModel_WhenDownloadFails_ShouldLogAndStayEmpty', async () => {
  // Arrange
  const logger = new RecordingLogger();
  const failingLoad = () => Promise.reject(new Error('offline'));

  // Act
  const sut = new DeferredAnimalModel('wolf', () => new FakeModel(), logger, undefined, failingLoad);
  await flush();

  // Assert
  assert.equal(sut.isLoaded(), false);
  assert.equal(sut.object.children.length, 0);
  assert.equal(logger.warnings.length, 1);
});

before(async () => {
  await preloadAnimalModelsForTests();
});

test('deferredModel_WhenCalledBeforeLoad_ShouldReplayStateAndSpeedOnAttach', async () => {
  // Arrange
  const model = new FakeModel();
  let attached: FakeModel | null = null;

  // Act
  const sut = new DeferredAnimalModel('bear', () => model, new RecordingLogger(), (m) => (attached = m));
  sut.setState('roar');
  sut.moveSpeed = 2.5;
  sut.update(0.1);
  await flush();

  // Assert
  assert.equal(sut.isLoaded(), true);
  assert.equal(attached, model);
  assert.deepEqual(model.states, ['roar']);
  assert.equal(model.moveSpeed, 2.5);
  assert.equal(model.updates, 0);
  assert.equal(sut.object.children[0], model.object);
  assert.equal(sut.rig, model.rig);
});

test('deferredModel_WhenLoaded_ShouldForwardCalls', async () => {
  // Arrange
  const model = new FakeModel();
  const sut = new DeferredAnimalModel('bear', () => model, new RecordingLogger());
  await flush();

  // Act
  sut.setState('walk');
  sut.update(0.1, 0.3);

  // Assert
  assert.deepEqual(model.states, ['walk']);
  assert.equal(model.updates, 1);
});
// #endregion
