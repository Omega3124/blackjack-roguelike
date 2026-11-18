import { useState, useEffect } from 'react';
import { BlackjackGame } from '../../src/core/game';
import { RunManager, createRunManager } from '../../src/roguelike/run';
import { getRandomPerks, type Perk } from '../../src/roguelike/perks';
import { calculateHandScore } from '../../src/core/hand';
import { GameTable } from './components/GameTable';
import { TarotCard } from './components/TarotCard';

type Screen = 'main' | 'playing' | 'results';

interface GameResult {
  result: string;
  payout: number;
  totalStake: number;
  playerScore: number;
  dealerScore: number;
}

function App() {
  // ========== СОСТОЯНИЯ ЭКРАНОВ ==========
  const [screen, setScreen] = useState<Screen>('main');
  const [lastResult, setLastResult] = useState<GameResult | null>(null);

  // ========== ИГРОВАЯ ЛОГИКА ==========
  const [game, setGame] = useState<BlackjackGame | null>(null);
  const [runManager] = useState(() => createRunManager());
  const [message, setMessage] = useState('Начните новый забег!');
  const [, forceUpdate] = useState(0);
  const [showPerkSelection, setShowPerkSelection] = useState(false);
  const [availablePerks, setAvailablePerks] = useState<Perk[]>([]);
  const [currentBet, setCurrentBet] = useState<number>(10);
  const [isDealerPlaying, setIsDealerPlaying] = useState(false);

  // ========== НАСТРОЙКИ ВЫХОДА ==========
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutChoice, setLogoutChoice] = useState<boolean>(true);
  const [username] = useState<string | null>(() => localStorage.getItem('username'));

  const [showLogoutWarning, setShowLogoutWarning] = useState<boolean>(() => {
    const saved = localStorage.getItem('showLogoutWarning');
    return saved !== 'false'; // по умолчанию true
  });

  const saveLogoutSetting = (value: boolean) => {
    setShowLogoutWarning(value);
    localStorage.setItem('showLogoutWarning', String(value));
  };

  const handleLogout = () => {
    const currentFloor = runManager.getCurrentFloor();

    // Если этаж <= 1 ИЛИ пользователь отключил предупреждение — выходим сразу
    if (currentFloor <= 1 || !showLogoutWarning) {
      performLogout();
      return;
    }

    setShowLogoutConfirm(true);
    setLogoutChoice(true);
  };

  const performLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    window.location.reload();
  };

  const confirmLogout = () => {
    if (!logoutChoice) {
      saveLogoutSetting(false);
    }
    setShowLogoutConfirm(false);
    performLogout();
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

    // Если сразу blackjack — показываем результаты
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
  const handleAction = (action: 'hit' | 'stand' | 'double' | 'split' | 'insurance') => {
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
        showGameResults(game, state);
      } else if (state.state === 'dealerTurn') {
        // ✅ Анимация хода дилера
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

  // ✅ Пошаговый ход дилера с задержкой
  const dealerPlayStep = (currentGame: BlackjackGame) => {
    const state = currentGame.getState();

    if (state.state === 'gameOver') {
      showGameResults(currentGame, state);
      return;
    }

    if (state.state === 'dealerTurn') {
      currentGame.stand(); // дилер берёт карту

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

  // ✅ Показ экрана результатов (НЕ переходим на главный экран!)
  const showGameResults = (currentGame: BlackjackGame, state: any) => {
    const payout = currentGame.getPayout();
    const totalStake = currentGame.getTotalStake();
    const hpChange = payout - totalStake;
    const hpBefore = runManager.getHp();
    runManager.updateHp(hpChange);
    const hpAfter = runManager.getHp();

    const playerScore = calculateHandScore(state.playerHands[0]).total;
    const dealerScore = calculateHandScore(state.dealerHand).total;

    setLastResult({
      result: state.result,
      payout,
      totalStake,
      playerScore,
      dealerScore,
    });

    setIsDealerPlaying(false);
    setGame(null);
    setScreen('results'); // ✅ Показываем экран результатов
    forceUpdate(n => n + 1);
  };

  // ✅ Переход после экрана результатов (advanceFloor ТОЛЬКО здесь)
  const continueAfterGame = () => {
    if (!runManager.isRunActive() || runManager.getHp() <= 0) {
      setScreen('main');
      return;
    }

    const currentFloor = runManager.getCurrentFloor();
    const maxFloors = runManager.getState().maxFloors;

    // ✅ ПРАВИЛЬНЫЙ ПОРЯДОК: сначала проверяем, потом advanceFloor
    if (currentFloor >= maxFloors) {
      runManager.advanceFloor(); // установит status = 'completed'
      setMessage('Забег завершён! Поздравляем!');
      setScreen('main');
    } else {
      runManager.advanceFloor();
      setMessage(`Этаж ${runManager.getCurrentFloor()}! Выберите перк.`);
      setAvailablePerks(getRandomPerks(3));
      setShowPerkSelection(true);
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

  // Подсчёт очков для отображения
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

  // ========== ЭКРАН РЕЗУЛЬТАТОВ ИГРЫ ==========
  if (screen === 'results' && lastResult) {
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
            {lastResult.result === 'blackjack' && '🎉 BLACKJACK!'}
            {lastResult.result === 'playerWin' && '✅ Победа!'}
            {lastResult.result === 'push' && '🤝 Ничья'}
            {lastResult.result === 'dealerWin' && '❌ Проигрыш'}
          </h1>

          <div style={{ marginBottom: '30px', fontSize: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ color: '#a0a0a0', marginBottom: '5px' }}>Ваш счёт:</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' }}>
                {lastResult.playerScore}
              </div>
            </div>
            <div>
              <div style={{ color: '#a0a0a0', marginBottom: '5px' }}>Счёт дилера:</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#e74c3c' }}>
                {lastResult.dealerScore}
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
      {/* Основной контент */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto'
      }}>
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

        {/* Главный экран — выбор ставки или новый забег */}
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
                  {state?.state === 'playerTurn'
                    ? `${getDealerVisibleScore()} + ?`   // ✅ было "10?", стало "10 + ?"
                    : getDealerVisibleScore()}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#a0a0a0', marginBottom: '5px' }}>Игрок:</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4CAF50' }}>
                  {getPlayerScore()}
                </div>
              </div>
            </div>

            {/* ✅ GameTable рендерится ОДИН раз */}
            <GameTable
              state={state}
              deckRemaining={52}
            />

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
                </>
              )}
            </div>
          </div>
        )}

        {/* Выбор перка */}
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
                  <TarotCard
                    key={perk.id}
                    perk={perk}
                    onClick={() => selectPerk(perk)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Кнопка выхода внизу */}
      <div style={{
        padding: '20px',
        textAlign: 'center',
        borderTop: '2px solid #16213e'
      }}>
        <button
          onClick={handleLogout}
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

      {/* ✅ Модалка подтверждения выхода с checkbox */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                fontSize: '16px'
              }}>
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