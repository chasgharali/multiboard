"use client";

import { nanoid } from "nanoid";
import type { RoomView } from "./room";

const ID_KEY = "mb_client_id";
const NAME_KEY = "mb_name";

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = nanoid(16);
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function getSavedName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) || "";
}

export function saveName(name: string) {
  if (typeof window !== "undefined") localStorage.setItem(NAME_KEY, name.trim());
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  async createRoom(game: string, hostName: string, joinPolicy: "open" | "approval") {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ game, hostId: getClientId(), hostName, joinPolicy }),
    });
    return jsonOrThrow(res) as Promise<{ code: string }>;
  },
  async listOpenRooms() {
    const res = await fetch("/api/rooms", { cache: "no-store" });
    return jsonOrThrow(res) as Promise<{
      rooms: {
        code: string;
        game: string;
        status: string;
        players: number;
        maxPlayers: number;
        hostName: string;
        updatedAt: number;
      }[];
    }>;
  },
  async getRoom(code: string): Promise<RoomView> {
    const res = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
    return jsonOrThrow(res) as Promise<RoomView>;
  },
  async join(code: string, name: string) {
    const res = await fetch(`/api/rooms/${code}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: getClientId(), name }),
    });
    return jsonOrThrow(res) as Promise<{ seated: boolean; room: RoomView }>;
  },
  async manageRequest(code: string, requesterId: string, action: "approve" | "deny") {
    const res = await fetch(`/api/rooms/${code}/requests`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hostId: getClientId(), requesterId, action }),
    });
    return jsonOrThrow(res) as Promise<{ room: RoomView }>;
  },
  async start(code: string) {
    const res = await fetch(`/api/rooms/${code}/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hostId: getClientId() }),
    });
    return jsonOrThrow(res) as Promise<{ room: RoomView }>;
  },
  async callPresence(code: string, name: string, action: "ping" | "leave") {
    try {
      await fetch(`/api/rooms/${code}/call`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: getClientId(), name, action }),
        keepalive: action === "leave", // let "leave" send during unload
      });
    } catch {
      /* best effort */
    }
  },
  async move(code: string, move: unknown) {
    const res = await fetch(`/api/rooms/${code}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId: getClientId(), move }),
    });
    return jsonOrThrow(res) as Promise<{ room: RoomView }>;
  },
};
