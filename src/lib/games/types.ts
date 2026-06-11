// Shared, framework-agnostic game contract.
// Engines are PURE: no DB, no randomness side effects except via the provided rng.
// The server validates every move through the engine (server-authoritative).

export type GameId = "chess" | "ludo";

export interface SeatPlayer {
  id: string; // client id
  name: string;
  seat: number; // 0-based seat index
}

export type MoveResult<S> =
  | { ok: true; state: S }
  | { ok: false; error: string };

export interface GameDefinition<S = unknown, M = unknown> {
  id: GameId;
  name: string;
  minPlayers: number;
  maxPlayers: number;

  /** Build the starting state for the given seated players. */
  createInitialState(seats: SeatPlayer[]): S;

  /** Validate + apply a move made by the player in `seat`. Pure. */
  applyMove(state: S, move: M, seat: number, rng: Rng): MoveResult<S>;

  /** Whose turn is it (seat index)? -1 when the game is over. */
  currentSeat(state: S): number;

  /** Winner seat, "draw", or null if still in progress. */
  winner(state: S): { seat: number } | "draw" | null;

  /** Short human-readable status line for the UI. */
  status(state: S): string;
}

/** Deterministic-friendly RNG injected by the server (so moves stay auditable). */
export type Rng = () => number; // returns [0,1)

export const GAME_META: Record<
  GameId,
  { name: string; minPlayers: number; maxPlayers: number; blurb: string; emoji: string }
> = {
  chess: {
    name: "Chess",
    minPlayers: 2,
    maxPlayers: 2,
    blurb: "Classic 2-player chess with full legal-move rules.",
    emoji: "♟️",
  },
  ludo: {
    name: "Ludo",
    minPlayers: 2,
    maxPlayers: 4,
    blurb: "Race your 4 tokens home. 2–4 players, dice & captures.",
    emoji: "🎲",
  },
};
