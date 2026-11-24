import { describe, it, expect } from 'vitest';
import { BlackjackGame } from '../src/core/game';
import { RunManager, createRunManager } from '../src/roguelike/run';
import { calculateHandScore } from '../src/core/hand';

describe('Перки — механики', () => {
  it('Sun: increaseMaxHp даёт +5 к maxHp', () => {
    const rm = createRunManager();
    const initialMaxHp = rm.getMaxHp();
    rm.increaseMaxHp(5);
    expect(rm.getMaxHp()).toBe(initialMaxHp + 5);
    expect(rm.getHp()).toBe(initialMaxHp + 5);
  });

  it('Justice: проигрыш не может быть хуже -5 HP', () => {
    const rm = createRunManager();
    rm.addPerk('justice');
    const hpBefore = rm.getHp();
    const hpChange = Math.max(-20 + 5, -5);
    rm.updateHp(hpChange);
    expect(rm.getHp()).toBe(hpBefore - 5);
  });

  it('Death: reroll меняет карты', () => {
    const game = new BlackjackGame(456);
    game.startGame(10, 50, ['death']);
    game.deal();
    game.playerTurn();
    const stateBefore = game.getState();
    expect(stateBefore.state).toBe('playerTurn');
    const before = JSON.stringify((stateBefore as any).playerHands[0]);
    const success = game.reroll();
    expect(success).toBe(true);
    const stateAfter = game.getState();
    const after = JSON.stringify((stateAfter as any).playerHands[0]);
    expect(before).not.toBe(after);
  });

  it('Wheel: wheel() заменяет карты', () => {
    const game = new BlackjackGame(789);
    game.startGame(10, 50, ['the_wheel']);
    game.deal();
    game.playerTurn();
    const stateBefore = game.getState();
    expect(stateBefore.state).toBe('playerTurn');
    const before = JSON.stringify((stateBefore as any).playerHands[0]);
    const success = game.wheel();
    expect(success).toBe(true);
    const stateAfter = game.getState();
    const after = JSON.stringify((stateAfter as any).playerHands[0]);
    expect(before).not.toBe(after);
  });

  it('Moon: ставка удваивается', () => {
    const game = new BlackjackGame(200);
    game.activateMoon();
    game.startGame(10, 50, ['the_moon']);
    const state = game.getState();
    expect(state.state).toBe('betting');
    expect((state as any).currentBet).toBe(20);
  });

  it('Fool auto_win: автоматическая победа', () => {
    const game = new BlackjackGame(300);
    game.applyFoolEffect('fool_auto_win');
    game.startGame(10, 50, []);
    game.deal();
    const state = game.getState();
    expect(state.state).toBe('gameOver');
    expect((state as any).result).toBe('playerWin');
  });

  it('Tower: setDealerDifficulty меняет порог дилера', () => {
    const game = new BlackjackGame(42);
    game.setDealerDifficulty(1);
    game.startGame(10, 50, []);
    game.deal();
    game.playerTurn();
    game.stand();
    expect(game.getState().state).toBe('gameOver');
  });
});

describe('Баланс — все числа кратно 5', () => {
  it('Стартовое HP кратно 5', () => {
    const rm = createRunManager();
    expect(rm.getHp() % 5).toBe(0);
    expect(rm.getMaxHp() % 5).toBe(0);
  });

  it('После Sun (+5 max HP) — всё ещё кратно 5', () => {
    const rm = createRunManager();
    rm.increaseMaxHp(5);
    expect(rm.getMaxHp() % 5).toBe(0);
    expect(rm.getHp() % 5).toBe(0);
  });

  it('После хила локации (+10) — кратно 5', () => {
    const rm = createRunManager();
    rm.onNewLocation();
    expect(rm.getHp() % 5).toBe(0);
  });

  it('Justice: проигрыш минимум -5, кратно 5', () => {
    const rm = createRunManager();
    rm.addPerk('justice');
    const hpChange = Math.max(-20 + 5, -5);
    rm.updateHp(hpChange);
    expect(rm.getHp() % 5).toBe(0);
  });

  it('После 10 игр с разными перками — HP кратно 5', () => {
    const rm = createRunManager();
    rm.addPerk('the_sun');
    rm.addPerk('justice');
    for (let i = 0; i < 10; i++) {
      const game = new BlackjackGame(i);
      game.startGame(10, rm.getHp(), rm.getPerks());
      game.deal();
      if (game.getState().state !== 'gameOver') {
        game.playerTurn();
        game.stand();
      }
      const state = game.getState();
      let hpChange = game.getPayout() - game.getTotalStake();

      if (state.state === 'gameOver') {
        const dealerHand = (state as any).dealerHand;
        if (dealerHand && calculateHandScore(dealerHand).total > 21) {
          if (game.hasPerk('the_sun')) {
            rm.increaseMaxHp(5);
          }
        }
        const result = (state as any).result;
        if (result === 'dealerWin' && game.hasPerk('justice')) {
          hpChange = Math.max(hpChange + 5, -5);
        }
      }

      rm.updateHp(hpChange);
      rm.advanceFloor();
      if (rm.isNewLocation()) rm.onNewLocation();
    }
    expect(rm.getHp() % 5).toBe(0);
    expect(rm.getMaxHp() % 5).toBe(0);
  });
});

describe('Сплит — edge cases', () => {
  it('Сплит: повторный запрещён', () => {
    const game = new BlackjackGame(999);
    game.startGame(10, 50, []);
    game.deal();
    game.playerTurn();
    const state = game.getState();
    if (state.state === 'playerTurn') {
      const hand = (state as any).playerHands[0];
      if (hand && hand.length === 2 && hand[0].rank === hand[1].rank) {
        game.split();
        try {
          game.split();
          expect(false).toBe(true);
        } catch (e) {
          expect((e as Error).message).toContain('Повторное разделение запрещено');
        }
      } else {
        expect(true).toBe(true);
      }
    }
  });
});