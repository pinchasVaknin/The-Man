// ============================================================================
// MODULE: World / Domain / Rest And Ride State
// DESIGN: Where the player is while resting in a bed or riding a minecart (SRP)
// SUMMARY: Whether the player sleeps, the bed in use and where the player was before sleeping, and the minecart being
//          ridden. Replaces loose variables in the canvas so these states have one owner and one shape.
// ============================================================================

// #region Contracts
/** Summary: A position in the world. */
export interface IRestPosition {
  x: number;
  y: number;
  z: number;
}

/** Summary: The bed the player is sleeping in, with its facing when known. */
export interface ISleepingBed extends IRestPosition {
  yaw?: number;
}

/** Summary: The minecart the player is riding on a line, and where it is along the line. */
export interface IMinecartRide {
  lineId: string;
  lineName: string;
  u: number;
  velocity: number;
  wheelAngle: number;
  facingSign: 1 | -1;
}

/** Summary: Mutable rest and ride state of one running world. */
export interface IRestAndRideState {
  isSleepingInBed: boolean;
  activeSleepingBed: ISleepingBed | null;
  /** Where the player was before lying down, so waking returns them to it. */
  preSleepPlayerPos: IRestPosition | null;
  activeMinecartRide: IMinecartRide | null;
}

/** Summary: A fresh state with the player awake, on foot, and not in a minecart. */
export function createRestAndRideState(): IRestAndRideState {
  return {
    isSleepingInBed: false,
    activeSleepingBed: null,
    preSleepPlayerPos: null,
    activeMinecartRide: null,
  };
}
// #endregion
