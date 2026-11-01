// ============================================================================
// MODULE: Lab / Catalog Characterization Tests
// DESIGN: Golden-master test that pins the editor labels for every lab entity
// SUMMARY: Records getEntityEditorLabels for each catalog entity before its switch is
//          replaced by a lookup map.
// ============================================================================

// ======================== IMPORTS & TEST DEPENDENCIES ======================== \\
// #region Imports & Test Dependencies
import { test } from 'node:test';
import { assertMatchesGolden } from '../testSupport/goldenMaster';
import { getEntityEditorLabels, LAB_ENTITIES } from './labCatalog';
// #endregion

// ======================== EDITOR LABELS ======================== \\
// #region Editor Labels
test('entityEditorLabels_WhenEvaluatedForEveryEntity_ShouldMatchGolden', () => {
  // Arrange
  const entityIds = [...LAB_ENTITIES.map((entity) => entity.id), 'unknown_entity'];

  // Act
  const table = entityIds.map((entityId) => ({ entityId, labels: getEntityEditorLabels(entityId) }));

  // Assert
  assertMatchesGolden(new URL('./__golden__/entity-editor-labels.json', import.meta.url), table);
});
// #endregion
