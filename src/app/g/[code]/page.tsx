"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, getClientId, getSavedName, saveName } from "@/lib/client";
import { useRoom } from "@/lib/useRoom";
import { getGame, GAME_META } from "@/lib/games";
import ChessBoard from "@/components/ChessBoard";
import LudoBoard from "@/components/LudoBoard";
import CallPanel from "@/components/CallPanel";
import SoundToggle from "@/components/SoundToggle";
import ShareMenu from "@/components/ShareMenu";
import { playSound, type SoundName } from "@/lib/sound";
import { COLOR_NAMES } from "@/lib/games/ludo";

const LUDO_COLORS = ["#ef4565", "#3ecf8e", "#f5c518", "#6c8cff"];

function seatColor(game: string, state: any, seat: number): string {
  if (game === "chess") return seat === 0 ? "#f2f3f8" : "#10131f";
  const c = state?.seatColors?.[seat] ?? seat;
  return LUDO_COLORS[c] ?? "#6c8cff";
}
function seatLabel(game: string, state: any, seat: number): string {
  if (game === "chess") return seat === 0 ? "White" : "Black";
  const c = state?.seatColors?.[seat] ?? seat;
  return COLOR_NAMES[c] ?? `P${seat + 1}`;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params.code || "").toUpperCase();

  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const joinedRef = useRef(false);
  const soundPrev = useRef<any>(null);

  const { room, error, loading, apply } = useRoom(code);
  const clientId = getClientId();

  // Play sound effects when the room state changes (moves, turns, joins, wins).
  useEffect(() => {
    if (!room) return;
    const me = room.players.find((p) => p.id === clientId);
    const meSeat = me ? me.seat : -1;
    let curSeat = -1;
    if (room.state) {
      try {
        curSeat = getGame(room.game).currentSeat(room.state);
      } catch {}
    }
    const snap = {
      playersLen: room.players.length,
      requestsLen: room.requests.length,
      status: room.status,
      chessHist: room.game === "chess" ? (room.state as any)?.history?.length ?? 0 : 0,
      ludoLog0: room.game === "ludo" ? (room.state as any)?.log?.[0] ?? "" : "",
      myTurn: meSeat >= 0 && curSeat === meSeat && room.status === "active",
    };
    const prev = soundPrev.current;
    soundPrev.current = snap;
    if (!prev) return; // first load — stay silent

    let toPlay: SoundName | null = null;
    if (room.status === "active") {
      if (room.game === "chess" && snap.chessHist > prev.chessHist) {
        const san = (room.state as any).history[snap.chessHist - 1] || "";
        toPlay = /x/.test(san) ? "capture" : "move";
      } else if (room.game === "ludo" && snap.ludoLog0 && snap.ludoLog0 !== prev.ludoLog0) {
        const l = snap.ludoLog0 as string;
        if (/captured/.test(l)) toPlay = "capture";
        else if (/moved/.test(l)) toPlay = "move";
        else if (/rolled/.test(l)) toPlay = "dice";
      }
    }
    if (snap.status === "finished" && prev.status !== "finished") {
      toPlay = room.winnerSeat === meSeat ? "win" : "lose";
    } else if (snap.myTurn && !prev.myTurn && toPlay !== "capture") {
      toPlay = "turn";
    }
    if (snap.playersLen > prev.playersLen || snap.requestsLen > prev.requestsLen) playSound("join");
    if (toPlay) playSound(toPlay);
  }, [room, clientId]);

  useEffect(() => {
    const n = getSavedName();
    setName(n);
    setNameInput(n);
  }, []);

  // Auto-join once we have a name and the room is loaded.
  useEffect(() => {
    if (!room || !name || joinedRef.current) return;
    const amPlayer = room.players.some((p) => p.id === clientId);
    const amPending = room.requests.some((r) => r.id === clientId);
    if (amPlayer || amPending) {
      joinedRef.current = true;
      return;
    }
    joinedRef.current = true;
    api
      .join(code, name)
      .then((r) => apply(r.room))
      .catch((e) => setToast(e.message));
  }, [room, name, code, clientId, apply]);

  function showToast(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  }

  async function doMove(move: unknown) {
    try {
      const { room } = await api.move(code, move);
      apply(room);
    } catch (e: any) {
      showToast(e.message);
    }
  }
  async function doStart() {
    try {
      const { room } = await api.start(code);
      apply(room);
    } catch (e: any) {
      showToast(e.message);
    }
  }
  async function manage(reqId: string, action: "approve" | "deny") {
    try {
      const { room } = await api.manageRequest(code, reqId, action);
      apply(room);
    } catch (e: any) {
      showToast(e.message);
    }
  }

  // ---- Name gate ----
  if (!name) {
    return (
      <div className="container center" style={{ minHeight: "70vh" }}>
        <div className="card col" style={{ maxWidth: 380, width: "100%" }}>
          <h2>Join room {code}</h2>
          <p className="muted" style={{ marginTop: 0 }}>Enter a name to join the game.</p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            maxLength={24}
            onKeyDown={(e) => e.key === "Enter" && nameInput.trim() && (saveName(nameInput), setName(nameInput.trim()))}
          />
          <button
            className="btn-primary"
            disabled={!nameInput.trim()}
            onClick={() => {
              saveName(nameInput);
              setName(nameInput.trim());
            }}
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  if (loading && !room) return <div className="container center" style={{ minHeight: "60vh" }}>Loading room…</div>;
  if (error && !room)
    return (
      <div className="container center" style={{ minHeight: "60vh" }}>
        <div className="card col center" style={{ gap: 12 }}>
          <div className="error">{error}</div>
          <button className="btn-primary" onClick={() => router.push("/")}>Back home</button>
        </div>
      </div>
    );
  if (!room) return null;

  const meta = GAME_META[room.game];
  const me = room.players.find((p) => p.id === clientId);
  const amHost = room.hostId === clientId;
  const amPending = room.requests.some((r) => r.id === clientId);
  const mySeat = me ? me.seat : -1;

  let currentSeat = -1;
  let winnerText: string | null = null;
  if (room.state) {
    try {
      currentSeat = getGame(room.game).currentSeat(room.state);
    } catch {}
  }
  if (room.status === "finished") {
    if (room.isDraw) winnerText = "It's a draw!";
    else if (room.winnerSeat != null)
      winnerText = `${seatLabel(room.game, room.state, room.winnerSeat)} wins! 🎉`;
  }
  const isMyTurn = me != null && currentSeat === mySeat && room.status === "active";

  const callMembers = room.callMembers || [];
  const meInCall = callMembers.some((m) => m.id === clientId);
  const othersInCall = callMembers.filter((m) => m.id !== clientId);
  const showCallInvite = me != null && !meInCall && othersInCall.length > 0;

  function answerCall() {
    window.dispatchEvent(new Event("mb:join-call"));
    document.getElementById("call-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="container col" style={{ gap: 18 }}>
      <div className="spread">
        <div className="brand" style={{ cursor: "pointer" }} onClick={() => router.push("/")}>
          <span className="logo">{meta.emoji}</span> MultiBoard
        </div>
        <div className="row" style={{ gap: 8 }}>
          <SoundToggle />
          <span className="pill">Room <b style={{ color: "var(--text)", marginLeft: 4 }}>{code}</b></span>
          <ShareMenu code={code} />
        </div>
      </div>

      {/* Pending / spectator notices */}
      {amPending && (
        <div className="notice">⏳ Waiting for the host to approve you. You’ll join automatically.</div>
      )}
      {!me && !amPending && room.status === "active" && (
        <div className="notice">👀 You’re spectating. {room.joinPolicy === "approval" ? "Ask the host to let you in." : "No free seats right now."}</div>
      )}
      {showCallInvite && (
        <div
          className="notice"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            borderColor: "var(--good)",
            background: "rgba(62,207,142,.08)",
          }}
        >
          <span>
            📹 <strong>{othersInCall.map((m) => m.name).join(", ")}</strong>
            {` ${othersInCall.length > 1 ? "are" : "is"} on a call — turn on your audio & video to join.`}
          </span>
          <button className="btn-good btn-sm" onClick={answerCall} style={{ flexShrink: 0 }}>
            🎙️ Turn on
          </button>
        </div>
      )}

      <div className="room-layout">
        {/* Board / lobby area */}
        <div className="room-main">
          {room.status === "lobby" ? (
            <div className="card col center" style={{ gap: 14, width: "min(92vw, 480px)" }}>
              <h2>{meta.name} — waiting room</h2>
              <p className="muted" style={{ textAlign: "center", marginTop: 0 }}>
                Share the room link or code <b>{code}</b> with friends. The game needs{" "}
                {meta.minPlayers}
                {meta.minPlayers !== meta.maxPlayers ? `–${meta.maxPlayers}` : ""} players.
              </p>
              {amHost ? (
                <button
                  className="btn-primary"
                  disabled={room.players.length < meta.minPlayers}
                  onClick={doStart}
                  style={{ padding: "12px 28px" }}
                >
                  {room.players.length < meta.minPlayers
                    ? `Waiting for players (${room.players.length}/${meta.minPlayers})`
                    : "Start game"}
                </button>
              ) : (
                <div className="pill">Waiting for the host to start…</div>
              )}
            </div>
          ) : room.game === "chess" ? (
            <ChessBoard state={room.state as any} mySeat={mySeat} isMyTurn={isMyTurn} onMove={doMove} />
          ) : (
            <LudoBoard state={room.state as any} mySeat={mySeat} isMyTurn={isMyTurn} onMove={doMove} />
          )}

          {room.status === "active" && (
            <div className={`turn-banner ${isMyTurn ? "you" : ""}`}>
              {isMyTurn ? "Your turn — " : ""}
              {room.status_text}
            </div>
          )}
          {winnerText && (
            <div className="col center" style={{ gap: 10 }}>
              <div className="turn-banner you" style={{ fontSize: 18 }}>{winnerText}</div>
              {amHost && (
                <button className="btn-primary" onClick={doStart}>Rematch</button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="room-side">
          <div className="card col">
            <h2>Players</h2>
            {room.players
              .slice()
              .sort((a, b) => a.seat - b.seat)
              .map((p) => (
                <div key={p.id} className="player-chip">
                  <span className="seat-dot" style={{ background: seatColor(room.game, room.state, p.seat), border: "1px solid var(--border)" }} />
                  <span className="grow">{p.name}{p.id === clientId ? " (you)" : ""}</span>
                  {p.id === room.hostId && <span className="pill" style={{ fontSize: 11 }}>host</span>}
                  {room.status === "active" && currentSeat === p.seat && <span title="their turn">▶</span>}
                </div>
              ))}
            {Array.from({ length: Math.max(0, room.maxPlayers - room.players.length) }).map((_, i) => (
              <div key={i} className="player-chip" style={{ opacity: 0.5 }}>
                <span className="seat-dot" style={{ background: "transparent", border: "1px dashed var(--muted)" }} />
                <span className="muted">Open seat</span>
              </div>
            ))}
          </div>

          {me && (
            <div id="call-panel">
              <CallPanel
                code={code}
                myId={clientId}
                myName={name}
                peers={room.players.map((p) => ({ id: p.id, name: p.name }))}
                callMembers={callMembers}
              />
            </div>
          )}

          {amHost && room.requests.length > 0 && (
            <div className="card col">
              <h2>Join requests</h2>
              {room.requests.map((r) => (
                <div key={r.id} className="player-chip">
                  <span className="grow">{r.name}</span>
                  <button className="btn-good btn-sm" onClick={() => manage(r.id, "approve")}>✓</button>
                  <button className="btn-danger btn-sm" onClick={() => manage(r.id, "deny")}>✕</button>
                </div>
              ))}
            </div>
          )}

          {room.game === "ludo" && Boolean((room.state as any)?.log?.length) && (
            <div className="card col">
              <h2>Activity</h2>
              <div className="col" style={{ gap: 4 }}>
                {(room.state as any).log.slice(0, 6).map((l: string, i: number) => (
                  <span key={i} className="muted" style={{ fontSize: 13 }}>• {l}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
