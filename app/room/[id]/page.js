"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { BOARD, GROUP_COLORS } from "../../../lib/board";
import { gridPos, gridPct, pawnOffset, PLAYER_COLORS } from "../../../lib/layoutGrid";
import Dice3D from "../../../components/Dice3D";
import CardModal from "../../../components/CardModal";
import PropertiesPanel from "../../../components/PropertiesPanel";
import TradePanel from "../../../components/TradePanel";

function getOrCreatePlayerId() {
  let id = localStorage.getItem("monopoly_player_id");
  if (!id) {
    id = "p_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("monopoly_player_id", id);
  }
  return id;
}

const TILE_ICONS = {
  go: "➡️",
  jail: "🚔",
  gotojail: "👮",
  free: "🅿️",
  tax: "💰",
  chance: "❓",
  chest: "🎁",
  railroad: "🚂",
  utility: "💡",
};

export default function RoomPage() {
  const { id: roomId } = useParams();
  const [game, setGame] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedTile, setSelectedTile] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);
  const [rollToken, setRollToken] = useState(0);
  const [activeCard, setActiveCard] = useState(null);
  const pollRef = useRef(null);
  const lastCardSeq = useRef(0);
  const prevPositions = useRef({});
  const [landedPawns, setLandedPawns] = useState({});

  useEffect(() => {
    const pid = getOrCreatePlayerId();
    setPlayerId(pid);
    const name = localStorage.getItem("monopoly_name");
    (async () => {
      const g = await refresh();
      if (!g) return;
      lastCardSeq.current = g.cardSeq || 0;
      const alreadyIn = g.players.some((p) => p.id === pid);
      if (alreadyIn) return;
      if (name) {
        try {
          const res = await fetch(`/api/game/${roomId}/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, playerId: pid }),
          });
          if (res.ok) {
            const data = await res.json();
            setGame(data.game);
            return;
          }
        } catch {}
      }
      setNeedsName(true);
    })();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/${roomId}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        applyIncomingGame(data.game);
        setError("");
        return data.game;
      } else {
        setError(data.error || "Room not found");
        return null;
      }
    } catch (e) {
      setError("Connection error");
      return null;
    }
  }, [roomId]);

  function applyIncomingGame(newGame) {
    const landed = {};
    for (const p of newGame.players) {
      const prev = prevPositions.current[p.id];
      if (prev !== undefined && prev !== p.position) landed[p.id] = Date.now();
      prevPositions.current[p.id] = p.position;
    }
    if (Object.keys(landed).length) {
      setLandedPawns((prevMap) => ({ ...prevMap, ...landed }));
      setTimeout(() => {
        setLandedPawns((prevMap) => {
          const copy = { ...prevMap };
          for (const k of Object.keys(landed)) delete copy[k];
          return copy;
        });
      }, 500);
    }
    if (newGame.cardSeq && newGame.cardSeq !== lastCardSeq.current) {
      lastCardSeq.current = newGame.cardSeq;
      setActiveCard(newGame.lastCard);
      setTimeout(() => setActiveCard(null), 3200);
    }
    setGame(newGame);
  }

  useEffect(() => {
    pollRef.current = setInterval(refresh, 1800);
    return () => clearInterval(pollRef.current);
  }, [refresh]);

  async function act(type, extra = {}) {
    if (!playerId) return { error: "Not ready" };
    setBusy(true);
    setError("");
    try {
      const isTrade = type === "proposeTrade" || type === "respondTrade" || type === "cancelTrade";
      const url = isTrade ? `/api/game/${roomId}/trade` : `/api/game/${roomId}/action`;
      const mappedType = { proposeTrade: "propose", respondTrade: "respond", cancelTrade: "cancel" }[type] || type;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: mappedType, playerId, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      if (type === "roll") setRollToken((t) => t + 1);
      applyIncomingGame(data.game);
      return { ok: true };
    } catch (e) {
      setError(e.message);
      return { error: e.message };
    } finally {
      setBusy(false);
    }
  }

  async function submitJoin() {
    if (!joinName.trim()) return;
    setJoining(true);
    setError("");
    try {
      localStorage.setItem("monopoly_name", joinName.trim());
      const res = await fetch(`/api/game/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: joinName.trim(), playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join room");
      setGame(data.game);
      setNeedsName(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setJoining(false);
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    });
  }

  if (error && !game) {
    return (
      <Centered>
        <h2>⚠️ {error}</h2>
        <a href="/" style={{ color: "#4cc9f0" }}>← Back home</a>
      </Centered>
    );
  }
  if (!game) return <Centered><p>Loading room...</p></Centered>;

  const me = game.players.find((p) => p.id === playerId);

  if (needsName && !me) {
    return (
      <Centered>
        <div style={{ background: "#151b2e", borderRadius: 14, padding: 28, width: 340, maxWidth: "90vw" }}>
          <h3 style={{ marginTop: 0 }}>Join Room {roomId}</h3>
          <p style={{ color: "#8b93ab", fontSize: 13, marginTop: -6 }}>Enter your name to join this game.</p>
          <input
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitJoin()}
            placeholder="Your name"
            maxLength={20}
            autoFocus
            style={{ width: "100%", padding: "12px 14px", marginBottom: 14, borderRadius: 10, border: "1px solid #2a3352", background: "#0f1526", color: "#fff", fontSize: 16 }}
          />
          <button onClick={submitJoin} disabled={joining || !joinName.trim()} style={{ ...btnPrimary, width: "100%" }}>
            {joining ? "Joining..." : "Join Game"}
          </button>
          {error && <p style={{ color: "#ff6b6b", marginTop: 12, fontSize: 13 }}>{error}</p>}
        </div>
      </Centered>
    );
  }

  const current = game.players[game.turnIndex];
  const isMyTurn = current && current.id === playerId;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 12px 60px" }}>
      <div style={{ width: "100%", maxWidth: 1140, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0 }}>🎩 Monopoly — Room {roomId}</h2>
        <button onClick={copyLink} style={btnGhost}>{copySuccess ? "✓ Copied!" : "🔗 Copy invite link"}</button>
      </div>

      {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}

      {game.status === "lobby" && (
        <Lobby game={game} playerId={playerId} act={act} busy={busy} />
      )}

      {game.status !== "lobby" && (
        <div style={{ width: "100%", maxWidth: 1140, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 580px", minWidth: 320 }}>
            <Board game={game} onTileClick={setSelectedTile} landedPawns={landedPawns} />
          </div>
          <div style={{ flex: "1 1 320px", minWidth: 280, display: "flex", flexDirection: "column", gap: 12 }}>
            <PlayersPanel game={game} playerId={playerId} />
            <Controls game={game} me={me} isMyTurn={isMyTurn} act={act} busy={busy} rollToken={rollToken} />
            <TradePanel game={game} me={me} playerId={playerId} act={act} busy={busy} />
            <PropertiesPanel game={game} me={me} />
            <Log game={game} />
          </div>
        </div>
      )}

      {selectedTile !== null && (
        <TileModal
          tile={BOARD[selectedTile]}
          game={game}
          me={me}
          isMyTurn={isMyTurn}
          act={act}
          onClose={() => setSelectedTile(null)}
        />
      )}

      {activeCard && <CardModal card={activeCard} onClose={() => setActiveCard(null)} />}
    </div>
  );
}

function Centered({ children }) {
  return <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>{children}</div>;
}

const btnGhost = { padding: "8px 14px", borderRadius: 8, border: "1px solid #3a4568", background: "transparent", color: "#fff", fontSize: 13 };
const btnPrimary = { padding: "10px 16px", borderRadius: 8, border: "none", background: "#e63946", color: "#fff", fontWeight: 700, fontSize: 14 };
const btnSecondary = { padding: "10px 16px", borderRadius: 8, border: "1px solid #3a4568", background: "#1b2338", color: "#fff", fontSize: 14 };

function Lobby({ game, playerId, act, busy }) {
  const isHost = game.players[0]?.id === playerId;
  const [cashInput, setCashInput] = useState(game.startingCash || 1500);

  return (
    <div style={{ background: "#151b2e", borderRadius: 14, padding: 24, maxWidth: 480, width: "100%" }}>
      <h3 style={{ marginTop: 0 }}>Players in lobby</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {game.players.map((p, i) => (
          <li key={p.id} style={{ padding: "8px 0", borderBottom: "1px solid #232c46", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: PLAYER_COLORS[i % PLAYER_COLORS.length], display: "inline-block" }} />
            {p.name} {i === 0 && <span style={{ fontSize: 11, color: "#8b93ab" }}>(host)</span>}
          </li>
        ))}
      </ul>
      <p style={{ color: "#8b93ab", fontSize: 13 }}>Share the room link so friends can join before starting.</p>

      <div style={{ background: "#0f1526", borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <label style={{ fontSize: 12.5, color: "#a7afc7", display: "block", marginBottom: 6 }}>
          Starting cash per player (USD)
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            min={200}
            max={100000}
            step={100}
            value={cashInput}
            onChange={(e) => setCashInput(e.target.value)}
            disabled={!isHost}
            style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #2a3352", background: "#151b2e", color: "#fff", fontSize: 14 }}
          />
          {isHost && (
            <button
              onClick={() => act("setStartingCash", { amount: cashInput })}
              disabled={busy}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #3a4568", background: "transparent", color: "#fff", fontSize: 13 }}
            >
              Set
            </button>
          )}
        </div>
        <p style={{ fontSize: 11.5, color: "#6b7390", margin: "6px 0 0" }}>
          Current: ${Number(game.startingCash || 1500).toLocaleString()} {isHost ? "" : "(host controls this)"}
        </p>
      </div>

      {isHost ? (
        <button onClick={() => act("start")} disabled={busy || game.players.length < 2} style={{ ...btnPrimary, width: "100%", opacity: game.players.length < 2 ? 0.5 : 1 }}>
          {game.players.length < 2 ? "Need at least 2 players" : "Start Game"}
        </button>
      ) : (
        <p style={{ color: "#8b93ab" }}>Waiting for host to start the game...</p>
      )}
    </div>
  );
}

function TileVisual({ tile }) {
  if (tile.type === "go") return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 900, color: "#e63946", letterSpacing: 1 }}>GO</div>
      <div style={{ fontSize: 18 }}>➡️</div>
      <div style={{ fontSize: 8, fontWeight: 800, color: "#e63946" }}>COLLECT $200</div>
    </div>
  );
  if (tile.type === "jail") return <div style={{ fontSize: 18 }}>🚔<div style={{ fontSize: 8 }}>IN JAIL / VISITING</div></div>;
  if (tile.type === "gotojail") return <div style={{ fontSize: 20 }}>👮<div style={{ fontSize: 9, fontWeight: 700 }}>GO TO JAIL</div></div>;
  if (tile.type === "free") return <div style={{ fontSize: 20 }}>🅿️<div style={{ fontSize: 8 }}>FREE PARKING</div></div>;
  return null;
}

function Board({ game, onTileClick, landedPawns }) {
  const pawnsByTile = {};
  game.players.forEach((p, i) => {
    if (p.bankrupt) return;
    if (!pawnsByTile[p.position]) pawnsByTile[p.position] = [];
    pawnsByTile[p.position].push({ ...p, colorIdx: i });
  });

  return (
    <div className="board-3d-wrap">
      <div
        className="board-3d"
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "repeat(11, 1fr)",
          gridTemplateRows: "repeat(11, 1fr)",
          aspectRatio: "1 / 1",
          width: "100%",
          background: "radial-gradient(ellipse at 50% 45%, #1f7a44 0%, #14572f 70%, #0d3d20 100%)",
          borderRadius: 14,
          padding: 8,
          gap: 2,
          boxShadow: "0 20px 50px rgba(0,0,0,0.55), inset 0 0 40px rgba(0,0,0,0.35)",
          border: "2px solid #0a2c18",
        }}
      >
        <div
          style={{
            gridColumn: "2 / 11",
            gridRow: "2 / 11",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            color: "rgba(255,255,255,0.85)",
            userSelect: "none",
          }}
        >
          <div style={{ fontSize: "clamp(24px, 5vw, 52px)", fontWeight: 900, letterSpacing: 4, transform: "rotate(-28deg)", textShadow: "0 4px 12px rgba(0,0,0,0.5)", color: "#e63946" }}>
            PROPERTY
          </div>
          <div style={{ fontSize: "clamp(10px, 1.4vw, 16px)", opacity: 0.75, marginTop: 4, letterSpacing: 2 }}>TRADING GAME</div>
        </div>

        {BOARD.map((tile) => {
          const pos = gridPos(tile.id);
          const own = game.ownership[tile.id];
          const isCorner = [0, 10, 20, 30].includes(tile.id);
          const ownerIdx = own ? game.players.findIndex((p) => p.id === own.owner) : -1;
          return (
            <div
              key={tile.id}
              onClick={() => onTileClick(tile.id)}
              className={isCorner ? "tile-corner-3d" : "tile-3d"}
              style={{
                gridColumn: pos.col,
                gridRow: pos.row,
                background: own && !own.mortgaged ? "#fffdf6" : "#fbf8ef",
                borderRadius: 4,
                outline: own && !own.mortgaged ? `2px solid ${PLAYER_COLORS[ownerIdx % PLAYER_COLORS.length]}` : "none",
                outlineOffset: -2,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",
                minHeight: 0,
                minWidth: 0,
              }}
              title={tile.name}
            >
              {tile.group && (
                <div style={{ height: "24%", background: GROUP_COLORS[tile.group], flexShrink: 0, borderBottom: "1px solid rgba(0,0,0,0.25)" }} />
              )}
              <div
                style={{
                  fontSize: isCorner ? "clamp(6px, 0.85vw, 9px)" : "clamp(4.5px, 0.62vw, 6.5px)",
                  padding: 2,
                  color: "#1c1c1c",
                  lineHeight: 1.1,
                  flex: 1,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isCorner ? "center" : "flex-start",
                  justifyContent: isCorner ? "center" : "flex-start",
                  textAlign: isCorner ? "center" : "left",
                  fontWeight: isCorner ? 800 : 600,
                }}
              >
                {isCorner ? (
                  <TileVisual tile={tile} />
                ) : (
                  <>
                    {(tile.type === "chance" || tile.type === "chest" || tile.type === "railroad" || tile.type === "utility" || tile.type === "tax") && (
                      <div style={{ fontSize: "1.6em" }}>{TILE_ICONS[tile.type]}</div>
                    )}
                    <span>{tile.name}</span>
                    {tile.price && <span style={{ color: "#5a5a5a" }}>${tile.price}</span>}
                    {tile.type === "tax" && <span style={{ color: "#5a5a5a" }}>Pay ${tile.amount}</span>}
                    {own?.mortgaged && <span style={{ color: "#c0392b", fontWeight: 800 }}>MORTGAGED</span>}
                    {own && (own.houses > 0 || own.hotel) && (
                      <span style={{ color: "#b8860b" }}>{own.hotel ? "🏨" : "🏠".repeat(own.houses)}</span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {game.players.map((p, i) => {
          if (p.bankrupt) return null;
          const tileGroup = pawnsByTile[p.position] || [];
          const idxOnTile = tileGroup.findIndex((x) => x.id === p.id);
          const pct = gridPct(p.position);
          const centerLeft = pct.left + pct.size / 2;
          const centerTop = pct.top + pct.size / 2;
          const off = pawnOffset(idxOnTile);
          const isLanded = !!landedPawns[p.id];
          return (
            <div
              key={p.id}
              className={`pawn-token${isLanded ? " landed" : ""}`}
              style={{
                left: `calc(${centerLeft}% + ${off.dx * 0.4}px)`,
                top: `calc(${centerTop}% + ${off.dy * 0.4}px)`,
                width: 16,
                height: 16,
                background: `radial-gradient(circle at 35% 30%, #fff8, ${PLAYER_COLORS[i % PLAYER_COLORS.length]})`,
              }}
              title={p.name}
            />
          );
        })}
      </div>
    </div>
  );
}

function PlayersPanel({ game, playerId }) {
  return (
    <div style={{ background: "#151b2e", borderRadius: 12, padding: 14 }}>
      <h4 style={{ margin: "0 0 10px" }}>Players</h4>
      {game.players.map((p, i) => (
        <div
          key={p.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 8px",
            borderRadius: 8,
            marginBottom: 4,
            background: game.turnIndex === i && game.status === "playing" ? "#232c46" : "transparent",
            opacity: p.bankrupt ? 0.4 : 1,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
            {p.name} {p.id === playerId && "(you)"} {p.bankrupt && "💀"}
            {p.inJail && !p.bankrupt && " 🔒"}
          </span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>${p.cash.toLocaleString()}</span>
        </div>
      ))}
      {game.status === "finished" && (
        <p style={{ color: "#ffd166", fontWeight: 700, marginTop: 10 }}>
          🏆 {game.players.find((p) => p.id === game.winner)?.name} wins!
        </p>
      )}
    </div>
  );
}

function Controls({ game, me, isMyTurn, act, busy, rollToken }) {
  if (!me) return null;
  const tile = BOARD[me.position];
  const pending = game.pendingAction;

  return (
    <div style={{ background: "#151b2e", borderRadius: 12, padding: 14 }}>
      <h4 style={{ margin: "0 0 10px" }}>
        {game.status === "finished" ? "Game over" : isMyTurn ? "Your turn" : `Waiting for ${game.players[game.turnIndex]?.name}...`}
      </h4>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <Dice3D value={game.dice[0]} rollToken={rollToken} size={46} />
        <Dice3D value={game.dice[1]} rollToken={rollToken} size={46} />
        <span style={{ fontSize: 13, color: "#8b93ab" }}>= {game.dice[0] + game.dice[1]}</span>
      </div>

      {game.status === "playing" && isMyTurn && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {me.inJail && !pending && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={btnSecondary} disabled={busy} onClick={() => act("payJailFine")}>Pay $50 fine</button>
              {me.jailCards > 0 && (
                <button style={btnSecondary} disabled={busy} onClick={() => act("useJailCard")}>Use Jail Card</button>
              )}
              <button style={btnPrimary} disabled={busy} onClick={() => act("roll")}>Roll for doubles</button>
            </div>
          )}
          {!me.inJail && !pending && (
            <button style={btnPrimary} disabled={busy} onClick={() => act("roll")}>🎲 Roll Dice</button>
          )}
          {pending === "awaitBuy" && (
            <div className="pending-buy-glow" style={{ borderRadius: 10, padding: 10, background: "#1b2338" }}>
              <p style={{ fontSize: 14, margin: "0 0 8px" }}>
                Buy <strong>{tile.name}</strong> for ${tile.price}?
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={btnPrimary} disabled={busy || me.cash < tile.price} onClick={() => act("buy")}>Buy</button>
                <button style={btnSecondary} disabled={busy} onClick={() => act("pass")}>Pass</button>
              </div>
            </div>
          )}
          {!pending && !me.inJail && (
            <button style={btnGhost} disabled={busy} onClick={() => act("endTurn")}>End Turn</button>
          )}
          <button style={{ ...btnGhost, borderColor: "#7a2b34", color: "#ff8a8a" }} disabled={busy} onClick={() => { if (confirm("Declare bankruptcy and leave the game?")) act("bankrupt"); }}>
            Declare Bankruptcy
          </button>
        </div>
      )}
      <p style={{ fontSize: 12, color: "#8b93ab", marginTop: 10 }}>Tap any tile on the board to manage it (buy houses, mortgage).</p>
    </div>
  );
}

function Log({ game }) {
  return (
    <div style={{ background: "#151b2e", borderRadius: 12, padding: 14, maxHeight: 220, overflowY: "auto" }}>
      <h4 style={{ margin: "0 0 8px" }}>Game Log</h4>
      {[...game.log].reverse().map((l, i) => (
        <div key={i} style={{ fontSize: 12.5, color: "#c3c9dc", padding: "3px 0", borderBottom: "1px solid #202944" }}>{l}</div>
      ))}
    </div>
  );
}

function TileModal({ tile, game, me, isMyTurn, act, onClose }) {
  const own = game.ownership[tile.id];
  const isOwner = own && me && own.owner === me.id;
  const canManage = isMyTurn && isOwner && game.status === "playing";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div style={{ background: "#151b2e", borderRadius: 14, padding: 22, width: 340, maxWidth: "90vw" }} onClick={(e) => e.stopPropagation()}>
        {tile.group && <div style={{ height: 10, background: GROUP_COLORS[tile.group], borderRadius: 4, marginBottom: 10 }} />}
        <h3 style={{ margin: "0 0 6px" }}>{tile.name}</h3>
        {tile.price && <p style={{ color: "#8b93ab", margin: "0 0 10px" }}>Price: ${tile.price} · Mortgage: ${tile.mortgage}</p>}
        {tile.rent && (
          <div style={{ fontSize: 13, color: "#c3c9dc", marginBottom: 10 }}>
            Rent: ${tile.rent[0]} (base) · ${tile.rent[1]}/${tile.rent[2]}/${tile.rent[3]}/${tile.rent[4]} (1-4 houses) · ${tile.rent[5]} (hotel)
          </div>
        )}
        {own && (
          <p style={{ fontSize: 13 }}>
            Owner: <strong>{game.players.find((p) => p.id === own.owner)?.name}</strong>{" "}
            {own.mortgaged && <span style={{ color: "#ff6b6b" }}>(mortgaged)</span>}
            {own.houses > 0 && ` · ${own.houses} house(s)`}
            {own.hotel && " · Hotel"}
          </p>
        )}
        {!own && tile.price && <p style={{ fontSize: 13, color: "#8b93ab" }}>Unowned. Land on this tile to buy it.</p>}

        {canManage && tile.type === "property" && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {!own.mortgaged && (
              <>
                <button style={btnSecondary} onClick={() => act("buyHouse", { tileId: tile.id })}>Build House/Hotel</button>
                <button style={btnSecondary} onClick={() => act("sellHouse", { tileId: tile.id })}>Sell House/Hotel</button>
              </>
            )}
            {own.houses === 0 && !own.hotel && (
              <button style={btnSecondary} onClick={() => act("mortgage", { tileId: tile.id })}>
                {own.mortgaged ? "Unmortgage" : "Mortgage"}
              </button>
            )}
          </div>
        )}
        {canManage && (tile.type === "railroad" || tile.type === "utility") && (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={btnSecondary} onClick={() => act("mortgage", { tileId: tile.id })}>
              {own.mortgaged ? "Unmortgage" : "Mortgage"}
            </button>
          </div>
        )}

        <button style={{ ...btnGhost, marginTop: 16, width: "100%" }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
