"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function getOrCreatePlayerId() {
  let id = localStorage.getItem("monopoly_player_id");
  if (!id) {
    id = "p_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("monopoly_player_id", id);
  }
  return id;
}

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("monopoly_name");
    if (savedName) setName(savedName);
  }, []);

  async function createRoom() {
    if (!name.trim()) return setError("Enter your name first.");
    setError("");
    setLoading(true);
    try {
      const playerId = getOrCreatePlayerId();
      localStorage.setItem("monopoly_name", name.trim());
      const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create room");
      router.push(`/room/${data.roomId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function joinRoom() {
    if (!name.trim()) return setError("Enter your name first.");
    if (!joinCode.trim()) return setError("Enter a room code.");
    setError("");
    setLoading(true);
    try {
      const playerId = getOrCreatePlayerId();
      localStorage.setItem("monopoly_name", name.trim());
      const code = joinCode.trim().toUpperCase();
      const res = await fetch(`/api/game/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join room");
      router.push(`/room/${code}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 420, width: "100%", background: "#151b2e", borderRadius: 16, padding: 32, boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 32, textAlign: "center" }}>🎩 Monopoly</h1>
        <p style={{ textAlign: "center", color: "#8b93ab", marginTop: 0, marginBottom: 28 }}>Play online with friends, anywhere</p>

        <label style={{ fontSize: 13, color: "#a7afc7" }}>Your name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex"
          maxLength={20}
          style={{ width: "100%", padding: "12px 14px", marginTop: 6, marginBottom: 20, borderRadius: 10, border: "1px solid #2a3352", background: "#0f1526", color: "#fff", fontSize: 16 }}
        />

        <button
          onClick={createRoom}
          disabled={loading}
          style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: "#e63946", color: "#fff", fontWeight: 700, fontSize: 16, marginBottom: 16 }}
        >
          {loading ? "Creating..." : "🎲 Create New Room"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0", color: "#6b7390" }}>
          <div style={{ flex: 1, height: 1, background: "#2a3352" }} />
          <span style={{ fontSize: 13 }}>OR JOIN A ROOM</span>
          <div style={{ flex: 1, height: 1, background: "#2a3352" }} />
        </div>

        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Room code e.g. AB12C"
          maxLength={5}
          style={{ width: "100%", padding: "12px 14px", marginBottom: 12, borderRadius: 10, border: "1px solid #2a3352", background: "#0f1526", color: "#fff", fontSize: 16, letterSpacing: 2, textAlign: "center" }}
        />
        <button
          onClick={joinRoom}
          disabled={loading}
          style={{ width: "100%", padding: "14px", borderRadius: 10, border: "1px solid #3a4568", background: "transparent", color: "#fff", fontWeight: 700, fontSize: 16 }}
        >
          {loading ? "Joining..." : "Join Room"}
        </button>

        {error && <p style={{ color: "#ff6b6b", marginTop: 16, textAlign: "center", fontSize: 14 }}>{error}</p>}

        <p style={{ marginTop: 28, fontSize: 12, color: "#5c6483", textAlign: "center" }}>
          After creating a room, share its link with friends so they can join from any device.
        </p>
      </div>
    </div>
  );
}
