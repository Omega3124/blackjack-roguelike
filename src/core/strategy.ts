/**
 * AI бот для Blackjack на основе Basic Strategy.
 * 
 * Basic Strategy — математически оптимальная таблица решений,
 * минимизирующая house edge до ~0.5%.
 * 
 * Источник: Wizard of Odds, "Blackjack Basic Strategy"
 */

import type { Card } from './types.js';
import { calculateHandScore } from './hand.js';

// Типы действий игрока
export type PlayerAction = 'hit' | 'stand' | 'double' | 'split' | 'surrender';

// Упрощённая таблица Basic Strategy для hard hands (без тузов)
// Ключ: сумма руки игрока, Значение: действие против карты дилера 2-11 (11 = туз)
const HARD_HAND_STRATEGY: Record<number, PlayerAction[]> = {
  5:  ['hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit'],
  6:  ['hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit'],
  7:  ['hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit'],
  8:  ['hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit', 'hit'],
  9:  ['hit', 'double', 'double', 'double', 'double', 'hit', 'hit', 'hit', 'hit', 'hit'],
  10: ['double', 'double', 'double', 'double', 'double', 'double', 'double', 'double', 'hit', 'hit'],
  11: ['double', 'double', 'double', 'double', 'double', 'double', 'double', 'double', 'double', 'double'],
  12: ['hit', 'hit', 'stand', 'stand', 'stand', 'hit', 'hit', 'hit', 'hit', 'hit'],
  13: ['stand', 'stand', 'stand', 'stand', 'stand', 'hit', 'hit', 'hit', 'hit', 'hit'],
  14: ['stand', 'stand', 'stand', 'stand', 'stand', 'hit', 'hit', 'hit', 'hit', 'hit'],
  15: ['stand', 'stand', 'stand', 'stand', 'stand', 'hit', 'hit', 'hit', 'hit', 'hit'],
  16: ['stand', 'stand', 'stand', 'stand', 'stand', 'hit', 'hit', 'hit', 'hit', 'hit'],
  17: ['stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand'],
  18: ['stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand'],
  19: ['stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand'],
  20: ['stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand'],
  21: ['stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand'],
};

// Soft hands (руки с тузом, считающимся как 11)
// Ключ: "мягкая" сумма (A+2=13, A+3=14, ..., A+9=20)
const SOFT_HAND_STRATEGY: Record<number, PlayerAction[]> = {
  13: ['hit', 'hit', 'hit', 'double', 'double', 'hit', 'hit', 'hit', 'hit', 'hit'], // A,2
  14: ['hit', 'hit', 'hit', 'double', 'double', 'hit', 'hit', 'hit', 'hit', 'hit'], // A,3
  15: ['hit', 'hit', 'double', 'double', 'double', 'hit', 'hit', 'hit', 'hit', 'hit'], // A,4
  16: ['hit', 'hit', 'double', 'double', 'double', 'hit', 'hit', 'hit', 'hit', 'hit'], // A,5
  17: ['hit', 'double', 'double', 'double', 'double', 'hit', 'hit', 'hit', 'hit', 'hit'], // A,6
  18: ['stand', 'double', 'double', 'double', 'double', 'stand', 'stand', 'hit', 'hit', 'hit'], // A,7
  19: ['stand', 'stand', 'stand', 'stand', 'double', 'stand', 'stand', 'stand', 'stand', 'stand'], // A,8
  20: ['stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand', 'stand'], // A,9
};

// Уровни сложности AI
export type AIDifficulty = 'beginner' | 'intermediate' | 'expert' | 'card_counter';

export interface AIDecision {
  action: PlayerAction;
  confidence: number; // 0-1, насколько AI уверен в решении
  reasoning: string;  // человекочитаемое объяснение
}

export class BasicStrategyAI {
  private difficulty: AIDifficulty;
  private errorRate: number; // Вероятность случайной ошибки (для beginner/intermediate)

  constructor(difficulty: AIDifficulty = 'expert') {
    this.difficulty = difficulty;
    this.errorRate = this.getErrorRate(difficulty);
  }

  /**
   * Принять решение на основе текущей руки и карты дилера.
   * 
   * @param playerHand - карты игрока
   * @param dealerVisibleCard - открытая карта дилера
   * @returns оптимальное действие
   */
  decide(playerHand: Card[], dealerVisibleCard: Card): AIDecision {
    // Для beginner — случайные действия
    if (this.difficulty === 'beginner') {
      return this.randomDecision();
    }

    // Для intermediate — basic strategy с ошибками
    if (this.difficulty === 'intermediate' && Math.random() < this.errorRate) {
      return this.randomDecision();
    }

    const score = calculateHandScore(playerHand);
    const dealerCardValue = this.getDealerCardValue(dealerVisibleCard);
    const dealerIndex = dealerCardValue - 2; // 0-based индекс (2→0, 3→1, ..., A→9)

    let action: PlayerAction;

    if (score.isSoft && score.total >= 13 && score.total <= 20) {
      // Soft hand
      action = SOFT_HAND_STRATEGY[score.total]?.[dealerIndex] ?? 'stand';
    } else if (score.total >= 5 && score.total <= 21) {
      // Hard hand
      action = HARD_HAND_STRATEGY[score.total]?.[dealerIndex] ?? 'stand';
    } else {
      action = 'stand';
    }

    // Для card_counter — добавляем учёт оставшихся карт (упрощённо)
    if (this.difficulty === 'card_counter') {
      action = this.applyCardCounting(action, score.total, dealerCardValue);
    }

    return {
      action,
      confidence: this.difficulty === 'expert' ? 1.0 : 0.7,
      reasoning: this.getReasoning(action, score, dealerCardValue),
    };
  }

  /**
   * Получить числовое значение карты дилера для таблицы стратегии.
   * Туз = 11 (индекс 9 в таблице).
   */
  private getDealerCardValue(card: Card): number {
    if (card.rank === 'A') return 11;
    if (['K', 'Q', 'J'].includes(card.rank)) return 10;
    return parseInt(card.rank, 10);
  }

  /**
   * Случайное решение (для beginner или ошибок intermediate).
   */
  private randomDecision(): AIDecision {
    const actions: PlayerAction[] = ['hit', 'stand'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    return {
      action,
      confidence: 0.3,
      reasoning: 'Random decision (beginner level)',
    };
  }

  /**
   * Упрощённый card counting (Hi-Lo система).
   * Если счёт положительный — более агрессивная игра (больше double).
   */
  private applyCardCounting(
    baseAction: PlayerAction,
    playerTotal: number,
    dealerCard: number
  ): PlayerAction {
    // Упрощённая эвристика: при высоком счёте чаще double на 10-11
    if (playerTotal === 10 && dealerCard <= 9) return 'double';
    if (playerTotal === 11) return 'double';
    return baseAction;
  }

  /**
   * Человекочитаемое объяснение решения.
   */
  private getReasoning(
    action: PlayerAction,
    score: { total: number; isSoft: boolean },
    dealerCard: number
  ): string {
    const handType = score.isSoft ? 'soft' : 'hard';
    return `${handType} ${score.total} vs dealer ${dealerCard} → ${action}`;
  }

  private getErrorRate(difficulty: AIDifficulty): number {
    switch (difficulty) {
      case 'beginner': return 0.5;  // 50% ошибок
      case 'intermediate': return 0.2; // 20% ошибок
      case 'expert': return 0;
      case 'card_counter': return 0;
    }
  }
}

/**
 * Фабрика для создания AI с нужной сложностью.
 */
export function createAI(difficulty: AIDifficulty = 'expert'): BasicStrategyAI {
  return new BasicStrategyAI(difficulty);
}