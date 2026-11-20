// ============================================================================
// MODULE: World / Domain / Mount Prompt
// DESIGN: Pure mapping from the id of what the player rides (or stands next to) to a locale key, so the
//         HUD prompt names the actual mount instead of always saying "horse"
// SUMMARY: Returns the translation key of the interact prompt for a mount: "Dismount Hoverbike",
//          "Ride CatLion", "Drop Anchor / Disembark" and so on. Holds no text and no UI.
// ============================================================================

// ======================== CONSTANTS & TYPES ======================== \
// #region Constants & Types
const SHIP_ID = 'sailable-ship';
const HOVERBIKE_ID = 'sky-hoverbike';
const STAG_ID_PREFIX = 'mount-stag-';
const LION_ID_PREFIX = 'mount-lion-';

type MountKind = 'ship' | 'hoverbike' | 'stag' | 'lion' | 'horse';
// #endregion

// ======================== PUBLIC PROMPT ======================== \
// #region Mount Prompt Key
function classifyMount(id: string): MountKind {
  if (id === SHIP_ID) return 'ship';
  if (id === HOVERBIKE_ID) return 'hoverbike';
  if (id.startsWith(STAG_ID_PREFIX)) return 'stag';
  if (id.startsWith(LION_ID_PREFIX)) return 'lion';
  return 'horse';
}

/**
 * Summary: The locale key of the prompt for the mount the player is on, or next to.
 * @param mountedId Id of the mount the player is riding, if any.
 * @param nearbyId Id of the mount within reach, if any (used when nothing is ridden).
 * @returns A `hud.*` key; the horse prompt when there is no mount at all.
 */
export function getMountPromptKey(mountedId: string | null | undefined, nearbyId: string | null | undefined): string {
  if (mountedId) {
    return {
      ship: 'hud.disembark_ship',
      hoverbike: 'hud.dismount_hoverbike',
      stag: 'hud.dismount_stag',
      lion: 'hud.dismount_lion',
      horse: 'hud.dismount_horse',
    }[classifyMount(mountedId)];
  }
  if (nearbyId) {
    return {
      ship: 'hud.sail_ship',
      hoverbike: 'hud.ride_hoverbike',
      stag: 'hud.ride_stag',
      lion: 'hud.ride_lion',
      horse: 'hud.ride_horse',
    }[classifyMount(nearbyId)];
  }
  return 'hud.ride_horse';
}
// #endregion
