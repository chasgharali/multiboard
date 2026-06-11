import { NextRequest, NextResponse } from "next/server";
import { mutateRoom, publicView } from "@/lib/room";
import { getGame } from "@/lib/games";

export const dynamic = "force-dynamic";

// Host starts (or restarts for a rematch) the game.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json();
  const hostId = String(body.hostId || "");

  const result = await mutateRoom(code, (room) => {
    if (room.hostId !== hostId) return { error: "Only the host can start the game.", status: 403 };
    const game = getGame(room.game);
    if (room.players.length < game.minPlayers) {
      return { error: `Need at least ${game.minPlayers} players to start.` };
    }
    const seats = [...room.players].sort((a, b) => a.seat - b.seat);
    const state = game.createInitialState(seats);
    return {
      set: {
        status: "active",
        state,
        winnerSeat: null,
        isDraw: false,
        requests: [], // clear stale requests on (re)start
      },
    };
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ room: publicView(result.room!) });
}
