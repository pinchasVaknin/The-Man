import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isWorldPausedByMenu } from './uiPause';

describe('uiPause - isWorldPausedByMenu', () => {
  it('should pause while the inventory or trade menu is open', () => {
    assert.equal(isWorldPausedByMenu({ skyrimModalOpen: 'true' }), true);
  });

  it('should pause while the world map is open', () => {
    assert.equal(isWorldPausedByMenu({ worldMapModalOpen: 'true' }), true);
  });

  it('should run when no menu is open', () => {
    assert.equal(isWorldPausedByMenu({ skyrimModalOpen: 'false', worldMapModalOpen: 'false' }), false);
    assert.equal(isWorldPausedByMenu({}), false);
  });
});
