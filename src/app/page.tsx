"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getSavedName, saveName } from "@/lib/client";
import { GAME_META } from "@/lib/games";
import type { GameId } from "@/lib/games/types";
import SoundToggle from "@/components/SoundToggle";

const GAMES = Object.entries(GAME_META) as [GameId, (typeof GAME_META)[GameId]][];

const FAQ = [
  {
    q: "How do I play board games online with friends for free?",
    a: "Pick a game on MultiBoard, enter a name, create a room, and share the link or 6-character room code. Friends with the link take a free seat instantly; anyone else can request to join. It's free with no sign-up.",
  },
  {
    q: "Do I need an account or download to play?",
    a: "No. There is no account, email or download required. You only choose a display name, then create or join a room directly in your browser.",
  },
  {
    q: "What board games can I play online here?",
    a: "You can play Chess (full legal-move rules) and Ludo (2–4 players with dice and captures) online with friends. More popular board games are being added.",
  },
  {
    q: "Can I play board games online with video chat?",
    a: "Yes. Every room has built-in peer-to-peer voice, video and text chat over WebRTC, so you can see and talk to other players while you play — no separate Zoom or Discord needed.",
  },
  {
    q: "Can I play 2-player chess online with a friend?",
    a: "Yes. Create a chess room, share the link, and your friend takes the second seat. Every move uses a full legal-move chess engine with castling, en passant, promotion and checkmate.",
  },
  {
    q: "Is this a free Ludo King alternative?",
    a: "Yes. MultiBoard is a browser-based way to play Ludo with friends without downloading any app — a free Ludo King alternative for 2–4 players.",
  },
  {
    q: "Does it work on mobile phones?",
    a: "Yes. MultiBoard is mobile-responsive and runs in any modern phone, tablet or desktop browser — no app install needed.",
  },
];

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "browse">("create");
  const [name, setName] = useState("");
  const [game, setGame] = useState<GameId>("chess");
  const [policy, setPolicy] = useState<"open" | "approval">("open");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setName(getSavedName()), []);

  async function create() {
    setError(null);
    if (!name.trim()) return setError("Please enter your name first.");
    setBusy(true);
    try {
      saveName(name);
      const { code } = await api.createRoom(game, name.trim(), policy);
      router.push(`/g/${code}`);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  function joinByCode() {
    setError(null);
    if (!name.trim()) return setError("Please enter your name first.");
    const c = code.trim().toUpperCase();
    if (c.length < 4) return setError("Enter a valid room code.");
    saveName(name);
    router.push(`/g/${c}`);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "MultiBoard",
        applicationCategory: "GameApplication",
        operatingSystem: "Any (web browser)",
        url: siteUrl || undefined,
        description:
          "Play Chess and Ludo online with friends for free. No sign-up — share a link and play multiplayer board games with voice, video and chat in your browser.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          "Multiplayer Chess",
          "Multiplayer Ludo (2–4 players)",
          "No sign-up",
          "Peer-to-peer voice, video and text chat",
          "Shareable room links",
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main className="container col" style={{ gap: 22 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="spread">
        <div className="brand">
          <span className="logo">🎲</span> MultiBoard
        </div>
        <div className="row" style={{ gap: 8 }}>
          <SoundToggle />
          <span className="pill">No sign-up · just a name</span>
        </div>
      </header>

      <section>
        <h1>Play board games online with friends</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Free multiplayer <strong>Chess</strong> and <strong>Ludo</strong> in your browser. Pick a
          game, enter your name, and share the link — friends join instantly, and you can talk over
          built-in voice, video and chat. No account required.
        </p>
        <div className="row" style={{ gap: 8, marginTop: 4 }}>
          <Link href="/play/chess" className="pill">♟️ Play Chess online</Link>
          <Link href="/play/ludo" className="pill">🎲 Play Ludo online</Link>
        </div>
      </section>

      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "create"}
          className={`tab ${tab === "create" ? "active" : ""}`}
          onClick={() => setTab("create")}
        >
          Start a game
        </button>
        <button
          role="tab"
          aria-selected={tab === "browse"}
          className={`tab ${tab === "browse" ? "active" : ""}`}
          onClick={() => setTab("browse")}
        >
          Browse open games
        </button>
      </div>

      {tab === "create" ? (
        <>
          <div className="card col">
            <div className="col">
              <label className="muted" style={{ fontSize: 14 }}>Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                maxLength={24}
              />
            </div>

            <div className="col">
              <label className="muted" style={{ fontSize: 14 }}>Choose a game</label>
              <div className="game-grid">
                {GAMES.map(([id, meta]) => (
                  <button
                    key={id}
                    className={`game-tile ${game === id ? "selected" : ""}`}
                    onClick={() => setGame(id)}
                    type="button"
                  >
                    <span className="emoji">{meta.emoji}</span>
                    <span className="name">{meta.name}</span>
                    <span className="muted" style={{ fontSize: 13 }}>{meta.blurb}</span>
                    <span className="pill" style={{ marginTop: 6, alignSelf: "flex-start" }}>
                      {meta.minPlayers === meta.maxPlayers
                        ? `${meta.maxPlayers} players`
                        : `${meta.minPlayers}–${meta.maxPlayers} players`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="col">
              <label className="muted" style={{ fontSize: 14 }}>Who can join?</label>
              <div className="row">
                <button
                  type="button"
                  className={`game-tile ${policy === "open" ? "selected" : ""}`}
                  style={{ flex: 1, minWidth: 200 }}
                  onClick={() => setPolicy("open")}
                >
                  <span className="name">🔗 Anyone with the link</span>
                  <span className="muted" style={{ fontSize: 13 }}>Friends take a free seat instantly.</span>
                </button>
                <button
                  type="button"
                  className={`game-tile ${policy === "approval" ? "selected" : ""}`}
                  style={{ flex: 1, minWidth: 200 }}
                  onClick={() => setPolicy("approval")}
                >
                  <span className="name">✋ Approve each player</span>
                  <span className="muted" style={{ fontSize: 13 }}>You confirm every join request.</span>
                </button>
              </div>
            </div>

            {error && <div className="error">{error}</div>}

            <button className="btn-primary" onClick={create} disabled={busy} style={{ padding: "13px" }}>
              {busy ? "Creating…" : "Create game room"}
            </button>
          </div>

          <div className="card col">
            <h2>Have a room code?</h2>
            <div className="row">
              <input
                className="grow"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCDEF"
                maxLength={6}
                style={{ letterSpacing: 3, textTransform: "uppercase", minWidth: 160 }}
              />
              <button className="btn-primary" onClick={joinByCode}>Join</button>
            </div>
          </div>
        </>
      ) : (
        <BrowseGames name={name} onNeedName={() => setTab("create")} />
      )}

      {/* FAQ — helps players and answer engines (AEO) */}
      <section className="card col" aria-labelledby="faq-h">
        <h2 id="faq-h">Frequently asked questions</h2>
        {FAQ.map((f) => (
          <details key={f.q} className="faq">
            <summary>{f.q}</summary>
            <p className="muted" style={{ margin: "8px 0 0" }}>{f.a}</p>
          </details>
        ))}
      </section>

      <footer className="muted" style={{ fontSize: 13, textAlign: "center", paddingTop: 8 }}>
        MultiBoard — free online multiplayer board games. Play chess and ludo with friends in your
        browser, no sign-up.
      </footer>
    </main>
  );
}

function BrowseGames({ name, onNeedName }: { name: string; onNeedName: () => void }) {
  const router = useRouter();
  const [rooms, setRooms] = useState<
    { code: string; game: string; status: string; players: number; maxPlayers: number; hostName: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const { rooms } = await api.listOpenRooms();
        if (!stop) setRooms(rooms);
      } catch {
        /* ignore */
      } finally {
        if (!stop) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  function join(code: string) {
    if (!name.trim()) {
      onNeedName();
      return;
    }
    saveName(name);
    router.push(`/g/${code}`);
  }

  return (
    <div className="card col">
      <div className="spread">
        <h2 style={{ margin: 0 }}>Open games anyone can join</h2>
        <span className="pill">{rooms.length} open</span>
      </div>
      {loading ? (
        <p className="muted">Loading open games…</p>
      ) : rooms.length === 0 ? (
        <p className="muted">
          No open games right now. Switch to <strong>Start a game</strong> to create one!
        </p>
      ) : (
        <div className="col" style={{ gap: 8 }}>
          {rooms.map((r) => (
            <div key={r.code} className="player-chip" style={{ gap: 12 }}>
              <span style={{ fontSize: 22 }}>{GAME_META[r.game as GameId]?.emoji}</span>
              <div className="grow col" style={{ gap: 2 }}>
                <strong>
                  {GAME_META[r.game as GameId]?.name}{" "}
                  <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
                    · {r.status === "lobby" ? "in lobby" : "in progress"}
                  </span>
                </strong>
                <span className="muted" style={{ fontSize: 13 }}>
                  Host {r.hostName} · {r.players}/{r.maxPlayers} players · code {r.code}
                </span>
              </div>
              <button className="btn-primary btn-sm" onClick={() => join(r.code)}>Join</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
