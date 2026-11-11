import { describe, it, expect } from 'vitest';
import { Simulator, createSimulator } from '../src/core/simulation.js';
import { StatsAnalyzer } from '../src/core/stats.js';

describe('Simulator', () => {
  it('should run simulation and return stats', () => {
    const sim = createSimulator({
      numGames: 100,
      initialBalance: 1000,
      betSize: 10,
      aiDifficulty: 'expert',
    });

    const stats = sim.run();

    expect(stats.totalGames).toBeGreaterThan(0);
    expect(stats.totalGames).toBeLessThanOrEqual(100);
    expect(stats.wins + stats.losses + stats.pushes).toBe(stats.totalGames);
    expect(stats.winRate).toBeGreaterThanOrEqual(0);
    expect(stats.winRate).toBeLessThanOrEqual(1);
    expect(stats.houseEdge).toBeDefined();
  });

  it('should stop when player is bankrupt', () => {
    const sim = createSimulator({
      numGames: 10000,
      initialBalance: 50,
      betSize: 10,
      aiDifficulty: 'expert',
    });

    const stats = sim.run();
    expect(stats.totalGames).toBeLessThan(10000);
  });

  it('expert AI should have house edge close to theoretical 0.5%', () => {
    const sim = createSimulator({
      numGames: 10000,
      initialBalance: 10000,
      betSize: 10,
      aiDifficulty: 'expert',
    });

    const stats = sim.run();
    // House edge должен быть в разумных пределах (0-5%)
    expect(stats.houseEdge).toBeGreaterThanOrEqual(-2);
    expect(stats.houseEdge).toBeLessThanOrEqual(5);
  });
});

describe('StatsAnalyzer', () => {
  it('should generate report with all fields', () => {
    const sim = createSimulator({
      numGames: 100,
      initialBalance: 1000,
      betSize: 10,
      aiDifficulty: 'expert',
    });

    const stats = sim.run();
    const report = StatsAnalyzer.generateReport(stats, {
      numGames: 100,
      initialBalance: 1000,
      betSize: 10,
      aiDifficulty: 'expert',
    });

    expect(report.summary).toBeDefined();
    expect(report.metrics.houseEdge).toBeDefined();
  });

  it('should compare multiple strategies', () => {
    const results = [
      {
        strategy: 'expert',
        stats: {
          totalGames: 100,
          wins: 42,
          losses: 50,
          pushes: 8,
          blackjacks: 4,
          totalStaked: 1000,
          totalPayouts: 950,
          netProfit: -50,
          winRate: 0.46,
          lossRate: 0.50,
          pushRate: 0.08,
          houseEdge: 5.0,
          roi: -5.0,
          avgPayout: 9.5,
          maxWinStreak: 3,
          maxLossStreak: 5,
          finalBalance: 950,
        },
      },
    ];

    const comparison = StatsAnalyzer.compareStrategies(results);
    expect(comparison).toContain('expert');
  });
});