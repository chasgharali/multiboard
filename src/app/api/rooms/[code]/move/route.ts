import { NextRequest, NextResponse } from "next/server";
import { mutateRoom, publicView } from "@/lib/room";
import { getGame } from "@/lib/games";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json();
  const playerId = String(body.playerId || "");
  const move = body.move;

  const result = await mutateRoom(code, (room) => {
    if (room.status !== "active" || !room.state) return { error: "Game is not in progress." };
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { error: "You are not a player in this game.", status: 403 };

    const game = getGame(room.game);
    const res = game.applyMove(room.state, move, player.seat, Math.random);
    if (!res.ok) return { error: res.error };

    const winner = game.winner(res.state);
    const finished = winner !== null;
    return {
      set: {
        state: res.state,
        status: finished ? "finished" : "active",
        winnerSeat: winner && winner !== "draw" ? winner.seat : null,
        isDraw: winner === "draw",
      },
    };
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ room: publicView(result.room!) });
}
