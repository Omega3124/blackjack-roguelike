import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from './db/index.js';

const app = express();
const PORT = 3001;
const JWT_SECRET = 'blackjack-roguelike-secret-key-2026';

app.use(cors());
app.use(express.json());

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username и password обязательны' });
    }

    const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Пользователь уже существует' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)'
    ).run(username, passwordHash, new Date().toISOString());

    const token = jwt.sign(
      { userId: result.lastInsertRowid, username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, userId: result.lastInsertRowid, username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Логин
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ error: 'Неверный username или password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный username или password' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, userId: user.id, username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Проверка jwt
const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
  }
};

// Получение текущего пользователя
app.get('/api/auth/me', authMiddleware, (req: any, res) => {
  const user: any = db.prepare(
    'SELECT id, username, created_at FROM users WHERE id = ?'
  ).get(req.user.userId);

  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  res.json({ id: user.id, username: user.username, createdAt: user.created_at });
});

// Сохранение результата игры
app.post('/api/sessions', authMiddleware, (req: any, res) => {
  try {
    const { bet, hpBefore, hpAfter, result, floor, runId } = req.body;
    const stmt = db.prepare(`
      INSERT INTO game_sessions (user_id, played_at, bet, hp_before, hp_after, result, floor, run_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const r = stmt.run(
      req.user.userId,
      new Date().toISOString(),
      bet, hpBefore, hpAfter, result, floor || 1, runId || null
    );
    res.json({ id: r.lastInsertRowid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение истории игр пользователя
app.get('/api/sessions', authMiddleware, (req: any, res) => {
  const sessions = db.prepare(`
    SELECT * FROM game_sessions WHERE user_id = ? ORDER BY played_at DESC LIMIT 50
  `).all(req.user.userId);
  res.json(sessions);
});

// Получение статистики пользователя
app.get('/api/stats', authMiddleware, (req: any, res) => {
  const sessions: any[] = db.prepare(
    'SELECT * FROM game_sessions WHERE user_id = ?'
  ).all(req.user.userId);

  const totalGames = sessions.length;
  const wins = sessions.filter(s => s.result === 'win' || s.result === 'blackjack').length;
  const losses = sessions.filter(s => s.result === 'loss').length;
  const pushes = sessions.filter(s => s.result === 'push').length;
  const blackjacks = sessions.filter(s => s.result === 'blackjack').length;

  res.json({
    totalGames,
    wins,
    losses,
    pushes,
    blackjacks,
    winRate: totalGames > 0 ? wins / totalGames : 0
  });
});

// Сохранение забега
app.post('/api/runs', authMiddleware, (req: any, res) => {
  try {
    const { currentFloor, maxFloors, hp, maxHp, perks, status, gamesPlayed, gamesWon } = req.body;
    const stmt = db.prepare(`
      INSERT INTO runs (user_id, started_at, current_floor, max_floors, hp, max_hp, perks, status, games_played, games_won)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const r = stmt.run(
      req.user.userId,
      new Date().toISOString(),
      currentFloor || 1, maxFloors || 5, hp || 100, maxHp || 100,
      JSON.stringify(perks || []), status || 'active', gamesPlayed || 0, gamesWon || 0
    );
    res.json({ id: r.lastInsertRowid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение активного забега пользователя
app.get('/api/runs/active', authMiddleware, (req: any, res) => {
  const run: any = db.prepare(`
    SELECT * FROM runs WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1
  `).get(req.user.userId);

  if (!run) {
    return res.json(null);
  }

  res.json({ ...run, perks: JSON.parse(run.perks) });
});

// ========== НАСТРОЙКИ ПОЛЬЗОВАТЕЛЯ ==========
app.get('/api/settings', authMiddleware, (req: any, res) => {
  try {
    const u: any = db.prepare(
      'SELECT show_logout_warning FROM users WHERE id = ?'
    ).get(req.user.userId);
    res.json({ showLogoutWarning: u ? u.show_logout_warning === 1 : true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.put('/api/settings', authMiddleware, (req: any, res) => {
  try {
    const { showLogoutWarning } = req.body;
    db.prepare(
      'UPDATE users SET show_logout_warning = ? WHERE id = ?'
    ).run(showLogoutWarning ? 1 : 0, req.user.userId);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ========== ОБНОВЛЕНИЕ ЗАБЕГА ==========
app.put('/api/runs/:id', authMiddleware, (req: any, res) => {
  try {
    const { currentFloor, maxFloors, hp, maxHp, perks, usedPerks, status, gamesPlayed, gamesWon } = req.body;
    db.prepare(`
      UPDATE runs 
      SET current_floor=?, max_floors=?, hp=?, max_hp=?, 
          perks=?, used_perks=?, status=?, games_played=?, games_won=?
      WHERE id=? AND user_id=?
    `).run(
      currentFloor || 1, maxFloors || 15, hp || 50, maxHp || 50,
      JSON.stringify(perks || []), JSON.stringify(usedPerks || []),
      status || 'active', gamesPlayed || 0, gamesWon || 0,
      req.params.id, req.user.userId
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ========== ПОДРОБНАЯ СТАТИСТИКА ==========
app.get('/api/stats/detailed', authMiddleware, (req: any, res) => {
  try {
    const uid = req.user.userId;
    const sessions: any[] = db.prepare(
      'SELECT * FROM game_sessions WHERE user_id = ?'
    ).all(uid);
    const runs: any[] = db.prepare(
      'SELECT * FROM runs WHERE user_id = ?'
    ).all(uid);

    const wins = sessions.filter(s => s.result === 'playerWin' || s.result === 'blackjack').length;
    const losses = sessions.filter(s => s.result === 'dealerWin').length;
    const pushes = sessions.filter(s => s.result === 'push').length;
    const blackjacks = sessions.filter(s => s.result === 'blackjack').length;

    const perkUsage: Record<string, number> = {};
    runs.forEach(run => {
      try {
        const perks = JSON.parse(run.perks || '[]');
        perks.forEach((p: string) => { perkUsage[p] = (perkUsage[p] || 0) + 1; });
      } catch {}
    });

    res.json({
      games: {
        total: sessions.length,
        wins,
        losses,
        pushes,
        blackjacks,
        winRate: sessions.length > 0 ? (wins / sessions.length * 100).toFixed(1) : '0'
      },
      runs: {
        total: runs.length,
        completed: runs.filter(r => r.status === 'completed').length,
        failed: runs.filter(r => r.status === 'failed').length,
        completionRate: runs.length > 0 
          ? (runs.filter(r => r.status === 'completed').length / runs.length * 100).toFixed(1) 
          : '0'
      },
      perks: {
        totalUsed: Object.values(perkUsage).reduce((a: number, b: number) => a + b, 0),
        usage: perkUsage
      },
      cards: {
        estimatedDrawn: sessions.length * 6
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ========== ОБНОВЛЕНИЕ ЗАБЕГА (АВТОСОХРАНЕНИЕ) ==========
app.put('/api/runs/:id', authMiddleware, (req: any, res) => {
  try {
    const { currentFloor, maxFloors, hp, maxHp, perks, usedPerks, foolEffectId, moonActive, status, gamesPlayed, gamesWon } = req.body;
    db.prepare(`
      UPDATE runs 
      SET current_floor=?, max_floors=?, hp=?, max_hp=?, 
          perks=?, used_perks=?, fool_effect_id=?, moon_active=?,
          status=?, games_played=?, games_won=?
      WHERE id=? AND user_id=?
    `).run(
      currentFloor || 1, maxFloors || 999, hp || 50, maxHp || 50,
      JSON.stringify(perks || []), JSON.stringify(usedPerks || []),
      foolEffectId || null, moonActive ? 1 : 0,
      status || 'active', gamesPlayed || 0, gamesWon || 0,
      req.params.id, req.user.userId
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ========== ПОДРОБНАЯ СТАТИСТИКА ==========
app.get('/api/stats/detailed', (req, res) => {
  try {
    const sessions: any[] = db.prepare('SELECT * FROM game_sessions').all();
    const runs: any[] = db.prepare('SELECT * FROM runs').all();

    const wins = sessions.filter(s => s.result === 'playerWin' || s.result === 'blackjack').length;
    const losses = sessions.filter(s => s.result === 'dealerWin').length;
    const pushes = sessions.filter(s => s.result === 'push').length;
    const blackjacks = sessions.filter(s => s.result === 'blackjack').length;

    res.json({
      games: {
        total: sessions.length,
        wins, losses, pushes, blackjacks,
        winRate: sessions.length > 0 ? (wins / sessions.length * 100).toFixed(1) : '0'
      },
      runs: {
        total: runs.length,
        completed: runs.filter(r => r.status === 'completed').length,
        failed: runs.filter(r => r.status === 'failed').length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

// Получение настроек пользователя
app.get('/api/settings', authMiddleware, (req: any, res) => {
  try {
    const user: any = db.prepare(
      'SELECT show_logout_warning FROM users WHERE id = ?'
    ).get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      showLogoutWarning: user.show_logout_warning === 1
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновление настроек пользователя
app.put('/api/settings', authMiddleware, (req: any, res) => {
  try {
    const { showLogoutWarning } = req.body;

    if (typeof showLogoutWarning !== 'boolean') {
      return res.status(400).json({ error: 'showLogoutWarning должен быть boolean' });
    }

    db.prepare(
      'UPDATE users SET show_logout_warning = ? WHERE id = ?'
    ).run(showLogoutWarning ? 1 : 0, req.user.userId);

    res.json({ success: true, showLogoutWarning });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Настройки пользователя
app.get('/api/settings', authMiddleware, (req: any, res) => {
  const u: any = db.prepare('SELECT show_logout_warning FROM users WHERE id = ?').get(req.user.userId);
  res.json({ showLogoutWarning: u ? u.show_logout_warning === 1 : true });
});
app.put('/api/settings', authMiddleware, (req: any, res) => {
  const { showLogoutWarning } = req.body;
  db.prepare('UPDATE users SET show_logout_warning = ? WHERE id = ?')
    .run(showLogoutWarning ? 1 : 0, req.user.userId);
  res.json({ success: true });
});

// Обновление забега
app.put('/api/runs/:id', authMiddleware, (req: any, res) => {
  const { currentFloor, maxFloors, hp, maxHp, perks, usedPerks, status, gamesPlayed, gamesWon } = req.body;
  db.prepare(`UPDATE runs SET current_floor=?, max_floors=?, hp=?, max_hp=?, perks=?, used_perks=?, status=?, games_played=?, games_won=? WHERE id=? AND user_id=?`)
    .run(currentFloor||1, maxFloors||15, hp||50, maxHp||50,
         JSON.stringify(perks||[]), JSON.stringify(usedPerks||[]),
         status||'active', gamesPlayed||0, gamesWon||0, req.params.id, req.user.userId);
  res.json({ success: true });
});

// Подробная статистика
app.get('/api/stats/detailed', authMiddleware, (req: any, res) => {
  const uid = req.user.userId;
  const s: any[] = db.prepare('SELECT * FROM game_sessions WHERE user_id=?').all(uid);
  const r: any[] = db.prepare('SELECT * FROM runs WHERE user_id=?').all(uid);
  const wins = s.filter(x => x.result==='playerWin'||x.result==='blackjack').length;
  const losses = s.filter(x => x.result==='dealerWin').length;
  const pushes = s.filter(x => x.result==='push').length;
  const blackjacks = s.filter(x => x.result==='blackjack').length;
  const perkUsage: Record<string, number> = {};
  r.forEach(run => JSON.parse(run.perks||'[]').forEach((p:string)=>{ perkUsage[p]=(perkUsage[p]||0)+1; }));
  res.json({
    games: { total: s.length, wins, losses, pushes, blackjacks,
             winRate: s.length? (wins/s.length*100).toFixed(1):'0' },
    runs: { total: r.length, completed: r.filter(x=>x.status==='completed').length,
            failed: r.filter(x=>x.status==='failed').length,
            completionRate: r.length? (r.filter(x=>x.status==='completed').length/r.length*100).toFixed(1):'0' },
    perks: { totalUsed: Object.values(perkUsage).reduce((a,b)=>a+b,0), usage: perkUsage },
    cards: { estimatedDrawn: s.length * 6 },
  });
});