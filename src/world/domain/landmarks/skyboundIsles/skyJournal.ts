// ============================================================================
// MODULE: World / Domain / Landmarks / Skybound Isles — Captain's journal
// DESIGN: The journal is a readable object, not a puzzle: looking at it and pressing E opens a panel
//         with a few lines of the captain's last log; E again closes it. The open state is only a
//         view, so it is not saved. The text is kept in the locale file.
// SUMMARY: Journal reach and facing, the open journal panel state, and its lines.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports
import { AIRSHIP_JOURNAL } from './airshipWreckLayout';
// #endregion

// ======================== CONSTANTS & TYPES ======================== \\
// #region Types
/** Summary: The journal the player has open, with its localized text. */
export interface ISkyJournalView {
  readonly id: string;
  readonly titleKey: string;
  readonly lineKeys: readonly string[];
}
// #endregion

// #region Tuning
/** Reach (m) from the player to the journal for reading. */
const READ_REACH_M = 2.2;
/** Largest height difference (m) between the player's feet and the journal. */
const READ_HEIGHT_M = 1.5;
/** Smallest cosine between the aim and the journal (roughly a 70 degree cone). */
const READ_MIN_DOT = 0.35;
// #endregion

// ======================== MODULE STATE ======================== \\
// #region State
const AIRSHIP_JOURNAL_VIEW: ISkyJournalView = {
  id: AIRSHIP_JOURNAL.id,
  titleKey: 'journal.airship.title',
  lineKeys: ['journal.airship.line_1', 'journal.airship.line_2', 'journal.airship.line_3', 'journal.airship.line_4'],
};
let openView: ISkyJournalView | null = null;
// #endregion

// ======================== PUBLIC API ======================== \\
// #region Reading
/**
 * Summary: Finds the journal the player is facing, within reading reach.
 * @param x Player feet X.
 * @param feetY Player feet Y.
 * @param z Player feet Z.
 * @param yaw Player yaw (forward is (-sin yaw, -cos yaw)).
 * @returns The journal, or null when none is in front of the player.
 */
export function findReadableSkyJournal(x: number, feetY: number, z: number, yaw: number): ISkyJournalView | null {
  if (Math.abs(feetY - AIRSHIP_JOURNAL.y) > READ_HEIGHT_M) return null;
  const dx = AIRSHIP_JOURNAL.x - x;
  const dz = AIRSHIP_JOURNAL.z - z;
  const dist = Math.hypot(dx, dz);
  if (dist > READ_REACH_M) return null;
  const fwdX = -Math.sin(yaw);
  const fwdZ = -Math.cos(yaw);
  if (dist > 0.6 && (dx * fwdX + dz * fwdZ) / dist < READ_MIN_DOT) return null;
  return AIRSHIP_JOURNAL_VIEW;
}

/** Summary: The journal currently open in the panel, or null. */
export function getOpenSkyJournal(): ISkyJournalView | null {
  return openView;
}

/** Summary: Opens a journal's panel. */
export function openSkyJournal(view: ISkyJournalView): void {
  openView = view;
}

/** Summary: Closes the open journal panel (no-op when none is open). */
export function closeSkyJournal(): void {
  openView = null;
}
// #endregion
