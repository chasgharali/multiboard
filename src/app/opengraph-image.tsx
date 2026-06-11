import { ImageResponse } from "next/og";

export const alt = "MultiBoard — Play Chess & Ludo online with friends, free and no sign-up";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px",
          background: "linear-gradient(135deg, #000000 0%, #15151a 100%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 700 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#0d0d0f",
              border: "2px solid #2a2a2e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
            }}
          >
            🎲
          </div>
          MultiBoard
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, marginTop: 28, letterSpacing: "-0.03em" }}>
          Play Chess &amp; Ludo online with friends
        </div>
        <div style={{ fontSize: 34, color: "#9a9aa3", marginTop: 24 }}>
          Free · no sign-up · share a link · voice, video &amp; chat
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
          {["♟️ Chess", "🎲 Ludo", "🎥 Video chat", "📱 Any browser"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                fontSize: 26,
                padding: "10px 20px",
                borderRadius: 999,
                background: "#161619",
                border: "1px solid #2a2a2e",
                color: "#e7e7ea",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
