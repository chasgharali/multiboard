import { NextRequest, NextResponse } from "next/server";
import { mutateRoom, freeSeat, publicView } from "@/lib/room";

export const dynamic = "force-dynamic";

// Host approves or denies a pending join request.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json();
  const hostId = String(body.hostId || "");
  const requesterId = String(body.requesterId || "");
  const action = body.action === "approve" ? "approve" : "deny";

  const result = await mutateRoom(code, (room) => {
    if (room.hostId !== hostId) return { error: "Only the host can manage requests.", status: 403 };
    const reqEntry = room.requests.find((r) => r.id === requesterId);
    if (!reqEntry) return { set: {} }; // already handled

    const requests = room.requests.filter((r) => r.id !== requesterId);

    if (action === "deny") return { set: { requests } };

    // approve
    if (room.players.some((p) => p.id === requesterId)) return { set: { requests } };
    const seat = freeSeat(room);
    if (seat === -1) return { error: "No free seats available." };
    return {
      set: {
        requests,
        players: [
          ...room.players,
          { id: requesterId, name: reqEntry.name, seat, joinedAt: Date.now() },
        ],
      },
    };
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ room: publicView(result.room!) });
}
