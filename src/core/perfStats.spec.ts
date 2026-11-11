import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PerfStats, percentile, formatPerfStats } from './perfStats';

describe('perfStats - percentile', () => {
  it('should return the nearest-rank p95 of 1..100 as 95', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    assert.equal(percentile(values, 95), 95);
  });

  it('should return 0 for an empty list', () => {
    assert.equal(percentile([], 95), 0);
  });
});

describe('perfStats - recorder', () => {
  it('should summarise average, p95 and max per section', () => {
    const stats = new PerfStats();
    for (let i = 1; i <= 100; i++) stats.record('frame', i);
    const frame = stats.snapshot().sections.frame;
    assert.equal(frame.avg, 50.5);
    assert.equal(frame.p95, 95);
    assert.equal(frame.max, 100);
    assert.equal(frame.samples, 100);
  });

  it('should keep only the most recent samples inside the window', () => {
    const stats = new PerfStats(10);
    for (let i = 1; i <= 25; i++) stats.record('sim', i);
    const sim = stats.snapshot().sections.sim;
    assert.equal(sim.samples, 10);
    assert.equal(sim.max, 25);
    assert.equal(sim.avg, 20.5);
  });

  it('should ignore negative and non-finite durations', () => {
    const stats = new PerfStats();
    stats.record('render', -1);
    stats.record('render', Number.NaN);
    assert.deepEqual(stats.snapshot().sections, {});
  });
});

describe('perfStats - formatting', () => {
  it('should format each section and the extra counters as lines', () => {
    const stats = new PerfStats();
    stats.record('frame', 16);
    const text = formatPerfStats(stats.snapshot(), { drawCalls: 812 });
    assert.match(text, /frame\s+avg 16\.00/);
    assert.match(text, /drawCalls\s+812/);
  });
});
