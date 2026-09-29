/**
 * Симулятор для проверки баланса игры.
 * 
 * Прогоняет N игр с заданной стратегией и собирает статистику:
 * - Win rate игрока
 * - House edge (математическое преимущество казино)
 * - ROI (return on investment)
 * - Distribution результатов
 */

import { BlackjackGame } from '../core/game.js';
import { BasicStrategyAI, type PlayerAction, type AIDifficulty } from './strategy.js';

export interface SimulationConfig {
  numGames: number;        // Количество игр для симуляции
  initialBalance: number;  // Начальный баланс игрока
  betSize: number;         // Размер ставки
  aiDifficulty: AIDifficulty;
  seed?: string;           // Для воспроизводимости
}

export interface GameResult {
  outcome: 'win' | 'loss' | 'push' | 'blackjack';
  payout: number;          // Выплата (положительная = выигрыш)
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
  winRate: number;         // (wins + blackjacks) / totalGames
  lossRate: number;
  pushRate: number;
  houseEdge: number;       // -netProfit / totalWagered (в %)
  roi: number;             // netProfit / totalWagered * 100
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
    let totalWagered = 0;      // Всего поставлено денег
    let totalPayouts = 0;      // Всего получено выплат (включая возврат ставки)
    let totalLostBets = 0;     // Сумма чисто проигранных ставок
    let wins = 0;
    let losses = 0;
    let pushes = 0;
    let blackjacks = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    for (let i = 0; i < this.config.numGames; i++) {
      if (balance < this.config.betSize) {
        break; // Игрок обанкротился
      }

      const result = this.playSingleGame(balance);
      balance = result.finalBalance;
      
      // Накапливаем общие метрики
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
    
    // ✅ ПРАВИЛЬНАЯ ФОРМУЛА: Чистая прибыль = Все выплаты - Все ставки
    const netProfit = totalPayouts - totalWagered;

    return {
      totalGames,
      wins,
      losses,
      pushes,
      blackjacks,
      totalWagered,
      totalWon: totalPayouts,       // Для совместимости интерфейса
      totalLost: totalLostBets,     // Для совместимости интерфейса
      netProfit,
      winRate: totalGames > 0 ? (wins + blackjacks) / totalGames : 0,
      lossRate: totalGames > 0 ? losses / totalGames : 0,
      pushRate: totalGames > 0 ? pushes / totalGames : 0,
      // ✅ ПРАВИЛЬНЫЙ HOUSE EDGE: (Прибыль казино / Всего ставок) * 100
      houseEdge: totalWagered > 0 ? ((totalWagered - totalPayouts) / totalWagered) * 100 : 0,
      roi: totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0,
      avgPayout: totalGames > 0 ? totalPayouts / totalGames : 0,
      maxWinStreak,
      maxLossStreak,
      finalBalance: balance,
    };
  }

    /**
   * Сыграть одну игру с AI-ботом.
   */
  private playSingleGame(startBalance: number): GameResult {
    const seed = `sim-${Date.now()}-${Math.random()}`;
    const game = new BlackjackGame(seed);

    // Делаем ставку и раздаём карты
    game.startGame(this.config.betSize, startBalance);
    game.deal();

    // ⚠️ ВАЖНО: Проверяем состояние после раздачи!
    // Если сразу выпал Blackjack — игра уже закончилась
    let state = game.getState();
    if (state.state === 'gameOver') {
      return this.buildResult(game, startBalance);
    }

    // Переходим в ход игрока
    game.playerTurn();
    state = game.getState();

    // AI принимает решения пока не закончится ход игрока
    while (state.state === 'playerTurn') {
      const playerHand = state.playerHand;
      const dealerCard = state.dealerHand[0];
      const decision = this.ai.decide(playerHand, dealerCard);

      this.executeAction(game, decision.action);

      // Обновляем состояние после действия
      state = game.getState();

      // Если игра закончилась (bust) — выходим
      if (state.state === 'gameOver') {
        break;
      }
    }

    return this.buildResult(game, startBalance);
  }

  /**
   * Собрать результат игры.
   */
  private buildResult(game: BlackjackGame, startBalance: number): GameResult {
    const state = game.getState();
    const payout = game.getPayout();
    const profit = payout - this.config.betSize;

    let outcome: GameResult['outcome'];

    if (state.state === 'gameOver') {
      switch (state.result) {
        case 'blackjack':
          outcome = 'blackjack';
          break;
        case 'playerWin':
          outcome = 'win';
          break;
        case 'dealerWin':
          outcome = 'loss';
          break;
        case 'push':
          outcome = 'push';
          break;
        default:
          outcome = 'loss';
      }
    } else {
      outcome = 'loss'; // shouldn't happen
    }

   return {
     outcome,
     payout,
      finalBalance: startBalance + profit,
   };
  }

  /**
   * Выполнить действие AI в игре.
   */
  private executeAction(game: BlackjackGame, action: PlayerAction): void {
    try {
      switch (action) {
        case 'hit':
          game.hit();
          break;
        case 'stand':
          game.stand();
          break;
        case 'double':

          game.hit();
          break;
        case 'split':
          // TODO: реализовать split в game.ts
          game.hit();
          break;
        case 'surrender':
          // TODO: реализовать surrender
          game.stand();
          break;
      }
    } catch (e) {
      // Если действие невозможно — stand
      game.stand();
    }
  }
}

/**
 * Фабрика для создания симулятора.
 */
export function createSimulator(config: SimulationConfig): Simulator {
  return new Simulator(config);
}