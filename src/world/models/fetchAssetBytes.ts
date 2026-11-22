// ============================================================================
// MODULE: World / Models / Asset Fetch Helper
// DESIGN: Concurrency-bounded fetch with HTTP 429/503 retry backoff (SRP)
// SUMMARY: Prevents bursting 30+ parallel GLB downloads on startup and recovers
//          automatically if an edge proxy returns HTTP 429 Too Many Requests.
// ============================================================================

// ======================== CONSTANTS ======================== \\
// #region Constants
import { InfrastructureCorruptedException } from '../../core/AppException';

const MAX_CONCURRENT_ASSET_FETCHES = 4;
const MAX_RETRY_ATTEMPTS = 4;
const BASE_RETRY_DELAY_MS = 350;
// #endregion

// ======================== CONCURRENCY QUEUE & RETRY ======================== \\
// #region Concurrency Queue & Retry
let activeFetches = 0;
const waitQueue: Array<() => void> = [];

function acquireFetchSlot(): Promise<void> {
  if (activeFetches < MAX_CONCURRENT_ASSET_FETCHES) {
    activeFetches += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waitQueue.push(() => {
      activeFetches += 1;
      resolve();
    });
  });
}

function releaseFetchSlot(): void {
  activeFetches = Math.max(0, activeFetches - 1);
  const next = waitQueue.shift();
  if (next) next();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryDelayMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(8000, Math.ceil(seconds * 1000));
    }
  }
  const jitter = Math.floor(Math.random() * 150);
  return BASE_RETRY_DELAY_MS * Math.pow(2, attempt) + jitter;
}

/**
 * Summary: Downloads a binary GLB asset using a bounded concurrency pool (max 4 in flight)
 *          and exponential backoff retries on HTTP 429 / 503 or transient network failures.
 */
export async function fetchAssetBytes(url: string, label: string): Promise<ArrayBuffer> {
  await acquireFetchSlot();
  try {
    for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return await response.arrayBuffer();
        }
        const retryable = response.status === 429 || response.status === 503 || response.status === 502;
        if (retryable && attempt < MAX_RETRY_ATTEMPTS) {
          await sleep(parseRetryDelayMs(response, attempt));
          continue;
        }
        throw new InfrastructureCorruptedException(
          `${label} could not be downloaded (${response.status}).`
        );
      } catch (err: unknown) {
        if (err instanceof InfrastructureCorruptedException) {
          throw err;
        }
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await sleep(BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        throw new InfrastructureCorruptedException(
          `${label} could not be downloaded (${String(err)}).`
        );
      }
    }
    throw new InfrastructureCorruptedException(`${label} could not be downloaded.`);
  } finally {
    releaseFetchSlot();
  }
}
// #endregion
