import { NextResponse } from "next/server";
import { loadGame, saveGame } from "../../../../../lib/store";
import {
  startGame,
  rollDice,
  buyProperty,
  passOnProperty,
  payJailFine,
  useJailCard,
  buyHouse,
  sellHouse,
  toggleMortgage,
  endTurnManually,
  declareBankruptcy,
} from "../../../../../lib/engine";

export async function POST(req, { params }) {
  try {
    const roomId = params.id.toUpperCase();
    const body = await req.json();
    const { type, playerId, tileId } = body;

    const game = await loadGame(roomId);
    if (!game) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    switch (type) {
      case "start":
        startGame(game, playerId);
        break;
      case "roll":
        rollDice(game, playerId);
        break;
      case "buy":
        buyProperty(game, playerId);
        break;
      case "pass":
        passOnProperty(game, playerId);
        break;
      case "payJailFine":
        payJailFine(game, playerId);
        break;
      case "useJailCard":
        useJailCard(game, playerId);
        break;
      case "buyHouse":
        buyHouse(game, playerId, tileId);
        break;
      case "sellHouse":
        sellHouse(game, playerId, tileId);
        break;
      case "mortgage":
        toggleMortgage(game, playerId, tileId);
        break;
      case "endTurn":
        endTurnManually(game, playerId);
        break;
      case "bankrupt":
        declareBankruptcy(game, playerId);
        break;
      default:
        return NextResponse.json({ error: "Unknown action type" }, { status: 400 });
    }

    await saveGame(game);
    return NextResponse.json({ game });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
