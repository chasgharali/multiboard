import type { Metadata } from "next";
import GameLanding, { type LandingContent } from "@/components/GameLanding";

export const metadata: Metadata = {
  title: "Play Ludo Online With Friends — Free Ludo Multiplayer (2–4 Players)",
  description:
    "Play Ludo online with friends for free — 2 to 4 players, no sign-up, no download. A browser Ludo King alternative: create a room, share the link, roll the dice and play with voice, video and chat.",
  keywords: [
    "play ludo online",
    "play ludo online with friends",
    "ludo with friends",
    "ludo online multiplayer",
    "ludo king alternative",
    "play ludo without downloading",
    "ludo online free",
    "ludo 4 players online",
    "ludo in browser",
    "ludo with video chat",
  ],
  alternates: { canonical: "/play/ludo" },
  openGraph: {
    title: "Play Ludo Online With Friends — Free Ludo Multiplayer (2–4 Players)",
    description:
      "A browser Ludo King alternative. Create a room, share the link, and play 2–4 player Ludo with voice, video and chat. No download.",
    url: "/play/ludo",
    type: "website",
  },
};

const content: LandingContent = {
  game: "ludo",
  emoji: "🎲",
  title: "Play Ludo Online With Friends",
  path: "/play/ludo",
  lede: "Free 2–4 player Ludo online in your browser — no sign-up, no download. A Ludo King alternative you can play with friends over a shared link, with voice, video and chat.",
  intro: [
    "MultiBoard is the easy way to play Ludo online with friends — no app, no Ludo King download, no account. Create a Ludo room for 2 to 4 players, share the link, and everyone joins straight from their browser on a phone, tablet or computer.",
    "It is real multiplayer Ludo with dice rolls, token captures, safe squares and a race home — plus a house rule that locks your home until you capture an opponent, so games stay competitive. Talk and see each other over the built-in peer-to-peer voice, video and text chat while you play.",
  ],
  steps: [
    { h: "Enter your name", p: "No registration or Ludo King download — a display name is enough." },
    { h: "Create a Ludo room", p: "Ludo supports 2, 3 or 4 players. Choose “Anyone with the link” so friends join instantly." },
    { h: "Share the link or code", p: "Send the room link; friends join from any device and pick a colour." },
    { h: "Roll, race and chat", p: "Roll the dice, capture opponents, race home, and talk over voice and video." },
  ],
  features: [
    { h: "🎲 Real 2–4 player Ludo", p: "Dice, token captures, safe star squares and the race to home." },
    { h: "🔒 Capture-to-unlock-home", p: "A competitive house rule: you can’t bring a token home until you capture an opponent." },
    { h: "🔗 Share-a-link rooms", p: "No sign-up. Friends join with a link; others can request to join." },
    { h: "🎥 Voice, video & chat", p: "Built-in peer-to-peer call so it feels like the table is together." },
  ],
  faq: [
    {
      q: "How can I play Ludo online with friends for free?",
      a: "Open MultiBoard, enter a name, create a Ludo room, and share the link or room code with up to 3 friends. Everyone joins from their browser and you play instantly — no sign-up or download.",
    },
    {
      q: "Is there a Ludo King alternative I can play without downloading?",
      a: "Yes. MultiBoard is a browser-based Ludo you can play without downloading any app. Just share a room link and play Ludo with friends for free.",
    },
    {
      q: "How many players can play Ludo online here?",
      a: "Ludo supports 2, 3 or 4 players in a single room. Share the link and friends take the open seats.",
    },
    {
      q: "Can I play Ludo with friends on mobile?",
      a: "Yes. The Ludo board is mobile-responsive and runs in any modern phone, tablet or desktop browser.",
    },
    {
      q: "Can we talk while playing Ludo online?",
      a: "Yes. Every room has built-in peer-to-peer voice, video and text chat, so you can talk and see each other during the game.",
    },
  ],
  related: [
    { href: "/play/chess", label: "Play Chess online", emoji: "♟️" },
    { href: "/", label: "Browse all games", emoji: "🎮" },
  ],
};

export default function LudoLanding() {
  return <GameLanding c={content} />;
}
