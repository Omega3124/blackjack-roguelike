/**
 * Модуль статистики и анализа результатов симуляции.
 * 
 * Форматирует результаты, сравнивает с теоретическими значениями,
 * выявляет аномалии баланса и даёт рекомендации.
 * 
 * Источник теоретических значений: Wizard of Odds
 */

import type { SimulationStats, SimulationConfig } from './simulation.js';

// Теоретические значения house edge для разных стратегий
// Источник: Wizard of Odds, "Blackjack House Edge"
export const THEORETICAL_HOUSE_EDGE: Record<string, number> = {
  expert: 0.5,          // 0.5% при идеальной Basic Strategy
  intermediate: 2.0,    // ~2% при игре с ошибками (20% ошибок)
  beginner: 4.0,        // ~4% при случайных решениях (50% ошибок)
  card_counter: -1.0,   // -1% (игрок в плюсе) при хорошем счёте
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

    // Проверка на аномалии house edge
    const expected = THEORETICAL_HOUSE_EDGE[config.aiDifficulty] ?? 0.5;
    const deviation = stats.houseEdge - expected;

    if (Math.abs(deviation) > 2) {
      anomalies.push(
        `House edge (${stats.houseEdge.toFixed(2)}%) сильно отклоняется от теоретического ` +
        `(${expected.toFixed(2)}%). Возможно, нужно больше игр для симуляции ` +
        `(рекомендуется 50,000+).`
      );
    }

    // Длинная серия проигрышей
    if (stats.maxLossStreak > 15) {
      anomalies.push(`Зафиксирована длинная серия проигрышей: ${stats.maxLossStreak} игр подряд.`);
      recommendations.push('Рассмотреть систему управления банкроллом (Kelly Criterion).');
    }

    // Низкий win rate
    if (stats.winRate < 0.40) {
      anomalies.push(`Низкий win rate: ${(stats.winRate * 100).toFixed(1)}%.`);
    }

    // Банкротство
    if (stats.finalBalance <= 0) {
      recommendations.push(
        'Игрок обанкротился. Увеличить начальный баланс или уменьшить ставку.'
      );
    }

    // Слишком высокий house edge
    if (stats.houseEdge > 5) {
      recommendations.push('House edge слишком высокий — игра несправедлива к игроку.');
    }

    // Игрок в плюсе без card counting — возможный баг
    if (stats.houseEdge < 0 && config.aiDifficulty !== 'card_counter') {
      recommendations.push(
        'Игрок в плюсе без card counting — возможно, баг в логике выплат или AI слишком сильный.'
      );
    }

    // Push rate должен быть около 8-9%
    if (stats.pushRate < 0.05 || stats.pushRate > 0.15) {
      anomalies.push(
        `Push rate (${(stats.pushRate * 100).toFixed(1)}%) отклоняется от ожидаемого (~8-9%).`
      );
    }

    // Blackjack rate должен быть около 4.8%
    const blackjackRate = (stats.blackjacks / stats.totalGames) * 100;
    if (blackjackRate < 3 || blackjackRate > 7) {
      anomalies.push(
        `Blackjack rate (${blackjackRate.toFixed(2)}%) отклоняется от ожидаемого (~4.8%).`
      );
    }

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
        maxWinStreak: stats.maxWinStreak,
        maxLossStreak: stats.maxLossStreak,
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
    report += 'Стратегия'.padEnd(20) + 
              'House Edge'.padEnd(12) + 
              'Win Rate'.padEnd(10) + 
              'ROI'.padEnd(10) + 
              'Push Rate\n';
    report += '-'.repeat(70) + '\n';

    for (const { strategy, stats } of results) {
      report += 
        strategy.padEnd(20) +
        stats.houseEdge.toFixed(2).padStart(8) + '%'.padEnd(3) +
        (stats.winRate * 100).toFixed(1).padStart(6) + '%'.padEnd(3) +
        stats.roi.toFixed(2).padStart(8) + '%'.padEnd(2) +
        (stats.pushRate * 100).toFixed(1) + '%\n';
    }

    return report;
  }

  /**
   * Сгенерировать текстовое резюме симуляции.
   */
  private static generateSummary(
    stats: SimulationStats, 
    config: SimulationConfig
  ): string {
    return (
      `Симуляция завершена: ${stats.totalGames} игр, ` +
      `начальный баланс $${config.initialBalance}, ` +
      `ставка $${config.betSize}, ` +
      `AI: ${config.aiDifficulty}.\n` +
      `Финальный баланс: $${stats.finalBalance.toFixed(2)}, ` +
      `House Edge: ${stats.houseEdge.toFixed(2)}%, ` +
      `ROI: ${stats.roi.toFixed(2)}%, ` +
      `Win Rate: ${(stats.winRate * 100).toFixed(1)}%, ` +
      `Blackjacks: ${stats.blackjacks}.`
    );
  }
}