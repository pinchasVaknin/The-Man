// ============================================================================
// MODULE: Core / Yield To Browser
// DESIGN: One place that gives the browser a turn between long synchronous steps (SRP)
// SUMMARY: Resolves after a macrotask, so the browser can paint and handle input between world-build stages.
// ============================================================================

/** Summary: Waits one macrotask so the browser can paint and handle input before the next step runs. */
export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
