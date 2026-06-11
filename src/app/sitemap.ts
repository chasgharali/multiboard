import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/play/chess`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/play/ludo`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
  ];
}
