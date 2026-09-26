"use client";
import { BOARD, GROUP_COLORS } from "../lib/board";

export default function PropertiesPanel({ game, me }) {
  if (!me) return null;
  const owned = me.properties
    .map((id) => ({ tile: BOARD[id], own: game.ownership[id] }))
    .filter((x) => x.tile);

  return (
    <div style={{ background: "#151b2e", borderRadius: 12, padding: 14 }}>
      <h4 style={{ margin: "0 0 10px" }}>My Properties {owned.length > 0 && `(${owned.length})`}</h4>
      {owned.length === 0 && <p style={{ fontSize: 13, color: "#8b93ab", margin: 0 }}>You don't own anything yet.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
        {owned.map(({ tile, own }) => (
          <div
            key={tile.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#0f1526",
              borderRadius: 8,
              padding: "6px 8px",
              opacity: own.mortgaged ? 0.55 : 1,
            }}
          >
            <span
              style={{
                width: 10,
                height: 22,
                borderRadius: 3,
                background: tile.group ? GROUP_COLORS[tile.group] : tile.type === "railroad" ? "#2b2b2b" : "#4cc9f0",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tile.name}</div>
              <div style={{ fontSize: 10.5, color: "#8b93ab" }}>
                {own.mortgaged ? "Mortgaged" : own.hotel ? "🏨 Hotel" : own.houses > 0 ? `🏠 x${own.houses}` : "No buildings"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
