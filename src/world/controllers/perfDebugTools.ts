// ============================================================================
// MODULE: World / Controllers / Performance Debug Tools
// DESIGN: Owns the debug surface of the game: the F4 timing overlay and the browser hooks (SRP)
// SUMMARY: Installs window.getPerfStats and window.auditColliders, and toggles a text panel with frame, render,
//          simulation and draw-call timings. The canvas only creates the tools, calls toggleOverlay(), and dispose().
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import type * as THREE from 'three';
import type { PerfStats } from '../../core/perfStats';
import { formatPerfStats } from '../../core/perfStats';
import { auditColliderCoverage } from '../builders/colliderAudit';
import type { ISolidBuildingBox } from '../domain/worldTypes';
// #endregion

// ======================== CONTRACTS ======================== \\
// #region Contracts
export interface IPerfDebugToolsOptions {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly perfStats: PerfStats;
  readonly colliders: readonly ISolidBuildingBox[];
}

/** Summary: The debug surface of one running world. */
export interface IPerfDebugTools {
  /** Shows the timing panel, or hides it when it is already shown (F4). */
  toggleOverlay(): void;
  /** Hides the panel, stops its refresh, and leaves the browser hooks in place for the page. */
  dispose(): void;
}
// #endregion

// ======================== FACTORY ======================== \\
// #region Factory
/** Summary: Counts point lights in the scene (each adds per-pixel cost to every lit material). */
function countPointLights(scene: THREE.Scene): number {
  let count = 0;
  scene.traverse((obj) => {
    if ((obj as THREE.PointLight).isPointLight) count++;
  });
  return count;
}

/**
 * Summary: Creates the debug tools and installs the browser hooks (`window.getPerfStats`, `window.auditColliders`).
 */
export function createPerfDebugTools(options: IPerfDebugToolsOptions): IPerfDebugTools {
  const { renderer, scene, perfStats, colliders } = options;
  let panel: HTMLPreElement | null = null;
  let timer = 0;

  (window as unknown as { getPerfStats?: () => unknown }).getPerfStats = () => ({
    ...perfStats.snapshot(),
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    programs: renderer.info.programs?.length ?? 0,
    pointLights: countPointLights(scene),
  });
  (window as unknown as { auditColliders?: () => unknown }).auditColliders = () =>
    auditColliderCoverage(scene, colliders);

  const hidePanel = (): void => {
    window.clearInterval(timer);
    panel?.remove();
    panel = null;
  };

  return {
    toggleOverlay(): void {
      if (panel) {
        hidePanel();
        return;
      }
      const el = document.createElement('pre');
      el.setAttribute('data-testid', 'perf-overlay');
      el.style.cssText =
        'position:fixed;top:8px;left:8px;z-index:9999;margin:0;padding:6px 8px;background:rgba(0,0,0,0.7);color:#e5e7eb;font:12px/1.4 monospace;pointer-events:none;border-radius:4px;';
      document.body.appendChild(el);
      panel = el;
      const refresh = (): void => {
        el.textContent = formatPerfStats(perfStats.snapshot(), {
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          pointLights: countPointLights(scene),
        });
      };
      refresh();
      timer = window.setInterval(refresh, 500);
    },
    dispose(): void {
      hidePanel();
    },
  };
}
// #endregion
