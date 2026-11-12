import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decodeRevealedMap, encodeRevealedMap } from './mapExploration';

describe('mapExploration - encodeRevealedMap / decodeRevealedMap (S4)', () => {
  it('should round-trip an empty map', () => {
    const grid = new Uint8Array(1000);
    const back = decodeRevealedMap(encodeRevealedMap(grid), 1000);
    assert.ok(back);
    assert.deepEqual(back, grid);
  });

  it('should round-trip a partly explored map with soft edges', () => {
    const grid = new Uint8Array(5000);
    grid.fill(255, 100, 2000);
    grid.fill(128, 2000, 2100);
    grid[4999] = 7;
    const back = decodeRevealedMap(encodeRevealedMap(grid), 5000);
    assert.ok(back);
    assert.deepEqual(back, grid);
  });

  it('should store a mostly-empty map in a small string', () => {
    const grid = new Uint8Array(1080 * 1080);
    grid.fill(255, 0, 40000);
    const encoded = encodeRevealedMap(grid);
    assert.ok(encoded.length < 1000, `expected a small save, got ${encoded.length} characters`);
  });

  it('should reject text that does not cover exactly the expected cells', () => {
    const encoded = encodeRevealedMap(new Uint8Array(100));
    assert.equal(decodeRevealedMap(encoded, 200), null);
  });

  it('should reject missing or malformed text', () => {
    assert.equal(decodeRevealedMap(undefined, 10), null);
    assert.equal(decodeRevealedMap('', 10), null);
    assert.equal(decodeRevealedMap('!!not base64!!', 10), null);
  });
});
