// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles
// DESIGN: One small state object for every archipelago puzzle, kept here (like the cloud
//         runtimes) and saved with the world. Mechanisms are things the player activates
//         with the interact key; each one belongs to a puzzle. Gates are boxes that block
//         only while their puzzle is unsolved; the physics step pushes the player out of them.
// SUMMARY: Puzzle state, the mechanisms the player can use, activation rules, closed gates,
//          and save/restore of the state: Observatory rings, Crystal resonance, Ruins runes and
//          the Wind Cores.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { OBSERVATORY_CHAMBER_GATE, OBSERVATORY_LEVERS } from './observatoryLayout';
import { CRYSTAL_PASSAGE_GATE, RESONANCE_CRYSTALS, RESONANCE_ORDER } from './crystalIslesLayout';
import { RUINS_RUNES, RUINS_TEMPLE_DOOR } from './ancientRuinsLayout';
import { WIND_CORES } from './windCoresLayout';
import { AIRSHIP_CRATE_GATE, AIRSHIP_CRATE_PUSH_POINT, AIRSHIP_NAVIGATION_LEVER } from './airshipWreckLayout';
import { getSkyIsland } from './skyboundLayout';
import type { ISkySolidBox } from './skyHarborLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: Ids of the archipelago puzzles. */
export type SkyPuzzleId = 'observatory-rings' | 'crystal-resonance' | 'ruins-temple' | 'airship-navigation' | 'airship-hatch';

/** Summary: What a mechanism belongs to: a puzzle, or the Wind Core progression. */
export type SkyMechanismGroup = SkyPuzzleId | 'wind-cores';

const KNOWN_PUZZLES: readonly SkyPuzzleId[] = ['observatory-rings', 'crystal-resonance', 'ruins-temple', 'airship-navigation', 'airship-hatch'];

/** Summary: Saved state of every archipelago puzzle. */
export interface ISkyPuzzleState {
  /** Step (0..5) of the outer, middle and inner armillary ring. */
  observatoryRings: [number, number, number];
  /** How many resonance crystals have been touched in the right order so far (0..3). */
  crystalResonanceProgress: number;
  /** Ids of the Ruins temple runes awakened so far (any order). */
  ruinsRunesLit: string[];
  /** Ids of the Wind Cores activated so far (any order). */
  windCoresActive: string[];
  solved: SkyPuzzleId[];
}

/** Summary: Something the player activates with the interact key. */
export interface ISkyMechanism {
  readonly id: string;
  readonly puzzleId: SkyMechanismGroup;
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
  /** A sequence puzzle was answered wrongly and started over. */
  readonly sequenceReset: boolean;
  /** Ruins runes awake after this activation (0 when the mechanism is not a rune). */
  readonly runesLit: number;
  /** Wind Cores active after this activation (0 when the mechanism is not a core). */
  readonly coresActive: number;
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
export const SKY_MECHANISMS: readonly ISkyMechanism[] = [
  {
    id: AIRSHIP_CRATE_PUSH_POINT.id,
    puzzleId: 'airship-hatch' as const,
    x: AIRSHIP_CRATE_PUSH_POINT.x,
    y: AIRSHIP_CRATE_PUSH_POINT.y,
    z: AIRSHIP_CRATE_PUSH_POINT.z,
    interactRadius: 2.6,
    labelKey: 'hud.sky_push_crate',
  },
  {
    id: AIRSHIP_NAVIGATION_LEVER.id,
    puzzleId: 'airship-navigation' as const,
    x: AIRSHIP_NAVIGATION_LEVER.x,
    y: AIRSHIP_NAVIGATION_LEVER.y,
    z: AIRSHIP_NAVIGATION_LEVER.z,
    interactRadius: 2.4,
    labelKey: 'hud.sky_pull_navigation',
  },
  ...OBSERVATORY_LEVERS.map((l) => ({
    id: l.id,
    puzzleId: 'observatory-rings' as const,
    x: l.x,
    y: OBSERVATORY_DECK_Y,
    z: l.z,
    interactRadius: 2.4,
    labelKey: LEVER_LABELS[l.ringIndex],
  })),
  ...RESONANCE_CRYSTALS.map((c) => ({
    id: c.id,
    puzzleId: 'crystal-resonance' as const,
    x: c.x,
    y: c.y,
    z: c.z,
    interactRadius: 2.6,
    labelKey: 'hud.sky_touch_crystal',
  })),
  ...RUINS_RUNES.map((r) => ({
    id: r.id,
    puzzleId: 'ruins-temple' as const,
    x: r.x,
    y: r.y,
    z: r.z,
    interactRadius: 2.4,
    labelKey: 'hud.sky_awaken_rune',
  })),
  ...WIND_CORES.map((c) => ({
    id: c.id,
    puzzleId: 'wind-cores' as const,
    x: c.x,
    y: c.y,
    z: c.z,
    interactRadius: 2.4,
    labelKey: 'hud.sky_activate_wind_core',
  })),
];

/** Summary: Number of runes that open the Ruins temple door. */
export const RUINS_RUNE_COUNT = RUINS_RUNES.length;

/** Summary: Gates and the puzzle that opens each. */
const SKY_GATES: ReadonlyArray<{ readonly puzzleId: SkyPuzzleId; readonly box: ISkySolidBox }> = [
  { puzzleId: 'observatory-rings', box: OBSERVATORY_CHAMBER_GATE },
  { puzzleId: 'crystal-resonance', box: CRYSTAL_PASSAGE_GATE },
  { puzzleId: 'ruins-temple', box: RUINS_TEMPLE_DOOR },
  { puzzleId: 'airship-hatch', box: AIRSHIP_CRATE_GATE },
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
  return { observatoryRings: [0, 0, 0], crystalResonanceProgress: 0, ruinsRunesLit: [], windCoresActive: [], solved: [] };
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
  return {
    observatoryRings: [...state.observatoryRings],
    crystalResonanceProgress: state.crystalResonanceProgress,
    ruinsRunesLit: [...state.ruinsRunesLit],
    windCoresActive: [...state.windCoresActive],
    solved: [...state.solved],
  };
}

/**
 * Summary: Restores the state from a save file; anything missing or malformed starts unsolved.
 * @param saved The saved state, or undefined for an older save without puzzles.
 */
export function importSkyPuzzleState(saved: Partial<ISkyPuzzleState> | undefined): void {
  const fresh = createSkyPuzzleState();
  const rings = Array.isArray(saved?.observatoryRings) && saved.observatoryRings.length === 3 ? saved.observatoryRings : fresh.observatoryRings;
  const progress = Math.floor(Number(saved?.crystalResonanceProgress) || 0);
  state = {
    observatoryRings: [0, 1, 2].map((i) => normalizeStep(Number(rings[i]) || 0)) as [number, number, number],
    crystalResonanceProgress: Math.max(0, Math.min(RESONANCE_ORDER.length, progress)),
    ruinsRunesLit: Array.isArray(saved?.ruinsRunesLit) ? RUINS_RUNES.map((r) => r.id).filter((id) => saved.ruinsRunesLit!.includes(id)) : [],
    windCoresActive: Array.isArray(saved?.windCoresActive) ? WIND_CORES.map((c) => c.id).filter((id) => saved.windCoresActive!.includes(id)) : [],
    solved: Array.isArray(saved?.solved) ? saved.solved.filter((id): id is SkyPuzzleId => KNOWN_PUZZLES.includes(id as SkyPuzzleId)) : [],
  };
}

/** Summary: How many Wind Cores are active (drives the Windspire and its wind unlocks). */
export function getActiveWindCoreCount(): number {
  return state.windCoresActive.length;
}

/**
 * Summary: Whether a Wind Core is active.
 * @param id Wind Core id.
 */
export function isWindCoreActive(id: string): boolean {
  return state.windCoresActive.includes(id);
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
 * Summary: Uses a mechanism: turns an Observatory ring one step, touches a resonance crystal,
 *          awakens a Ruins rune (runes stay awake; all four open the temple), or activates a
 *          Wind Core.
 * Design: A solved puzzle locks its mechanisms. Touching a resonance crystal out of order
 *         silences them all and the sequence starts again from the first crystal.
 * @param id Mechanism id.
 * @returns Whether anything changed, which puzzle (if any) this solved, and whether a sequence reset.
 */
export function activateSkyMechanism(id: string): ISkyActivationResult {
  const lever = OBSERVATORY_LEVERS.find((l) => l.id === id);
  if (lever) return turnObservatoryRing(lever.ringIndex);
  if (RESONANCE_ORDER.includes(id)) return touchResonanceCrystal(id);
  if (RUINS_RUNES.some((r) => r.id === id)) return awakenRune(id);
  if (WIND_CORES.some((c) => c.id === id)) return activateWindCore(id);
  if (id === AIRSHIP_NAVIGATION_LEVER.id) return pullNavigationLever();
  if (id === AIRSHIP_CRATE_PUSH_POINT.id) return pushAirshipCrate();
  return NOTHING_CHANGED;
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
// #region Puzzle Rules
const NOTHING_CHANGED: ISkyActivationResult = { changed: false, solvedPuzzle: null, sequenceReset: false, runesLit: 0, coresActive: 0 };

function turnObservatoryRing(ringIndex: number): ISkyActivationResult {
  if (isSkyPuzzleSolved('observatory-rings')) return NOTHING_CHANGED;
  state.observatoryRings[ringIndex] = normalizeStep(state.observatoryRings[ringIndex] + 1);
  const solvedNow = state.observatoryRings.every((step, i) => step === OBSERVATORY_RING_SOLUTION[i]);
  if (solvedNow) state.solved.push('observatory-rings');
  return { changed: true, solvedPuzzle: solvedNow ? 'observatory-rings' : null, sequenceReset: false, runesLit: 0, coresActive: 0 };
}

function pushAirshipCrate(): ISkyActivationResult {
  if (isSkyPuzzleSolved('airship-hatch')) return NOTHING_CHANGED;
  state.solved.push('airship-hatch');
  return { changed: true, solvedPuzzle: 'airship-hatch', sequenceReset: false, runesLit: 0, coresActive: 0 };
}

function pullNavigationLever(): ISkyActivationResult {
  if (isSkyPuzzleSolved('airship-navigation')) return NOTHING_CHANGED;
  state.solved.push('airship-navigation');
  return { changed: true, solvedPuzzle: 'airship-navigation', sequenceReset: false, runesLit: 0, coresActive: 0 };
}

function touchResonanceCrystal(id: string): ISkyActivationResult {
  if (isSkyPuzzleSolved('crystal-resonance')) return NOTHING_CHANGED;
  if (RESONANCE_ORDER[state.crystalResonanceProgress] !== id) {
    // A wrong crystal silences the chord; touching the first crystal again counts as a fresh start.
    state.crystalResonanceProgress = RESONANCE_ORDER[0] === id ? 1 : 0;
    return { changed: true, solvedPuzzle: null, sequenceReset: true, runesLit: 0, coresActive: 0 };
  }
  state.crystalResonanceProgress += 1;
  const solvedNow = state.crystalResonanceProgress === RESONANCE_ORDER.length;
  if (solvedNow) state.solved.push('crystal-resonance');
  return { changed: true, solvedPuzzle: solvedNow ? 'crystal-resonance' : null, sequenceReset: false, runesLit: 0, coresActive: 0 };
}

function activateWindCore(id: string): ISkyActivationResult {
  if (state.windCoresActive.includes(id)) return { ...NOTHING_CHANGED, coresActive: state.windCoresActive.length };
  state.windCoresActive.push(id);
  return { changed: true, solvedPuzzle: null, sequenceReset: false, runesLit: 0, coresActive: state.windCoresActive.length };
}

function awakenRune(id: string): ISkyActivationResult {
  if (state.ruinsRunesLit.includes(id)) return { ...NOTHING_CHANGED, runesLit: state.ruinsRunesLit.length };
  state.ruinsRunesLit.push(id);
  const solvedNow = state.ruinsRunesLit.length === RUINS_RUNE_COUNT && !isSkyPuzzleSolved('ruins-temple');
  if (solvedNow) state.solved.push('ruins-temple');
  return { changed: true, solvedPuzzle: solvedNow ? 'ruins-temple' : null, sequenceReset: false, runesLit: state.ruinsRunesLit.length, coresActive: 0 };
}
// #endregion

// #region Helpers
function normalizeStep(step: number): number {
  return ((Math.round(step) % OBSERVATORY_RING_STEPS) + OBSERVATORY_RING_STEPS) % OBSERVATORY_RING_STEPS;
}
// #endregion
