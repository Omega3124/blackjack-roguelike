import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Perk } from '../../../src/roguelike/perks';
import { getTarotImageUrl, CARD_SIZES, type CardSize } from '../lib/cardAssets';

interface Props {
  perk: Perk;
  size?: CardSize;
  onClick?: () => void;
}

export function TarotCard({ perk, size = 'md', onClick }: Props) {
  const { w, h } = CARD_SIZES[size];
  const [imgError, setImgError] = useState(false);

  const typeColors: Record<string, string> = {
    visual: 'rgba(180,140,255,0.6)',
    information: 'rgba(255,220,90,0.6)',
    mechanic: 'rgba(90,200,255,0.6)',
    chaos: 'rgba(255,90,90,0.6)',
  };

  return (
    <motion.div
      className={`tarot-card tarot-${perk.type}`}
      onClick={onClick}
      whileHover={{ scale: 1.05, y: -8 }}
      whileTap={{ scale: 0.98 }}
      style={{
        width: w,
        height: h,
        cursor: 'pointer',
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: `0 0 20px ${typeColors[perk.type] ?? 'rgba(255,255,255,0.3)'}`,
        border: '2px solid rgba(255,255,255,0.2)',
        background: '#0f3460',
      }}
    >
      {!imgError ? (
        <img
          src={getTarotImageUrl(perk.id)}
          alt={perk.name}
          draggable={false}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '70%', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '70%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 48,
          }}
        >
          {perk.icon}
        </div>
      )}
      <div style={{ padding: '6px 8px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 'bold', color: '#fff' }}>{perk.name}</div>
        <div style={{ fontSize: 10, color: '#a0a0a0', marginTop: 2 }}>{perk.description}</div>
      </div>
    </motion.div>
  );
}