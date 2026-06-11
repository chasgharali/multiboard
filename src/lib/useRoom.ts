"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./client";
import type { RoomView } from "./room";

const POLL_MS = 1200;

/**
 * Realtime room subscription.
 *
 * On Vercel's serverless runtime there is no long-lived socket, so this polls
 * MongoDB (the source of truth) on a short interval. The whole component tree
 * only ever talks to this hook — to switch to Socket.IO when self-hosting,
 * swap the polling loop here for socket events and nothing else changes.
 */
export function useRoom(code: string) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const versionRef = useRef(-1);
  const stopped = useRef(false);

  const apply = useCallback((next: RoomView) => {
    // Ignore stale responses that arrive out of order.
    if (next.version >= versionRef.current) {
      versionRef.current = next.version;
      setRoom(next);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await api.getRoom(code);
      apply(next);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Could not load room.");
    } finally {
      setLoading(false);
    }
  }, [code, apply]);

  useEffect(() => {
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout>;

    const loop = async () => {
      if (stopped.current) return;
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        await refresh();
      }
      if (!stopped.current) timer = setTimeout(loop, POLL_MS);
    };
    loop();

    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stopped.current = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  return { room, error, loading, refresh, apply };
}
