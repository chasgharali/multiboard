"use client";

import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import type { ChessState, ChessMove } from "@/lib/games/chess";

// Solid glyphs for both colours — colour/3D look comes from CSS, not the glyph.
const GLYPH: Record<string, string> = {
  p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function squareName(row: number, col: number) {
  // row 0 = rank 8 (chess.js board() order), col 0 = file a
  return FILES[col] + (8 - row);
}

// Display (grid) coordinates of a square, honoring board orientation.
function displayCoords(sq: string, flipped: boolean): [number, number] {
  const realCol = FILES.indexOf(sq[0]);
  const realRow = 8 - parseInt(sq[1], 10);
  return flipped ? [7 - realRow, 7 - realCol] : [realRow, realCol];
}

export default function ChessBoard({
  state,
  mySeat,
  isMyTurn,
  onMove,
}: {
  state: ChessState;
  mySeat: number; // 0 white, 1 black, -1 spectator
  isMyTurn: boolean;
  onMove: (move: ChessMove) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const myColor = mySeat === 0 ? "w" : mySeat === 1 ? "b" : null;
  const flipped = mySeat === 1;

  const chess = useMemo(() => new Chess(state.fen), [state.fen]);
  const board = chess.board(); // 8x8, index0 = rank8

  const targets = useMemo(() => {
    if (!selected) return new Set<string>();
    try {
      const moves = chess.moves({ square: selected as any, verbose: true }) as Array<{ to: string }>;
      return new Set(moves.map((m) => m.to));
    } catch {
      return new Set<string>();
    }
  }, [selected, chess]);

  function handleClick(sq: string) {
    if (!myColor || !isMyTurn) return;
    const piece = chess.get(sq as any);

    if (selected && targets.has(sq)) {
      const moving = chess.get(selected as any);
      const lastRank = sq[1] === "8" || sq[1] === "1";
      const promotion = moving?.type === "p" && lastRank ? "q" : undefined;
      onMove({ from: selected, to: sq, promotion });
      setSelected(null);
      return;
    }
    if (piece && piece.color === myColor) {
      setSelected(sq);
    } else {
      setSelected(null);
    }
  }

  // Build display rows honoring orientation.
  const rows = flipped ? [...board].reverse() : board;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gridTemplateRows: "repeat(8, 1fr)",
        width: "min(92vw, 480px)",
        aspectRatio: "1",
        borderRadius: 12,
        overflow: "hidden",
        border: "2px solid var(--border)",
        boxShadow: "0 10px 40px rgba(0,0,0,.35)",
      }}
    >
      {rows.map((rowArr, ri) => {
        const cols = flipped ? [...rowArr].reverse() : rowArr;
        const realRow = flipped ? 7 - ri : ri;
        return cols.map((cell, ci) => {
          const realCol = flipped ? 7 - ci : ci;
          const sq = squareName(realRow, realCol);
          const dark = (realRow + realCol) % 2 === 1;
          const isSel = selected === sq;
          const isTarget = targets.has(sq);
          const isLast = state.lastMove && (state.lastMove.from === sq || state.lastMove.to === sq);
          const glyph = cell ? GLYPH[cell.type] : "";
          // Slide the piece that just moved from its origin square.
          const movedHere = !!state.lastMove && state.lastMove.to === sq && !!cell;
          let slide: React.CSSProperties | undefined;
          let slideKey = "p";
          if (movedHere && state.lastMove) {
            const [fr, fc] = displayCoords(state.lastMove.from, flipped);
            slide = { "--dx": String(fc - ci), "--dy": String(fr - ri) } as React.CSSProperties;
            slideKey = `${state.lastMove.from}${state.lastMove.to}`;
          }
          return (
            <div
              key={sq}
              onClick={() => handleClick(sq)}
              style={{
                position: "relative",
                background: dark ? "#3a3a3e" : "#b6b6bb",
                display: "grid",
                placeItems: "center",
                cursor: myColor && isMyTurn ? "pointer" : "default",
                outline: isSel ? "3px solid var(--accent)" : "none",
                outlineOffset: -3,
                boxShadow: isLast ? "inset 0 0 0 100px rgba(245,166,35,.18)" : "none",
              }}
            >
              {isTarget && (
                <span
                  style={{
                    position: "absolute",
                    width: cell ? "82%" : "30%",
                    height: cell ? "82%" : "30%",
                    borderRadius: "50%",
                    border: cell ? "3px solid rgba(62,207,142,.9)" : "none",
                    background: cell ? "transparent" : "rgba(62,207,142,.7)",
                  }}
                />
              )}
              {cell && (
                <div
                  key={slideKey}
                  className={`piece-wrap ${movedHere ? "piece-moved" : ""}`}
                  style={slide}
                >
                  <span className={`piece ${cell.color === "w" ? "w" : "b"}`}>{glyph}</span>
                </div>
              )}
            </div>
          );
        });
      })}
    </div>
  );
}
