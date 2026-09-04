'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentLoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Не удалось войти.');
        setLoading(false);
        return;
      }
      router.push('/student');
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
        <h2>Вход по PIN-коду</h2>
        <form onSubmit={submit}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Например, 4821"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Проверяю…' : 'Войти'}
          </button>
        </form>
        {error && <div className="error-note">{error}</div>}
        <div className="note">Свой PIN-код спросите у учителя — у каждого ученика он свой.</div>
      </div>
    </div>
  );
}
