import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MultiBoard — Play Chess & Ludo Online With Friends",
    short_name: "MultiBoard",
    description:
      "Free multiplayer board games in your browser. Play Chess and Ludo with friends — no sign-up.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["games", "entertainment"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
