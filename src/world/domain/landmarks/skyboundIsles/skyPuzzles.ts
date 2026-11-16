// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: One small state object for every archipelago puzzle, kept here (like the cloud
//         runtimes) and saved with the world. Mechanisms are things the player activates
//         with the interact key; each one belongs to a puzzle. Gates are boxes that block
//         only while their puzzle is unsolved; the physics step pushes the player out of them.
// SUMMARY: Puzzle state, the mechanisms the player can use, activation rules, closed gates,
//          and save/restore of the state. The Observatory ring puzzle is the first puzzle.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { OBSERVATORY_CHAMBER_GATE, OBSERVATORY_LEVERS } from './observatoryLayout';
import { getSkyIsland } from './skyboundLayout';
import type { ISkySolidBox } from './skyHarborLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: Ids of the archipelago puzzles. */
export type SkyPuzzleId = 'observatory-rings';

/** Summary: Saved state of every archipelago puzzle. */
export interface ISkyPuzzleState {
  /** Step (0..5) of the outer, middle and inner armillary ring. */
  observatoryRings: [number, number, number];
  solved: SkyPuzzleId[];
}

/** Summary: Something the player activates with the interact key. */
export interface ISkyMechanism {
  readonly id: string;
  readonly puzzleId: SkyPuzzleId;
  readonly x: number;
  /** Floor height the mechanism stands on. */
  readonly y: number;
  readonly z: number;
  readonly interactRadius: number;
  /** Locale key of the HUD prompt (e.g. `hud.sky_turn_outer_ring`). */
  readonly labelKey: string;
}

/** Summary: What activating a mechanism did. */
export interface ISkyActivationResult {
  readonly changed: boolean;
  /** The puzzle this activation just solved, if any. */
  readonly solvedPuzzle: SkyPuzzleId | null;
}
// #endregion

// #region Observatory Puzzle
/** Summary: Each armillary ring turns in this many equal steps (60 degrees each). */
export const OBSERVATORY_RING_STEPS = 6;

/**
 * Summary: The ring steps that open the chamber, as shown on the tower's star map.
 * Design: Outer 2, middle 4, inner 1: no ring shares a step, so a random guess rarely works,
 *         and the mural inside the tower draws exactly these three marker angles.
 */
export const OBSERVATORY_RING_SOLUTION: readonly [number, number, number] = [2, 4, 1];

const LEVER_LABELS = ['hud.sky_turn_outer_ring', 'hud.sky_turn_middle_ring', 'hud.sky_turn_inner_ring'] as const;
const OBSERVATORY_DECK_Y = getSkyIsland('sky-observatory')!.deckY;
// #endregion

// #region Mechanisms And Gates
/** Summary: Every mechanism of every archipelago puzzle. */
export const SKY_MECHANISMS: readonly ISkyMechanism[] = OBSERVATORY_LEVERS.map((l) => ({
  id: l.id,
  puzzleId: 'observatory-rings',
  x: l.x,
  y: OBSERVATORY_DECK_Y,
  z: l.z,
  interactRadius: 2.4,
  labelKey: LEVER_LABELS[l.ringIndex],
}));

/** Summary: Gates and the puzzle that opens each. */
const SKY_GATES: ReadonlyArray<{ readonly puzzleId: SkyPuzzleId; readonly box: ISkySolidBox }> = [
  { puzzleId: 'observatory-rings', box: OBSERVATORY_CHAMBER_GATE },
];
// #endregion

// ======================== MODULE STATE ======================== \\
// #region State
let state: ISkyPuzzleState = createSkyPuzzleState();
// #endregion

// ======================== PUBLIC API ======================== \\
// #region State Access
/** Summary: A fresh, unsolved puzzle state. */
export function createSkyPuzzleState(): ISkyPuzzleState {
  return { observatoryRings: [0, 0, 0], solved: [] };
}

/** Summary: The live puzzle state (read-only view for renderers and the HUD). */
export function getSkyPuzzleState(): Readonly<ISkyPuzzleState> {
  return state;
}

/** Summary: Puts every puzzle back to unsolved (new world, tests). */
export function resetSkyPuzzles(): void {
  state = createSkyPuzzleState();
}

/** Summary: A copy of the state for the save file. */
export function exportSkyPuzzleState(): ISkyPuzzleState {
  return { observatoryRings: [...state.observatoryRings], solved: [...state.solved] };
}

/**
 * Summary: Restores the state from a save file; anything missing or malformed starts unsolved.
 * @param saved The saved state, or undefined for an older save without puzzles.
 */
export function importSkyPuzzleState(saved: Partial<ISkyPuzzleState> | undefined): void {
  const fresh = createSkyPuzzleState();
  const rings = Array.isArray(saved?.observatoryRings) && saved.observatoryRings.length === 3 ? saved.observatoryRings : fresh.observatoryRings;
  state = {
    observatoryRings: [0, 1, 2].map((i) => normalizeStep(Number(rings[i]) || 0)) as [number, number, number],
    solved: Array.isArray(saved?.solved) ? saved.solved.filter((id): id is SkyPuzzleId => id === 'observatory-rings') : [],
  };
}

/**
 * Summary: Whether a puzzle is solved.
 * @param id Puzzle id.
 */
export function isSkyPuzzleSolved(id: SkyPuzzleId): boolean {
  return state.solved.includes(id);
}
// #endregion

// #region Activation
/**
 * Summary: The nearest mechanism within its interact radius of the feet (same floor only).
 * @param x Feet X.
 * @param y Feet Y.
 * @param z Feet Z.
 * @returns The mechanism, or `null`.
 */
export function findNearestSkyMechanism(x: number, y: number, z: number): ISkyMechanism | null {
  let best: ISkyMechanism | null = null;
  let bestDist = Infinity;
  for (const m of SKY_MECHANISMS) {
    if (Math.abs(y - m.y) > 1.5) continue;
    const d = Math.hypot(x - m.x, z - m.z);
    if (d <= m.interactRadius && d < bestDist) {
      best = m;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Summary: Uses a mechanism: turns its ring one step and checks the solution.
 * Design: A solved puzzle locks its mechanisms, so the rings stay in the solved pose.
 * @param id Mechanism id.
 * @returns Whether anything changed and which puzzle (if any) this solved.
 */
export function activateSkyMechanism(id: string): ISkyActivationResult {
  const lever = OBSERVATORY_LEVERS.find((l) => l.id === id);
  if (!lever || isSkyPuzzleSolved('observatory-rings')) return { changed: false, solvedPuzzle: null };
  state.observatoryRings[lever.ringIndex] = normalizeStep(state.observatoryRings[lever.ringIndex] + 1);
  const solvedNow = state.observatoryRings.every((step, i) => step === OBSERVATORY_RING_SOLUTION[i]);
  if (solvedNow) state.solved.push('observatory-rings');
  return { changed: true, solvedPuzzle: solvedNow ? 'observatory-rings' : null };
}
// #endregion

// #region Gates
/** Summary: Gate boxes that still block (their puzzle is unsolved). */
export function closedSkyGates(): ISkySolidBox[] {
  return SKY_GATES.filter((g) => !isSkyPuzzleSolved(g.puzzleId)).map((g) => g.box);
}

/** Summary: Every gate box with its open state, for the renderer. */
export function skyGatesWithState(): ReadonlyArray<{ readonly box: ISkySolidBox; readonly open: boolean }> {
  return SKY_GATES.map((g) => ({ box: g.box, open: isSkyPuzzleSolved(g.puzzleId) }));
}
// #endregion

// ======================== PRIVATE HELPERS ======================== \\
// #region Helpers
function normalizeStep(step: number): number {
  return ((Math.round(step) % OBSERVATORY_RING_STEPS) + OBSERVATORY_RING_STEPS) % OBSERVATORY_RING_STEPS;
}
// #endregion
