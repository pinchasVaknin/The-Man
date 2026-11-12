// ============================================================================
// MODULE: World / Domain / UI Pause
// DESIGN: Decides when the world simulation pauses for an open menu (UI2), from the flags the UI writes (SRP)
// SUMMARY: The inventory, trade and world-map menus set `data-skyrim-modal-open` and `data-world-map-modal-open`
//          on the body. While either is 'true', the world does not advance.
// ============================================================================

/** Summary: The body dataset flags the UI writes when a menu is open. */
export interface IMenuFlags {
  readonly skyrimModalOpen?: string;
  readonly worldMapModalOpen?: string;
}

/**
 * Summary: True while an inventory, trade or world-map menu is open. The simulation holds still then.
 */
export function isWorldPausedByMenu(flags: IMenuFlags): boolean {
  return flags.skyrimModalOpen === 'true' || flags.worldMapModalOpen === 'true';
}
