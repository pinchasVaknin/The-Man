// ============================================================================
// MODULE: World / Domain / Map Exploration
// DESIGN: The revealed (explored) part of the map, saved between sessions (S4). Pure encoding plus one shared holder.
// SUMMARY: The map keeps one byte per cell: 0 unexplored, 255 fully revealed. The grid is run-length encoded and
//          base64 encoded into the world save, so a typical map is a small string instead of 1.2 MB.
// ============================================================================

/** Summary: Map cells per side (the explorer map's grid: 2160 m at 2 m per cell). */
export const MAP_EXPLORATION_SIDE = 1080;
/** Summary: Total cells in the revealed grid. */
export const MAP_EXPLORATION_CELLS = MAP_EXPLORATION_SIDE * MAP_EXPLORATION_SIDE;

/**
 * Summary: The one shared revealed grid. The minimap paints into it and the save reads it. It is null until the map
 * exists; it is replaced when a save is loaded or the world is reset.
 */
export const mapExplorationState: { revealed: Uint8Array | null } = { revealed: null };

/** Summary: Encodes the grid as run-length pairs (value, run length) in base64. */
export function encodeRevealedMap(grid: Uint8Array): string {
  const bytes: number[] = [];
  let i = 0;
  while (i < grid.length) {
    const value = grid[i];
    let run = 1;
    while (i + run < grid.length && grid[i + run] === value && run < 65535) run++;
    bytes.push(value, (run >> 8) & 0xff, run & 0xff);
    i += run;
  }
  return toBase64(Uint8Array.from(bytes));
}

/**
 * Summary: Decodes a grid saved by encodeRevealedMap.
 * @returns The grid, or null when the text is missing, malformed, or does not cover exactly `cells` cells.
 */
export function decodeRevealedMap(encoded: string | undefined | null, cells = MAP_EXPLORATION_CELLS): Uint8Array | null {
  if (!encoded) return null;
  let bytes: Uint8Array;
  try {
    bytes = fromBase64(encoded);
  } catch {
    return null;
  }
  if (bytes.length % 3 !== 0) return null;
  const grid = new Uint8Array(cells);
  let pos = 0;
  for (let b = 0; b < bytes.length; b += 3) {
    const value = bytes[b];
    const run = (bytes[b + 1] << 8) | bytes[b + 2];
    if (run <= 0 || pos + run > cells) return null;
    grid.fill(value, pos, pos + run);
    pos += run;
  }
  return pos === cells ? grid : null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
