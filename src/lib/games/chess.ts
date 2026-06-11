import { Chess } from "chess.js";
import type { GameDefinition, MoveResult, SeatPlayer } from "./types";

// Seat 0 = white, Seat 1 = black.
export interface ChessState {
  fen: string;
  lastMove: { from: string; to: string } | null;
  history: string[]; // SAN moves, for the move list
}

export interface ChessMove {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
}

function load(fen: string): Chess {
  return new Chess(fen);
}

export const chessGame: GameDefinition<ChessState, ChessMove> = {
  id: "chess",
  name: "Chess",
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(_seats: SeatPlayer[]): ChessState {
    const c = new Chess();
    return { fen: c.fen(), lastMove: null, history: [] };
  },

  applyMove(state, move, seat): MoveResult<ChessState> {
    const c = load(state.fen);
    if (c.isGameOver()) return { ok: false, error: "Game is already over." };
    const turnSeat = c.turn() === "w" ? 0 : 1;
    if (seat !== turnSeat) return { ok: false, error: "Not your turn." };
    try {
      const result = c.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? "q",
      });
      if (!result) return { ok: false, error: "Illegal move." };
      return {
        ok: true,
        state: {
          fen: c.fen(),
          lastMove: { from: result.from, to: result.to },
          history: [...state.history, result.san],
        },
      };
    } catch {
      return { ok: false, error: "Illegal move." };
    }
  },

  currentSeat(state): number {
    const c = load(state.fen);
    if (c.isGameOver()) return -1;
    return c.turn() === "w" ? 0 : 1;
  },

  winner(state) {
    const c = load(state.fen);
    if (c.isCheckmate()) {
      // The side to move is checkmated, so the other side won.
      return { seat: c.turn() === "w" ? 1 : 0 };
    }
    if (c.isDraw() || c.isStalemate() || c.isThreefoldRepetition() || c.isInsufficientMaterial()) {
      return "draw";
    }
    return null;
  },

  status(state): string {
    const c = load(state.fen);
    if (c.isCheckmate()) return `Checkmate — ${c.turn() === "w" ? "Black" : "White"} wins`;
    if (c.isStalemate()) return "Stalemate — draw";
    if (c.isDraw()) return "Draw";
    const side = c.turn() === "w" ? "White" : "Black";
    return c.isCheck() ? `${side} to move (in check)` : `${side} to move`;
  },
};

// Helper used by the client board to compute legal destinations for a square.
export function legalTargetsFrom(fen: string, square: string): string[] {
  const c = load(fen);
  try {
    const moves = c.moves({ square: square as any, verbose: true }) as Array<{ to: string }>;
    return moves.map((m) => m.to);
  } catch {
    return [];
  }
}
