// ============================================================================
// MODULE: Test / Sound Engine Specification
// DESIGN: Unit verification for NatureSoundEngine with dependency-injected ILogger (AAA)
// SUMMARY: Validates sound engine lifecycle, mute toggling, and logger delegation.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NatureSoundEngine } from './soundEngine';
import type { ILogger } from '../core/ILogger';

class MockLogger implements ILogger {
  public readonly warnings: { message: string; context?: Readonly<Record<string, unknown>> }[] = [];
  public readonly errors: { message: string; context?: Readonly<Record<string, unknown>> }[] = [];

  public debug(): void {}
  public info(): void {}
  public warn(message: string, context?: Readonly<Record<string, unknown>>): void {
    this.warnings.push({ message, context });
  }
  public error(message: string, context?: Readonly<Record<string, unknown>>): void {
    this.errors.push({ message, context });
  }
}

test('NatureSoundEngine_WhenConstructed_ShouldDefaultToUnmuted', () => {
  // Arrange
  const logger = new MockLogger();

  // Act
  const engine = new NatureSoundEngine(logger);

  // Assert
  assert.equal(engine.isMuted(), false);
});

test('setMuted_WhenMutedToggled_ShouldUpdateMutedState', () => {
  // Arrange
  const logger = new MockLogger();
  const engine = new NatureSoundEngine(logger);

  // Act
  engine.setMuted(true);

  // Assert
  assert.equal(engine.isMuted(), true);

  // Act 2
  engine.setMuted(false);

  // Assert 2
  assert.equal(engine.isMuted(), false);
});

test('dispose_WhenCalledOnUninitializedEngine_ShouldCompleteSafelyWithoutErrors', () => {
  // Arrange
  const logger = new MockLogger();
  const engine = new NatureSoundEngine(logger);

  // Act & Assert
  assert.doesNotThrow(() => {
    engine.dispose();
  });
  assert.equal(logger.errors.length, 0);
});

test('init_WhenExecutedInHeadlessNodeEnvironment_ShouldGracefullyHandleMissingAudioContext', () => {
  // Arrange
  const logger = new MockLogger();
  const engine = new NatureSoundEngine(logger);

  // Act & Assert (Should not throw uncaught error in Node.js where window.AudioContext is undefined)
  assert.doesNotThrow(() => {
    engine.init();
  });
});
