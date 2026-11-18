import { useState } from 'react';

interface LoginProps {
  onLogin: (token: string, userId: number, username: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка сервера');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', String(data.userId));
      localStorage.setItem('username', data.username);
      onLogin(data.token, data.userId, data.username);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#1a1a2e',
      fontFamily: 'Arial'
    }}>
      <div style={{
        width: '400px',
        padding: '40px',
        background: '#16213e',
        borderRadius: '15px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{
          textAlign: 'center',
          color: 'white',
          marginBottom: '30px',
          fontSize: '28px'
        }}>
          {isRegister ? 'Регистрация' : 'Вход'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Username поле */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#a0a0a0',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              Username:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid #0f3460',
                background: '#0f3460',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Password поле */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#a0a0a0',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              Пароль:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid #0f3460',
                background: '#0f3460',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              color: '#e74c3c',
              marginBottom: '20px',
              padding: '10px',
              background: 'rgba(231, 76, 60, 0.1)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#95a5a6' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'background 0.3s'
            }}
          >
            {loading ? 'Загрузка...' : (isRegister ? 'Зарегистрироваться' : 'Войти')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => setIsRegister(!isRegister)}
            style={{
              background: 'none',
              border: 'none',
              color: '#3498db',
              cursor: 'pointer',
              fontSize: '14px',
              textDecoration: 'underline'
            }}
          >
            {isRegister ? 'Есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </div>
    </div>
  );
}