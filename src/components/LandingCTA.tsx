"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getSavedName, saveName } from "@/lib/client";
import type { GameId } from "@/lib/games/types";

export default function LandingCTA({ game }: { game: GameId }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setName(getSavedName()), []);

  async function create() {
    setError(null);
    if (!name.trim()) return setError("Please enter your name first.");
    setBusy(true);
    try {
      saveName(name);
      const { code } = await api.createRoom(game, name.trim(), "open");
      router.push(`/g/${code}`);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="card col" style={{ gap: 12 }}>
      <label className="muted" style={{ fontSize: 14 }}>Your name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Alex"
        maxLength={24}
      />
      {error && <div className="error">{error}</div>}
      <button className="btn-primary" onClick={create} disabled={busy} style={{ padding: 13 }}>
        {busy ? "Creating…" : `Create a ${game === "chess" ? "Chess" : "Ludo"} room & share the link`}
      </button>
      <p className="muted" style={{ margin: 0, fontSize: 13, textAlign: "center" }}>
        Free · no sign-up · works on mobile and desktop
      </p>
    </div>
  );
}
