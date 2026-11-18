import type { Card } from '../../../src/core/types';

/**
 * Слуги для имён файлов.
 * Формат: {suit}-{rank}.png
 * Примеры: hearts-A.png, spades-10.png, clubs-K.png
 */
export function getCardImageUrl(card: Card): string {
  return `/cards/${card.suit}-${card.rank}.png`;
}

/** Рубашка карты */
export const CARD_BACK_URL = '/cards/back.png';

/** Пустой слот (fallback если PNG не загрузился) */
export const CARD_FALLBACK_URL = '/cards/fallback.png';

/** Таро: /tarot/{perkId}.png */
export function getTarotImageUrl(perkId: string): string {
  return `/tarot/${perkId}.png`;
}

/** Размеры карт */
export const CARD_SIZES = {
  sm: { w: 60, h: 88 },
  md: { w: 90, h: 130 },
  lg: { w: 110, h: 160 },
} as const;
export type CardSize = keyof typeof CARD_SIZES;

/**
 * Откуда "летит" карта при раздаче.
 * Колода стоит в правом верхнем углу стола.
 * Настрой под свой макет.
 */
export const DEAL_ORIGIN = { x: 240, y: -180, rotate: -15 };