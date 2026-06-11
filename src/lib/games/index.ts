import type { GameDefinition, GameId } from "./types";
import { chessGame } from "./chess";
import { ludoGame } from "./ludo";

const REGISTRY: Record<GameId, GameDefinition<any, any>> = {
  chess: chessGame,
  ludo: ludoGame,
};

export function getGame(id: GameId): GameDefinition<any, any> {
  const g = REGISTRY[id];
  if (!g) throw new Error(`Unknown game: ${id}`);
  return g;
}

export { GAME_META } from "./types";
export type { GameId } from "./types";
