// ============================================================================
// MODULE: Core / Telemetry Store
// DESIGN: External observable store for high-frequency player telemetry updates (SRP, ISP)
// SUMMARY: Decouples 100ms telemetry sampling updates from the React App tree,
//          preventing full-tree re-renders and isolating re-renders to subscriber HUDs.
// ============================================================================

// ======================== IMPORTS & TYPES ======================== \\
// #region Imports & Types
import { useSyncExternalStore } from 'react';
import { WORLD_SPAWN } from '../world/terrainMath';
import type { ITelemetrySnapshot, TelemetrySnapshot } from '../components/WorldCanvas';

export const INITIAL_TELEMETRY_SNAPSHOT: TelemetrySnapshot = Object.freeze({
  x: WORLD_SPAWN.x,
  y: 2.15,
  z: WORLD_SPAWN.z,
  yawDeg: 0,
  distanceWalked: 0,
  stepCount: 0,
  biome: 'trail',
  walkPace: 'normal',
  timeString: '06:40',
  phaseLabelHe: 'זריחה וערפל בוקר',
  sunElevationDeg: 14,
  pointerLocked: false,
  isFlying: false,
});

export interface ITelemetryStore {
  readonly getSnapshot: () => TelemetrySnapshot;
  readonly setSnapshot: (next: TelemetrySnapshot) => void;
  readonly subscribe: (listener: () => void) => () => void;
}
// #endregion

// ======================== STORE IMPLEMENTATION ======================== \\
// #region Store Implementation
/**
 * Design: High-performance singleton observable store for 100ms game telemetry updates.
 * Summary: Manages current snapshot reference and listener dispatch without triggering root component re-renders.
 */
class TelemetryStore implements ITelemetryStore {
  private currentSnapshot: TelemetrySnapshot = INITIAL_TELEMETRY_SNAPSHOT;
  private readonly listeners = new Set<() => void>();

  /**
   * Summary: Returns the current immutable telemetry snapshot.
   * @returns TelemetrySnapshot
   */
  public getSnapshot = (): TelemetrySnapshot => {
    return this.currentSnapshot;
  };

  /**
   * Summary: Updates the current telemetry snapshot and dispatches to subscribed listeners.
   * @param next - Updated telemetry snapshot from game physics/world tick
   */
  public setSnapshot = (next: TelemetrySnapshot): void => {
    this.currentSnapshot = next;
    for (const listener of this.listeners) {
      listener();
    }
  };

  /**
   * Summary: Registers a subscription callback for state changes.
   * @param listener - Callback triggered on snapshot changes
   * @returns Unsubscribe cleanup callback
   */
  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

export const telemetryStore: ITelemetryStore = new TelemetryStore();

/**
 * Design: React hook providing selective reactivity to telemetry changes via useSyncExternalStore.
 * Summary: Subscribes the caller component to telemetry updates without re-rendering parent components.
 * @returns TelemetrySnapshot
 */
export function useTelemetry(): TelemetrySnapshot {
  return useSyncExternalStore(telemetryStore.subscribe, telemetryStore.getSnapshot);
}
// #endregion
