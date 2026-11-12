import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LOADING_STEP_IDS, describeLoadingStage } from './loadingStages';

describe('loadingStages - describeLoadingStage', () => {
  it('starts at the renderer step before the builder reports anything', () => {
    const progress = describeLoadingStage(null);
    assert.equal(progress.stepId, 'renderer');
    assert.equal(progress.stepNumber, 1);
    assert.equal(progress.fraction, 0);
  });

  it('maps each builder stage name to its step, in order', () => {
    const names = [
      'terrain and water',
      'vegetation',
      'settlements',
      'sky and weather',
      'player and combat',
      'wildlife',
      'collider debug',
    ];
    names.forEach((name, i) => {
      const progress = describeLoadingStage(name);
      assert.equal(progress.stepNumber, i + 2);
      assert.equal(progress.stepId, LOADING_STEP_IDS[i + 1]);
    });
  });

  it('advances the fraction as steps complete, never reaching 1 before the world is ready', () => {
    const early = describeLoadingStage('terrain and water');
    const late = describeLoadingStage('collider debug');
    assert.ok(late.fraction > early.fraction);
    assert.ok(late.fraction < 1);
    assert.equal(late.totalSteps, LOADING_STEP_IDS.length);
  });

  it('keeps the previous step for an unknown name, so the bar never jumps backwards', () => {
    const progress = describeLoadingStage('something new');
    assert.equal(progress.stepId, 'renderer');
  });

  it('does not treat inherited object keys as stage names', () => {
    assert.equal(describeLoadingStage('constructor').stepId, 'renderer');
    assert.equal(describeLoadingStage('toString').stepId, 'renderer');
  });
});
