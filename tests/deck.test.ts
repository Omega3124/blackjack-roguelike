import { describe, it, expect } from 'vitest';
import { Deck } from '../src/core/deck.js';

describe('Deck', () => {
  it('should create a full deck of 52 cards', () => {
    const deck = new Deck('test-seed');
    expect(deck.remaining()).toBe(52);
  });

  it('should draw cards from the deck', () => {
    const deck = new Deck('test-seed');
    deck.shuffle();

    const card = deck.draw();
    expect(card).toHaveProperty('suit');
    expect(card).toHaveProperty('rank');
    expect(deck.remaining()).toBe(51);
  });

  it('should auto-reshuffle when low on cards', () => {
    const deck = new Deck('reshuffle-test');

    // Вытаскиваем 40 карт (остаётся 12 < 15)
    for (let i = 0; i < 40; i++) {
      deck.draw();
    }

    // Колода должна была перетасоваться
    expect(deck.remaining()).toBeGreaterThan(15);
  });

  it('should produce same sequence with same seed', () => {
    const deck1 = new Deck('same-seed');
    const deck2 = new Deck('same-seed');

    deck1.shuffle();
    deck2.shuffle();

    const cards1 = [deck1.draw(), deck1.draw(), deck1.draw()];
    const cards2 = [deck2.draw(), deck2.draw(), deck2.draw()];

    expect(cards1[0].rank).toBe(cards2[0].rank);
    expect(cards1[0].suit).toBe(cards2[0].suit);
    expect(cards1[1].rank).toBe(cards2[1].rank);
    expect(cards1[2].rank).toBe(cards2[2].rank);
  });

  it('should reset deck manually', () => {
    const deck = new Deck('reset-test');
    deck.shuffle();

    // Вытаскиваем несколько карт
    deck.draw();
    deck.draw();
    deck.draw();

    expect(deck.remaining()).toBe(49);

    // Сбрасываем
    deck.reset();
    expect(deck.remaining()).toBe(52);
  });
});
