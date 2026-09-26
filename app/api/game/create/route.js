import { NextResponse } from "next/server";
import { newGame } from "../../../../lib/engine";
import { saveGame } from "../../../../lib/store";

function randomRoomId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function POST(req) {
  try {
    const { name, playerId } = await req.json();
    if (!name || !playerId) {
      return NextResponse.json({ error: "Missing name or playerId" }, { status: 400 });
    }
    const roomId = randomRoomId();
    const game = newGame(roomId, name.slice(0, 20), playerId);
    await saveGame(game);
    return NextResponse.json({ roomId, game });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
