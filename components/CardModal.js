"use client";

export default function CardModal({ card, onClose }) {
  if (!card) return null;
  const isChance = card.deck === "chance";
  const bg = isChance ? "linear-gradient(160deg,#ff9f1c,#e8720c)" : "linear-gradient(160deg,#4cc9f0,#1f7fb8)";

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
      onClick={onClose}
    >
      <div className="card-flip-scene" style={{ width: 300, height: 190 }} onClick={(e) => e.stopPropagation()}>
        <div className="card-flip-inner">
          <div className="card-face back" style={{ background: bg, border: "3px solid #fff" }}>
            <div style={{ fontSize: 40 }}>{isChance ? "❓" : "🎁"}</div>
          </div>
          <div className="card-face" style={{ background: bg, border: "3px solid #fff", color: "#fff" }}>
            <div style={{ fontSize: 12, letterSpacing: 1, opacity: 0.85, marginBottom: 6, textTransform: "uppercase" }}>
              {isChance ? "Chance" : "Community Chest"}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{card.text}</div>
            {card.playerName && (
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 10 }}>Drawn by {card.playerName}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
