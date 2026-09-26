"use client";
import { useState } from "react";
import { BOARD, GROUP_COLORS } from "../lib/board";

function tradableProps(game, playerId) {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return [];
  return player.properties
    .map((id) => ({ tile: BOARD[id], own: game.ownership[id] }))
    .filter((x) => x.tile && x.own && !x.own.mortgaged && x.own.houses === 0 && !x.own.hotel);
}

export default function TradePanel({ game, me, playerId, act, busy }) {
  const [open, setOpen] = useState(false);
  const [toId, setToId] = useState("");
  const [offerCash, setOfferCash] = useState(0);
  const [requestCash, setRequestCash] = useState(0);
  const [offerProps, setOfferProps] = useState([]);
  const [requestProps, setRequestProps] = useState([]);
  const [localError, setLocalError] = useState("");

  if (!me) return null;
  const others = game.players.filter((p) => p.id !== playerId && !p.bankrupt);
  const myTradables = tradableProps(game, playerId);
  const theirTradables = toId ? tradableProps(game, toId) : [];

  const myTrades = (game.trades || []).filter((t) => (t.from === playerId || t.to === playerId) && t.status === "pending");

  function toggle(list, setList, id) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function submit() {
    setLocalError("");
    if (!toId) return setLocalError("Choose a player to trade with.");
    const res = await act("proposeTrade", {
      toId,
      offerCash: Number(offerCash) || 0,
      offerProps,
      requestCash: Number(requestCash) || 0,
      requestProps,
    });
    if (res?.ok) {
      setOpen(false);
      setToId("");
      setOfferCash(0);
      setRequestCash(0);
      setOfferProps([]);
      setRequestProps([]);
    } else if (res?.error) {
      setLocalError(res.error);
    }
  }

  return (
    <div style={{ background: "#151b2e", borderRadius: 12, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ margin: 0 }}>Trading</h4>
        {others.length > 0 && (
          <button
            onClick={() => setOpen(true)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #3a4568", background: "transparent", color: "#fff", fontSize: 12.5 }}
          >
            + Propose Trade
          </button>
        )}
      </div>

      {myTrades.length === 0 && <p style={{ fontSize: 12.5, color: "#8b93ab", marginBottom: 0 }}>No pending trades.</p>}
      {myTrades.map((t) => (
        <div key={t.id} style={{ background: "#0f1526", borderRadius: 8, padding: 10, marginTop: 8, fontSize: 12.5 }}>
          {t.from === playerId ? (
            <div>
              <div style={{ marginBottom: 4 }}>
                You offered a trade to <strong>{t.toName}</strong> — waiting for response.
              </div>
              <TradeSummary t={t} />
              <button onClick={() => act("cancelTrade", { tradeId: t.id })} disabled={busy} style={{ marginTop: 6, padding: "5px 10px", borderRadius: 6, border: "1px solid #3a4568", background: "transparent", color: "#fff", fontSize: 11.5 }}>
                Cancel
              </button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 4 }}>
                <strong>{t.fromName}</strong> proposed a trade with you:
              </div>
              <TradeSummary t={t} />
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button onClick={() => act("respondTrade", { tradeId: t.id, accept: true })} disabled={busy} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "#2a9d8f", color: "#fff", fontSize: 11.5, fontWeight: 700 }}>
                  Accept
                </button>
                <button onClick={() => act("respondTrade", { tradeId: t.id, accept: false })} disabled={busy} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #3a4568", background: "transparent", color: "#fff", fontSize: 11.5 }}>
                  Decline
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 55 }} onClick={() => setOpen(false)}>
          <div style={{ background: "#151b2e", borderRadius: 14, padding: 20, width: 400, maxWidth: "92vw", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Propose a Trade</h3>

            <label style={lbl}>Trade with</label>
            <select value={toId} onChange={(e) => { setToId(e.target.value); setRequestProps([]); }} style={sel}>
              <option value="">Select a player...</option>
              {others.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (${p.cash})</option>
              ))}
            </select>

            <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>You give — cash ($)</label>
                <input type="number" min={0} value={offerCash} onChange={(e) => setOfferCash(e.target.value)} style={inp} />
                <label style={lbl}>You give — properties</label>
                <div style={list}>
                  {myTradables.length === 0 && <p style={{ fontSize: 11.5, color: "#6b7390" }}>None tradable</p>}
                  {myTradables.map(({ tile }) => (
                    <label key={tile.id} style={chk}>
                      <input type="checkbox" checked={offerProps.includes(tile.id)} onChange={() => toggle(offerProps, setOfferProps, tile.id)} />
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: tile.group ? GROUP_COLORS[tile.group] : "#888" }} />
                      {tile.name}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>You get — cash ($)</label>
                <input type="number" min={0} value={requestCash} onChange={(e) => setRequestCash(e.target.value)} style={inp} disabled={!toId} />
                <label style={lbl}>You get — properties</label>
                <div style={list}>
                  {!toId && <p style={{ fontSize: 11.5, color: "#6b7390" }}>Pick a player first</p>}
                  {toId && theirTradables.length === 0 && <p style={{ fontSize: 11.5, color: "#6b7390" }}>None tradable</p>}
                  {theirTradables.map(({ tile }) => (
                    <label key={tile.id} style={chk}>
                      <input type="checkbox" checked={requestProps.includes(tile.id)} onChange={() => toggle(requestProps, setRequestProps, tile.id)} />
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: tile.group ? GROUP_COLORS[tile.group] : "#888" }} />
                      {tile.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {localError && <p style={{ color: "#ff6b6b", fontSize: 12.5, marginTop: 10 }}>{localError}</p>}

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={submit} disabled={busy} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#e63946", color: "#fff", fontWeight: 700 }}>
                Send Offer
              </button>
              <button onClick={() => setOpen(false)} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #3a4568", background: "transparent", color: "#fff" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TradeSummary({ t }) {
  const offerBits = [];
  if (t.offerCash > 0) offerBits.push(`$${t.offerCash}`);
  offerBits.push(...t.offerProps.map((id) => BOARD[id]?.name).filter(Boolean));
  const requestBits = [];
  if (t.requestCash > 0) requestBits.push(`$${t.requestCash}`);
  requestBits.push(...t.requestProps.map((id) => BOARD[id]?.name).filter(Boolean));
  return (
    <div style={{ color: "#c3c9dc" }}>
      <div>Gives: {offerBits.length ? offerBits.join(", ") : "nothing"}</div>
      <div>Gets: {requestBits.length ? requestBits.join(", ") : "nothing"}</div>
    </div>
  );
}

const lbl = { display: "block", fontSize: 11.5, color: "#a7afc7", marginTop: 8, marginBottom: 4 };
const inp = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #2a3352", background: "#0f1526", color: "#fff", fontSize: 13 };
const sel = { ...inp, marginTop: 6 };
const list = { display: "flex", flexDirection: "column", gap: 4, maxHeight: 120, overflowY: "auto", background: "#0f1526", borderRadius: 8, padding: 6 };
const chk = { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#e8ecf4" };
