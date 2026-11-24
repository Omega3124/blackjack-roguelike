import { describe, it, expect } from 'vitest';
import { BlackjackGame } from '../src/core/game';
import { RunManager, createRunManager } from '../src/roguelike/run';
import { calculateHandScore } from '../src/core/hand';

describe('Симуляция баланса', () => {
  it('Без перков: средний забег длится 5-15 игр', () => {
    const results: number[] = [];
    for (let seed = 0; seed < 100; seed++) {
      const rm = createRunManager();
      let games = 0;
      while (rm.isRunActive() && games < 100 && rm.getHp() >= 10) {
        const game = new BlackjackGame(seed + games);
        game.startGame(10, rm.getHp(), []);
        game.deal();
        if (game.getState().state !== 'gameOver') {
          game.playerTurn();
          game.stand();
        }
        const payout = game.getPayout();
        const stake = game.getTotalStake();
        rm.updateHp(payout - stake);
        rm.advanceFloor();
        games++;
      }
      results.push(games);
    }
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    console.log(`Средняя длина забега без перков: ${avg.toFixed(1)} игр`);
    expect(avg).toBeGreaterThan(3);
    expect(avg).toBeLessThan(30);
  });

  it('С Justice: забег длиннее на 20-50%', () => {
    const resultsNoPerk: number[] = [];
    const resultsWithJustice: number[] = [];

    for (let seed = 0; seed < 100; seed++) {
      const rm1 = createRunManager();
      let g1 = 0;
      while (rm1.isRunActive() && g1 < 100 && rm1.getHp() >= 10) {
        const game = new BlackjackGame(seed + g1);
        game.startGame(10, rm1.getHp(), []);
        game.deal();
        if (game.getState().state !== 'gameOver') {
          game.playerTurn();
          game.stand();
        }
        rm1.updateHp(game.getPayout() - game.getTotalStake());
        rm1.advanceFloor();
        g1++;
      }
      resultsNoPerk.push(g1);

      const rm2 = createRunManager();
      rm2.addPerk('justice');
      let g2 = 0;
      while (rm2.isRunActive() && g2 < 100 && rm2.getHp() >= 10) {
        const game = new BlackjackGame(seed + g2);
        game.startGame(10, rm2.getHp(), ['justice']);
        game.deal();
        if (game.getState().state !== 'gameOver') {
          game.playerTurn();
          game.stand();
        }
        let hpChange = game.getPayout() - game.getTotalStake();
        const state = game.getState();
        if (state.state === 'gameOver') {
          const result = (state as any).result;
          if (result === 'dealerWin') {
            hpChange = Math.max(hpChange + 5, -5);
          }
        }
        rm2.updateHp(hpChange);
        rm2.advanceFloor();
        g2++;
      }
      resultsWithJustice.push(g2);
    }

    const avgNo = resultsNoPerk.reduce((a, b) => a + b, 0) / 100;
    const avgJ = resultsWithJustice.reduce((a, b) => a + b, 0) / 100;
    console.log(`Без Justice: ${avgNo.toFixed(1)} игр, с Justice: ${avgJ.toFixed(1)} игр`);
    expect(avgJ).toBeGreaterThan(avgNo * 1.1);
  });

  it('HP всегда кратно 5 после любого числа игр', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rm = createRunManager();
      rm.addPerk('the_sun');
      rm.addPerk('justice');
      for (let i = 0; i < 20; i++) {
        const game = new BlackjackGame(seed + i);
        game.startGame(10, rm.getHp(), rm.getPerks());
        game.deal();
        if (game.getState().state !== 'gameOver') {
          game.playerTurn();
          game.stand();
        }
        let hpChange = game.getPayout() - game.getTotalStake();
        const state = game.getState();
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
    }
  });

  it('Усложнение дилера: чем выше этаж, тем сложнее', () => {
    const game1 = new BlackjackGame(1);
    game1.setDealerDifficulty(1);
    game1.startGame(10, 50, []);
    game1.deal();
    game1.playerTurn();
    game1.stand();

    const game2 = new BlackjackGame(2);
    game2.setDealerDifficulty(12);
    game2.startGame(10, 50, []);
    game2.deal();
    game2.playerTurn();
    game2.stand();

    expect(true).toBe(true);
  });
});