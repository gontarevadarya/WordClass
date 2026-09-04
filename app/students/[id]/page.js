'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import TeacherToggle from '../../components/TeacherToggle';

function wordNoun(n) {
  const m10 = n % 10,
    m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'слово';
  if ([2, 3, 4].includes(m10) && ![12, 13, 14].includes(m100)) return 'слова';
  return 'слов';
}

export default function StudentDecksPage() {
  const { id } = useParams();
  const [isTeacher, setIsTeacher] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [decks, setDecks] = useState([]);
  const [wordsByDeck, setWordsByDeck] = useState({});
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [sRes, dRes] = await Promise.all([fetch('/api/students'), fetch(`/api/students/${id}/decks`)]);
    if (sRes.ok) {
      const sData = await sRes.json();
      const found = (sData.students || []).find((s) => s.id === id);
      setStudentName(found ? found.name : '');
    }
    const dData = await dRes.json();
    const deckList = dData.decks || [];
    setDecks(deckList);
    const entries = await Promise.all(
      deckList.map(async (d) => {
        const r = await fetch(`/api/students/${id}/decks/${d.id}/words`);
        const wd = await r.json();
        return [d.id, wd.words || []];
      })
    );
    setWordsByDeck(Object.fromEntries(entries));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function createDeck(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('Введите название папки.');
    setCreating(true);
    setError('');
    const res = await fetch(`/api/students/${id}/decks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) return setError(data.error || 'Не удалось создать папку.');
    setName('');
    load();
  }

  async function deleteDeck(deckId) {
    if (!confirm('Удалить папку вместе со всеми словами?')) return;
    await fetch(`/api/students/${id}/decks/${deckId}`, { method: 'DELETE' });
    load();
  }

  if (isTeacher === false) {
    return (
      <div className="app-shell">
        <TeacherToggle onStatus={setIsTeacher} />
        <div className="empty">Эта страница доступна только учителю.</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <a className="crumb" href="/students">
        ← Все ученики
      </a>
      <header className="top">
        <h1>{studentName || '…'} — папки со словами</h1>
        <TeacherToggle onStatus={setIsTeacher} />
      </header>

      <form className="new-deck-form" onSubmit={createDeck}>
        <input placeholder="Название папки, например «Еда»" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" type="submit" disabled={creating}>
          {creating ? 'Создаю…' : '+ Новая папка'}
        </button>
      </form>
      {error && <div className="error-note">{error}</div>}

      {decks.length === 0 && <div className="empty">У этого ученика пока нет папок со словами.</div>}

      <div className="deck-grid">
        {decks.map((d) => {
          const words = wordsByDeck[d.id] || [];
          const thumbs = words.slice(0, 4).filter((w) => w.image);
          return (
            <div className="deck-card" key={d.id}>
              <div className="thumb-strip">
                {thumbs.map((w) => (
                  <img key={w.id} src={w.image.thumb} alt="" />
                ))}
              </div>
              <h3>{d.name}</h3>
              <div className="count">
                {words.length} {wordNoun(words.length)}
              </div>
              <div className="actions">
                <a className="btn small" href={`/students/${id}/decks/${d.id}`}>
                  Открыть
                </a>
                <button className="btn small danger" onClick={() => deleteDeck(d.id)}>
                  Удалить
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
