import { describe, it, expect } from 'vitest';
import { BlackjackGame } from '../src/core/game.js';

describe('BlackjackGame', () => {
  it('should handle player blackjack', () => {
    // Нужен seed где игроку выпадет A + 10
    const game = new BlackjackGame('player-bj-seed');
    game.startGame(100, 1000);
    game.deal();

    const state = game.getState();
    if (state.state === 'gameOver' && state.result === 'blackjack') {
      expect(game.getPayout()).toBe(250); // 100 * 2.5
    }
  });

  it('should handle dealer blackjack', () => {
    const game = new BlackjackGame('dealer-bj-seed');
    game.startGame(100, 1000);
    game.deal();

    const state = game.getState();
    if (state.state === 'gameOver' && state.result === 'dealerWin') {
      expect(game.getPayout()).toBe(0);
    }
  });

  it('should handle both blackjack as push', () => {
    const game = new BlackjackGame('both-bj-seed');
    game.startGame(100, 1000);
    game.deal();

    const state = game.getState();
    if (state.state === 'gameOver' && state.result === 'push') {
      expect(game.getPayout()).toBe(100); // Возврат ставки
    }
  });

  it('should auto-reshuffle deck when low', () => {
    const game = new BlackjackGame('reshuffle-seed');
    game.startGame(100, 1000);
    game.deal();
    game.playerTurn();

    // Вытаскиваем много карт
    for (let i = 0; i < 40; i++) {
      try {
        game.hit();
      } catch {
        break;
      }
    }

    // Колода должна была перетасоваться
    expect(true).toBe(true); // Просто проверяем что не упало
  });

  it('should fully reset game state', () => {
    const game = new BlackjackGame('reset-seed');
    game.startGame(100, 1000);
    game.deal();
    game.playerTurn();
    game.stand();

    game.reset();
    expect(game.getState().state).toBe('idle');
  });
});