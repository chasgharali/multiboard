import { NextRequest, NextResponse } from "next/server";
import { mutateRoom, freeSeat, publicView } from "@/lib/room";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json();
  const id = String(body.id || "").trim();
  const name = String(body.name || "").trim().slice(0, 24);
  if (!id) return NextResponse.json({ error: "Missing player id." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Please enter a name." }, { status: 400 });

  const result = await mutateRoom(code, (room) => {
    // Already seated → nothing to do.
    if (room.players.some((p) => p.id === id)) return { set: {} };
    if (room.status === "finished") return { error: "This game has finished." };

    const seat = freeSeat(room);

    if (room.joinPolicy === "open" && room.status === "lobby" && seat !== -1) {
      return {
        set: {
          players: [...room.players, { id, name, seat, joinedAt: Date.now() }],
          // Keep their name out of pending requests if it was there.
          requests: room.requests.filter((r) => r.id !== id),
        },
      };
    }

    // Otherwise it's a request the host must approve (full room, approval
    // policy, or game already active → join as a pending request).
    if (room.requests.some((r) => r.id === id)) return { set: {} }; // already pending
    return {
      set: {
        requests: [...room.requests, { id, name, requestedAt: Date.now() }],
      },
    };
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  const seated = result.room!.players.some((p) => p.id === id);
  return NextResponse.json({ seated, room: publicView(result.room!) });
}
