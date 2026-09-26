import { NextResponse } from "next/server";
import { loadGame, saveGame } from "../../../../../lib/store";
import { proposeTrade, respondTrade, cancelTrade } from "../../../../../lib/engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req, { params }) {
  try {
    const roomId = params.id.toUpperCase();
    const body = await req.json();
    const { type, playerId } = body;

    const game = await loadGame(roomId);
    if (!game) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    switch (type) {
      case "propose":
        proposeTrade(
          game,
          playerId,
          body.toId,
          body.offerCash,
          body.offerProps,
          body.requestCash,
          body.requestProps
        );
        break;
      case "respond":
        respondTrade(game, body.tradeId, playerId, !!body.accept);
        break;
      case "cancel":
        cancelTrade(game, body.tradeId, playerId);
        break;
      default:
        return NextResponse.json({ error: "Unknown trade action" }, { status: 400 });
    }

    await saveGame(game);
    return NextResponse.json({ game });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
