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
