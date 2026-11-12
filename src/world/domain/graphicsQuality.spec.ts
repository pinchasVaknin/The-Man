import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAPHICS_PROFILES,
  GRAPHICS_QUALITIES,
  resolvePixelRatio,
  resolveShadowsEnabled,
} from './graphicsQuality';

describe('graphicsQuality - presets', () => {
  it('lists the three presets in order', () => {
    assert.deepEqual([...GRAPHICS_QUALITIES], ['low', 'medium', 'high']);
  });

  it('keeps the original renderer settings on high (2048 shadows, pixel ratio up to 2)', () => {
    assert.equal(GRAPHICS_PROFILES.high.shadowsEnabled, true);
    assert.equal(GRAPHICS_PROFILES.high.shadowMapSize, 2048);
    assert.equal(GRAPHICS_PROFILES.high.maxPixelRatio, 2);
  });

  it('turns shadows off on low and uses smaller shadow maps and lower pixel ratios as presets drop', () => {
    assert.equal(GRAPHICS_PROFILES.low.shadowsEnabled, false);
    assert.ok(GRAPHICS_PROFILES.medium.shadowMapSize <= GRAPHICS_PROFILES.high.shadowMapSize);
    assert.ok(GRAPHICS_PROFILES.low.maxPixelRatio <= GRAPHICS_PROFILES.medium.maxPixelRatio);
    assert.ok(GRAPHICS_PROFILES.medium.maxPixelRatio <= GRAPHICS_PROFILES.high.maxPixelRatio);
  });
});

describe('graphicsQuality - resolveShadowsEnabled', () => {
  it('draws shadows on medium and high on a hardware GPU', () => {
    assert.equal(resolveShadowsEnabled('medium', false), true);
    assert.equal(resolveShadowsEnabled('high', false), true);
  });

  it('never draws shadows on a software rasterizer, whatever the preset', () => {
    for (const quality of GRAPHICS_QUALITIES) {
      assert.equal(resolveShadowsEnabled(quality, true), false);
    }
  });

  it('never draws shadows on low', () => {
    assert.equal(resolveShadowsEnabled('low', false), false);
  });
});

describe('graphicsQuality - resolvePixelRatio', () => {
  it('caps a 3x display at 2 on high, as the renderer always did', () => {
    assert.equal(resolvePixelRatio('high', 3, false), 2);
  });

  it('caps a 2x display at 1.5 on medium and 1 on low', () => {
    assert.equal(resolvePixelRatio('medium', 2, false), 1.5);
    assert.equal(resolvePixelRatio('low', 2, false), 1);
  });

  it('uses the device ratio when it is below the cap', () => {
    assert.equal(resolvePixelRatio('high', 1.25, false), 1.25);
  });

  it('draws at 1 on a software rasterizer, whatever the preset or ratio', () => {
    assert.equal(resolvePixelRatio('high', 2, true), 1);
  });

  it('falls back to 1 for a missing or invalid device ratio', () => {
    assert.equal(resolvePixelRatio('high', 0, false), 1);
    assert.equal(resolvePixelRatio('high', Number.NaN, false), 1);
  });
});
