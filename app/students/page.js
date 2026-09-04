'use client';
import { useEffect, useState, useCallback } from 'react';
import TeacherToggle from '../components/TeacherToggle';

export default function StudentsPage() {
  const [isTeacher, setIsTeacher] = useState(null);
  const [students, setStudents] = useState([]);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/students');
    if (!res.ok) return;
    const data = await res.json();
    setStudents(data.students || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addStudent(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Введите имя ученика.');
      return;
    }
    setCreating(true);
    setError('');
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error || 'Не удалось добавить ученика.');
      return;
    }
    setName('');
    load();
  }

  async function removeStudent(id) {
    if (!confirm('Удалить ученика вместе со всеми его папками, словами и заданиями?')) return;
    await fetch(`/api/students/${id}`, { method: 'DELETE' });
    load();
  }

  async function regeneratePin(id) {
    if (!confirm('Старый PIN перестанет работать. Продолжить?')) return;
    await fetch(`/api/students/${id}/regenerate-pin`, { method: 'POST' });
    load();
  }

  function copyPin(id, pin) {
    navigator.clipboard?.writeText(pin).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 1200);
  }

  if (isTeacher === false) {
    return (
      <div className="app-shell">
        <TeacherToggle onStatus={setIsTeacher} />
        <div className="empty">Эта страница доступна только учителю. Войдите через «Я учитель».</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <a className="crumb" href="/">
        ← На главную
      </a>
      <header className="top">
        <h1>Мои ученики</h1>
        <TeacherToggle onStatus={setIsTeacher} />
      </header>

      <form className="new-deck-form" onSubmit={addStudent}>
        <input placeholder="Имя ученика, например «Аня К.»" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" type="submit" disabled={creating}>
          {creating ? 'Добавляю…' : '+ Добавить ученика'}
        </button>
      </form>
      {error && <div className="error-note">{error}</div>}

      {students.length === 0 && <div className="empty">Пока нет ни одного ученика.</div>}

      <div className="word-list" style={{ marginTop: 18 }}>
        {students.map((s) => (
          <div className="word-row" key={s.id}>
            <div className="txt">
              <div className="en">{s.name}</div>
              <div className="ru">
                PIN: <strong>{s.pin}</strong>
              </div>
            </div>
            <div className="row-actions">
              <button className="icon-btn" onClick={() => copyPin(s.id, s.pin)}>
                {copiedId === s.id ? 'Скопировано ✓' : 'Скопировать PIN'}
              </button>
              <a className="btn small secondary" href={`/students/${s.id}`}>
                Папки со словами
              </a>
              <button className="icon-btn" onClick={() => regeneratePin(s.id)}>
                Новый PIN
              </button>
              <button className="icon-btn" onClick={() => removeStudent(s.id)}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="note" style={{ marginTop: 20 }}>
        Дайте каждому ученику его личный PIN — по нему он попадёт только в свою папку. Ссылка на сайт может быть одна и та
        же для всех, различия — только в PIN.
      </div>
    </div>
  );
}
