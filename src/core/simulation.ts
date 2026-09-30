import { BlackjackGame } from '../core/game.js';
import { BasicStrategyAI, type AIDifficulty } from './strategy.js';
import type { Card } from './types.js';

export interface SimulationConfig {
  numGames: number;
  initialBalance: number;
  betSize: number;
  aiDifficulty: AIDifficulty;
  seed?: string;
}

export interface GameResult {
  outcome: 'win' | 'loss' | 'push' | 'blackjack';
  payout: number;
  finalBalance: number;
}

export interface SimulationStats {
  totalGames: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  netProfit: number;
  winRate: number;
  lossRate: number;
  pushRate: number;
  houseEdge: number;
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
    let totalWagered = 0;
    let totalPayouts = 0;
    let totalLostBets = 0;
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
      totalWagered += this.config.betSize;
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
          totalLostBets += this.config.betSize;
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
    const netProfit = totalPayouts - totalWagered;

    return {
      totalGames,
      wins,
      losses,
      pushes,
      blackjacks,
      totalWagered,
      totalWon: totalPayouts,
      totalLost: totalLostBets,
      netProfit,
      winRate: totalGames > 0 ? (wins + blackjacks) / totalGames : 0,
      lossRate: totalGames > 0 ? losses / totalGames : 0,
      pushRate: totalGames > 0 ? pushes / totalGames : 0,
      houseEdge: totalWagered > 0 ? ((totalWagered - totalPayouts) / totalWagered) * 100 : 0,
      roi: totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0,
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

    let state = game.getState();
    if (state.state === 'gameOver') {
      return this.buildResult(game, startBalance);
    }

    game.playerTurn();
    state = game.getState();

    while (state.state === 'playerTurn') {
      const currentHand = state.playerHands[state.currentHandIndex];
      const dealerCard = state.dealerHand[0];
      const decision = this.ai.decide(currentHand, dealerCard);
      this.executeAction(game, decision.action);
      state = game.getState();
      if (state.state === 'gameOver') break;
    }

    return this.buildResult(game, startBalance);
  }

  private buildResult(game: BlackjackGame, startBalance: number): GameResult {
    const state = game.getState();
    const payout = game.getPayout();
    const profit = payout - this.config.betSize;
    let outcome: GameResult['outcome'];

    if (state.state === 'gameOver') {
      switch (state.result) {
        case 'blackjack': outcome = 'blackjack'; break;
        case 'playerWin': outcome = 'win'; break;
        case 'dealerWin': outcome = 'loss'; break;
        case 'push': outcome = 'push'; break;
        default: outcome = 'loss';
      }
    } else {
      outcome = 'loss';
    }

    return { outcome, payout, finalBalance: startBalance + profit };
  }

  private executeAction(game: BlackjackGame, action: string): void {
    try {
      switch (action) {
        case 'hit':
          game.hit();
          break;
        case 'stand':
          game.stand();
          break;
        case 'double':
          game.double();
          break;
        case 'split':
          game.split();
          break;
        case 'insurance':
          game.insurance();
          break;
        default:
          game.stand();
      }
    } catch (e) {
      game.stand();
    }
  }
}

export function createSimulator(config: SimulationConfig): Simulator {
  return new Simulator(config);
}