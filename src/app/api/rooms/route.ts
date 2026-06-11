import { NextRequest, NextResponse } from "next/server";
import { createRoom, listOpenRooms } from "@/lib/room";
import { GAME_META } from "@/lib/games";
import type { GameId } from "@/lib/games/types";

export const dynamic = "force-dynamic";

// Public lobby of open games anyone can join.
export async function GET() {
  try {
    const rooms = await listOpenRooms();
    return NextResponse.json({ rooms });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error.", rooms: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const game = body.game as GameId;
    const hostId = String(body.hostId || "").trim();
    const hostName = String(body.hostName || "").trim().slice(0, 24);
    const joinPolicy = body.joinPolicy === "approval" ? "approval" : "open";

    if (!GAME_META[game]) return NextResponse.json({ error: "Unknown game." }, { status: 400 });
    if (!hostId) return NextResponse.json({ error: "Missing player id." }, { status: 400 });
    if (!hostName) return NextResponse.json({ error: "Please enter a name." }, { status: 400 });

    const room = await createRoom({ game, hostId, hostName, joinPolicy });
    return NextResponse.json({ code: room.code });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error." }, { status: 500 });
  }
}
