import { useState } from 'react';
import { BlackjackGame } from '../../src/core/game';
import { RunManager, createRunManager } from '../../src/roguelike/run';
import { getRandomPerks, type Perk } from '../../src/roguelike/perks';
import { calculateHandScore } from '../../src/core/hand';
import { GameTable } from './components/GameTable';
import { TarotCard } from './components/TarotCard';
import { Login } from './components/Login';

type Screen = 'main' | 'playing' | 'results';

interface GameResult {
  result: string;
  payout: number;
  totalStake: number;
  playerScore: number;
  dealerScore: number;
  playerBust?: boolean;
  dealerBust?: boolean;
}

// ============================================================
// AUTH GATE
// ============================================================
function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const handleLogin = (newToken: string, newUserId: number, newUsername: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('userId', String(newUserId));
    localStorage.setItem('username', newUsername);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    setToken(null);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return <Game key={token} onLogout={handleLogout} />;
}

// ============================================================
// GAME
// ============================================================
function Game({ onLogout }: { onLogout: () => void }) {
  const [screen, setScreen] = useState<Screen>('main');
  const [lastResult, setLastResult] = useState<GameResult | null>(null);

  const [game, setGame] = useState<BlackjackGame | null>(null);
  const [runManager] = useState(() => createRunManager());
  const [message, setMessage] = useState('Начните новый забег!');
  const [, forceUpdate] = useState(0);
  const [showPerkSelection, setShowPerkSelection] = useState(false);
  const [availablePerks, setAvailablePerks] = useState<Perk[]>([]);
  const [currentBet, setCurrentBet] = useState<number>(10);
  const [isDealerPlaying, setIsDealerPlaying] = useState(false);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutChoice, setLogoutChoice] = useState<boolean>(true);
  const [username] = useState<string | null>(() => localStorage.getItem('username'));
  const [showLogoutWarning, setShowLogoutWarning] = useState<boolean>(() => {
    const saved = localStorage.getItem('showLogoutWarning');
    return saved !== 'false';
  });

  const saveLogoutSetting = (value: boolean) => {
    setShowLogoutWarning(value);
    localStorage.setItem('showLogoutWarning', String(value));
  };

  const handleLogoutClick = () => {
    const currentFloor = runManager.getCurrentFloor();
    if (currentFloor <= 1 || !showLogoutWarning) {
      onLogout();
      return;
    }
    setShowLogoutConfirm(true);
    setLogoutChoice(true);
  };

  const confirmLogout = () => {
    if (!logoutChoice) {
      saveLogoutSetting(false);
    }
    setShowLogoutConfirm(false);
    onLogout();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // ========== УПРАВЛЕНИЕ ЗАБЕГОМ ==========
  const startNewRun = () => {
    runManager.startNewRun();
    setMessage('Забег начат! Выберите ставку HP.');
    forceUpdate(n => n + 1);
  };

  const startGame = (bet: number) => {
    const hp = runManager.getHp();
    if (bet <= 0 || bet > hp) {
      setMessage('Некорректная ставка');
      return;
    }
    setCurrentBet(bet);
    const newGame = new BlackjackGame(`game-${Date.now()}`);
    // ✅ Передаём перки в игру
    newGame.startGame(bet, hp, runManager.getPerks());
    newGame.deal();
    const state = newGame.getState();

    if (state.state === 'gameOver') {
      showGameResults(newGame, state);
      return;
    }

    newGame.playerTurn();
    setGame(newGame);
    setScreen('playing');
    setMessage('Ваш ход!');
    forceUpdate(n => n + 1);
  };

  // ========== ДЕЙСТВИЯ ИГРОКА ==========
  const handleAction = (action: 'hit' | 'stand' | 'double' | 'split' | 'insurance' | 'reroll') => {
    if (!game) return;
    try {
      if (action === 'reroll') {
        const success = game.reroll();
        if (success) {
          runManager.usePerk('death');
          setMessage('💀 Карты пересданы! (Перк "Смерть" использован)');
          forceUpdate(n => n + 1);
        } else {
          setMessage('Ошибка: невозможно пересдать карты');
        }
        return;
      }

      switch (action) {
        case 'hit': game.hit(); break;
        case 'stand': game.stand(); break;
        case 'double': game.double(); break;
        case 'split': game.split(); break;
        case 'insurance': game.insurance(); break;
      }

      const state = game.getState();

      if (state.state === 'gameOver') {
        showGameResults(game, state);
      } else if (state.state === 'dealerTurn') {
        setIsDealerPlaying(true);
        setMessage('Ход дилера...');
        forceUpdate(n => n + 1);
        setTimeout(() => {
          dealerPlayStep(game);
        }, 800);
      } else {
        setMessage('Ваш ход!');
        forceUpdate(n => n + 1);
      }
    } catch (e) {
      setMessage(`Ошибка: ${(e as Error).message}`);
    }
  };

  const dealerPlayStep = (currentGame: BlackjackGame) => {
    const state = currentGame.getState();
    if (state.state === 'gameOver') {
      showGameResults(currentGame, state);
      return;
    }
    if (state.state === 'dealerTurn') {
      currentGame.stand();
      const newState = currentGame.getState();
      if (newState.state === 'gameOver') {
        setTimeout(() => {
          showGameResults(currentGame, newState);
        }, 800);
      } else {
        setTimeout(() => {
          dealerPlayStep(currentGame);
        }, 800);
      }
    }
  };

  const showGameResults = (currentGame: BlackjackGame, state: any) => {
    const payout = currentGame.getPayout();
    const totalStake = currentGame.getTotalStake();
    let hpChange = payout - totalStake;

    // ✅ Считаем очки по всем рукам (фикс BUST при сплите)
    const playerScores = state.playerHands.map((h: any[]) => calculateHandScore(h).total);
    const dealerScore = calculateHandScore(state.dealerHand).total;
    const allBust = playerScores.every((s: number) => s > 21);
    const dealerBust = dealerScore > 21;

    // ☀️ SUN: если проиграл и перк активен — HP не теряется
    if (
      hpChange < 0 &&
      currentGame.hasPerk('the_sun') &&
      !runManager.isPerkUsed('the_sun')
    ) {
      runManager.usePerk('the_sun');
      hpChange = 0;
      setMessage('☀️ Солнце спасло вас! HP не потеряно.');
    }

    // ⚖️ JUSTICE: при ничьей +2 HP к макс. HP
    if (state.result === 'push' && currentGame.hasPerk('justice')) {
      runManager.increaseMaxHp(2);
      hpChange += 2;
    }

    runManager.updateHp(hpChange);

    setLastResult({
      result: state.result,
      payout,
      totalStake,
      playerScore: playerScores[0],
      dealerScore,
      playerBust: allBust,
      dealerBust,
    });

    setIsDealerPlaying(false);
    setGame(null);
    setScreen('results');
    forceUpdate(n => n + 1);
  };

  const continueAfterGame = () => {
    if (!runManager.isRunActive() || runManager.getHp() <= 0) {
      setScreen('main');
      return;
    }

    const currentFloor = runManager.getCurrentFloor();
    const maxFloors = runManager.getState().maxFloors;

    if (currentFloor >= maxFloors) {
      runManager.getState().status = 'completed';
      setMessage('Забег завершён! Поздравляем!');
      setScreen('main');
    } else {
      runManager.advanceFloor();
      const newFloor = runManager.getCurrentFloor();

      // ✅ Таро реже: только на чётных этажах (2, 4)
      if (newFloor % 2 === 0) {
        setMessage(`Этаж ${newFloor}! Выберите перк.`);
        setAvailablePerks(getRandomPerks(3));
        setShowPerkSelection(true);
      } else {
        setMessage(`Этаж ${newFloor}! Начинайте игру.`);
      }
      setScreen('main');
    }
  };

  const selectPerk = (perk: Perk) => {
    runManager.addPerk(perk.id);
    setShowPerkSelection(false);
    setMessage(`Перк "${perk.name}" добавлен! Начните следующую игру.`);
    forceUpdate(n => n + 1);
  };

  // ========== РЕНДЕР ==========
  const state = game?.getState();
  const runState = runManager.getState();

  const getPlayerScore = () => {
    if (!state || state.state !== 'playerTurn') return 0;
    const currentHand = state.playerHands[state.currentHandIndex];
    return calculateHandScore(currentHand).total;
  };

  const getDealerVisibleScore = () => {
    if (!state) return 0;
    if (state.state === 'playerTurn') {
      const card = state.dealerVisibleCard;
      if (card.rank === 'A') return 11;
      if (['K', 'Q', 'J'].includes(card.rank)) return 10;
      return parseInt(card.rank);
    }
    if (state.state === 'dealerTurn' || state.state === 'gameOver') {
      return calculateHandScore(state.dealerHand).total;
    }
    return 0;
  };

  // ✅ Счётчик карт в колоде
  const cardsOnTable = state
    ? state.state === 'playerTurn'
      ? state.playerHands.flat().length + state.dealerHand.length
      : state.state === 'dealerTurn' || state.state === 'gameOver'
      ? state.playerHands.flat().length + state.dealerHand.length
      : 0
    : 0;
  const deckRemaining = Math.max(0, 52 - cardsOnTable);

  // ========== ЭКРАН РЕЗУЛЬТАТОВ ==========
  if (screen === 'results' && lastResult) {
    const isBust = lastResult.playerBust;
    const resultTitle = isBust
      ? '💥 BUST!'
      : lastResult.result === 'blackjack'
      ? '🎉 BLACKJACK!'
      : lastResult.result === 'playerWin'
      ? '✅ Победа!'
      : lastResult.result === 'push'
      ? '🤝 Ничья'
      : '❌ Проигрыш';

    return (
      <div style={{
        padding: '20px',
        fontFamily: 'Arial',
        maxWidth: '800px',
        margin: '0 auto',
        background: '#1a1a2e',
        minHeight: '100vh',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: '#16213e',
          padding: '40px',
          borderRadius: '20px',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%'
        }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
            {resultTitle}
          </h1>

          <div style={{ marginBottom: '30px', fontSize: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ color: '#a0a0a0', marginBottom: '5px' }}>Ваш счёт:</div>
              <div style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: isBust ? '#e74c3c' : '#4CAF50'
              }}>
                {lastResult.playerScore}
                {isBust && ' (перебор)'}
              </div>
            </div>
            <div>
              <div style={{ color: '#a0a0a0', marginBottom: '5px' }}>Счёт дилера:</div>
              <div style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: isBust ? '#555' : '#e74c3c'
              }}>
                {lastResult.dealerScore}
                {isBust && ' (не важно)'}
              </div>
            </div>
          </div>

          <div style={{
            background: '#0f3460',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '30px'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>
              Ставка: {lastResult.totalStake} HP
            </div>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>
              Выплата: {lastResult.payout} HP
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: lastResult.payout >= lastResult.totalStake ? '#4CAF50' : '#e74c3c'
            }}>
              Изменение HP: {lastResult.payout - lastResult.totalStake >= 0 ? '+' : ''}
              {lastResult.payout - lastResult.totalStake}
            </div>
          </div>

          <div style={{ fontSize: '20px', marginBottom: '30px' }}>
            HP: {runState.hp}/{runState.maxHp}
          </div>

          <button
            onClick={continueAfterGame}
            style={{
              padding: '15px 40px',
              fontSize: '20px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Продолжить
          </button>
        </div>
      </div>
    );
  }

  // ========== ГЛАВНЫЙ ЭКРАН / ИГРА ==========
  return (
    <div style={{
      width: '800px',
      height: '100vh',
      margin: '0 auto',
      background: '#1a1a2e',
      color: 'white',
      fontFamily: 'Arial',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
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
            Этаж: {Math.min(runState.currentFloor, runState.maxFloors)}/{runState.maxFloors} |
            Игр: {runState.gamesPlayed} |
            Побед: {runState.gamesWon}
          </div>
          {runState.perks.length > 0 && (
            <div style={{ fontSize: '16px', marginTop: '10px', color: '#f39c12' }}>
              Перки: {runState.perks.join(', ')}
            </div>
          )}
          {runState.usedPerks && runState.usedPerks.length > 0 && (
            <div style={{ fontSize: '14px', marginTop: '5px', color: '#95a5a6' }}>
              Использованы: {runState.usedPerks.join(', ')}
            </div>
          )}
        </div>

        {/* Новый забег / конец забега */}
        {screen === 'main' && !runManager.isRunActive() && (
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
        )}

        {/* Выбор ставки */}
        {screen === 'main' && runManager.isRunActive() && !game && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '20px' }}>
              <button onClick={() => startGame(5)} style={buttonStyle}>Ставка 5 HP</button>
              <button onClick={() => startGame(10)} style={buttonStyle}>Ставка 10 HP</button>
              <button onClick={() => startGame(20)} style={buttonStyle}>Ставка 20 HP</button>
            </div>
          </div>
        )}

        {/* Игровой экран */}
        {screen === 'playing' && game && state && (
          <div>
            {/* Счёт игрока и дилера */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginBottom: '20px',
              padding: '15px',
              background: '#16213e',
              borderRadius: '10px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#a0a0a0', marginBottom: '5px' }}>Дилер:</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#e74c3c' }}>
                  {state.state === 'playerTurn'
                    ? `${getDealerVisibleScore()} + ?`
                    : getDealerVisibleScore()}
                </div>
                {/* 🗼 БЕЙДЖ БАШНИ */}
                {game.isTowerApplied() && (
                  <div style={{ fontSize: '13px', color: '#f39c12', marginTop: '4px' }}>
                    🗼 Башня сработала
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#a0a0a0', marginBottom: '5px' }}>Игрок:</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4CAF50' }}>
                  {getPlayerScore()}
                </div>
              </div>
            </div>

            <GameTable state={state} deckRemaining={deckRemaining} />

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
              {state.state === 'playerTurn' && !isDealerPlaying && (
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
                  {/* 💀 Кнопка пересдачи (Death) */}
                  {game.hasPerk('death') && !runManager.isPerkUsed('death') && (
                    <button
                      onClick={() => handleAction('reroll')}
                      style={{...buttonStyle, background: '#9b59b6', borderColor: '#8e44ad'}}
                    >
                      💀 Пересдать
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Выбор перка */}
        {showPerkSelection && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
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
                  <TarotCard key={perk.id} perk={perk} onClick={() => selectPerk(perk)} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Кнопка выхода */}
      <div style={{ padding: '20px', textAlign: 'center', borderTop: '2px solid #16213e' }}>
        <button
          onClick={handleLogoutClick}
          style={{
            padding: '12px 30px',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          Выйти ({username})
        </button>
      </div>

      {/* Модалка подтверждения выхода */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: '#16213e',
            padding: '40px',
            borderRadius: '15px',
            textAlign: 'center',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#e74c3c' }}>⚠️ Подтверждение выхода</h2>
            <p style={{ fontSize: '18px', marginBottom: '25px', lineHeight: '1.6' }}>
              Вы находитесь на этаже <strong>{runManager.getCurrentFloor()}</strong>.<br/>
              <strong>Прогресс текущего забега не будет сохранён!</strong><br/>
              Вы уверены, что хотите выйти?
            </p>
            <div style={{
              background: '#0f3460',
              padding: '15px 20px',
              borderRadius: '10px',
              marginBottom: '25px',
              textAlign: 'left'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '16px' }}>
                <input
                  type="checkbox"
                  checked={logoutChoice}
                  onChange={(e) => setLogoutChoice(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span>Показывать это предупреждение в будущем</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button
                onClick={cancelLogout}
                style={{
                  padding: '12px 30px',
                  background: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Отмена
              </button>
              <button
                onClick={confirmLogout}
                style={{
                  padding: '12px 30px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Выйти
              </button>
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