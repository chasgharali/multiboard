import type { Metadata } from "next";
import GameLanding, { type LandingContent } from "@/components/GameLanding";

export const metadata: Metadata = {
  title: "Play Chess Online With Friends — Free, No Sign-up (2-Player)",
  description:
    "Play 2-player chess online with friends for free — no sign-up, no download. Create a room, share the link, and play chess in your browser on mobile or desktop with built-in voice, video and chat.",
  keywords: [
    "play chess online with friends",
    "play chess online free",
    "2 player chess online",
    "online chess with friends",
    "chess online no sign up",
    "play chess in browser",
    "free online chess",
    "chess multiplayer",
    "play chess with friends link",
    "chess with video chat",
  ],
  alternates: { canonical: "/play/chess" },
  openGraph: {
    title: "Play Chess Online With Friends — Free, No Sign-up",
    description:
      "Create a room, share the link, and play 2-player chess in your browser with voice, video and chat. No account needed.",
    url: "/play/chess",
    type: "website",
  },
};

const content: LandingContent = {
  game: "chess",
  emoji: "♟️",
  title: "Play Chess Online With Friends",
  path: "/play/chess",
  lede: "Free 2-player online chess in your browser — no sign-up, no download. Create a room, share the link, and play with voice, video and chat.",
  intro: [
    "MultiBoard lets you play chess online with friends in seconds. There is no registration and nothing to install — just enter a name, create a game room, and send the link to a friend. The board runs in any modern browser on mobile or desktop.",
    "Every move is checked by a full legal-move chess engine (castling, en passant, promotion, check and checkmate), so games play exactly like over-the-board chess. You can also talk and see each other on the built-in peer-to-peer voice, video and text chat while you play.",
  ],
  steps: [
    { h: "Enter your name", p: "No account or email required — a display name is all you need." },
    { h: "Create a chess room", p: "Pick “Anyone with the link” so a friend can take the second seat instantly." },
    { h: "Share the link or room code", p: "Send the link by message; your friend joins from any device." },
    { h: "Play and chat", p: "Make your moves and turn on voice and video to play face-to-face." },
  ],
  features: [
    { h: "♟️ Full legal-move rules", p: "Castling, en passant, promotion, check, checkmate and stalemate — all enforced server-side." },
    { h: "🔗 Share-a-link rooms", p: "No sign-up. Friends join with a link; strangers can request to join." },
    { h: "🎥 Voice, video & chat", p: "Built-in peer-to-peer call so you can talk while you play." },
    { h: "📱 Works everywhere", p: "Mobile and desktop browsers — nothing to download or install." },
  ],
  faq: [
    {
      q: "How do I play chess online with friends for free?",
      a: "Open MultiBoard, enter a name, create a chess room, and share the link or 6-character code with a friend. They join from any browser and you start playing instantly — no sign-up or download.",
    },
    {
      q: "Can I play 2-player chess online without an account?",
      a: "Yes. MultiBoard needs no account or email. You only choose a display name, then create or join a room.",
    },
    {
      q: "Does online chess work on mobile?",
      a: "Yes. The chess board runs in any modern mobile or desktop browser, so you can play on a phone, tablet or computer.",
    },
    {
      q: "Can we talk while playing chess online?",
      a: "Yes. Each room has built-in peer-to-peer voice, video and text chat, so you can see and talk to your opponent during the game.",
    },
    {
      q: "Is the chess engine accurate?",
      a: "Yes. Every move is validated by a complete legal-move engine, including castling, en passant, pawn promotion, check, checkmate and draw detection.",
    },
  ],
  related: [
    { href: "/play/ludo", label: "Play Ludo online", emoji: "🎲" },
    { href: "/", label: "Browse all games", emoji: "🎮" },
  ],
};

export default function ChessLanding() {
  return <GameLanding c={content} />;
}
