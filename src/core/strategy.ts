import type { Card } from './types.js';
import { calculateHandScore } from './hand.js';

export type PlayerAction = 'hit' | 'stand' | 'double' | 'split' | 'insurance';

const HARD_HAND_STRATEGY: Record<number, PlayerAction[]> = {
  5:  ['hit','hit','hit','hit','hit','hit','hit','hit','hit','hit'],
  6:  ['hit','hit','hit','hit','hit','hit','hit','hit','hit','hit'],
  7:  ['hit','hit','hit','hit','hit','hit','hit','hit','hit','hit'],
  8:  ['hit','hit','hit','hit','hit','hit','hit','hit','hit','hit'],
  9:  ['hit','double','double','double','double','hit','hit','hit','hit','hit'],
  10: ['double','double','double','double','double','double','double','double','hit','hit'],
  11: ['double','double','double','double','double','double','double','double','double','double'],
  12: ['hit','hit','stand','stand','stand','hit','hit','hit','hit','hit'],
  13: ['stand','stand','stand','stand','stand','hit','hit','hit','hit','hit'],
  14: ['stand','stand','stand','stand','stand','hit','hit','hit','hit','hit'],
  15: ['stand','stand','stand','stand','stand','hit','hit','hit','hit','hit'],
  16: ['stand','stand','stand','stand','stand','hit','hit','hit','hit','hit'],
  17: ['stand','stand','stand','stand','stand','stand','stand','stand','stand','stand'],
  18: ['stand','stand','stand','stand','stand','stand','stand','stand','stand','stand'],
  19: ['stand','stand','stand','stand','stand','stand','stand','stand','stand','stand'],
  20: ['stand','stand','stand','stand','stand','stand','stand','stand','stand','stand'],
  21: ['stand','stand','stand','stand','stand','stand','stand','stand','stand','stand'],
};

const SOFT_HAND_STRATEGY: Record<number, PlayerAction[]> = {
  13: ['hit','hit','hit','double','double','hit','hit','hit','hit','hit'],
  14: ['hit','hit','hit','double','double','hit','hit','hit','hit','hit'],
  15: ['hit','hit','double','double','double','hit','hit','hit','hit','hit'],
  16: ['hit','hit','double','double','double','hit','hit','hit','hit','hit'],
  17: ['hit','double','double','double','double','hit','hit','hit','hit','hit'],
  18: ['stand','double','double','double','double','stand','stand','hit','hit','hit'],
  19: ['stand','stand','stand','stand','double','stand','stand','stand','stand','stand'],
  20: ['stand','stand','stand','stand','stand','stand','stand','stand','stand','stand'],
};

export type AIDifficulty = 'beginner' | 'intermediate' | 'expert' | 'card_counter';

export interface AIDecision {
  action: PlayerAction;
  confidence: number;
  reasoning: string;
}

export class BasicStrategyAI {
  private difficulty: AIDifficulty;
  private errorRate: number;

  constructor(difficulty: AIDifficulty = 'expert') {
    this.difficulty = difficulty;
    this.errorRate = this.getErrorRate(difficulty);
  }

  decide(playerHand: Card[], dealerVisibleCard: Card): AIDecision {
    if (this.difficulty === 'beginner') return this.randomDecision();

    if (this.difficulty === 'intermediate' && Math.random() < this.errorRate) {
      return this.randomDecision();
    }

    const score = calculateHandScore(playerHand);
    const dealerCardValue = this.getDealerCardValue(dealerVisibleCard);
    const dealerIndex = dealerCardValue - 2;

    let action: PlayerAction;

    if (score.isSoft && score.total >= 13 && score.total <= 20) {
      action = SOFT_HAND_STRATEGY[score.total]?.[dealerIndex] ?? 'stand';
    } else if (score.total >= 5 && score.total <= 21) {
      action = HARD_HAND_STRATEGY[score.total]?.[dealerIndex] ?? 'stand';
    } else {
      action = 'stand';
    }

    if (this.difficulty === 'card_counter') {
      action = this.applyCardCounting(action, score.total, dealerCardValue);
    }

    return {
      action,
      confidence: this.difficulty === 'expert' ? 1.0 : 0.7,
      reasoning: `${score.isSoft ? 'soft' : 'hard'} ${score.total} vs dealer ${dealerCardValue} → ${action}`,
    };
  }

  private getDealerCardValue(card: Card): number {
    if (card.rank === 'A') return 11;
    if (['K', 'Q', 'J'].includes(card.rank)) return 10;
    return parseInt(card.rank, 10);
  }

  private randomDecision(): AIDecision {
    const actions: PlayerAction[] = ['hit', 'stand'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    return { action, confidence: 0.3, reasoning: 'Random decision' };
  }

  private applyCardCounting(baseAction: PlayerAction, playerTotal: number, dealerCard: number): PlayerAction {
    if (playerTotal === 10 && dealerCard <= 9) return 'double';
    if (playerTotal === 11) return 'double';
    return baseAction;
  }

  private getErrorRate(difficulty: AIDifficulty): number {
    switch (difficulty) {
      case 'beginner': return 0.5;
      case 'intermediate': return 0.2;
      case 'expert': return 0;
      case 'card_counter': return 0;
    }
  }
}

export function createAI(difficulty: AIDifficulty = 'expert'): BasicStrategyAI {
  return new BasicStrategyAI(difficulty);
}