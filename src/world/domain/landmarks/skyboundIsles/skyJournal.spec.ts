// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles — Captain's journal (tests)
// DESIGN: Uses the real reach-and-facing lookup, the panel state and the locale text, so the journal
//         is proven readable only from in front, and its four lines are all present in the locale file.
// SUMMARY: The journal is readable from in front and within reach, the panel opens and closes, and every
//          line of the captain's log has its text.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AIRSHIP_JOURNAL } from './airshipWreckLayout';
import { closeSkyJournal, findReadableSkyJournal, getOpenSkyJournal, openSkyJournal } from './skyJournal';
import { t } from '../../../../locales';
// #endregion

// ======================== TEST FIXTURES & FACTORIES ======================== \\
// #region Fixtures
/** The player 1.5 m south of the journal, on the hull. */
const SOUTH_OF_JOURNAL = { x: AIRSHIP_JOURNAL.x, y: AIRSHIP_JOURNAL.y, z: AIRSHIP_JOURNAL.z - 1.5 };
/** Yaw that faces +z (towards the journal from the south). */
const FACING_JOURNAL = Math.PI;
// #endregion

// ======================== TESTS ======================== \\
beforeEach(() => {
  closeSkyJournal();
});

// #region Reading
describe('captain journal reading', () => {
  it('journal_WhenFacedFromWithinReach_ShouldBeReadable', () => {
    // Arrange / Act
    const found = findReadableSkyJournal(SOUTH_OF_JOURNAL.x, SOUTH_OF_JOURNAL.y, SOUTH_OF_JOURNAL.z, FACING_JOURNAL);
    // Assert
    assert.equal(found?.id, AIRSHIP_JOURNAL.id);
  });

  it('journal_WhenTheBackIsTurned_ShouldNotBeReadable', () => {
    // Arrange / Act: facing away (yaw 0 faces -z, away from the journal).
    const found = findReadableSkyJournal(SOUTH_OF_JOURNAL.x, SOUTH_OF_JOURNAL.y, SOUTH_OF_JOURNAL.z, 0);
    // Assert
    assert.equal(found, null);
  });

  it('journal_WhenFarAway_ShouldNotBeReadable', () => {
    // Arrange / Act
    const found = findReadableSkyJournal(AIRSHIP_JOURNAL.x, AIRSHIP_JOURNAL.y, AIRSHIP_JOURNAL.z - 4.0, FACING_JOURNAL);
    // Assert
    assert.equal(found, null);
  });
});
// #endregion

// #region Panel
describe('captain journal panel', () => {
  it('journalPanel_WhenOpened_ShouldShowItUntilClosed', () => {
    // Arrange
    const view = findReadableSkyJournal(SOUTH_OF_JOURNAL.x, SOUTH_OF_JOURNAL.y, SOUTH_OF_JOURNAL.z, FACING_JOURNAL)!;
    // Act
    openSkyJournal(view);
    const whileOpen = getOpenSkyJournal()?.id;
    closeSkyJournal();
    // Assert
    assert.equal(whileOpen, AIRSHIP_JOURNAL.id);
    assert.equal(getOpenSkyJournal(), null);
  });

  it('journalText_WhenLooked_ShouldHaveTitleAndFourLines', () => {
    // Arrange
    const view = findReadableSkyJournal(SOUTH_OF_JOURNAL.x, SOUTH_OF_JOURNAL.y, SOUTH_OF_JOURNAL.z, FACING_JOURNAL)!;
    // Act
    const text = [view.titleKey, ...view.lineKeys].map((k) => t(k));
    // Assert
    assert.equal(view.lineKeys.length, 4);
    for (const line of text) assert.notEqual(line, '', 'every journal line needs text');
    for (const [i, line] of text.entries()) assert.ok(!line.startsWith('journal.'), `line ${i} missing its locale text`);
  });
});
// #endregion
