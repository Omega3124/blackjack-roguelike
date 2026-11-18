import type { GameState } from '../../../src/core/types';
import { PlayingCard } from './PlayingCard';
import { DeckPile } from './DeckPile';

interface Props {
  state: GameState;
  deckRemaining: number;
}

/**
 * Индексы раздачи:
 * - Игрок получает карты с индексами 0, 1
 * - Дилер получает карты с индексами 2, 3
 * - При split вторая рука начинается с индекса 4
 */
function dealIndex(side: 'player' | 'dealer', cardIndex: number, handOffset = 0): number {
  return side === 'player' ? cardIndex + handOffset * 4 : 2 + cardIndex;
}

export function GameTable({ state, deckRemaining }: Props) {
  // Показываем стол только во время активной игры
  if (
    state.state !== 'playerTurn' &&
    state.state !== 'dealing' &&
    state.state !== 'dealerTurn' &&
    state.state !== 'gameOver'
  ) {
    return null;
  }

  // Нормализуем руки: в состоянии dealing — одна рука в playerHand
  const playerHands: Card[][] =
    state.state === 'dealing'
      ? [state.playerHand]
      : state.playerHands;

  const dealerHand = state.dealerHand;

  // Показывать ли закрытые карты дилера
  const showDealerHole =
    state.state === 'dealerTurn' || state.state === 'gameOver';

  return (
    <div className="game-table" style={{ position: 'relative', padding: '20px 0' }}>
      {/* Колода в правом верхнем углу */}
      <div style={{ position: 'absolute', top: 10, right: 20 }}>
        <DeckPile remaining={deckRemaining} />
      </div>

      {/* Карты дилера */}
      <div className="dealer-area" style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ color: '#a0a0a0', marginBottom: 10, fontSize: 14 }}>ДИЛЕР</div>
        <div className="cards-row" style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {dealerHand.map((card, i) => {
            // Первая карта всегда открыта (dealerVisibleCard), остальные — рубашка
            const isFirst = i === 0;
            const faceUp = isFirst || showDealerHole;

            return (
              <PlayingCard
                key={`dealer-${card.suit}-${card.rank}-${i}`}
                card={card}
                faceUp={faceUp}
                dealIndex={dealIndex('dealer', i)}
              />
            );
          })}
        </div>
      </div>

      {/* Карты игрока (с поддержкой split) */}
      <div className="player-area" style={{ textAlign: 'center' }}>
        <div style={{ color: '#a0a0a0', marginBottom: 10, fontSize: 14 }}>ВАШИ КАРТЫ</div>
        <div
          className="hands-row"
          style={{
            display: 'flex',
            gap: 30,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {playerHands.map((hand, handIdx) => {
            const isCurrentHand =
              state.state === 'playerTurn' &&
              'currentHandIndex' in state &&
              handIdx === state.currentHandIndex;

            return (
              <div
                key={`hand-${handIdx}`}
                className={`hand-group ${isCurrentHand ? 'active-hand' : ''}`}
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: isCurrentHand ? 10 : 0,
                  borderRadius: 12,
                  border: isCurrentHand ? '2px solid #e94560' : '2px solid transparent',
                  background: isCurrentHand ? 'rgba(233,69,96,0.08)' : 'transparent',
                  transition: 'all 0.3s',
                }}
              >
                {hand.map((card, cardIdx) => (
                  <PlayingCard
                    key={`player-${handIdx}-${card.suit}-${card.rank}-${cardIdx}`}
                    card={card}
                    faceUp
                    dealIndex={dealIndex('player', cardIdx, handIdx)}
                    highlight={isCurrentHand}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Тип Card нужен для TS
import type { Card } from '../../../src/core/types';