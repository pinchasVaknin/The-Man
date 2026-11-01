// ============================================================================
// MODULE: World / Controllers / Frame Schedulers
// DESIGN: Browser adapters for the core IFrameScheduler contract (humble objects)
// SUMMARY: requestAnimationFrame pacing for GPU-backed WebGL, and GPU-fence pacing for
//          software WebGL so a slow rasterizer is never flooded with queued frames.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type { IFrameScheduler } from '../../core/gameLoop';
// #endregion

// ======================== CONSTANTS ======================== \\
// #region Constants
/** Poll interval while waiting for the GPU fence to signal. */
const FENCE_POLL_INTERVAL_MS = 5;
/** Breathing gap after a software-rendered frame finishes. */
const SOFTWARE_FRAME_GAP_MS = 80;
// #endregion

// ======================== ANIMATION FRAME SCHEDULER ======================== \\
// #region Animation Frame Scheduler
/**
 * Summary: Schedules frames with window.requestAnimationFrame.
 */
export function createAnimationFrameScheduler(): IFrameScheduler {
  let handle = 0;
  return {
    request(callback) {
      handle = requestAnimationFrame(callback);
    },
    cancel() {
      cancelAnimationFrame(handle);
    },
  };
}
// #endregion

// ======================== GPU FENCE SCHEDULER ======================== \\
// #region GPU Fence Scheduler
/**
 * Summary: Schedules the next frame only after the GPU finished the previous one.
 * Design: The first frame uses requestAnimationFrame; later frames wait on a fence sync,
 *         then pause briefly, which keeps software WebGL (SwiftShader) responsive.
 */
export function createGpuFencePacedScheduler(gl: WebGL2RenderingContext): IFrameScheduler {
  let animationHandle = 0;
  let timeoutHandle = 0;
  let hasRequestedFirstFrame = false;
  return {
    request(callback) {
      if (!hasRequestedFirstFrame) {
        hasRequestedFirstFrame = true;
        animationHandle = requestAnimationFrame(callback);
        return;
      }
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          timeoutHandle = window.setTimeout(poll, FENCE_POLL_INTERVAL_MS);
        } else {
          if (sync) gl.deleteSync(sync);
          timeoutHandle = window.setTimeout(callback, SOFTWARE_FRAME_GAP_MS);
        }
      };
      timeoutHandle = window.setTimeout(poll, FENCE_POLL_INTERVAL_MS);
    },
    cancel() {
      cancelAnimationFrame(animationHandle);
      clearTimeout(timeoutHandle);
    },
  };
}
// #endregion
