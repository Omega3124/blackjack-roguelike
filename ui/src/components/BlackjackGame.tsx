import { useState, useEffect } from 'react';
import { BlackjackGame } from '../core/game.js';

export function BlackjackGameComponent() {
  const [game, setGame] = useState<BlackjackGame | null>(null);
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(100);
  const [message, setMessage] = useState('Введите ставку и нажмите "Начать игру"');

  const startGame = () => {
    if (bet <= 0 || bet > balance) {
      setMessage('Некорректная ставка');
      return;
    }

    const newGame = new BlackjackGame(`game-${Date.now()}`);
    newGame.startGame(bet, balance);
    newGame.deal();

    const state = newGame.getState();
    if (state.state === 'gameOver') {
      const payout = newGame.getPayout();
      setBalance(balance - bet + payout);
      setMessage(`Игра окончена: ${state.result}. Выплата: $${payout}`);
      setGame(null);
      return;
    }

    newGame.playerTurn();
    setGame(newGame);
    setMessage('Ваш ход!');
  };

  const handleAction = (action: 'hit' | 'stand' | 'double' | 'split' | 'insurance') => {
    if (!game) return;

    try {
      switch (action) {
        case 'hit':
          game.hit();
          break;
        case 'stand':
          game.stand();
          break;
        case 'double':
          game.double();
          break;
        case 'split':
          game.split();
          break;
        case 'insurance':
          game.insurance();
          break;
      }

      const state = game.getState();
      if (state.state === 'gameOver') {
        const payout = game.getPayout();
        setBalance(balance - bet + payout);
        setMessage(`Игра окончена: ${state.result}. Выплата: $${payout}`);
        setGame(null);
      } else {
        setMessage('Ваш ход!');
      }
    } catch (e) {
      setMessage(`Ошибка: ${(e as Error).message}`);
    }
  };

  const state = game?.getState();

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1> Blackjack</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p>Баланс: <strong>${balance}</strong></p>
      </div>

      {!game ? (
        <div>
          <input
            type="number"
            value={bet}
            onChange={(e) => setBet(Number(e.target.value))}
            min="1"
            max={balance}
            style={{ marginRight: '10px', padding: '5px' }}
          />
          <button onClick={startGame} style={{ padding: '10px 20px' }}>
            Начать игру
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h3>Дилер показывает:</h3>
            {state?.state === 'playerTurn' && (
              <div style={{ fontSize: '24px' }}>
                {state.dealerVisibleCard.rank} {state.dealerVisibleCard.suit === 'hearts' ? '♥' : state.dealerVisibleCard.suit === 'diamonds' ? '♦' : state.dealerVisibleCard.suit === 'clubs' ? '♣' : '♠'}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Ваши карты:</h3>
            {state?.state === 'playerTurn' && (
              <div style={{ display: 'flex', gap: '10px', fontSize: '24px' }}>
                {state.playerHands[state.currentHandIndex].map((card, idx) => (
                  <div key={idx} style={{ border: '1px solid #000', padding: '10px' }}>
                    {card.rank} {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p><strong>{message}</strong></p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => handleAction('hit')} style={{ padding: '10px 20px' }}>
              Hit
            </button>
            <button onClick={() => handleAction('stand')} style={{ padding: '10px 20px' }}>
              Stand
            </button>
            {state?.state === 'playerTurn' && 
             state.playerHands[state.currentHandIndex].length === 2 && (
              <>
                <button onClick={() => handleAction('double')} style={{ padding: '10px 20px' }}>
                  Double
                </button>
                {state.playerHands[state.currentHandIndex][0].rank === 
                 state.playerHands[state.currentHandIndex][1].rank && (
                  <button onClick={() => handleAction('split')} style={{ padding: '10px 20px' }}>
                    Split
                  </button>
                )}
              </>
            )}
            {state?.state === 'playerTurn' && 
             state.insuranceAvailable && 
             state.insuranceBet === 0 && (
              <button onClick={() => handleAction('insurance')} style={{ padding: '10px 20px' }}>
                Insurance
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}