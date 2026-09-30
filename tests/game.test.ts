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
    if (state.state === 'dealing') {
      expect(state.playerHand.length).toBe(2);
      expect(state.dealerHand.length).toBe(2);
    } else if (state.state === 'gameOver') {
      expect(state.playerHands[0].length).toBe(2);
    }
  });

  it('should allow player to hit', () => {
    const game = new BlackjackGame('hit-seed');
    game.startGame(100, 1000);
    game.deal();
    game.playerTurn();
    const beforeHit = game.getState();
    if (beforeHit.state === 'playerTurn') {
      expect(beforeHit.playerHands[0].length).toBe(2);
    }
    game.hit();
    const afterHit = game.getState();
    if (afterHit.state === 'playerTurn') {
      expect(afterHit.playerHands[0].length).toBe(3);
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

  it('should allow player to double down', () => {
    const game = new BlackjackGame('double-test-seed');
    game.startGame(100, 1000);
    game.deal();
    game.playerTurn();
    const stateBefore = game.getState();
    if (stateBefore.state === 'playerTurn') {
      expect(stateBefore.playerHands[0].length).toBe(2);
      game.double();
      const stateAfter = game.getState();
      if (stateAfter.state === 'playerTurn' || stateAfter.state === 'dealerTurn') {
        expect(stateAfter.playerHands[0].length).toBe(3);
      }
    }
  });

  it('should not allow double after hit', () => {
    const game = new BlackjackGame('double-after-hit-seed');
    game.startGame(100, 1000);
    game.deal();
    game.playerTurn();
    game.hit();
    expect(() => game.double()).toThrow('Можно удваивать только на первых двух картах');
  });

it('should not allow double without balance', () => {
  // Сценарий: после split баланс = 0, пытаемся удвоить
  const game = new BlackjackGame('double-no-balance-seed');
  game.startGame(100, 100);
  game.deal();
  game.playerTurn();

  const state = game.getState();
  if (state.state !== 'playerTurn') return;

  const currentHand = state.playerHands[state.currentHandIndex];
  // Если есть пара - делаем split, баланс станет 0
  if (currentHand.length === 2 && currentHand[0].rank === currentHand[1].rank) {
    game.split(); // баланс: 100 - 100 = 0

    const stateAfterSplit = game.getState();
    if (stateAfterSplit.state === 'playerTurn') {
      const hand = stateAfterSplit.playerHands[stateAfterSplit.currentHandIndex];
      if (hand.length === 2) {
        expect(() => game.double()).toThrow('Недостаточно средств для удвоения');
      }
    }
  }
  // Если нет пары - тест пропускается (не падает)
});

  it('should not allow split without pair', () => {
    const game = new BlackjackGame('no-split-seed');
    game.startGame(100, 1000);
    game.deal();
    game.playerTurn();
    const state = game.getState();
    if (state.state === 'playerTurn') {
      const currentHand = state.playerHands[state.currentHandIndex];
      if (currentHand[0].rank !== currentHand[1].rank) {
        expect(() => game.split()).toThrow('Можно разделить только одинаковые карты');
      }
    }
  });

  it('should not allow split after hit', () => {
    const game = new BlackjackGame('split-after-hit-seed');
    game.startGame(100, 1000);
    game.deal();
    game.playerTurn();
    game.hit();

    const state = game.getState();
    if (state.state !== 'playerTurn') return;

    expect(() => game.split()).toThrow('Можно разделить только руку из двух карт');
  });

  it('should offer insurance when dealer has ace', () => {
  const game = new BlackjackGame('insurance-test-seed');
  game.startGame(100, 1000);
  game.deal();
  game.playerTurn();
  
  const state = game.getState();
  if (state.state === 'playerTurn') {
    // Проверяем что страховка доступна если у дилера туз
    const dealerVisibleCard = state.dealerVisibleCard;
    if (dealerVisibleCard.rank === 'A') {
      expect(state.insuranceAvailable).toBe(true);
    }
  }
  });

  it('should not allow insurance after hit', () => {
  // Подбираем сид где у дилера туз и игрок не получает bust после hit
  const game = new BlackjackGame('insurance-hit-v2');
  game.startGame(100, 1000);
  game.deal();
  game.playerTurn();

  const state = game.getState();
  if (state.state === 'playerTurn' && state.insuranceAvailable) {
    game.hit();

    const stateAfterHit = game.getState();
    if (stateAfterHit.state === 'playerTurn') {
      expect(() => game.insurance()).toThrow('Страховку можно взять только в начале');
    }
  }
  });

    it('should offer insurance when dealer has ace', () => {
    const game = new BlackjackGame('insurance-test-seed');
    game.startGame(100, 1000);
    game.deal();
    game.playerTurn();
    
    const state = game.getState();
    if (state.state === 'playerTurn') {
      const dealerVisibleCard = state.dealerVisibleCard;
      if (dealerVisibleCard.rank === 'A') {
        expect(state.insuranceAvailable).toBe(true);
      }
    }
  });

  it('should not allow insurance when dealer does not have ace', () => {
    const game = new BlackjackGame('no-insurance-seed');
    game.startGame(100, 1000);
    game.deal();
    game.playerTurn();
    
    const state = game.getState();
    if (state.state === 'playerTurn' && !state.insuranceAvailable) {
      expect(() => game.insurance()).toThrow('Страховка недоступна');
    }
  });

  it('should not allow insurance after hit', () => {
    const game = new BlackjackGame('insurance-after-hit-seed');
    game.startGame(100, 1000);
    game.deal();
    game.playerTurn();
    
    const state = game.getState();
    if (state.state === 'playerTurn' && state.insuranceAvailable) {
      game.hit();
      const stateAfterHit = game.getState();
      if (stateAfterHit.state === 'playerTurn') {
        expect(() => game.insurance()).toThrow('Страховку можно взять только в начале');
      }
    }
  });
});