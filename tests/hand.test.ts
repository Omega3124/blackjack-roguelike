import { describe, it, expect } from 'vitest';
import { calculateHandScore, isBlackjack, isBust } from '../src/core/hand.js';
import { Card } from '../src/core/types.js';

function card(rank: string, suit: string = 'hearts'): Card {
  return { suit: suit as any, rank: rank as any };
}

describe('Hand scoring', () => {
  it('should calculate simple hand (10 + 5 = 15)', () => {
    const hand = [card('10'), card('5')];
    const score = calculateHandScore(hand);
    expect(score.total).toBe(15);
    expect(score.isSoft).toBe(false);
    expect(score.isBust).toBe(false);
  });

  it('should handle Ace as 11 when possible', () => {
    const hand = [card('A'), card('7')];
    const score = calculateHandScore(hand);
    expect(score.total).toBe(18);
    expect(score.isSoft).toBe(true);
  });

  it('should handle Ace as 1 when 11 causes bust', () => {
    const hand = [card('A'), card('K'), card('5')];
    const score = calculateHandScore(hand);
    expect(score.total).toBe(16);
    expect(score.isSoft).toBe(false);
  });

  it('should handle multiple Aces', () => {
    const hand = [card('A'), card('A'), card('9')];
    const score = calculateHandScore(hand);
    expect(score.total).toBe(21);
    expect(score.isSoft).toBe(true);
  });

  it('should detect bust', () => {
    const hand = [card('10'), card('8'), card('5')];
    const score = calculateHandScore(hand);
    expect(score.isBust).toBe(true);
    expect(score.total).toBe(23);
  });

  it('should detect blackjack', () => {
    expect(isBlackjack([card('A'), card('K')])).toBe(true);
    expect(isBlackjack([card('10'), card('A')])).toBe(true);
    expect(isBlackjack([card('A'), card('5'), card('5')])).toBe(false);
  });

  it('should detect bust with isBust helper', () => {
    expect(isBust([card('10'), card('10'), card('5')])).toBe(true);
    expect(isBust([card('10'), card('10')])).toBe(false);
  });
});