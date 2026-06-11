"use client";

import { useEffect, useRef, useState } from "react";
import { useWebRTC, type Peer } from "@/lib/useWebRTC";
import { api } from "@/lib/client";
import { playSound } from "@/lib/sound";

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 42%)`;
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}
function timeOf(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const svgBase = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function MicIcon({ off }: { off?: boolean }) {
  return (
    <svg {...svgBase}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="21.5" />
      <line x1="8" y1="21.5" x2="16" y2="21.5" />
      {off && <line x1="3.5" y1="3.5" x2="20.5" y2="20.5" />}
    </svg>
  );
}

function CamIcon({ off }: { off?: boolean }) {
  return (
    <svg {...svgBase}>
      <rect x="2" y="6" width="13" height="12" rx="2.5" />
      <path d="M22 8.5l-5 3.5 5 3.5z" />
      {off && <line x1="3.5" y1="3.5" x2="20.5" y2="20.5" />}
    </svg>
  );
}

function HangupIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ transform: "rotate(133deg)" }}>
      <path d="M20.5 15.5c-1.3 0-2.6-.2-3.8-.6a1.1 1.1 0 0 0-1.1.27l-1.65 1.65a15.3 15.3 0 0 1-6.69-6.69L8.96 8.4a1.1 1.1 0 0 0 .27-1.1A12.3 12.3 0 0 1 8.6 3.5 1.1 1.1 0 0 0 7.5 2.5H4.6a1.1 1.1 0 0 0-1.1 1.1C3.5 12.9 11.1 20.5 20.4 20.5a1.1 1.1 0 0 0 1.1-1.1v-2.8a1.1 1.1 0 0 0-1-1.1z" />
    </svg>
  );
}

function VideoTile({
  stream,
  name,
  you,
  muted,
}: {
  stream: MediaStream | null;
  name: string;
  you?: boolean;
  muted?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div
      className={`video-tile ${you ? "you" : ""} ${stream && !muted ? "live" : ""} ${muted ? "muted-tile" : ""}`}
      title={you ? `${name} (you)` : name}
    >
      {stream ? (
        <video ref={ref} autoPlay playsInline muted={you} />
      ) : (
        <div className="video-placeholder">
          <div
            className="chat-avatar"
            style={{ width: 44, height: 44, fontSize: 16, background: avatarColor(name) }}
          >
            {initials(name)}
          </div>
        </div>
      )}
      {muted && <span className="video-badge">🔇</span>}
    </div>
  );
}

export default function CallPanel({
  code,
  myId,
  myName,
  peers,
  callMembers,
}: {
  code: string;
  myId: string;
  myName: string;
  peers: Peer[];
  callMembers: { id: string; name: string }[];
}) {
  const [joined, setJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const { remote, messages, sendChat } = useWebRTC({
    code,
    myId,
    myName,
    peers,
    active: joined,
    localStream,
  });

  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  const othersInCall = callMembers.filter((m) => m.id !== myId);

  // Heartbeat presence while in the call; announce leaving on exit/unload.
  useEffect(() => {
    if (!joined) return;
    api.callPresence(code, myName, "ping");
    const t = setInterval(() => api.callPresence(code, myName, "ping"), 5000);
    const onUnload = () => api.callPresence(code, myName, "leave");
    window.addEventListener("pagehide", onUnload);
    return () => {
      clearInterval(t);
      window.removeEventListener("pagehide", onUnload);
      api.callPresence(code, myName, "leave");
    };
  }, [joined, code, myName]);

  // Let an external "Join call" prompt (room banner) start the call.
  const joinedRef = useRef(false);
  joinedRef.current = joined;
  useEffect(() => {
    const h = () => {
      if (!joinedRef.current) join();
    };
    window.addEventListener("mb:join-call", h);
    return () => window.removeEventListener("mb:join-call", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ring an attention sound when someone starts a call and we haven't joined.
  const prevOthers = useRef(0);
  useEffect(() => {
    if (!joined && othersInCall.length > prevOthers.current) playSound("turn");
    prevOthers.current = othersInCall.length;
  }, [othersInCall.length, joined]);

  async function join() {
    setErr(null);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setCamOn(false);
      } catch {
        setErr("No camera/mic access — you can still text chat.");
        setCamOn(false);
        setMicOn(false);
      }
    }
    setLocalStream(stream);
    setJoined(true);
  }

  function leave() {
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setJoined(false);
  }

  function toggleMic() {
    const on = !micOn;
    localStream?.getAudioTracks().forEach((t) => (t.enabled = on));
    setMicOn(on);
  }
  function toggleCam() {
    const on = !camOn;
    localStream?.getVideoTracks().forEach((t) => (t.enabled = on));
    setCamOn(on);
  }

  // Only show tiles for people actually in the call.
  const tileOthers = peers.filter(
    (p) => p.id !== myId && callMembers.some((m) => m.id === p.id)
  );

  // ---- Pre-join ----
  if (!joined) {
    const ringing = othersInCall.length > 0;
    const names = othersInCall.map((m) => m.name).join(", ");
    return (
      <div className={`card col ${ringing ? "ringing" : ""}`}>
        <style>{`
          @keyframes ringPulse { 0%,100%{box-shadow:0 0 0 0 rgba(62,207,142,0)} 50%{box-shadow:0 0 0 4px rgba(62,207,142,.25)} }
          .ringing { border-color: var(--good) !important; animation: ringPulse 1.4s ease-in-out infinite; }
        `}</style>
        <div className="spread">
          <h2 style={{ margin: 0 }}>🎧 Voice &amp; video</h2>
          {ringing && (
            <span className="pill" style={{ color: "var(--good)", borderColor: "var(--good)" }}>
              🔴 live
            </span>
          )}
        </div>
        {ringing ? (
          <p style={{ margin: 0, fontSize: 14 }}>
            <strong>{names}</strong>
            {` ${othersInCall.length > 1 ? "are" : "is"} on the call. Turn on your audio & video to join them.`}
          </p>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Talk and chat with the table, peer-to-peer.
          </p>
        )}
        <button className="btn-primary" onClick={join}>
          {ringing ? "🎙️ Turn on audio & video" : "Join call"}
        </button>
      </div>
    );
  }

  // ---- In call ----
  const count = Math.max(1, callMembers.length);
  return (
    <div className="card col" style={{ gap: 12 }}>
      <div className="spread">
        <h2 style={{ margin: 0 }}>🎧 Voice &amp; video</h2>
        <span className="pill" style={{ color: "var(--good)", borderColor: "var(--good)" }}>
          🔴 {count} in call
        </span>
      </div>

      {err && <div className="notice" style={{ fontSize: 12 }}>{err}</div>}

      <div className="call-videos">
        <VideoTile stream={localStream} name={myName} you muted={!micOn} />
        {tileOthers.map((p) => (
          <VideoTile key={p.id} stream={remote[p.id]?.stream ?? null} name={p.name} />
        ))}
      </div>
      <div className="call-names">
        <span className="me">{myName} (you)</span>
        {tileOthers.map((p) => (
          <span key={p.id}>{p.name}</span>
        ))}
      </div>

      <div className="call-controls">
        <button
          className={`ctrl-btn ${!micOn ? "off" : ""}`}
          onClick={toggleMic}
          title={micOn ? "Mute microphone" : "Unmute microphone"}
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
        >
          <MicIcon off={!micOn} />
        </button>
        <button
          className={`ctrl-btn ${!camOn ? "off" : ""}`}
          onClick={toggleCam}
          title={camOn ? "Turn camera off" : "Turn camera on"}
          aria-label={camOn ? "Turn camera off" : "Turn camera on"}
        >
          <CamIcon off={!camOn} />
        </button>
        <button className="ctrl-btn danger" onClick={leave} title="Leave call" aria-label="Leave call">
          <HangupIcon />
        </button>
      </div>

      <hr className="chat-divider" />

      <div ref={logRef} className="chat-scroll">
        {messages.length === 0 && <div className="chat-empty">No messages yet — say hi 👋</div>}
        {messages.map((m, i) => {
          const displayName = m.mine ? myName : m.name;
          const prev = messages[i - 1];
          const grouped =
            prev && prev.from === m.from && m.ts - prev.ts < 5 * 60 * 1000;
          if (grouped) {
            return (
              <div key={i} className="chat-cont">
                {m.text}
              </div>
            );
          }
          return (
            <div key={i} className="chat-msg">
              <div className="chat-avatar" style={{ background: avatarColor(displayName) }}>
                {initials(displayName)}
              </div>
              <div className="chat-body">
                <div className="chat-head">
                  <span className="chat-name">{displayName}</span>
                  <span className="chat-time">{timeOf(m.ts)}</span>
                </div>
                <div className="chat-text">{m.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          sendChat(draft);
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message…"
          maxLength={500}
        />
        <button className="send" type="submit" aria-label="Send message">
          ➤
        </button>
      </form>
    </div>
  );
}
