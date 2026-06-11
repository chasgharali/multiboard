# 🎲 MultiBoard

A simple, no-sign-up multiplayer board game site. Enter a name, pick a game, and
share a link — friends join instantly, anyone else can request to join. Built with
**Next.js (App Router)** and **MongoDB**, fully **Vercel-compatible**.

Currently playable: **Chess** (full legal-move rules) and **Ludo** (2–4 players,
dice, captures, safe squares). The game registry makes adding more games easy.

Every player at the table can also **talk, see each other on video, and text chat**
— all peer-to-peer over WebRTC.

Other niceties: a **Browse open games** lobby to join public rooms, synthesized
**sound effects** (with a mute toggle), a **mobile-responsive** layout, and
**SEO/AEO** built in.

### SEO / AEO

Keyword-researched and optimized for organic search and answer engines:

- **Dedicated landing pages** per head term — [`/play/chess`](src/app/play/chess/page.tsx)
  and [`/play/ludo`](src/app/play/ludo/page.tsx) — each server-rendered with its own
  title/description/canonical, keyword-rich copy ("how to play", features), an FAQ,
  and a create-game CTA. (One SPA can't rank for two different head terms; these can.)
- **Structured data (JSON-LD):** `WebApplication` + `FAQPage` on the home page;
  `VideoGame` + `BreadcrumbList` + `FAQPage` on each landing page — eligible for FAQ
  rich results and answer-engine answers.
- **Metadata:** researched keyword sets, Open Graph + Twitter cards, a generated
  `opengraph-image` for rich link previews, `robots.txt` (ephemeral `/g/` rooms
  disallowed), `sitemap.xml`, and a web app manifest.
- Set `NEXT_PUBLIC_SITE_URL` to your domain so canonical/OG URLs and the sitemap are
  absolute in production.

## How it works

- **No accounts.** Each browser gets a random client id in `localStorage` plus a
  display name. That's the whole identity model.
- **Server-authoritative.** Every move is validated on the server through a pure
  rules engine (`src/lib/games/*`) before it touches the database. Clients can't
  cheat by posting illegal moves.
- **MongoDB is the source of truth.** A room document holds players, pending join
  requests, and the full game state, with an optimistic-concurrency `version` so
  simultaneous moves never clobber each other.

### A note on "real-time"

Vercel's serverless functions can't hold a long-lived WebSocket, so the realtime
layer uses **short-interval polling** of MongoDB (~1.2s) behind a single hook
(`src/lib/useRoom.ts`). It feels live and needs zero extra infrastructure.

If you self-host on a long-running Node server and want true push updates, swap the
polling loop inside `useRoom.ts` for Socket.IO events — **nothing else in the app
needs to change**, because the whole UI only talks to that one hook.

### Voice / video / chat (WebRTC, peer-to-peer)

Audio, video, and text chat are **direct peer-to-peer** between players — media never
touches the server. Players form a full mesh of `RTCPeerConnection`s (fine up to the
4-player Ludo cap); text chat rides a data channel on those same connections.

The only thing the server does is **relay signaling** (SDP offers/answers + ICE
candidates), and even that reuses the Vercel-safe pattern: messages are written to a
MongoDB `signals` collection and polled by the recipient, then consumed on read (they
also auto-expire via a TTL index). See `src/lib/useWebRTC.ts` and
`src/app/api/rooms/[code]/signal/route.ts`.

> **NAT note:** only public STUN servers are configured, so connections work across
> most home networks but may fail behind strict/symmetric NATs. For production
> reliability, add a **TURN** server to the `iceServers` list in `useWebRTC.ts`
> (e.g. a free Twilio/Metered TURN credential or a self-hosted coturn).

## Getting started

1. **Install**

   ```bash
   npm install
   ```

2. **Set up MongoDB** — create a free [MongoDB Atlas](https://www.mongodb.com/atlas)
   cluster and copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   # then edit MONGODB_URI=...
   ```

3. **Run**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000, create a room, and open the share link in a second
   browser/incognito window to play against yourself.

## Deploy to Vercel

1. Push this folder to a Git repo and import it in Vercel.
2. Add the `MONGODB_URI` (and optional `MONGODB_DB`) environment variables.
3. Deploy. That's it — no extra services needed.

## Project layout

```
src/
  app/
    page.tsx                 Home: name + pick game + create/join
    g/[code]/page.tsx        Room: lobby, share, join requests, board
    api/rooms/...            Server-authoritative REST endpoints
  components/
    ChessBoard.tsx           Chess UI (uses chess.js for legal-move hints)
    LudoBoard.tsx            Ludo UI (15x15 cross board + dice)
  lib/
    games/
      types.ts               GameDefinition contract + metadata
      chess.ts               Chess engine (wraps chess.js)
      ludo.ts                Ludo rules engine (from scratch)
      index.ts               Game registry
    mongodb.ts               Cached serverless Mongo client
    room.ts                  Room data access + optimistic concurrency
    client.ts                Client identity + API helpers
    useRoom.ts               Realtime (polling) hook
```

## Adding a new game

1. Implement the `GameDefinition` contract in `src/lib/games/yourgame.ts`.
2. Register it in `src/lib/games/index.ts` and add metadata in `types.ts`.
3. Add a board component and wire it into `g/[code]/page.tsx`.
