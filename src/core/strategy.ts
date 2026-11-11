/**
 * AI бот для Blackjack на основе Basic Strategy.
 * Поддерживает: hit, stand, double, split, insurance
 * 
 * Источник: Wizard of Odds, "Blackjack Basic Strategy"
 */

import type { Card } from '../core/types.js';
import { calculateHandScore } from '../core/hand.js';

export type PlayerAction = 'hit' | 'stand' | 'double' | 'split' | 'insurance' | 'surrender';

export type AIDifficulty = 'beginner' | 'intermediate' | 'expert' | 'card_counter';

export interface AIDecision {
  action: PlayerAction;
  confidence: number;
  reasoning: string;
}

// Таблица Basic Strategy для hard hands (без тузов)
// Индекс по карте дилера: 2→0, 3→1, ..., 10→8, A→9
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

// Soft hands (руки с тузом как 11)
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

// Таблица Split: ключ = ранг карты, значение = действие против карты дилера 2-A
const SPLIT_STRATEGY: Record<string, PlayerAction[]> = {
  'A':  ['split','split','split','split','split','split','split','split','split','split'],
  '2':  ['split','split','split','split','split','split','hit','hit','hit','hit'],
  '3':  ['split','split','split','split','split','split','hit','hit','hit','hit'],
  '4':  ['hit','hit','hit','split','split','hit','hit','hit','hit','hit'],
  '5':  ['hit','hit','hit','hit','hit','hit','hit','hit','hit','hit'], // 5+5 = 10, лучше double
  '6':  ['split','split','split','split','split','hit','hit','hit','hit','hit'],
  '7':  ['split','split','split','split','split','split','hit','hit','hit','hit'],
  '8':  ['split','split','split','split','split','split','split','split','split','split'],
  '9':  ['split','split','split','split','split','stand','split','split','stand','stand'],
  '10': ['stand','stand','stand','stand','stand','stand','stand','stand','stand','stand'],
  'J':  ['stand','stand','stand','stand','stand','stand','stand','stand','stand','stand'],
  'Q':  ['stand','stand','stand','stand','stand','stand','stand','stand','stand','stand'],
  'K':  ['stand','stand','stand','stand','stand','stand','stand','stand','stand','stand'],
};

export class BasicStrategyAI {
  private difficulty: AIDifficulty;
  private errorRate: number;

  constructor(difficulty: AIDifficulty = 'expert') {
    this.difficulty = difficulty;
    this.errorRate = this.getErrorRate(difficulty);
  }

  /**
   * Принять решение для текущей руки.
   * 
   * @param currentHand - текущая рука (массив карт)
   * @param dealerVisibleCard - открытая карта дилера
   * @param allPlayerHands - все руки игрока (для проверки split)
   * @param canSplit - можно ли сделать split
   * @param canDouble - можно ли сделать double (2 карты в руке, достаточно баланса)
   * @param insuranceAvailable - доступна ли страховка
   * @param splitAces - был ли split тузов
   */
  decide(
    currentHand: Card[],
    dealerVisibleCard: Card,
    options: {
      canSplit: boolean;
      canDouble: boolean;
      insuranceAvailable: boolean;
      splitAces: boolean;
      balance: number;
      currentBet: number;
    }
  ): AIDecision {
    // Beginner — случайные действия
    if (this.difficulty === 'beginner') {
      return this.randomDecision();
    }

    // Intermediate — basic strategy с ошибками
    if (this.difficulty === 'intermediate' && Math.random() < this.errorRate) {
      return this.randomDecision();
    }

    // 1. Сначала проверяем Insurance (только в начале раздачи, 2 карты)
    if (options.insuranceAvailable && currentHand.length === 2) {
      const insuranceDecision = this.decideInsurance(dealerVisibleCard);
      if (insuranceDecision.action === 'insurance') {
        return insuranceDecision;
      }
    }

    // 2. Проверяем Split (2 карты одинакового ранга, можно split)
    if (options.canSplit && currentHand.length === 2) {
      const splitDecision = this.decideSplit(currentHand, dealerVisibleCard);
      if (splitDecision.action === 'split') {
        return splitDecision;
      }
    }

    // 3. После split aces — только stand (нельзя hit/double)
    if (options.splitAces) {
      return {
        action: 'stand',
        confidence: 1.0,
        reasoning: 'After split aces — must stand',
      };
    }

    // 4. Проверяем Double (только на первых 2 картах)
    if (options.canDouble && currentHand.length === 2) {
      const doubleDecision = this.decideDouble(currentHand, dealerVisibleCard);
      if (doubleDecision.action === 'double') {
        return doubleDecision;
      }
    }

    // 5. Обычное решение: hit или stand
    return this.decideHitOrStand(currentHand, dealerVisibleCard);
  }

  /**
   * Решение по страховке.
   * Математически страховка невыгодна (house edge ~7%), 
   * поэтому expert не берёт. Card counter берёт при TC >= 3.
   */
  private decideInsurance(dealerCard: Card): AIDecision {
    if (this.difficulty === 'card_counter') {
      // Упрощённо: считаем что счёт положительный
      return {
        action: 'insurance',
        confidence: 0.7,
        reasoning: 'Card counter takes insurance with positive count',
      };
    }
    // Expert/Intermediate не берут страховку
    return {
      action: 'stand', // placeholder, реальный выбор будет в hit/stand
      confidence: 1.0,
      reasoning: 'Insurance not mathematically favorable',
    };
  }

  /**
   * Решение по Split.
   */
  private decideSplit(hand: Card[], dealerCard: Card): AIDecision {
    const rank = hand[0].rank;
    const dealerIndex = this.getDealerIndex(dealerCard);
    
    const strategy = SPLIT_STRATEGY[rank];
    if (!strategy) {
      return { action: 'hit', confidence: 0.5, reasoning: `No split strategy for ${rank}` };
    }

    const action = strategy[dealerIndex];
    if (action === 'split') {
      return {
        action: 'split',
        confidence: 0.95,
        reasoning: `Split ${rank}s vs dealer ${dealerCard.rank}`,
      };
    }
    return { action: 'hit', confidence: 0.5, reasoning: `Don't split ${rank}s` };
  }

  /**
   * Решение по Double.
   */
  private decideDouble(hand: Card[], dealerCard: Card): AIDecision {
    const score = calculateHandScore(hand);
    const dealerIndex = this.getDealerIndex(dealerCard);

    let action: PlayerAction = 'hit';

    if (score.isSoft && score.total >= 13 && score.total <= 20) {
      const strategy = SOFT_HAND_STRATEGY[score.total];
      if (strategy) action = strategy[dealerIndex] ?? 'hit';
    } else if (score.total >= 9 && score.total <= 11) {
      const strategy = HARD_HAND_STRATEGY[score.total];
      if (strategy) action = strategy[dealerIndex] ?? 'hit';
    }

    if (action === 'double') {
      return {
        action: 'double',
        confidence: 0.9,
        reasoning: `Double ${score.isSoft ? 'soft' : 'hard'} ${score.total} vs ${dealerCard.rank}`,
      };
    }
    return { action: 'hit', confidence: 0.5, reasoning: 'No double' };
  }

  /**
   * Решение Hit или Stand.
   */
  private decideHitOrStand(hand: Card[], dealerCard: Card): AIDecision {
    const score = calculateHandScore(hand);
    const dealerIndex = this.getDealerIndex(dealerCard);

    let action: PlayerAction;

    if (score.isSoft && score.total >= 13 && score.total <= 20) {
      action = SOFT_HAND_STRATEGY[score.total]?.[dealerIndex] ?? 'stand';
    } else if (score.total >= 5 && score.total <= 21) {
      action = HARD_HAND_STRATEGY[score.total]?.[dealerIndex] ?? 'stand';
    } else {
      action = 'stand';
    }

    // Card counter: при высоком счёте более агрессивный double
    if (this.difficulty === 'card_counter') {
      if (score.total === 10 && this.getDealerValue(dealerCard) <= 9) action = 'double';
      if (score.total === 11) action = 'double';
    }

    return {
      action,
      confidence: this.difficulty === 'expert' ? 1.0 : 0.7,
      reasoning: `${score.isSoft ? 'soft' : 'hard'} ${score.total} vs ${dealerCard.rank} → ${action}`,
    };
  }

  private randomDecision(): AIDecision {
    const actions: PlayerAction[] = ['hit', 'stand'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    return {
      action,
      confidence: 0.3,
      reasoning: 'Random decision (beginner level)',
    };
  }

  private getDealerIndex(card: Card): number {
    const value = this.getDealerValue(card);
    return value - 2; // 2→0, 3→1, ..., 10→8, A→9
  }

  private getDealerValue(card: Card): number {
    if (card.rank === 'A') return 11;
    if (['K', 'Q', 'J'].includes(card.rank)) return 10;
    return parseInt(card.rank, 10);
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