/**
 * Симулятор для проверки баланса игры.
 * Работает с актуальным ядром: playerHands, split, double, insurance.
 */

import { BlackjackGame } from '../core/game.js';
import { BasicStrategyAI, type PlayerAction, type AIDifficulty } from './strategy.js';

export interface SimulationConfig {
  numGames: number;
  initialBalance: number;
  betSize: number;
  aiDifficulty: AIDifficulty;
}

export type GameOutcome = 'win' | 'loss' | 'push' | 'blackjack';

export interface GameResult {
  outcome: GameOutcome;
  payout: number;
  totalStake: number;
  finalBalance: number;
}

export interface SimulationStats {
  totalGames: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
  totalStaked: number;       // Сумма всех ставок (getTotalStake)
  totalPayouts: number;      // Сумма всех выплат
  netProfit: number;
  winRate: number;
  lossRate: number;
  pushRate: number;
  houseEdge: number;         // (totalStaked - totalPayouts) / totalStaked * 100
  roi: number;
  avgPayout: number;
  maxWinStreak: number;
  maxLossStreak: number;
  finalBalance: number;
}

export class Simulator {
  private config: SimulationConfig;
  private ai: BasicStrategyAI;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.ai = new BasicStrategyAI(config.aiDifficulty);
  }

  run(): SimulationStats {
    let balance = this.config.initialBalance;
    let totalStaked = 0;
    let totalPayouts = 0;
    let wins = 0;
    let losses = 0;
    let pushes = 0;
    let blackjacks = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    for (let i = 0; i < this.config.numGames; i++) {
      if (balance < this.config.betSize) break;

      const result = this.playSingleGame(balance);
      balance = result.finalBalance;
      totalStaked += result.totalStake;
      totalPayouts += result.payout;

      switch (result.outcome) {
        case 'blackjack':
          blackjacks++;
          wins++;
          currentWinStreak++;
          currentLossStreak = 0;
          maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
          break;
        case 'win':
          wins++;
          currentWinStreak++;
          currentLossStreak = 0;
          maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
          break;
        case 'loss':
          losses++;
          currentLossStreak++;
          currentWinStreak = 0;
          maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
          break;
        case 'push':
          pushes++;
          currentWinStreak = 0;
          currentLossStreak = 0;
          break;
      }
    }

    const totalGames = wins + losses + pushes;
    const netProfit = totalPayouts - totalStaked;

    return {
      totalGames,
      wins,
      losses,
      pushes,
      blackjacks,
      totalStaked,
      totalPayouts,
      netProfit,
      winRate: totalGames > 0 ? (wins + blackjacks) / totalGames : 0,
      lossRate: totalGames > 0 ? losses / totalGames : 0,
      pushRate: totalGames > 0 ? pushes / totalGames : 0,
      houseEdge: totalStaked > 0 ? ((totalStaked - totalPayouts) / totalStaked) * 100 : 0,
      roi: totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0,
      avgPayout: totalGames > 0 ? totalPayouts / totalGames : 0,
      maxWinStreak,
      maxLossStreak,
      finalBalance: balance,
    };
  }

  private playSingleGame(startBalance: number): GameResult {
    const seed = `sim-${Date.now()}-${Math.random()}`;
    const game = new BlackjackGame(seed);

    game.startGame(this.config.betSize, startBalance);
    game.deal();

    // Проверяем состояние после раздачи (может быть сразу gameOver при blackjack)
    let state = game.getState();
    if (state.state === 'gameOver') {
      return this.buildResult(game, startBalance);
    }

    game.playerTurn();
    state = game.getState();

    // Если после playerTurn игра уже закончилась (редко, но возможно)
    if (state.state === 'gameOver') {
      return this.buildResult(game, startBalance);
    }

    // Цикл AI: играем пока состояние playerTurn
    let safetyCounter = 0;
    while (state.state === 'playerTurn' && safetyCounter < 20) {
      safetyCounter++;
      const decision = this.getAIDecision(game, state);
      this.executeAction(game, decision.action, state);
      state = game.getState();
      if (state.state === 'gameOver') break;
    }

    return this.buildResult(game, startBalance);
  }

  /**
   * Получить решение AI с учётом текущего состояния игры.
   */
  private getAIDecision(game: BlackjackGame, state: any): { action: PlayerAction } {
    const playerState = state as any;
    const currentHand = playerState.playerHands[playerState.currentHandIndex];
    const dealerCard = playerState.dealerHand[0];
    const allHands = playerState.playerHands;
    const splitAces = playerState.splitAces ?? false;
    const insuranceAvailable = playerState.insuranceAvailable ?? false;
    const insuranceBet = playerState.insuranceBet ?? 0;

    // Определяем доступные действия
    const canSplit =
      allHands.length === 1 &&
      currentHand.length === 2 &&
      currentHand[0].rank === currentHand[1].rank &&
      !splitAces;

    const canDouble =
      currentHand.length === 2 &&
      !splitAces;

    const insuranceNotTaken = insuranceAvailable && insuranceBet === 0 && currentHand.length === 2;

    const decision = this.ai.decide(currentHand, dealerCard, {
      canSplit,
      canDouble,
      insuranceAvailable: insuranceNotTaken,
      splitAces,
      balance: playerState.balance ?? this.config.initialBalance,
      currentBet: playerState.bets?.[playerState.currentHandIndex] ?? this.config.betSize,
    });

    return decision;
  }

  /**
   * Выполнить действие AI в игре.
   */
  private executeAction(game: BlackjackGame, action: PlayerAction, state: any): void {
    try {
      switch (action) {
        case 'hit':
          game.hit();
          break;
        case 'stand':
          game.stand();
          break;
        case 'double':
          try {
            game.double();
          } catch {
            game.hit(); // fallback
          }
          break;
        case 'split':
          try {
            game.split();
          } catch {
            game.stand(); // fallback
          }
          break;
        case 'insurance':
          try {
            game.insurance();
          } catch {
            // insurance недоступна — продолжаем
          }
          break;
        default:
          game.stand();
      }
    } catch {
      // Если действие невозможно — stand
      try { game.stand(); } catch { /* ignore */ }
    }
  }

  /**
   * Собрать результат игры.
   */
  private buildResult(game: BlackjackGame, startBalance: number): GameResult {
    const state = game.getState();
    const payout = game.getPayout();
    const totalStake = game.getTotalStake();

    let outcome: GameOutcome = 'loss';

    if (state.state === 'gameOver') {
      switch (state.result) {
        case 'blackjack': outcome = 'blackjack'; break;
        case 'playerWin': outcome = 'win'; break;
        case 'dealerWin': outcome = 'loss'; break;
        case 'push': outcome = 'push'; break;
        default: outcome = 'loss';
      }
    }

    return {
      outcome,
      payout,
      totalStake,
      finalBalance: startBalance - totalStake + payout,
    };
  }
}

export function createSimulator(config: SimulationConfig): Simulator {
  return new Simulator(config);
}