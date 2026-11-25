import { useState, useEffect } from 'react';
import { BlackjackGame } from '../../src/core/game';
import { createRunManager } from '../../src/roguelike/run';
import { getRandomPerks, getRandomFoolEffect, type Perk } from '../../src/roguelike/perks';
import { calculateHandScore } from '../../src/core/hand';
import { GameTable } from './components/GameTable';
import { TarotCard } from './components/TarotCard';
import { Login } from './components/Login';

type Screen = 'main' | 'playing' | 'results';
type Modal = 'none' | 'stats' | 'rules';

interface GameResult {
  result: string;
  payout: number;
  totalStake: number;
  playerScore: number;
  dealerScore: number;
  playerBust?: boolean;
  dealerBust?: boolean;
}

interface Stats {
  games: any;
  runs: any;
  perks: any;
  cards: any;
}

// ============================================================
// AUTH GATE
// ============================================================
function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const handleLogin = (t: string, u: number, n: string) => {
    localStorage.setItem('token', t);
    localStorage.setItem('userId', String(u));
    localStorage.setItem('username', n);
    setToken(t);
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
  };

  if (!token) return <Login onLogin={handleLogin} />;
  return <Game key={token} token={token} onLogout={handleLogout} />;
}

// ============================================================
// GAME
// ============================================================
function Game({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [screen, setScreen] = useState<Screen>('main');
  const [modal, setModal] = useState<Modal>('none');
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const [game, setGame] = useState<BlackjackGame | null>(null);
  const [runManager] = useState(() => createRunManager());
  const [message, setMessage] = useState('Начните новый забег!');
  const [, forceUpdate] = useState(0);

  const [showPerkSelection, setShowPerkSelection] = useState(false);
  const [availablePerks, setAvailablePerks] = useState<Perk[]>([]);
  const [currentBet, setCurrentBet] = useState(10);
  const [isDealerPlaying, setIsDealerPlaying] = useState(false);

  const [showFoolModal, setShowFoolModal] = useState(false);
  const [foolEffect, setFoolEffect] = useState<any>(null);

  const [runId, setRunId] = useState<number | null>(null);
  const [username] = useState<string | null>(() => localStorage.getItem('username'));

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutChoice, setLogoutChoice] = useState(true);
  const [showLogoutWarning, setShowLogoutWarning] = useState(true);

  // ========== ЗАГРУЗКА НАСТРОЕК И ЗАБЕГА ПРИ СТАРТЕ ==========
  useEffect(() => {
    if (!token) return;

    // Загрузка настройки предупреждения
    fetch('http://localhost:3001/api/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setShowLogoutWarning(d.showLogoutWarning))
      .catch(() => {});

    // ✅ Загрузка активного забега
    fetch('http://localhost:3001/api/runs/active', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.status === 'active') {
          runManager.loadRun({
            runNumber: 1,
            currentFloor: data.current_floor,
            floorsPerLocation: 5,
            hp: data.hp,
            maxHp: data.max_hp,
            perks: data.perks || [],
            usedPerks: JSON.parse(data.used_perks || '[]'),
            gamesPlayed: data.games_played,
            gamesWon: data.games_won,
            status: data.status,
            foolEffectId: data.fool_effect_id || null,
            moonActive: data.moon_active === 1,
          });
          setRunId(data.id);
          setMessage(`Забег восстановлен! Этаж ${data.currentFloor}.`);
          forceUpdate(n => n + 1);
        }
      })
      .catch(() => {});
  }, [token]);

  const saveLogoutSetting = async (v: boolean) => {
    setShowLogoutWarning(v);
    try {
      await fetch('http://localhost:3001/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ showLogoutWarning: v })
      });
    } catch {}
  };

  const handleLogoutClick = () => {
    if (runManager.getCurrentFloor() <= 1 || !showLogoutWarning) return onLogout();
    setShowLogoutConfirm(true);
    setLogoutChoice(true);
  };

  const confirmLogout = () => {
    if (!logoutChoice) saveLogoutSetting(false);
    setShowLogoutConfirm(false);
    onLogout();
  };

  // ========== АВТОСОХРАНЕНИЕ ЗАБЕГА ==========
  const saveRunToDb = async () => {
    const rs = runManager.getState();
    const body = JSON.stringify({
      currentFloor: rs.currentFloor,
      maxFloors: 999,
      hp: rs.hp,
      maxHp: rs.maxHp,
      perks: rs.perks,
      usedPerks: rs.usedPerks,
      foolEffectId: rs.foolEffectId,
      moonActive: rs.moonActive,
      status: rs.status,
      gamesPlayed: rs.gamesPlayed,
      gamesWon: rs.gamesWon,
    });
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    try {
      if (runId) {
        await fetch(`http://localhost:3001/api/runs/${runId}`, { method: 'PUT', headers, body });
      } else {
        const r = await fetch('http://localhost:3001/api/runs', { method: 'POST', headers, body });
        if (r.ok) { const d = await r.json(); setRunId(d.id); }
      }
    } catch (e) { console.error('Не удалось сохранить забег:', e); }
  };

  const saveGameSession = async (result: string, hpB: number, hpA: number, bet: number, floor: number) => {
    try {
      await fetch('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bet, hpBefore: hpB, hpAfter: hpA, result, floor, runId })
      });
    } catch (e) { console.error(e); }
  };

  const loadStats = async () => {
    try {
      const r = await fetch('http://localhost:3001/api/stats/detailed', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { setStats(await r.json()); setModal('stats'); }
    } catch (e) { console.error(e); }
  };

  // ========== ЗАБЕГ ==========
  const startNewRun = async () => {
    runManager.startNewRun();
    setRunId(null);
    setCurrentBet(10);
    setMessage('Забег начат! Выберите ставку HP.');
    await saveRunToDb(); // ✅ Сохраняем новый забег
    forceUpdate(n => n + 1);
  };

  const startGame = (bet: number) => {
    const hp = runManager.getHp();
    if (bet <= 0 || bet > hp) return setMessage('Некорректная ставка');
    setCurrentBet(bet);
    const ng = new BlackjackGame(`game-${Date.now()}`);
    ng.setDealerDifficulty(runManager.getCurrentFloor());
    if (runManager.isMoonActive()) { ng.activateMoon(); runManager.setMoonActive(false); }
    const fid = runManager.getFoolEffect();
    if (fid) { ng.applyFoolEffect(fid); runManager.setFoolEffect(null); }
    ng.startGame(bet, hp, runManager.getPerks());
    ng.deal();
    const st = ng.getState();
    if (st.state === 'gameOver') return showGameResults(ng, st);
    ng.playerTurn();
    setGame(ng);
    setScreen('playing');
    setMessage('Ваш ход!');
    forceUpdate(n => n + 1);
  };

  // ========== ДЕЙСТВИЯ ==========
  const handleAction = (action: 'hit' | 'stand' | 'double' | 'split' | 'insurance' | 'reroll' | 'wheel') => {
    if (!game) return;
    try {
      if (action === 'reroll') {
        if (game.reroll()) {
          runManager.usePerk('death');
          setMessage('💀 Карты пересданы!');
          saveRunToDb(); // ✅ Сохраняем после использования перка
          forceUpdate(n => n + 1);
        } else setMessage('Ошибка: пересдача недоступна');
        return;
      }
      if (action === 'wheel') {
        if (game.wheel()) {
          runManager.usePerk('the_wheel');
          setMessage('🎡 Карты заменены!');
          saveRunToDb();
          forceUpdate(n => n + 1);
        } else setMessage('Ошибка: Колесо недоступно');
        return;
      }
      if (action === 'double') {
        const sc = getPlayerScore();
        if (sc >= 17 && !window.confirm(`Double на ${sc}? Рискованно!`)) return;
      }
      switch (action) {
        case 'hit': game.hit(); break;
        case 'stand': game.stand(); break;
        case 'double': game.double(); break;
        case 'split': game.split(); break;
        case 'insurance': game.insurance(); break;
      }
      const st = game.getState();
      if (st.state === 'gameOver') showGameResults(game, st);
      else if (st.state === 'dealerTurn') {
        setIsDealerPlaying(true);
        setMessage('Ход дилера...');
        forceUpdate(n => n + 1);
        setTimeout(() => dealerPlayStep(game), 800);
      } else {
        setMessage('Ваш ход!');
        forceUpdate(n => n + 1);
      }
    } catch (e) {
      setMessage(`Ошибка: ${(e as Error).message}`);
    }
  };

  const dealerPlayStep = (g: BlackjackGame) => {
    const st = g.getState();
    if (st.state === 'gameOver') return showGameResults(g, st);
    if (st.state === 'dealerTurn') {
      g.stand();
      const n = g.getState();
      if (n.state === 'gameOver') setTimeout(() => showGameResults(g, n), 800);
      else setTimeout(() => dealerPlayStep(g), 800);
    }
  };

  const showGameResults = async (g: BlackjackGame, st: any) => {
    const payout = g.getPayout(), totalStake = g.getTotalStake();
    let hpChange = payout - totalStake;
    const pScores = st.playerHands.map((h: any[]) => calculateHandScore(h).total);
    const dScore = calculateHandScore(st.dealerHand).total;
    const allBust = pScores.every((s: number) => s > 21);
    const dealerBust = dScore > 21;

    if (dealerBust && g.hasPerk('the_sun')) runManager.increaseMaxHp(5);
    if (st.result === 'dealerWin' && g.hasPerk('justice')) hpChange = Math.max(hpChange + 5, -5);
    if (hpChange < 0 && g.getFoolEffectId() === 'fool_free_bet') hpChange = 0;

    const hpBefore = runManager.getHp();
    runManager.updateHp(hpChange);

    await saveGameSession(st.result, hpBefore, runManager.getHp(), currentBet, runManager.getCurrentFloor());
    await saveRunToDb(); // ✅ Сохраняем после каждой игры

    setLastResult({
      result: st.result, payout, totalStake,
      playerScore: pScores[0], dealerScore: dScore,
      playerBust: allBust, dealerBust
    });
    setIsDealerPlaying(false);
    setGame(null);
    setScreen('results');
    forceUpdate(n => n + 1);
  };

  const continueAfterGame = async () => {
    if (!runManager.isRunActive() || runManager.getHp() <= 0) {
      await saveRunToDb();
      return setScreen('main');
    }
    runManager.advanceFloor();
    if (runManager.isNewLocation()) {
      runManager.onNewLocation();
      setMessage(`🏰 Локация ${runManager.getCurrentLocation()}! +10 HP, перки сброшены. Выберите карту таро.`);
      setAvailablePerks(getRandomPerks(3));
      setShowPerkSelection(true);
    } else {
      setMessage(`Этаж ${runManager.getCurrentFloor()}! Начинайте игру.`);
    }
    await saveRunToDb(); // ✅ Сохраняем после смены этажа
    setScreen('main');
  };

  const selectPerk = async (perk: Perk) => {
    if (perk.id === 'the_fool') {
      const e = getRandomFoolEffect();
      setFoolEffect(e);
      setShowFoolModal(true);
      runManager.setFoolEffect(e.id);
      runManager.addPerk(perk.id);
      setShowPerkSelection(false);
      setMessage(`🃏 Шут: ${e.name} (${e.description})`);
      await saveRunToDb(); // ✅ Сохраняем после выбора перка
      return forceUpdate(n => n + 1);
    }
    if (perk.id === 'the_moon') {
      runManager.setMoonActive(true);
      runManager.addPerk(perk.id);
      setShowPerkSelection(false);
      setMessage('🌙 Луна: следующая ставка ×2!');
      await saveRunToDb();
      return forceUpdate(n => n + 1);
    }
    runManager.addPerk(perk.id);
    setShowPerkSelection(false);
    setMessage(`Перк "${perk.name}" добавлен!`);
    await saveRunToDb();
    forceUpdate(n => n + 1);
  };

  // ========== РЕНДЕР ==========
  const st = game?.getState();
  const rs = runManager.getState();

  const getPlayerScore = () => {
    if (!st || st.state !== 'playerTurn') return 0;
    return calculateHandScore(st.playerHands[st.currentHandIndex]).total;
  };

   const getDealerVisibleScore = () => {
    if (!st) return 0;
    if (st.state === 'playerTurn') {
      const c = st.dealerVisibleCard;
      return c.rank === 'A' ? 11 : ['K', 'Q', 'J'].includes(c.rank) ? 10 : parseInt(c.rank);
    }
    if (st.state === 'dealerTurn' || st.state === 'gameOver') {
      return calculateHandScore(st.dealerHand).total;
    }
    return 0;
  };

  // ========== ЭКРАН РЕЗУЛЬТАТОВ ==========
  if (screen === 'results' && lastResult) {
    const isBust = lastResult.playerBust;
    const title = isBust ? '💥 BUST!' :
                  lastResult.result === 'blackjack' ? '🎉 BLACKJACK!' :
                  lastResult.result === 'playerWin' ? '✅ Победа!' :
                  lastResult.result === 'push' ? '🤝 Ничья' : '❌ Проигрыш';
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '800px', margin: '0 auto', background: '#1a1a2e', minHeight: '100vh', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#16213e', padding: '40px', borderRadius: '20px', textAlign: 'center', maxWidth: '500px', width: '100%' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>{title}</h1>
          <div style={{ marginBottom: '30px', fontSize: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ color: '#a0a0a0' }}>Ваш счёт:</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: isBust ? '#e74c3c' : '#4CAF50' }}>
                {lastResult.playerScore}{isBust && ' (перебор)'}
              </div>
            </div>
            <div>
              <div style={{ color: '#a0a0a0' }}>Счёт дилера:</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: isBust ? '#555' : '#e74c3c' }}>
                {lastResult.dealerScore}{isBust && ' (не важно)'}
              </div>
            </div>
          </div>
          <div style={{ background: '#0f3460', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>Ставка: {lastResult.totalStake} HP</div>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>Выплата: {lastResult.payout} HP</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: lastResult.payout >= lastResult.totalStake ? '#4CAF50' : '#e74c3c' }}>
              Изменение HP: {lastResult.payout - lastResult.totalStake >= 0 ? '+' : ''}{lastResult.payout - lastResult.totalStake}
            </div>
          </div>
          <div style={{ fontSize: '20px', marginBottom: '30px' }}>HP: {rs.hp}/{rs.maxHp}</div>
          <button onClick={continueAfterGame} style={{ padding: '15px 40px', fontSize: '20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Продолжить</button>
        </div>
      </div>
    );
  }

  // ========== ГЛАВНЫЙ / ИГРА ==========
  return (
    <div style={{ width: '800px', height: '100vh', margin: '0 auto', background: '#1a1a2e', color: 'white', fontFamily: 'Arial', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <h1 style={{ textAlign: 'center', fontSize: '36px', margin: '10px 0' }}>🃏 Blackjack Roguelike</h1>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
          <button onClick={loadStats} style={navBtn('#3498db')}>📊 Статистика</button>
          <button onClick={() => setModal('rules')} style={navBtn('#9b59b6')}>📖 Правила</button>
        </div>

        <div style={{ marginBottom: '15px', padding: '12px', background: '#16213e', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', marginBottom: '8px' }}>❤️ HP: <strong>{rs.hp}/{rs.maxHp}</strong></div>
          <div style={{ fontSize: '15px', color: '#a0a0a0' }}>
            🏰 Локация {runManager.getCurrentLocation()} · Этаж {rs.currentFloor} | Сложность: {rs.currentFloor <= 5 ? '🟢' : rs.currentFloor <= 10 ? '🟡' : rs.currentFloor <= 15 ? '🟠' : '🔴'}
          </div>
          {rs.perks.length > 0 && <div style={{ fontSize: '14px', marginTop: '6px', color: '#f39c12' }}>Перки: {rs.perks.join(', ')}</div>}
          {rs.usedPerks.length > 0 && <div style={{ fontSize: '12px', marginTop: '4px', color: '#95a5a6' }}>Использованы: {rs.usedPerks.join(', ')}</div>}
          {rs.foolEffectId && <div style={{ fontSize: '12px', marginTop: '4px', color: '#e91e63' }}>🃏 Эффект Шута активен</div>}
          {rs.moonActive && <div style={{ fontSize: '12px', marginTop: '4px', color: '#9b59b6' }}>🌙 Следующая ставка ×2</div>}
        </div>

        {screen === 'main' && !runManager.isRunActive() && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '20px' }}>💀 Забег провален</div>
            <div style={{ fontSize: '16px', color: '#a0a0a0', marginBottom: '20px' }}>
              Вы достигли этажа {rs.currentFloor} и выиграли {rs.gamesWon} игр!
            </div>
            <button onClick={startNewRun} style={{ padding: '15px 30px', fontSize: '20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Новый забег</button>
          </div>
        )}

        {screen === 'main' && runManager.isRunActive() && !game && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '20px', marginBottom: '15px' }}>Ставка: <strong style={{ color: '#f39c12' }}>{currentBet} HP</strong></div>
            <input type="range" min={5} max={runManager.getHp()} step={5} value={currentBet} onChange={e => setCurrentBet(Number(e.target.value))} style={{ width: '80%', maxWidth: '400px', cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '420px', margin: '10px auto 0', fontSize: '12px', color: '#a0a0a0' }}><span>5 HP</span><span>{runManager.getHp()} HP</span></div>
            <button onClick={() => startGame(currentBet)} style={{ marginTop: '20px', padding: '15px 40px', fontSize: '20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Начать игру ({currentBet} HP)</button>
            {runManager.isMoonActive() && <div style={{ marginTop: '15px', padding: '10px', background: '#9b59b6', borderRadius: '8px' }}>🌙 Реальная ставка: {currentBet * 2} HP</div>}
          </div>
        )}

        {screen === 'playing' && game && st && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '15px', padding: '10px', background: '#16213e', borderRadius: '10px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#a0a0a0', fontSize: '14px' }}>Дилер:</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>{st.state === 'playerTurn' ? `${getDealerVisibleScore()} + ?` : getDealerVisibleScore()}</div>
                {game.isTowerApplied() && <div style={{ fontSize: '12px', color: '#f39c12' }}>🗼 Башня сработала</div>}
                {game.isHangedManUsed() && <div style={{ fontSize: '12px', color: '#9b59b6' }}>🙃 Повешенный использован</div>}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#a0a0a0', fontSize: '14px' }}>Игрок:</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>{getPlayerScore()}</div>
              </div>
            </div>
            <GameTable state={st} deckRemaining={game.getDeckRemaining()} />
            <div style={{ marginBottom: '15px', padding: '10px', background: '#fff3cd', borderRadius: '10px', textAlign: 'center', color: '#856404', fontSize: '18px', fontWeight: 'bold' }}>{message}</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {st.state === 'playerTurn' && !isDealerPlaying && (<>
                <button onClick={() => handleAction('hit')} style={buttonStyle}>Hit</button>
                <button onClick={() => handleAction('stand')} style={buttonStyle}>Stand</button>
                {st.playerHands[st.currentHandIndex].length === 2 && (<>
                  <button onClick={() => handleAction('double')} style={buttonStyle}>Double</button>
                  {st.playerHands[st.currentHandIndex][0].rank === st.playerHands[st.currentHandIndex][1].rank && <button onClick={() => handleAction('split')} style={buttonStyle}>Split</button>}
                </>)}
                {st.insuranceAvailable && st.insuranceBet === 0 && <button onClick={() => handleAction('insurance')} style={buttonStyle}>Insurance</button>}
                {game.hasPerk('death') && !runManager.isPerkUsed('death') && <button onClick={() => handleAction('reroll')} style={{ ...buttonStyle, background: '#9b59b6' }}>💀 Пересдать</button>}
                {game.hasPerk('the_wheel') && !runManager.isPerkUsed('the_wheel') && <button onClick={() => handleAction('wheel')} style={{ ...buttonStyle, background: '#f39c12' }}>🎡 Колесо</button>}
              </>)}
            </div>
          </div>
        )}

        {showPerkSelection && (
          <div style={overlay}>
            <div style={{ background: '#16213e', padding: '40px', borderRadius: '20px', textAlign: 'center' }}>
              <h2 style={{ marginBottom: '20px' }}>Выберите карту таро:</h2>
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                {availablePerks.map(p => <TarotCard key={p.id} perk={p} onClick={() => selectPerk(p)} />)}
              </div>
            </div>
          </div>
        )}

        {showFoolModal && foolEffect && (
          <div style={overlay}>
            <div style={{ background: '#16213e', padding: '40px', borderRadius: '20px', textAlign: 'center', maxWidth: '400px', border: '3px solid #e91e63' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>{foolEffect.icon}</div>
              <h2 style={{ color: '#e91e63', marginBottom: '15px' }}>🃏 The Fool</h2>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>{foolEffect.name}</div>
              <div style={{ fontSize: '18px', color: '#a0a0a0', marginBottom: '30px' }}>{foolEffect.description}</div>
              <button onClick={() => setShowFoolModal(false)} style={{ padding: '12px 30px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Понятно!</button>
            </div>
          </div>
        )}

        {modal === 'stats' && stats && (
          <div style={overlay}>
            <div style={{ background: '#16213e', padding: '40px', borderRadius: '15px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
              <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>📊 Статистика</h2>
              <h3 style={{ color: '#3498db', marginBottom: '10px' }}>🎮 Игры</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <StatCell label="Всего" value={stats.games.total} />
                <StatCell label="Побед" value={stats.games.wins} color="#4CAF50" />
                <StatCell label="Проигрышей" value={stats.games.losses} color="#e74c3c" />
                <StatCell label="Ничьих" value={stats.games.pushes} color="#f39c12" />
                <StatCell label="Blackjack" value={stats.games.blackjacks} color="#9b59b6" />
                <StatCell label="Win Rate" value={`${stats.games.winRate}%`} />
              </div>
              <h3 style={{ color: '#3498db', marginBottom: '10px' }}>🏃 Забеги</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <StatCell label="Всего" value={stats.runs.total} />
                <StatCell label="Провалено" value={stats.runs.failed} color="#e74c3c" />
                <StatCell label="Активных" value={stats.runs.total - stats.runs.failed} color="#f39c12" />
              </div>
              <h3 style={{ color: '#3498db', marginBottom: '10px' }}>🎴 Перки (всего: {stats.perks.totalUsed})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
                {Object.entries(stats.perks.usage).length ? Object.entries(stats.perks.usage).map(([k, v]) => (
                  <div key={k} style={{ background: '#0f3460', padding: '8px', borderRadius: '6px', fontSize: '13px' }}>{k}: <strong>{String(v)}</strong></div>
                )) : <div style={{ color: '#a0a0a0', fontSize: '13px' }}>Перки не использовались</div>}
              </div>
              <h3 style={{ color: '#3498db', marginBottom: '10px' }}>🃏 Карты взято (≈)</h3>
              <div style={{ background: '#0f3460', padding: '10px', borderRadius: '8px', textAlign: 'center', marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>{stats.cards.estimatedDrawn}</div>
              <button onClick={() => setModal('none')} style={{ width: '100%', padding: '12px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Закрыть</button>
            </div>
          </div>
        )}

        {modal === 'rules' && (
          <div style={overlay}>
            <div style={{ background: '#16213e', padding: '40px', borderRadius: '15px', maxWidth: '700px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
              <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>📖 Правила</h2>
              <Section title="🎯 Цель" text="Набрать очков больше дилера, но не более 21. Играйте бесконечно — забег завершается только при HP=0." />
              <Section title="🃏 Карты" text="2-10 = номинал; J/Q/K = 10; A = 1 или 11 (автоматически)." />
              <Section title="🎮 Действия" text="Hit — взять карту; Stand — остановиться; Double — удвоить ставку и взять 1 карту (только на 2 картах); Split — разделить пару; Insurance — страховка при тузе дилера." />
              <Section title="💰 Выплаты" text="Blackjack 3:2; победа 1:1; ничья — возврат ставки; проигрыш — потеря ставки." />
              <Section title="🏃 Забег" text="Старт 50 HP. Ставка = часть HP. На смене локации (каждые 5 этажей) +10 HP и сброс одноразовых перков. HP=0 — провал. Этажи бесконечны!" />
              <Section title="🎴 Карты Таро" text="🗼 Башня: дилер берёт +1 при 17 (1×/локация). ☀️ Солнце: +5 max HP при переборе дилера. 💀 Смерть: пересдать карты (1×). ⚖️ Справедливость: при проигрыше теряешь на 5 меньше (мин. -5). 🎡 Колесо: заменить карты + перетасовка (1×). 🃏 Шут: случайный эффект. 🙃 Повешенный: поражение → ничья (1×). 🌙 Луна: следующая ставка ×2." />
              <button onClick={() => setModal('none')} style={{ width: '100%', padding: '12px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Закрыть</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '15px', textAlign: 'center', borderTop: '2px solid #16213e' }}>
        <button onClick={handleLogoutClick} style={{ padding: '12px 30px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Выйти ({username})</button>
      </div>

      {showLogoutConfirm && (
        <div style={overlay}>
          <div style={{ background: '#16213e', padding: '40px', borderRadius: '15px', textAlign: 'center', maxWidth: '500px', width: '90%' }}>
            <h2 style={{ marginBottom: '20px', color: '#e74c3c' }}>⚠️ Подтверждение выхода</h2>
            <p style={{ fontSize: '18px', marginBottom: '25px', lineHeight: '1.6' }}>
              Вы на этаже <strong>{runManager.getCurrentFloor()}</strong>.<br/>
              <strong>Прогресс забега не будет сохранён!</strong><br/>Выйти?
            </p>
            <div style={{ background: '#0f3460', padding: '15px 20px', borderRadius: '10px', marginBottom: '25px', textAlign: 'left' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={logoutChoice} onChange={e => setLogoutChoice(e.target.checked)} style={{ width: '20px', height: '20px' }} />
                <span>Показывать это предупреждение в будущем</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ padding: '12px 30px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Отмена</button>
              <button onClick={confirmLogout} style={{ padding: '12px 30px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Выйти</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========
const buttonStyle: React.CSSProperties = { padding: '12px 24px', fontSize: '16px', background: '#0f3460', color: 'white', border: '2px solid #e94560', borderRadius: '8px', cursor: 'pointer', minWidth: '100px' };
const navBtn = (c: string): React.CSSProperties => ({ padding: '10px 20px', background: c, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' });
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };

const StatCell = ({ label, value, color = '#fff' }: { label: string; value: any; color?: string }) => (
  <div style={{ background: '#0f3460', padding: '10px', borderRadius: '8px' }}>
    <div style={{ fontSize: '12px', color: '#a0a0a0' }}>{label}</div>
    <div style={{ fontSize: '22px', fontWeight: 'bold', color }}>{value}</div>
  </div>
);

const Section = ({ title, text }: { title: string; text: string }) => (
  <div style={{ marginBottom: '15px' }}>
    <h3 style={{ color: '#3498db', marginBottom: '5px' }}>{title}</h3>
    <p style={{ lineHeight: '1.6', color: '#d0d0d0' }}>{text}</p>
  </div>
);

export default App;