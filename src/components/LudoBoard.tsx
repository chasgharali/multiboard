"use client";

import { useEffect, useState } from "react";
import {
  LudoState,
  LudoMove,
  movableTokens,
  startOffset,
  RING_SIZE,
  SAFE_CELLS,
  COLOR_NAMES,
} from "@/lib/games/ludo";

const COLORS = ["#ef4565", "#3ecf8e", "#f5c518", "#6c8cff"]; // red, green, yellow, blue
const COLORS_DIM = ["#5a2733", "#1f4a3a", "#54491a", "#2c3a6b"];

// 52-cell clockwise ring as [row, col] on a 15x15 grid. Index 0 = color 0 start.
const PATH: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],            // 0-4
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],     // 5-10
  [0, 7],                                             // 11
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],     // 12-17
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],// 18-23
  [7, 14],                                            // 24
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],// 25-30
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],// 31-36
  [14, 7],                                            // 37
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],// 38-43
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],     // 44-49
  [7, 0],                                             // 50
  [6, 0],                                             // 51
];

// Home columns (relPos 51..56) per color, ending adjacent to the center (7,7).
const HOME_COLUMNS: Record<number, [number, number][]> = {
  0: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  1: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  3: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

const CENTER: [number, number] = [7, 7];

// Yard token spots per color.
const BASES: Record<number, [number, number][]> = {
  0: [[1, 1], [1, 4], [4, 1], [4, 4]],
  1: [[1, 10], [1, 13], [4, 10], [4, 13]],
  2: [[10, 10], [10, 13], [13, 10], [13, 13]],
  3: [[10, 1], [10, 4], [13, 1], [13, 4]],
};

// Base 6x6 square top-left corner per color.
const BASE_RECT: Record<number, [number, number]> = {
  0: [0, 0],
  1: [0, 9],
  2: [9, 9],
  3: [9, 0],
};

function tokenCoord(state: LudoState, seat: number, idx: number, pos: number): [number, number] {
  const color = state.seatColors[seat];
  if (pos === -1) return BASES[color][idx];
  if (pos >= 0 && pos <= 50) return PATH[(startOffset(color) + pos) % RING_SIZE];
  if (pos >= 51 && pos <= 56) return HOME_COLUMNS[color][pos - 51];
  return CENTER;
}

const key = (r: number, c: number) => `${r},${c}`;
const CELL = 100 / 15; // one cell as a % of the board

export default function LudoBoard({
  state,
  mySeat,
  isMyTurn,
  onMove,
}: {
  state: LudoState;
  mySeat: number;
  isMyTurn: boolean;
  onMove: (move: LudoMove) => void;
}) {
  const canMove = isMyTurn && state.phase === "move" && state.die != null;
  const movable = canMove ? movableTokens(state, mySeat, state.die!) : [];

  // Pre-compute background roles per cell.
  const pathSet = new Set(PATH.map(([r, c]) => key(r, c)));
  const startCells = new Map<string, number>();
  for (let color = 0; color < 4; color++) {
    const [r, c] = PATH[startOffset(color)];
    startCells.set(key(r, c), color);
  }
  const safeSet = new Set(
    [...SAFE_CELLS].map((abs) => {
      const [r, c] = PATH[abs];
      return key(r, c);
    })
  );
  const homeColCell = new Map<string, number>();
  for (let color = 0; color < 4; color++)
    HOME_COLUMNS[color].forEach(([r, c]) => homeColCell.set(key(r, c), color));

  // Background cells (no tokens here — tokens live in an animated overlay).
  const cells = [];
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const k = key(r, c);
      let bg = "transparent";
      for (let color = 0; color < 4; color++) {
        const [r0, c0] = BASE_RECT[color];
        if (r >= r0 && r < r0 + 6 && c >= c0 && c < c0 + 6) bg = COLORS_DIM[color];
      }
      if (r >= 6 && r <= 8 && c >= 6 && c <= 8) bg = "#3a4268";
      if (pathSet.has(k)) bg = "#cdd4ec";
      const sc = startCells.get(k);
      if (sc !== undefined) bg = COLORS[sc];
      const hc = homeColCell.get(k);
      if (hc !== undefined) bg = COLORS[hc];

      cells.push(
        <div
          key={k}
          style={{
            position: "relative",
            background: bg,
            border: pathSet.has(k) || hc !== undefined ? "1px solid rgba(0,0,0,.15)" : "none",
            display: "grid",
            placeItems: "center",
          }}
        >
          {safeSet.has(k) && sc === undefined && (
            <span style={{ fontSize: "55%", color: "#46506f" }}>★</span>
          )}
        </div>
      );
    }
  }

  // Tokens with stacking offsets so co-located tokens don't fully overlap.
  type Tok = {
    id: string;
    color: number;
    idx: number;
    seat: number;
    row: number;
    col: number;
    movableNow: boolean;
  };
  const raw: Tok[] = [];
  for (let seat = 0; seat < state.numPlayers; seat++) {
    const color = state.seatColors[seat];
    state.tokens[seat].forEach((pos, idx) => {
      const [row, col] = tokenCoord(state, seat, idx, pos);
      raw.push({
        id: `${seat}-${idx}`,
        color,
        idx,
        seat,
        row,
        col,
        movableNow: seat === mySeat && movable.includes(idx),
      });
    });
  }
  const sizes = new Map<string, number>();
  raw.forEach((t) => sizes.set(key(t.row, t.col), (sizes.get(key(t.row, t.col)) || 0) + 1));
  const seen = new Map<string, number>();

  return (
    <div className="col" style={{ alignItems: "center", gap: 16 }}>
      <style>{`
        @keyframes tokenPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.18)} }
        @keyframes diceRoll { 0%{transform:rotate(0) scale(1)} 50%{transform:rotate(180deg) scale(1.15)} 100%{transform:rotate(360deg) scale(1)} }
        @keyframes diceSettle { 0%{transform:scale(1.3)} 60%{transform:scale(.9)} 100%{transform:scale(1)} }
      `}</style>

      <div
        style={{
          position: "relative",
          width: "min(92vw, 480px)",
          aspectRatio: "1",
          borderRadius: 12,
          overflow: "hidden",
          border: "2px solid var(--border)",
          boxShadow: "0 10px 40px rgba(0,0,0,.35)",
          background: "#0b0e1a",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: "repeat(15, 1fr)",
            gridTemplateRows: "repeat(15, 1fr)",
          }}
        >
          {cells}
        </div>

        {/* Animated token overlay */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {raw.map((t) => {
            const k = key(t.row, t.col);
            const i = seen.get(k) || 0;
            seen.set(k, i + 1);
            const n = sizes.get(k) || 1;
            const spread = n > 1 ? (i - (n - 1) / 2) * 7 : 0;
            return (
              <div
                key={t.id}
                style={{
                  position: "absolute",
                  left: `${(t.col + 0.5) * CELL}%`,
                  top: `${(t.row + 0.5) * CELL}%`,
                  width: `${CELL * 0.62}%`,
                  height: `${CELL * 0.62}%`,
                  transform: `translate(-50%, -50%) translateX(${spread}px)`,
                  transition:
                    "left .45s cubic-bezier(.34,1.25,.5,1), top .45s cubic-bezier(.34,1.25,.5,1)",
                  zIndex: t.movableNow ? 3 : 2,
                }}
              >
                <button
                  onClick={() => t.movableNow && onMove({ kind: "move", token: t.idx })}
                  title={`${COLOR_NAMES[t.color]} token`}
                  style={{
                    width: "100%",
                    height: "100%",
                    padding: 0,
                    borderRadius: "50%",
                    background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.55), transparent 48%), ${COLORS[t.color]}`,
                    border: "2px solid rgba(0,0,0,.5)",
                    boxShadow: t.movableNow
                      ? "0 0 0 3px #fff, 0 0 12px 3px rgba(255,255,255,.7)"
                      : "inset 0 -2px 3px rgba(0,0,0,.35), 0 2px 5px rgba(0,0,0,.45)",
                    cursor: t.movableNow ? "pointer" : "default",
                    pointerEvents: t.movableNow ? "auto" : "none",
                    animation: t.movableNow ? "tokenPulse 1s ease-in-out infinite" : "none",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <LudoControls state={state} mySeat={mySeat} isMyTurn={isMyTurn} onMove={onMove} />
    </div>
  );
}

const PIP_LAYOUT: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ value, rolling }: { value: number | null; rolling: boolean }) {
  const pips = value && value >= 1 && value <= 6 ? PIP_LAYOUT[value] : null;
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 12,
        background: "#fff",
        boxShadow: "0 4px 12px rgba(0,0,0,.4)",
        animation: rolling
          ? "diceRoll .45s linear infinite"
          : value
            ? "diceSettle .35s ease-out"
            : "none",
      }}
      key={rolling ? "roll" : `v${value}`}
    >
      {pips ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "repeat(3, 1fr)",
            padding: 9,
            boxSizing: "border-box",
          }}
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ display: "grid", placeItems: "center" }}>
              {pips.includes(i) && (
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "#10131f",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="center" style={{ height: "100%", color: "#10131f", fontSize: 26 }}>–</div>
      )}
    </div>
  );
}

function LudoControls({
  state,
  mySeat,
  isMyTurn,
  onMove,
}: {
  state: LudoState;
  mySeat: number;
  isMyTurn: boolean;
  onMove: (move: LudoMove) => void;
}) {
  const canRoll = isMyTurn && state.phase === "roll";
  const myColorName = mySeat >= 0 ? COLOR_NAMES[state.seatColors[mySeat]] : "Spectator";
  const homeLocked = mySeat >= 0 && !state.hasKilled[mySeat];

  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState<number | null>(state.die);

  // Sync the displayed face with server state when not mid-roll.
  useEffect(() => {
    if (!rolling) setFace(state.die);
  }, [state.die, rolling]);

  // Cycle random faces during the roll animation.
  useEffect(() => {
    if (!rolling) return;
    const id = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 80);
    return () => clearInterval(id);
  }, [rolling]);

  function doRoll() {
    if (!canRoll || rolling) return;
    setRolling(true);
    onMove({ kind: "roll" });
    window.setTimeout(() => setRolling(false), 650);
  }

  return (
    <div className="col" style={{ alignItems: "center", gap: 8 }}>
      <div className="row" style={{ justifyContent: "center", gap: 14 }}>
        <Die value={rolling ? face : state.die} rolling={rolling} />
        <button className="btn-primary" disabled={!canRoll || rolling} onClick={doRoll}>
          🎲 Roll dice
        </button>
        <span className="pill">You are {myColorName}</span>
      </div>
      {homeLocked && (
        <span className="pill" style={{ color: "var(--warn)", borderColor: "var(--warn)" }}>
          🔒 Capture an opponent to unlock home
        </span>
      )}
    </div>
  );
}
