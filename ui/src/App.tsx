import { useState } from 'react';
import { BlackjackGame } from './core/game';
import { calculateHandScore } from './core/hand';

function App() {
  const [game, setGame] = useState<BlackjackGame | null>(null);
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(100);
  const [message, setMessage] = useState('Введите ставку и нажмите "Начать игру"');
  const [, forceUpdate] = useState(0);

  const [showResultModal, setShowResultModal] = useState(false);
  const [lastResult, setLastResult] = useState<{
    result: string;
    payout: number;
    balance: number;
  } | null>(null);

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
      const newBalance = balance - bet + payout;
      setBalance(newBalance);
      setLastResult({ result: state.result, payout, balance: newBalance });
      setShowResultModal(true);
      setMessage(`Игра окончена: ${state.result}. Выплата: $${payout}`);
      setGame(null);
      return;
    }

    newGame.playerTurn();
    setGame(newGame);
    setMessage('Ваш ход!');
    forceUpdate(n => n + 1);
  };

  const processAction = (actionFn: () => void) => {
    if (!game) return;

    try {
      actionFn();
      const state = game.getState();
      
      if (state.state === 'gameOver') {
        const payout = game.getPayout();
        const newBalance = balance - bet + payout;
        setBalance(newBalance);
        setLastResult({ result: state.result, payout, balance: newBalance });
        setShowResultModal(true);
        setMessage(`Игра окончена: ${state.result}. Выплата: $${payout}`);
        setGame(null);
      } else if (state.state === 'dealerTurn') {
        setMessage('Дилер берёт карты...');
        forceUpdate(n => n + 1);
      } else {
        setMessage('Ваш ход!');
        forceUpdate(n => n + 1);
      }
    } catch (e) {
      setMessage(`Ошибка: ${(e as Error).message}`);
      forceUpdate(n => n + 1);
    }
  };

  const handleHit = () => processAction(() => game!.hit());
  const handleStand = () => processAction(() => game!.stand());
  const handleDouble = () => processAction(() => game!.double());
  const handleSplit = () => processAction(() => game!.split());
  const handleInsurance = () => processAction(() => game!.insurance());

  const state = game?.getState();

  const getPlayerScore = (): number => {
    if (!state || state.state !== 'playerTurn') return 0;
    const hand = state.playerHands[state.currentHandIndex];
    return calculateHandScore(hand).total;
  };

  const getDealerScore = (): number => {
    if (!state) return 0;
    if (state.state === 'playerTurn') {
      return calculateHandScore(state.dealerHand).total;
    }
    if (state.state === 'gameOver' || state.state === 'dealerTurn') {
      return calculateHandScore(state.dealerHand).total;
    }
    return 0;
  };

  const renderCard = (card: { rank: string; suit: string }, key: number, hidden = false) => {
    if (hidden) {
      return (
        <div key={key} style={{ 
          border: '2px solid #000', 
          padding: '15px 20px', 
          borderRadius: '8px', 
          background: '#1a1a2e',
          fontSize: '32px',
          color: '#e94560',
          minWidth: '60px',
          textAlign: 'center',
          boxShadow: '2px 2px 5px rgba(0,0,0,0.3)'
        }}>
          ?
        </div>
      );
    }

    const suitSymbol = 
      card.suit === 'hearts' ? '♥' : 
      card.suit === 'diamonds' ? '♦' : 
      card.suit === 'clubs' ? '♣' : '♠';
    const color = (card.suit === 'hearts' || card.suit === 'diamonds') ? '#e74c3c' : '#2c3e50';
    
    return (
      <div key={key} style={{ 
        border: '2px solid #000', 
        padding: '15px 20px', 
        borderRadius: '8px', 
        background: 'white',
        fontSize: '32px',
        color: color,
        minWidth: '60px',
        textAlign: 'center',
        boxShadow: '2px 2px 5px rgba(0,0,0,0.3)'
      }}>
        {card.rank}{suitSymbol}
      </div>
    );
  };

  const getResultColor = (result: string): string => {
    switch (result) {
      case 'blackjack': return '#2ecc71';
      case 'playerWin': return '#3498db';
      case 'push': return '#f39c12';
      case 'dealerWin': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getResultText = (result: string): string => {
    switch (result) {
      case 'blackjack': return '🎉 BLACKJACK!';
      case 'playerWin': return '✅ Вы выиграли!';
      case 'push': return '🤝 Ничья (Push)';
      case 'dealerWin': return '❌ Дилер выиграл';
      default: return 'Игра окончена';
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial', 
      maxWidth: '800px', 
      margin: '0 auto',
      background: '#1a1a2e',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1 style={{ textAlign: 'center', fontSize: '48px', margin: '20px 0' }}>
        🃏 Blackjack
      </h1>
      
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        background: '#16213e', 
        borderRadius: '10px',
        textAlign: 'center',
        fontSize: '24px'
      }}>
         Баланс: <strong>${balance}</strong>
      </div>

      {!game ? (
        <div style={{ textAlign: 'center' }}>
          <input
            type="number"
            value={bet}
            onChange={(e) => setBet(Number(e.target.value))}
            min="1"
            max={balance}
            style={{ 
              marginRight: '10px', 
              padding: '15px', 
              fontSize: '20px',
              borderRadius: '5px',
              border: 'none',
              width: '150px'
            }}
          />
          <button 
            onClick={startGame} 
            style={{ 
              padding: '15px 30px', 
              fontSize: '20px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Начать игру
          </button>
        </div>
      ) : (
        <div>
          {/* Карты дилера */}
          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <h2 style={{ color: '#a0a0a0' }}>Дилер {state?.state === 'playerTurn' ? '(скрытая карта)' : ''}:</h2>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', fontSize: '32px' }}>
              {state?.state === 'playerTurn' ? (
                <>
                  {renderCard(state.dealerVisibleCard, 0)}
                  {renderCard({ rank: '?', suit: 'spades' } as any, 1, true)}
                </>
              ) : (
                state?.state === 'dealerTurn' || state?.state === 'gameOver'
                  ? state.dealerHand.map((card, idx) => renderCard(card, idx))
                  : null
              )}
            </div>
            {/* Очки дилера */}
            {(state?.state === 'dealerTurn' || state?.state === 'gameOver') && (
              <div style={{ 
                marginTop: '10px', 
                fontSize: '20px', 
                color: '#e94560',
                fontWeight: 'bold'
              }}>
                Очки дилера: {getDealerScore()}
              </div>
            )}
          </div>

          {/* Карты игрока */}
          <div style={{ marginBottom: '10px', textAlign: 'center' }}>
            <h2 style={{ color: '#a0a0a0' }}>Ваши карты:</h2>
            {state?.state === 'playerTurn' && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {state.playerHands[state.currentHandIndex].map((card, idx) => 
                  renderCard(card, idx)
                )}
              </div>
            )}
            {state?.state === 'gameOver' && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {state.playerHands.flat().map((card, idx) => 
                  renderCard(card, idx)
                )}
              </div>
            )}
          </div>

          {/* Очки игрока */}
          {state?.state === 'playerTurn' && (
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '20px',
              padding: '10px',
              background: '#0f3460',
              borderRadius: '10px',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              Ваши очки: <span style={{ color: '#e94560' }}>{getPlayerScore()}</span>
              {getPlayerScore() > 21 && <span style={{ color: '#e74c3c', marginLeft: '10px' }}>— ПЕРЕБОР!</span>}
              {getPlayerScore() === 21 && <span style={{ color: '#2ecc71', marginLeft: '10px' }}>— 21!</span>}
            </div>
          )}

          {/* Сообщение */}
          <div style={{ 
            marginBottom: '20px', 
            padding: '15px', 
            background: '#fff3cd', 
            borderRadius: '10px',
            textAlign: 'center',
            color: '#856404',
            fontSize: '20px',
            fontWeight: 'bold'
          }}>
            {message}
          </div>

          {/* Кнопки действий */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {state?.state === 'playerTurn' && (
              <>
                <button onClick={handleHit} style={buttonStyle}>Hit</button>
                <button onClick={handleStand} style={buttonStyle}>Stand</button>
                {state.playerHands[state.currentHandIndex].length === 2 && (
                  <>
                    <button onClick={handleDouble} style={buttonStyle}>Double</button>
                    {state.playerHands[state.currentHandIndex][0].rank === 
                     state.playerHands[state.currentHandIndex][1].rank && (
                      <button onClick={handleSplit} style={buttonStyle}>Split</button>
                    )}
                  </>
                )}
                {state.insuranceAvailable && state.insuranceBet === 0 && (
                  <button onClick={handleInsurance} style={buttonStyle}>Insurance</button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно результата */}
      {showResultModal && lastResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#16213e',
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center',
            maxWidth: '400px',
            border: `3px solid ${getResultColor(lastResult.result)}`
          }}>
            <div style={{ 
              fontSize: '48px', 
              marginBottom: '20px',
              color: getResultColor(lastResult.result)
            }}>
              {getResultText(lastResult.result)}
            </div>
            
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>
              Выплата: <strong style={{ color: '#2ecc71' }}>${lastResult.payout}</strong>
            </div>
            
            <div style={{ fontSize: '20px', marginBottom: '30px', color: '#a0a0a0' }}>
              Новый баланс: <strong>${lastResult.balance}</strong>
            </div>
            
            <button 
              onClick={() => setShowResultModal(false)}
              style={{
                padding: '15px 40px',
                fontSize: '20px',
                background: '#e94560',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '15px 30px',
  fontSize: '18px',
  background: '#0f3460',
  color: 'white',
  border: '2px solid #e94560',
  borderRadius: '8px',
  cursor: 'pointer',
  minWidth: '120px'
};

export default App;