import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// WebRTC signaling relayed through MongoDB (Vercel has no persistent socket).
// Messages are addressed peer-to-peer and consumed (deleted) on read.

interface SignalDoc {
  code: string;
  from: string;
  to: string;
  data: unknown; // { type: 'offer'|'answer'|'candidate', ... }
  createdAt: Date;
}

async function collection() {
  const db = await getDb();
  const col = db.collection<SignalDoc>("signals");
  // Auto-expire stale signals after 5 minutes (best effort, idempotent).
  await col.createIndex({ createdAt: 1 }, { expireAfterSeconds: 300 }).catch(() => {});
  await col.createIndex({ code: 1, to: 1 }).catch(() => {});
  return col;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json();
  const from = String(body.from || "");
  const to = String(body.to || "");
  if (!from || !to || body.data == null) {
    return NextResponse.json({ error: "Missing from/to/data." }, { status: 400 });
  }
  const col = await collection();
  await col.insertOne({ code: code.toUpperCase(), from, to, data: body.data, createdAt: new Date() });
  return NextResponse.json({ ok: true });
}

// Poll for and consume signals addressed to ?to=<clientId>.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const to = req.nextUrl.searchParams.get("to") || "";
  if (!to) return NextResponse.json([]);
  const col = await collection();
  const filter = { code: code.toUpperCase(), to };
  const items = await col.find(filter).sort({ createdAt: 1 }).limit(50).toArray();
  if (items.length) {
    await col.deleteMany({ _id: { $in: items.map((i) => i._id) } });
  }
  return NextResponse.json(items.map((i) => ({ from: i.from, data: i.data })));
}
