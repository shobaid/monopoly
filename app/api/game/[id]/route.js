import { NextResponse } from "next/server";
import { loadGame } from "../../../../lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req, { params }) {
  try {
    const game = await loadGame(params.id.toUpperCase());
    if (!game) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    return NextResponse.json({ game });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
