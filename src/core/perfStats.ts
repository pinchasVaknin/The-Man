// ============================================================================
// MODULE: Core / Performance Statistics
// DESIGN: Rolling-window timing recorder with percentile summaries (SRP)
// SUMMARY: Keeps the last N samples per named section (frame, render, sim, ...)
//          and summarises them for the F4 overlay and window.getPerfStats().
// ============================================================================

// ======================== CONTRACTS ======================== \\
// #region Contracts
/** Summary: Summary of one timed section over the rolling window, in milliseconds. */
export interface IPerfSectionSummary {
  readonly avg: number;
  readonly p95: number;
  readonly max: number;
  readonly samples: number;
}

/** Summary: All sections recorded so far. */
export interface IPerfSnapshot {
  readonly sections: Readonly<Record<string, IPerfSectionSummary>>;
}
// #endregion

// ======================== PURE HELPERS ======================== \\
// #region Pure Helpers
/**
 * Summary: Nearest-rank percentile of a list of numbers (p in 0..100). Returns 0 for an empty list.
 */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const rank = Math.ceil((Math.min(100, Math.max(0, p)) / 100) * sorted.length);
  return sorted[Math.max(0, rank - 1)];
}

/**
 * Summary: Formats a snapshot as aligned text lines for the on-screen overlay.
 */
export function formatPerfStats(
  snapshot: IPerfSnapshot,
  extra: Readonly<Record<string, number | string>> = {}
): string {
  const lines: string[] = [];
  for (const [name, s] of Object.entries(snapshot.sections)) {
    lines.push(
      `${name.padEnd(8)} avg ${s.avg.toFixed(2)}  p95 ${s.p95.toFixed(2)}  max ${s.max.toFixed(2)} ms`
    );
  }
  for (const [key, value] of Object.entries(extra)) {
    lines.push(`${key.padEnd(8)} ${typeof value === 'number' ? value : value}`);
  }
  return lines.join('\n');
}
// #endregion

// ======================== RECORDER ======================== \\
// #region Recorder
/**
 * Summary: Rolling-window recorder. Each section keeps at most `windowSize` recent samples.
 */
export class PerfStats {
  private readonly samples = new Map<string, number[]>();

  constructor(private readonly windowSize = 240) {}

  /** Records one duration for a named section, dropping the oldest sample beyond the window. */
  record(section: string, ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    let list = this.samples.get(section);
    if (!list) {
      list = [];
      this.samples.set(section, list);
    }
    list.push(ms);
    if (list.length > this.windowSize) list.splice(0, list.length - this.windowSize);
  }

  /** Summarises every recorded section. */
  snapshot(): IPerfSnapshot {
    const sections: Record<string, IPerfSectionSummary> = {};
    for (const [name, list] of this.samples) {
      const total = list.reduce((sum, v) => sum + v, 0);
      sections[name] = {
        avg: list.length ? total / list.length : 0,
        p95: percentile(list, 95),
        max: list.length ? Math.max(...list) : 0,
        samples: list.length,
      };
    }
    return { sections };
  }

  /** Clears all samples. */
  reset(): void {
    this.samples.clear();
  }
}
// #endregion
