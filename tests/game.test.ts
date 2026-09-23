import { describe, it, expect } from 'vitest';
import { BlackjackGame } from '../src/core/game.js';

describe('BlackjackGame', () => {
  it('should start a new game with betting', () => {
    const game = new BlackjackGame('test-seed');
    game.startGame(100, 1000);

    const state = game.getState();
    expect(state.state).toBe('betting');
    if (state.state === 'betting') {
      expect(state.currentBet).toBe(100);
      expect(state.balance).toBe(1000);
    }
  });

  it('should deal cards', () => {
    const game = new BlackjackGame('deal-seed');
    game.startGame(100, 1000);
    game.deal();

    const state = game.getState();
    expect(state.state).toBe('dealing');
    if (state.state === 'dealing') {
      expect(state.playerHand.length).toBe(2);
      expect(state.dealerHand.length).toBe(2);
    }
  });

  it('should allow player to hit', () => {
    const game = new BlackjackGame('hit-seed');
    game.startGame(100, 1000);
    game.deal();
    game.playerTurn();

    const beforeHit = game.getState();
    if (beforeHit.state === 'playerTurn') {
      expect(beforeHit.playerHand.length).toBe(2);
    }

    game.hit();

    const afterHit = game.getState();
    if (afterHit.state === 'playerTurn') {
      expect(afterHit.playerHand.length).toBe(3);
    }
  });

  it('should allow player to stand', () => {
    const game = new BlackjackGame('stand-seed');
    game.startGame(100, 1000);
    game.deal();
    game.playerTurn();
    game.stand();

    const state = game.getState();
    expect(state.state).toBe('gameOver');
  });

  it('should throw error on invalid actions', () => {
    const game = new BlackjackGame('error-seed');

    expect(() => game.deal()).toThrow('Сначала нужно сделать ставку');
    expect(() => game.hit()).toThrow('Сейчас не ход игрока');
    expect(() => game.stand()).toThrow('Сейчас не ход игрока');
  });

  it('should reset game', () => {
    const game = new BlackjackGame('reset-seed');
    game.startGame(100, 1000);
    game.deal();
    game.playerTurn();
    game.stand();

    game.reset();
    expect(game.getState().state).toBe('idle');
  });
});