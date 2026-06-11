// Standalone engine smoke test. Run: node --experimental-strip-types scripts/smoke.ts
import { chessGame } from "../src/lib/games/chess.ts";
import { ludoGame, movableTokens, type LudoState } from "../src/lib/games/ludo.ts";

let pass = 0;
let fail = 0;
function ok(cond: boolean, msg: string) {
  if (cond) { pass++; } else { fail++; console.error("  ✗ " + msg); }
}

// ---------------- Chess ----------------
{
  const seats = [{ id: "a", name: "A", seat: 0 }, { id: "b", name: "B", seat: 1 }];
  let s = chessGame.createInitialState(seats);
  ok(chessGame.currentSeat(s) === 0, "chess: white starts");

  // Illegal: black moving first
  let r = chessGame.applyMove(s, { from: "e7", to: "e5" }, 1, Math.random);
  ok(!r.ok, "chess: black cannot move first");

  // Legal e4
  r = chessGame.applyMove(s, { from: "e2", to: "e4" }, 0, Math.random);
  ok(r.ok, "chess: e4 legal");
  if (r.ok) s = r.state;
  ok(chessGame.currentSeat(s) === 1, "chess: now black to move");

  // Illegal jump
  r = chessGame.applyMove(s, { from: "e7", to: "e3" }, 1, Math.random);
  ok(!r.ok, "chess: illegal pawn jump rejected");

  // Fool's mate: 1.f3 e5 2.g4 Qh4#
  let m = chessGame.createInitialState(seats);
  const seq: [string, string, number][] = [
    ["f2", "f3", 0], ["e7", "e5", 1], ["g2", "g4", 0], ["d8", "h4", 1],
  ];
  for (const [from, to, seat] of seq) {
    const rr = chessGame.applyMove(m, { from, to }, seat, Math.random);
    ok(rr.ok, `chess: foolsmate move ${from}-${to}`);
    if (rr.ok) m = rr.state;
  }
  const w = chessGame.winner(m);
  ok(w !== null && w !== "draw" && w.seat === 1, "chess: fool's mate => black (seat 1) wins");
  ok(chessGame.currentSeat(m) === -1, "chess: game over => currentSeat -1");
}

// ---------------- Ludo ----------------
{
  const seats = [{ id: "a", name: "A", seat: 0 }, { id: "b", name: "B", seat: 1 }];
  let s = ludoGame.createInitialState(seats) as LudoState;
  ok(s.numPlayers === 2, "ludo: 2 players");
  ok(s.turnSeat === 0 && s.phase === "roll", "ludo: seat0 to roll");

  // Force a non-6 roll => no moves (all in yard) => turn passes
  const roll = (val: number) => () => (val - 1 + 0.001) / 6; // rng that yields `val`
  let r = ludoGame.applyMove(s, { kind: "roll" }, 0, roll(3));
  ok(r.ok, "ludo: roll ok");
  if (r.ok) s = r.state as LudoState;
  ok(s.turnSeat === 1, "ludo: non-6 with all-in-yard passes turn to seat1");

  // Seat1 rolls a 6 => can move a token out
  r = ludoGame.applyMove(s, { kind: "roll" }, 1, roll(6));
  ok(r.ok && (r.ok && (r.state as LudoState).phase === "move"), "ludo: seat1 rolled 6 => move phase");
  if (r.ok) s = r.state as LudoState;
  const mv = movableTokens(s, 1, 6);
  ok(mv.length === 4, "ludo: all 4 tokens movable out of yard on a 6");

  // Move a token out
  r = ludoGame.applyMove(s, { kind: "move", token: 0 }, 1, Math.random);
  ok(r.ok, "ludo: move token out of yard");
  if (r.ok) s = r.state as LudoState;
  ok(s.tokens[1][0] === 0, "ludo: token now at relPos 0");
  ok(s.turnSeat === 1, "ludo: rolled a 6 => same player rolls again");

  // Try to move when must roll
  r = ludoGame.applyMove(s, { kind: "move", token: 1 }, 1, Math.random);
  ok(!r.ok, "ludo: cannot move before rolling");
}

// ---- Ludo: home locked until a capture ----
{
  const seats = [{ id: "a", name: "A", seat: 0 }, { id: "b", name: "B", seat: 1 }];
  const s = ludoGame.createInitialState(seats) as LudoState;
  s.tokens[0][0] = 56; // one step from home
  s.turnSeat = 0;
  s.phase = "move";
  s.die = 1;
  s.hasKilled[0] = false;
  ok(!movableTokens(s, 0, 1).includes(0), "ludo: token not movable to home while locked");
  let r = ludoGame.applyMove(s, { kind: "move", token: 0 }, 0, Math.random);
  ok(!r.ok, "ludo: move home rejected while locked");

  s.hasKilled[0] = true; // simulate a capture
  ok(movableTokens(s, 0, 1).includes(0), "ludo: token movable to home after capture");
  r = ludoGame.applyMove(s, { kind: "move", token: 0 }, 0, Math.random);
  ok(r.ok && (r.state as LudoState).tokens[0][0] === 57, "ludo: token reaches home after unlock");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
