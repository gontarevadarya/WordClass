'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Не удалось войти.');
        setLoading(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <a className="crumb" href="/">
        ← На главную
      </a>
      <div className="login-box">
        <h2>Вход для учителя</h2>
        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="Пароль учителя"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Проверяю…' : 'Войти'}
          </button>
        </form>
        {error && <div className="error-note">{error}</div>}
        <div className="note">
          Пароль задаётся в настройках сайта (переменная окружения TEACHER_PASSWORD) — его знаете только вы.
        </div>
      </div>
    </div>
  );
}
