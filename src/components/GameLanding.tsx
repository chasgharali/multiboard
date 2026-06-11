import Link from "next/link";
import LandingCTA from "./LandingCTA";
import type { GameId } from "@/lib/games/types";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export interface LandingContent {
  game: GameId;
  emoji: string;
  title: string; // <h1>
  path: string; // e.g. /play/chess
  lede: string;
  intro: string[];
  steps: { h: string; p: string }[];
  features: { h: string; p: string }[];
  faq: { q: string; a: string }[];
  related: { href: string; label: string; emoji: string }[];
}

export default function GameLanding({ c }: { c: LandingContent }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "VideoGame",
        name: `${c.game === "chess" ? "Chess" : "Ludo"} on MultiBoard`,
        url: `${SITE}${c.path}`,
        applicationCategory: "GameApplication",
        operatingSystem: "Any (web browser)",
        gamePlatform: "Web browser",
        playMode: "MultiPlayer",
        numberOfPlayers: {
          "@type": "QuantitativeValue",
          minValue: 2,
          maxValue: c.game === "ludo" ? 4 : 2,
        },
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: c.lede,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: c.title, item: `${SITE}${c.path}` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: c.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main className="container col" style={{ gap: 22 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="spread">
        <Link href="/" className="brand" style={{ color: "var(--text)" }}>
          <span className="logo">🎲</span> MultiBoard
        </Link>
        <Link href="/" className="pill">← All games</Link>
      </header>

      <nav aria-label="Breadcrumb" className="muted" style={{ fontSize: 13 }}>
        <Link href="/">Home</Link> / {c.title}
      </nav>

      <section>
        <h1>
          {c.emoji} {c.title}
        </h1>
        <p className="muted" style={{ marginTop: 0, fontSize: 16 }}>{c.lede}</p>
      </section>

      <LandingCTA game={c.game} />

      <section className="col" style={{ gap: 8 }}>
        {c.intro.map((p, i) => (
          <p key={i} style={{ margin: 0, lineHeight: 1.6 }} className={i === 0 ? "" : "muted"}>
            {p}
          </p>
        ))}
      </section>

      <section className="card col">
        <h2>How to play {c.game} online with friends</h2>
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
          {c.steps.map((s, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              <strong>{s.h}.</strong> <span className="muted">{s.p}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="game-grid">
        {c.features.map((f, i) => (
          <div key={i} className="game-tile">
            <span className="name">{f.h}</span>
            <span className="muted" style={{ fontSize: 13 }}>{f.p}</span>
          </div>
        ))}
      </section>

      <section className="card col" aria-labelledby="faq-h">
        <h2 id="faq-h">{c.title} — FAQ</h2>
        {c.faq.map((f) => (
          <details key={f.q} className="faq">
            <summary>{f.q}</summary>
            <p className="muted" style={{ margin: "8px 0 0" }}>{f.a}</p>
          </details>
        ))}
      </section>

      <section className="card col">
        <h2>More ways to play</h2>
        <div className="row">
          {c.related.map((r) => (
            <Link key={r.href} href={r.href} className="player-chip" style={{ textDecoration: "none", color: "var(--text)" }}>
              <span style={{ fontSize: 20 }}>{r.emoji}</span>
              <span>{r.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="muted" style={{ fontSize: 13, textAlign: "center", paddingTop: 8 }}>
        MultiBoard — free online multiplayer board games with voice, video &amp; chat. No sign-up.
      </footer>
    </main>
  );
}
