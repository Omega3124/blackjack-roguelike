import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Card } from '../../../src/core/types';
import {
  getCardImageUrl,
  CARD_BACK_URL,
  CARD_FALLBACK_URL,
  CARD_SIZES,
  DEAL_ORIGIN,
  type CardSize,
} from '../lib/cardAssets';

interface Props {
  card?: Card;
  faceUp?: boolean;
  dealIndex?: number;
  size?: CardSize;
  highlight?: boolean;
  className?: string;
}

export function PlayingCard({
  card,
  faceUp = true,
  dealIndex = 0,
  size = 'md',
  highlight = false,
  className,
}: Props) {
  const { w, h } = CARD_SIZES[size];
  const [imgError, setImgError] = useState(false);

  const frontSrc = card ? getCardImageUrl(card) : CARD_BACK_URL;
  const displaySrc = imgError ? CARD_FALLBACK_URL : frontSrc;
  const delay = dealIndex * 0.15;

  return (
    <motion.div
      className={`playing-card ${highlight ? 'highlight' : ''} ${className ?? ''}`}
      style={{ width: w, height: h, position: 'relative' }}
      // 1) Вылет из колоды
      initial={{ x: DEAL_ORIGIN.x, y: DEAL_ORIGIN.y, scale: 0.4, opacity: 0, rotate: DEAL_ORIGIN.rotate }}
      animate={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, delay }}
    >
      <motion.div
        className="card-inner"
        // ✅ КЛЮЧЕВОЕ: initial = целевое состояние, чтобы рубашка была СРАЗУ
        initial={{ rotateY: faceUp ? 0 : 180 }}
        animate={{ rotateY: faceUp ? 0 : 180 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d', width: '100%', height: '100%' }}
      >
        <img
          className="card-face card-front"
          src={displaySrc}
          alt={card ? `${card.rank} ${card.suit}` : 'card'}
          draggable={false}
          onError={() => setImgError(true)}
        />
        <img
          className="card-face card-back"
          src={CARD_BACK_URL}
          alt="back"
          draggable={false}
        />
      </motion.div>
    </motion.div>
  );
}