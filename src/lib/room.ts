import { customAlphabet } from "nanoid";
import type { GameId } from "./games/types";
import { getDb } from "./mongodb";
import { getGame, GAME_META } from "./games";

// Human-friendly room codes (no ambiguous chars).
const makeCode = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 6);

export type RoomStatus = "lobby" | "active" | "finished";
export type JoinPolicy = "open" | "approval";

export interface RoomPlayer {
  id: string; // client id
  name: string;
  seat: number;
  joinedAt: number;
}

export interface JoinRequest {
  id: string; // client id
  name: string;
  requestedAt: number;
}

export interface CallMember {
  id: string;
  name: string;
  lastSeen: number; // heartbeat timestamp
}

const CALL_TTL = 12000; // a member is "in call" if seen within the last 12s

export interface RoomDoc {
  code: string;
  game: GameId;
  status: RoomStatus;
  joinPolicy: JoinPolicy;
  hostId: string;
  maxPlayers: number;
  players: RoomPlayer[];
  requests: JoinRequest[];
  callMembers: CallMember[]; // who currently has audio/video/chat on
  state: unknown; // game engine state (null until started)
  winnerSeat: number | null;
  isDraw: boolean;
  version: number; // bumped on every mutation
  createdAt: number;
  updatedAt: number;
}

const COLLECTION = "rooms";

export async function rooms() {
  const db = await getDb();
  const col = db.collection<RoomDoc>(COLLECTION);
  // Best-effort index (idempotent).
  await col.createIndex({ code: 1 }, { unique: true }).catch(() => {});
  return col;
}

export async function createRoom(input: {
  game: GameId;
  hostId: string;
  hostName: string;
  joinPolicy: JoinPolicy;
}): Promise<RoomDoc> {
  const meta = GAME_META[input.game];
  const now = Date.now();
  const col = await rooms();

  // Retry a couple of times in the unlikely event of a code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const doc: RoomDoc = {
      code: makeCode(),
      game: input.game,
      status: "lobby",
      joinPolicy: input.joinPolicy,
      hostId: input.hostId,
      maxPlayers: meta.maxPlayers,
      players: [{ id: input.hostId, name: input.hostName, seat: 0, joinedAt: now }],
      requests: [],
      callMembers: [],
      state: null,
      winnerSeat: null,
      isDraw: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await col.insertOne(doc);
      return doc;
    } catch (e: any) {
      if (e?.code === 11000) continue; // duplicate code, retry
      throw e;
    }
  }
  throw new Error("Could not allocate a room code, please retry.");
}

export async function getRoom(code: string): Promise<RoomDoc | null> {
  const col = await rooms();
  return col.findOne({ code: code.toUpperCase() }, { projection: { _id: 0 } });
}

export interface MutationOutcome {
  set?: Partial<RoomDoc>; // fields to write (version/updatedAt handled for you)
  error?: string;
  status?: number;
}

/**
 * Read-modify-write a room under optimistic concurrency. `fn` is pure-ish:
 * it inspects the current doc and returns the fields to set (or an error).
 * Retries on version conflict so concurrent moves/joins don't clobber.
 */
export async function mutateRoom(
  code: string,
  fn: (room: RoomDoc) => MutationOutcome
): Promise<{ room?: RoomDoc; error?: string; status?: number }> {
  const col = await rooms();
  const upper = code.toUpperCase();
  for (let attempt = 0; attempt < 6; attempt++) {
    const room = await col.findOne({ code: upper }, { projection: { _id: 0 } });
    if (!room) return { error: "Room not found.", status: 404 };

    const outcome = fn(room);
    if (outcome.error) return { error: outcome.error, status: outcome.status ?? 400 };

    const next = { ...outcome.set, version: room.version + 1, updatedAt: Date.now() };
    const res = await col.updateOne(
      { code: upper, version: room.version },
      { $set: next }
    );
    if (res.matchedCount === 1) {
      return { room: { ...room, ...next } as RoomDoc };
    }
    // version changed under us — retry
  }
  return { error: "Conflict, please retry.", status: 409 };
}

export interface OpenRoomSummary {
  code: string;
  game: GameId;
  status: RoomStatus;
  players: number;
  maxPlayers: number;
  hostName: string;
  updatedAt: number;
}

/** Public lobby: open-join rooms with a free seat, active in the last 2 hours. */
export async function listOpenRooms(): Promise<OpenRoomSummary[]> {
  const col = await rooms();
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  const docs = await col
    .find(
      { joinPolicy: "open", status: { $in: ["lobby", "active"] }, updatedAt: { $gte: cutoff } },
      { projection: { _id: 0 } }
    )
    .sort({ updatedAt: -1 })
    .limit(60)
    .toArray();
  return docs
    .filter((r) => r.players.length < r.maxPlayers)
    .slice(0, 30)
    .map((r) => ({
      code: r.code,
      game: r.game,
      status: r.status,
      players: r.players.length,
      maxPlayers: r.maxPlayers,
      hostName: r.players[0]?.name || "—",
      updatedAt: r.updatedAt,
    }));
}

/**
 * Heartbeat a player's call presence. Deliberately does NOT bump `version`
 * (it's a high-frequency heartbeat); pollers still see it because they apply
 * same-version snapshots too.
 */
export async function updateCallPresence(
  code: string,
  id: string,
  name: string,
  action: "ping" | "leave"
): Promise<CallMember[]> {
  const col = await rooms();
  const upper = code.toUpperCase();
  const now = Date.now();
  const room = await col.findOne({ code: upper }, { projection: { callMembers: 1 } });
  if (!room) return [];
  let members = (room.callMembers || []).filter((m) => m.id !== id && m.lastSeen > now - CALL_TTL);
  if (action !== "leave") members.push({ id, name, lastSeen: now });
  await col.updateOne({ code: upper }, { $set: { callMembers: members } });
  return members;
}

export function freeSeat(room: RoomDoc): number {
  const taken = new Set(room.players.map((p) => p.seat));
  for (let i = 0; i < room.maxPlayers; i++) if (!taken.has(i)) return i;
  return -1;
}

export function publicView(room: RoomDoc) {
  // Everything here is safe to send to any client.
  return {
    code: room.code,
    game: room.game,
    status: room.status,
    joinPolicy: room.joinPolicy,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    players: room.players,
    requests: room.requests,
    callMembers: (room.callMembers || []).filter((m) => m.lastSeen > Date.now() - CALL_TTL),
    state: room.state,
    winnerSeat: room.winnerSeat,
    isDraw: room.isDraw,
    version: room.version,
    status_text: room.state ? getGame(room.game).status(room.state) : "Waiting in lobby",
  };
}

export type RoomView = ReturnType<typeof publicView>;
