import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { IWeatherStateSnapshot } from './worldTypes';
import { easeToward, easeWeatherSnapshot } from './weatherEase';

function weather(overrides: Partial<IWeatherStateSnapshot>): IWeatherStateSnapshot {
  return {
    mode: 'auto',
    season: 'summer',
    seasonLabel: 'Summer',
    weatherKind: 'clear_clouds',
    weatherLabel: 'Clear',
    cloudCoverage: 0.2,
    cloudDarkness: 0,
    rainIntensity: 0,
    snowIntensity: 0,
    fogIntensity: 0,
    wetness: 0,
    windStrength: 0.2,
    sandWindIntensity: 0,
    lightningFlash: 0,
    thunderTriggered: false,
    boltOriginX: 0,
    boltOriginZ: 0,
    ...overrides,
  } as IWeatherStateSnapshot;
}

describe('weatherEase - easeToward', () => {
  it('should move at most the rate times dt toward the target', () => {
    assert.equal(easeToward(0, 1, 0.25, 0.5), 0.125);
  });

  it('should land exactly on the target when close', () => {
    assert.equal(easeToward(0.95, 1, 0.25, 0.5), 1);
  });

  it('should move down toward a lower target', () => {
    assert.equal(easeToward(1, 0, 0.25, 0.5), 0.875);
  });
});

describe('weatherEase - easeWeatherSnapshot (WX1)', () => {
  it('should use the target at once on the first step', () => {
    const target = weather({ rainIntensity: 1 });
    assert.equal(easeWeatherSnapshot(null, target, 0.016), target);
  });

  it('should not jump rain from 0 to 1 in one step', () => {
    const current = weather({ rainIntensity: 0 });
    const target = weather({ rainIntensity: 1, weatherKind: 'regional_rain' });
    const next = easeWeatherSnapshot(current, target, 1 / 60);
    assert.ok(next.rainIntensity > 0 && next.rainIntensity < 0.1, `rain eased to ${next.rainIntensity}`);
  });

  it('should reach the full value after a few seconds', () => {
    let current = weather({ rainIntensity: 0 });
    const target = weather({ rainIntensity: 1, weatherKind: 'regional_rain' });
    for (let i = 0; i < 300; i++) current = easeWeatherSnapshot(current, target, 1 / 60);
    assert.equal(current.rainIntensity, 1);
  });

  it('should pass discrete values through from the target', () => {
    const current = weather({ weatherKind: 'clear_clouds', weatherLabel: 'Clear' });
    const target = weather({ weatherKind: 'regional_rain', weatherLabel: 'Rain', lightningFlash: 1, thunderTriggered: true });
    const next = easeWeatherSnapshot(current, target, 1 / 60);
    assert.equal(next.weatherKind, 'regional_rain');
    assert.equal(next.weatherLabel, 'Rain');
    assert.equal(next.lightningFlash, 1);
    assert.equal(next.thunderTriggered, true);
  });

  it('should ease wetness more slowly than rain', () => {
    const current = weather({ wetness: 0, rainIntensity: 0 });
    const target = weather({ wetness: 1, rainIntensity: 1 });
    const next = easeWeatherSnapshot(current, target, 1);
    assert.ok(next.wetness < next.rainIntensity, 'wetness should lag behind rain');
  });
});
