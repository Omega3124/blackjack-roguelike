import { BlackjackGame } from '../core/game.js';
import type { Card } from '../core/types.js';

export interface PerkEffect {
  id: string;
  apply: (game: BlackjackGame, context: GameContext) => void;
}

export interface GameContext {
  player: {
    perks: string[];
    visibleCardOverride?: Card;
    canSeeDealerHidden: boolean;
    canSeeTopCard: boolean;
    pushEqualsWin: boolean;
  };
  dealer: {
    perks: string[];
    visibleCardOverride?: Card;
    canSeePlayerHidden: boolean;
  };
}