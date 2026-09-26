export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { addPlayer } from "../../../../../lib/engine";
import { loadGame, saveGame } from "../../../../../lib/store";

export async function POST(req, { params }) {
  try {
    const { name, playerId } = await req.json();
    if (!name || !playerId) {
      return NextResponse.json({ error: "Missing name or playerId" }, { status: 400 });
    }
    const roomId = params.id.toUpperCase();
    const game = await loadGame(roomId);
    if (!game) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const already = game.players.some((p) => p.id === playerId);
    if (!already) {
      addPlayer(game, playerId, name.slice(0, 20));
    }
    await saveGame(game);
    return NextResponse.json({ game });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
