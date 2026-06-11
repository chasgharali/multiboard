import { NextRequest, NextResponse } from "next/server";
import { updateCallPresence } from "@/lib/room";

export const dynamic = "force-dynamic";

// Heartbeat / leave for call (audio·video·chat) presence.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json();
  const id = String(body.id || "");
  const name = String(body.name || "").slice(0, 24);
  const action = body.action === "leave" ? "leave" : "ping";
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const members = await updateCallPresence(code, id, name, action);
  return NextResponse.json({ callMembers: members });
}
