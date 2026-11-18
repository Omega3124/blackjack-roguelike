import { CARD_BACK_URL, CARD_SIZES } from '../lib/cardAssets';

interface Props {
  remaining: number;
  max?: number;
}

/**
 * Стопка рубашек в углу стола.
 * "Тает" по мере раздачи карт.
 */
export function DeckPile({ remaining, max = 52 }: Props) {
  const { w, h } = CARD_SIZES.md;
  const layers = Math.max(1, Math.min(6, Math.ceil((remaining / max) * 6)));

  return (
    <div
      className="deck-pile"
      style={{ width: w, height: h, position: 'relative' }}
      aria-label={`В колоде ${remaining} карт`}
    >
      {Array.from({ length: layers }).map((_, i) => (
        <div
          key={i}
          className="deck-layer"
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translate(${i * 1.5}px, ${-i * 1.5}px)`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          <img
            className="card-face"
            src={CARD_BACK_URL}
            alt=""
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
          />
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          bottom: -22,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 12,
          color: '#cbd5e1',
          whiteSpace: 'nowrap',
        }}
      >
        Осталось: {remaining}
      </div>
    </div>
  );
}