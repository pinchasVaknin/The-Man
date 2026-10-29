// ============================================================================
// MODULE: Test / Core / Telemetry Store Specification
// DESIGN: Unit verification for external store subscription & snapshot updates (AAA)
// SUMMARY: Validates initial snapshot, subscriber notification on update, and unsubscription.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  telemetryStore,
  INITIAL_TELEMETRY_SNAPSHOT,
} from './telemetryStore';
import type { TelemetrySnapshot } from '../components/WorldCanvas';

test('getSnapshot_WhenInitialized_ShouldReturnInitialSnapshot', () => {
  // Arrange & Act
  const snapshot = telemetryStore.getSnapshot();

  // Assert
  assert.equal(snapshot.timeString, INITIAL_TELEMETRY_SNAPSHOT.timeString);
  assert.equal(snapshot.isFlying, false);
});

test('setSnapshot_WhenUpdated_ShouldNotifySubscriberAndReflectNewState', () => {
  // Arrange
  let notificationCount = 0;
  const unsubscribe = telemetryStore.subscribe(() => {
    notificationCount++;
  });
  const updatedSnapshot: TelemetrySnapshot = {
    ...INITIAL_TELEMETRY_SNAPSHOT,
    x: 100.5,
    distanceWalked: 42.0,
    timeString: '12:00',
  };

  // Act
  telemetryStore.setSnapshot(updatedSnapshot);
  const current = telemetryStore.getSnapshot();

  // Assert
  assert.equal(notificationCount, 1);
  assert.equal(current.x, 100.5);
  assert.equal(current.distanceWalked, 42.0);
  assert.equal(current.timeString, '12:00');

  // Cleanup
  unsubscribe();
});

test('subscribe_WhenUnsubscribed_ShouldNoLongerTriggerCallback', () => {
  // Arrange
  let notificationCount = 0;
  const unsubscribe = telemetryStore.subscribe(() => {
    notificationCount++;
  });
  unsubscribe();

  // Act
  telemetryStore.setSnapshot({
    ...INITIAL_TELEMETRY_SNAPSHOT,
    x: 250.0,
  });

  // Assert
  assert.equal(notificationCount, 0);
});
