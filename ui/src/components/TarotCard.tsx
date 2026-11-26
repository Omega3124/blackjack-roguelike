import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Perk } from '../../../src/roguelike/perks';

interface Props {
  perk: Perk;
  width?: number;
  onClick?: () => void;
}

const TARO_ASPECT = 122 / 208; // ≈ 0.5865

export function TarotCard({ perk, width = 110, onClick }: Props) {
  const [imgError, setImgError] = useState(false);
  const height = Math.round(width / TARO_ASPECT); // 110 → 188

  const typeColors: Record<string, string> = {
    visual: 'rgba(180,140,255,0.6)',
    information: 'rgba(255,220,90,0.6)',
    mechanic: 'rgba(90,200,255,0.6)',
    chaos: 'rgba(255,90,90,0.6)',
  };
  const glow = typeColors[perk.type] ?? 'rgba(255,255,255,0.3)';

  return (
    <motion.div
      className={`tarot-card tarot-${perk.type}`}
      onClick={onClick}
      whileHover={{ scale: 1.06, y: -10 }}
      whileTap={{ scale: 0.97 }}
      style={{
        width,
        height,
        cursor: 'pointer',
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: `0 0 22px ${glow}`,
        border: '2px solid rgba(255,255,255,0.25)',
        background: '#0f3460',
      }}
    >
      {/* Картинка занимает ВСЮ карту — без обрезки, т.к. пропорции совпадают */}
      {!imgError ? (
        <img
          src={`/tarot/${perk.id}.png`}
          alt={perk.name}
          draggable={false}
          onError={() => setImgError(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 56,
            background: '#1a1a2e',
          }}
        >
          {perk.icon}
        </div>
      )}
    </motion.div>
  );
}