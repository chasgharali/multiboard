import type { GameDefinition, MoveResult, SeatPlayer, Rng } from "./types";

// ---------------------------------------------------------------------------
// Ludo rules engine (server-authoritative, pure).
//
// Path model — each token has a single integer position:
//   -1        : in the yard (home base, not yet on the board)
//   0..50     : on the shared 52-cell ring, RELATIVE to the player's own start
//   51..56    : the player's private 6-cell home column
//   57        : finished (reached the center home)
//
// A token must land EXACTLY on 57 to finish (no overshoot).
// ---------------------------------------------------------------------------

export const COLOR_NAMES = ["Red", "Green", "Yellow", "Blue"] as const;
export const RING_SIZE = 52;
export const HOME_POS = 57;

// Each color enters the ring 13 cells apart.
export function startOffset(color: number): number {
  return color * 13;
}

// Safe cells (absolute ring index): the 4 colored start cells + 4 star cells.
export const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export interface LudoState {
  numPlayers: number;
  seatColors: number[]; // seat -> color index (0..3)
  tokens: number[][]; // tokens[seat][0..3] = position
  turnSeat: number;
  phase: "roll" | "move";
  die: number | null; // value rolled, set while phase === "move"
  sixCount: number; // consecutive sixes in the current turn chain
  // House rule: a seat's tokens cannot reach the final home until it has
  // captured at least one opponent token.
  hasKilled: boolean[];
  log: string[];
}

export type LudoMove = { kind: "roll" } | { kind: "move"; token: number };

function seatColorsFor(n: number): number[] {
  if (n <= 2) return [0, 2]; // opposite corners for 2 players
  if (n === 3) return [0, 1, 2];
  return [0, 1, 2, 3];
}

function clone(state: LudoState): LudoState {
  return {
    ...state,
    seatColors: [...state.seatColors],
    tokens: state.tokens.map((t) => [...t]),
    hasKilled: [...state.hasKilled],
    log: [...state.log],
  };
}

function seatFinished(state: LudoState, seat: number): boolean {
  return state.tokens[seat].every((p) => p === HOME_POS);
}

function nextSeat(state: LudoState, seat: number): number {
  for (let k = 1; k <= state.numPlayers; k++) {
    const cand = (seat + k) % state.numPlayers;
    if (!seatFinished(state, cand)) return cand;
  }
  return seat;
}

export function movableTokens(state: LudoState, seat: number, die: number): number[] {
  const out: number[] = [];
  const homeLocked = !state.hasKilled[seat];
  state.tokens[seat].forEach((pos, i) => {
    if (pos === HOME_POS) return;
    if (pos === -1) {
      if (die === 6) out.push(i);
    } else {
      const next = pos + die;
      if (next > HOME_POS) return; // overshoots home
      if (next === HOME_POS && homeLocked) return; // can't finish until a capture
      out.push(i);
    }
  });
  return out;
}

// Absolute ring cell for a token, or null if it is in the yard / home column / home.
export function absoluteCell(state: LudoState, seat: number, pos: number): number | null {
  if (pos < 0 || pos > 50) return null;
  return (startOffset(state.seatColors[seat]) + pos) % RING_SIZE;
}

export const ludoGame: GameDefinition<LudoState, LudoMove> = {
  id: "ludo",
  name: "Ludo",
  minPlayers: 2,
  maxPlayers: 4,

  createInitialState(seats: SeatPlayer[]): LudoState {
    const n = Math.max(2, Math.min(4, seats.length));
    return {
      numPlayers: n,
      seatColors: seatColorsFor(n),
      tokens: Array.from({ length: n }, () => [-1, -1, -1, -1]),
      turnSeat: 0,
      phase: "roll",
      die: null,
      sixCount: 0,
      hasKilled: Array.from({ length: n }, () => false),
      log: [],
    };
  },

  applyMove(prev, move, seat, rng: Rng): MoveResult<LudoState> {
    if (this.winner!(prev) !== null) return { ok: false, error: "Game is over." };
    if (seat !== prev.turnSeat) return { ok: false, error: "Not your turn." };

    const state = clone(prev);
    const colorName = COLOR_NAMES[state.seatColors[seat]];

    if (move.kind === "roll") {
      if (state.phase !== "roll") return { ok: false, error: "You already rolled — move a token." };
      const die = 1 + Math.floor(rng() * 6);
      state.sixCount = die === 6 ? state.sixCount + 1 : 0;

      // Three sixes in a row forfeits the turn.
      if (die === 6 && state.sixCount === 3) {
        state.log = [`${colorName} rolled three 6s — turn forfeited`, ...state.log].slice(0, 12);
        state.turnSeat = nextSeat(state, seat);
        state.phase = "roll";
        state.die = null;
        state.sixCount = 0;
        return { ok: true, state };
      }

      const movable = movableTokens(state, seat, die);
      if (movable.length === 0) {
        state.log = [`${colorName} rolled ${die} — no moves`, ...state.log].slice(0, 12);
        state.turnSeat = nextSeat(state, seat);
        state.phase = "roll";
        state.die = null;
        state.sixCount = 0;
        return { ok: true, state };
      }

      state.phase = "move";
      state.die = die;
      state.log = [`${colorName} rolled ${die}`, ...state.log].slice(0, 12);
      return { ok: true, state };
    }

    // move.kind === "move"
    if (state.phase !== "move" || state.die == null) {
      return { ok: false, error: "Roll the die first." };
    }
    const die = state.die;
    const cur = state.tokens[seat][move.token];
    const newPos = cur === -1 ? 0 : cur + die;

    // House rule: can't bring a token home before capturing an opponent.
    if (newPos === HOME_POS && !state.hasKilled[seat]) {
      return { ok: false, error: "Capture an opponent before bringing a token home." };
    }
    if (!movableTokens(state, seat, die).includes(move.token)) {
      return { ok: false, error: "That token can't move." };
    }

    state.tokens[seat][move.token] = newPos;

    let captured = 0;
    const landAbs = absoluteCell(state, seat, newPos);
    if (landAbs !== null && !SAFE_CELLS.has(landAbs)) {
      for (let s = 0; s < state.numPlayers; s++) {
        if (s === seat) continue;
        state.tokens[s].forEach((pos, i) => {
          if (absoluteCell(state, s, pos) === landAbs) {
            state.tokens[s][i] = -1;
            captured++;
          }
        });
      }
    }
    if (captured > 0 && !state.hasKilled[seat]) {
      state.hasKilled[seat] = true;
      state.log = [`${colorName} can now bring tokens home! 🏠`, ...state.log].slice(0, 12);
    }

    const reachedHome = newPos === HOME_POS;
    let msg = `${colorName} moved a token`;
    if (captured > 0) msg += ` and captured ${captured}`;
    if (reachedHome) msg += " — token home!";
    state.log = [msg, ...state.log].slice(0, 12);

    if (seatFinished(state, seat)) {
      state.log = [`${colorName} wins! 🎉`, ...state.log].slice(0, 12);
      state.phase = "roll";
      state.die = null;
      return { ok: true, state };
    }

    // Rolling a 6 (or making a capture) grants another roll.
    const extra = die === 6 || captured > 0;
    state.turnSeat = extra ? seat : nextSeat(state, seat);
    state.phase = "roll";
    state.die = null;
    if (!extra) state.sixCount = 0;
    return { ok: true, state };
  },

  currentSeat(state): number {
    if (this.winner!(state) !== null) return -1;
    return state.turnSeat;
  },

  winner(state) {
    for (let s = 0; s < state.numPlayers; s++) {
      if (state.tokens[s].every((p) => p === HOME_POS)) return { seat: s };
    }
    return null;
  },

  status(state): string {
    const w = this.winner!(state);
    if (w && w !== "draw") return `${COLOR_NAMES[state.seatColors[w.seat]]} wins!`;
    const colorName = COLOR_NAMES[state.seatColors[state.turnSeat]];
    return state.phase === "roll" ? `${colorName} to roll` : `${colorName} to move (${state.die})`;
  },
};
