"use client";

import { useEffect, useState } from "react";
import { isMuted, setMuted } from "@/lib/sound";

export default function SoundToggle() {
  const [muted, setM] = useState(false);
  useEffect(() => setM(isMuted()), []);
  return (
    <button
      className="pill"
      title={muted ? "Unmute sounds" : "Mute sounds"}
      aria-label={muted ? "Unmute sounds" : "Mute sounds"}
      onClick={() => {
        const next = !muted;
        setMuted(next);
        setM(next);
      }}
      style={{ cursor: "pointer" }}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
