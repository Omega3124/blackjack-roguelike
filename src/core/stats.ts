/**
 * Модуль статистики и анализа результатов симуляции.
 * 
 * Форматирует результаты, сравнивает с теоретическими значениями,
 * выявляет аномалии баланса.
 */

import type { SimulationStats, SimulationConfig } from './simulation.js';

// Теоретические значения house edge для разных стратегий
// Источник: Wizard of Odds
export const THEORETICAL_HOUSE_EDGE: Record<string, number> = {
  'perfect_basic_strategy': 0.5,    // 0.5% при идеальной basic strategy
  'intermediate_player': 2.0,       // ~2% при игре с ошибками
  'beginner_player': 4.0,           // ~4% при случайных решениях
  'card_counter': -1.0,             // -1% (игрок в плюсе) при хорошем счёте
};

export interface StatsReport {
  summary: string;
  metrics: Record<string, number>;
  anomalies: string[];
  recommendations: string[];
  comparisonWithTheory: {
    expected: number;
    actual: number;
    deviation: number;
  };
}

export class StatsAnalyzer {
  /**
   * Сгенерировать отчёт по результатам симуляции.
   */
  static generateReport(
    stats: SimulationStats,
    config: SimulationConfig
  ): StatsReport {
    const anomalies: string[] = [];
    const recommendations: string[] = [];

    // Проверка на аномалии
    if (Math.abs(stats.houseEdge - THEORETICAL_HOUSE_EDGE[config.aiDifficulty]) > 1) {
      anomalies.push(
        `House edge (${stats.houseEdge.toFixed(2)}%) сильно отклоняется от теоретического ` +
        `(${THEORETICAL_HOUSE_EDGE[config.aiDifficulty]}%). Возможно, нужно больше игр для симуляции.`
      );
    }

    if (stats.maxLossStreak > 15) {
      anomalies.push(`Зафиксирована длинная серия проигрышей: ${stats.maxLossStreak} игр подряд.`);
      recommendations.push('Рассмотреть систему управления банкроллом (Kelly Criterion).');
    }

    if (stats.winRate < 0.40) {
      anomalies.push(`Низкий win rate: ${(stats.winRate * 100).toFixed(1)}%.`);
    }

    if (stats.finalBalance <= 0) {
      recommendations.push('Игрок обанкротился. Увеличить начальный баланс или уменьшить ставку.');
    }

    // Рекомендации по балансу
    if (stats.houseEdge > 5) {
      recommendations.push('House edge слишком высокий — игра несправедлива к игроку.');
    } else if (stats.houseEdge < 0 && config.aiDifficulty !== 'card_counter') {
      recommendations.push('Игрок в плюсе без card counting — возможно, баг в логике выплат.');
    }

    const expected = THEORETICAL_HOUSE_EDGE[config.aiDifficulty] ?? 0.5;
    const deviation = stats.houseEdge - expected;

    return {
      summary: this.generateSummary(stats, config),
      metrics: {
        houseEdge: stats.houseEdge,
        winRate: stats.winRate * 100,
        lossRate: stats.lossRate * 100,
        pushRate: stats.pushRate * 100,
        roi: stats.roi,
        blackjacksPer100Games: (stats.blackjacks / stats.totalGames) * 100,
        avgPayout: stats.avgPayout,
      },
      anomalies,
      recommendations,
      comparisonWithTheory: {
        expected,
        actual: stats.houseEdge,
        deviation,
      },
    };
  }

  /**
   * Сравнить результаты нескольких симуляций (для разных стратегий).
   */
  static compareStrategies(
    results: Array<{ strategy: string; stats: SimulationStats }>
  ): string {
    let report = '📊 Сравнение стратегий:\n\n';
    report += 'Стратегия'.padEnd(20) + 'House Edge'.padEnd(12) + 'Win Rate'.padEnd(10) + 'ROI\n';
    report += '-'.repeat(60) + '\n';

    for (const { strategy, stats } of results) {
      report += 
        strategy.padEnd(20) +
        stats.houseEdge.toFixed(2).padStart(8) + '%'.padEnd(3) +
        (stats.winRate * 100).toFixed(1).padStart(6) + '%'.padEnd(3) +
        stats.roi.toFixed(2) + '%\n';
    }

    return report;
  }

  private static generateSummary(stats: SimulationStats, config: SimulationConfig): string {
    return (
      `Симуляция завершена: ${stats.totalGames} игр, ` +
      `начальный баланс $${config.initialBalance}, ` +
      `ставка $${config.betSize}, ` +
      `AI: ${config.aiDifficulty}.\n` +
      `Финальный баланс: $${stats.finalBalance.toFixed(2)}, ` +
      `House Edge: ${stats.houseEdge.toFixed(2)}%, ` +
      `ROI: ${stats.roi.toFixed(2)}%.`
    );
  }
}