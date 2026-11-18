import { useState, useEffect } from 'react';
import { BlackjackGame } from '@core/game';
import { RunManager, createRunManager } from '@roguelike/run';
import { getRandomPerks, type Perk } from '@roguelike/perks';
import { Login } from './components/Login';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [userId, setUserId] = useState<number | null>(() => {
    const saved = localStorage.getItem('userId');
    return saved ? Number(saved) : null;
  });
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('username'));

  const handleLogin = (newToken: string, newUserId: number, newUsername: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('userId', String(newUserId));
    localStorage.setItem('username', newUsername);
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    window.location.reload();
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Состояние игры
  const [game, setGame] = useState<BlackjackGame | null>(null);
  const [runManager] = useState(() => createRunManager());
  const [message, setMessage] = useState('Забег начат! Выберите ставку HP.');
  const [, forceUpdate] = useState(0);
  const [showPerkSelection, setShowPerkSelection] = useState(false);
  const [availablePerks, setAvailablePerks] = useState<Perk[]>([]);
  const [currentBet, setCurrentBet] = useState<number>(10);

  // Функции рана
  const startNewRun = () => {
    runManager.startNewRun();
    setMessage('Забег начат! Выберите ставку HP.');
    forceUpdate(n => n + 1);
  };

  const startGame = (bet: number) => {
    const hp = runManager.getHp();
    const maxHp = runManager.getMaxHp();

    if (bet <= 0 || bet > hp) {
      setMessage('Некорректная ставка');
      return;
    }

    setCurrentBet(bet);

    const newGame = new BlackjackGame(`game-${Date.now()}`);
    newGame.startGame(bet, hp);
    newGame.deal();

    const state = newGame.getState();
    if (state.state === 'gameOver') {
      const payout = newGame.getPayout();
      const totalStake = newGame.getTotalStake();
      const hpChange = payout - totalStake;
      runManager.updateHp(hpChange);
      setMessage(`Игра окончена: ${state.result}. HP: ${runManager.getHp()}/${runManager.getMaxHp()}`);
      setGame(null);
      saveGameSession(state.result, hp, runManager.getHp(), bet, 1);
      return;
    }

    newGame.playerTurn();
    setGame(newGame);
    setMessage('Ваш ход!');
    forceUpdate(n => n + 1);
  };

  // Сохранение на серв
  const saveGameSession = async (
    result: string,
    hpBefore: number,
    hpAfter: number,
    bet: number,
    floor: number
  ) => {
    try {
      await fetch('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bet,
          hpBefore,
          hpAfter,
          result,
          floor,
          runId: null
        })
      });
    } catch (err) {
      console.error('Не удалось сохранить игру:', err);
    }
  };

  // Действия юзера
  const handleAction = async (action: 'hit' | 'stand' | 'double' | 'split' | 'insurance') => {
    if (!game) return;

    try {
      switch (action) {
        case 'hit': game.hit(); break;
        case 'stand': game.stand(); break;
        case 'double': game.double(); break;
        case 'split': game.split(); break;
        case 'insurance': game.insurance(); break;
      }

      const state = game.getState();
      if (state.state === 'gameOver') {
        const payout = game.getPayout();
        const totalStake = game.getTotalStake();
        const hpChange = payout - totalStake;
        const hpBefore = runManager.getHp();

        runManager.updateHp(hpChange);
        const hpAfter = runManager.getHp();

        setMessage(`Игра окончена: ${state.result}. HP: ${hpAfter}/${runManager.getMaxHp()}`);
        setGame(null);

        await saveGameSession(
          state.result,
          hpBefore,
          hpAfter,
          currentBet,
          runManager.getCurrentFloor()
        );

        if (runManager.isRunActive() && hpAfter > 0) {
          runManager.advanceFloor();
          if (runManager.getCurrentFloor() > runManager.getState().maxFloors) {
            setMessage('Забег завершён! Поздравляем!');
          } else {
            setMessage(`Этаж ${runManager.getCurrentFloor()}! Выберите перк.`);
            setAvailablePerks(getRandomPerks(3));
            setShowPerkSelection(true);
          }
        }
      } else {
        setMessage('Ваш ход!');
        forceUpdate(n => n + 1);
      }
    } catch (e) {
      setMessage(`Ошибка: ${(e as Error).message}`);
    }
  };

  // Выбор перка
  const selectPerk = (perk: Perk) => {
    runManager.addPerk(perk.id);
    setShowPerkSelection(false);
    setMessage(`Перк "${perk.name}" добавлен! Начните следующую игру.`);
    forceUpdate(n => n + 1);
  };

  // Рендер
  const state = game?.getState();
  const runState = runManager.getState();

  const renderCard = (card: { rank: string; suit: string }, key: number) => {
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

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial',
      maxWidth: '800px',
      margin: '0 auto',
      background: '#1a1a2e',
      minHeight: '100vh',
      color: 'white',
      position: 'relative'
    }}>
      {/* Кнопка выхода */}
      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          background: '#e74c3c',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Выйти ({username})
      </button>

      <h1 style={{ textAlign: 'center', fontSize: '48px', margin: '20px 0' }}>
        🃏 Blackjack Roguelike
      </h1>

      {/* Статус забега */}
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        background: '#16213e',
        borderRadius: '10px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>
          ❤️ HP: <strong>{runState.hp}/{runState.maxHp}</strong>
        </div>
        <div style={{ fontSize: '18px', color: '#a0a0a0' }}>
          Этаж: {runState.currentFloor}/{runState.maxFloors} |
          Игр: {runState.gamesPlayed} |
          Побед: {runState.gamesWon}
        </div>
        {runState.perks.length > 0 && (
          <div style={{ fontSize: '16px', marginTop: '10px', color: '#f39c12' }}>
            Перки: {runState.perks.join(', ')}
          </div>
        )}
      </div>

      {!runManager.isRunActive() ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '20px' }}>
            {runState.status === 'completed' ? '🎉 Забег завершён!' : '💀 Забег провален'}
          </div>
          <button
            onClick={startNewRun}
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
            Новый забег
          </button>
        </div>
      ) : !game ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '20px' }}>
            <button onClick={() => startGame(5)} style={buttonStyle}>Ставка 5 HP</button>
            <button onClick={() => startGame(10)} style={buttonStyle}>Ставка 10 HP</button>
            <button onClick={() => startGame(20)} style={buttonStyle}>Ставка 20 HP</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <h2 style={{ color: '#a0a0a0' }}>Дилер:</h2>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {state?.state === 'playerTurn' && renderCard(state.dealerVisibleCard, 0)}
              {(state?.state === 'dealerTurn' || state?.state === 'gameOver') &&
                state.dealerHand.map((card, idx) => renderCard(card, idx))}
            </div>
          </div>

          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <h2 style={{ color: '#a0a0a0' }}>Ваши карты:</h2>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {state?.state === 'playerTurn' &&
                state.playerHands[state.currentHandIndex].map((card, idx) => renderCard(card, idx))}
              {state?.state === 'gameOver' &&
                state.playerHands.flat().map((card, idx) => renderCard(card, idx))}
            </div>
          </div>

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

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {state?.state === 'playerTurn' && (
              <>
                <button onClick={() => handleAction('hit')} style={buttonStyle}>Hit</button>
                <button onClick={() => handleAction('stand')} style={buttonStyle}>Stand</button>
                {state.playerHands[state.currentHandIndex].length === 2 && (
                  <>
                    <button onClick={() => handleAction('double')} style={buttonStyle}>Double</button>
                    {state.playerHands[state.currentHandIndex][0].rank ===
                     state.playerHands[state.currentHandIndex][1].rank && (
                      <button onClick={() => handleAction('split')} style={buttonStyle}>Split</button>
                    )}
                  </>
                )}
                {state.insuranceAvailable && state.insuranceBet === 0 && (
                  <button onClick={() => handleAction('insurance')} style={buttonStyle}>Insurance</button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showPerkSelection && (
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
            maxWidth: '600px'
          }}>
            <h2 style={{ marginBottom: '20px' }}>Выберите карту таро:</h2>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              {availablePerks.map(perk => (
                <div
                  key={perk.id}
                  onClick={() => selectPerk(perk)}
                  style={{
                    padding: '20px',
                    background: '#0f3460',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    border: '2px solid #e94560',
                    minWidth: '150px'
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>{perk.icon}</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>{perk.name}</div>
                  <div style={{ fontSize: '14px', color: '#a0a0a0' }}>{perk.description}</div>
                </div>
              ))}
            </div>
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