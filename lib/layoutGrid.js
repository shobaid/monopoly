export function gridPos(id) {
  if (id === 0) return { col: 11, row: 11 };
  if (id >= 1 && id <= 9) return { col: 11 - id, row: 11 };
  if (id === 10) return { col: 1, row: 11 };
  if (id >= 11 && id <= 19) return { col: 1, row: 11 - (id - 10) };
  if (id === 20) return { col: 1, row: 1 };
  if (id >= 21 && id <= 29) return { col: 1 + (id - 20), row: 1 };
  if (id === 30) return { col: 11, row: 1 };
  if (id >= 31 && id <= 39) return { col: 11, row: 1 + (id - 30) };
  return { col: 1, row: 1 };
}

export const PLAYER_COLORS = ["#e63946", "#2a9d8f", "#f4a300", "#8338ec", "#3a86ff", "#ff006e", "#06d6a0", "#adb5bd"];

// Percentage-based position of a tile's cell on the 11x11 board, for absolutely
// positioning pawns/overlays that need to smoothly animate between tiles.
export function gridPct(id) {
  const { col, row } = gridPos(id);
  const cell = 100 / 11;
  return { left: (col - 1) * cell, top: (row - 1) * cell, size: cell };
}

// Small per-player offset within a tile so multiple pawns on the same square
// don't fully overlap (arranged in a loose 2x2-ish cluster).
export function pawnOffset(indexOnTile) {
  const offsets = [
    { dx: -18, dy: -18 },
    { dx: 18, dy: -18 },
    { dx: -18, dy: 18 },
    { dx: 18, dy: 18 },
    { dx: 0, dy: -28 },
    { dx: 0, dy: 28 },
    { dx: -28, dy: 0 },
    { dx: 28, dy: 0 },
  ];
  return offsets[indexOnTile % offsets.length];
}
