'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StudentBadge from '../components/StudentBadge';

function wordNoun(n) {
  const m10 = n % 10,
    m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'слово';
  if ([2, 3, 4].includes(m10) && ![12, 13, 14].includes(m100)) return 'слова';
  return 'слов';
}

export default function StudentDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [decks, setDecks] = useState([]);
  const [wordsByDeck, setWordsByDeck] = useState({});
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadContent = useCallback(async (studentId) => {
    const [dRes, tRes] = await Promise.all([
      fetch(`/api/students/${studentId}/decks`),
      fetch(`/api/students/${studentId}/tasks`),
    ]);
    const dData = await dRes.json();
    const tData = await tRes.json();
    const deckList = dData.decks || [];
    setDecks(deckList);
    setFolders(tData.folders || []);
    const entries = await Promise.all(
      deckList.map(async (d) => {
        const r = await fetch(`/api/students/${studentId}/decks/${d.id}/words`);
        const wd = await r.json();
        return [d.id, wd.words || []];
      })
    );
    setWordsByDeck(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    fetch('/api/student/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.student) {
          router.push('/student-login');
          return;
        }
        setStudent(d.student);
        loadContent(d.student.id);
      });
  }, [router, loadContent]);

  async function createFolder(e) {
    e.preventDefault();
    if (!student) return;
    setCreating(true);
    const res = await fetch(`/api/students/${student.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim() || 'Новое задание' }),
    });
    setCreating(false);
    if (res.ok) {
      setNewFolderName('');
      loadContent(student.id);
    }
  }

  async function deleteFolder(folderId) {
    if (!student) return;
    if (!confirm('Удалить эту папку с заданием?')) return;
    await fetch(`/api/students/${student.id}/tasks/${folderId}`, { method: 'DELETE' });
    loadContent(student.id);
  }

  if (!student) {
    return <div className="app-shell">Загрузка…</div>;
  }

  return (
    <div className="app-shell">
      <header className="top">
        <div>
          <h1>Привет, {student.name}!</h1>
          <div className="tag">твоё личное пространство в СловоКлассе</div>
        </div>
        <StudentBadge />
      </header>

      <h3 style={{ marginTop: 28 }}>Папки со словами (от учителя)</h3>
      {decks.length === 0 && <div className="empty">Учитель пока не добавил вам папки со словами.</div>}
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
                <a className="btn small secondary" href={`/student/deck/${d.id}/study`}>
                  Учить
                </a>
                <a
                  className="btn small"
                  href={`/student/deck/${d.id}/exercise`}
                  style={{ pointerEvents: words.length < 3 ? 'none' : 'auto', opacity: words.length < 3 ? 0.5 : 1 }}
                >
                  Задание
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <h3 style={{ marginTop: 36 }}>Мои папки с заданиями</h3>
      <div className="note" style={{ marginTop: 0 }}>
        Здесь можно свободно создавать, редактировать и удалять что угодно — это ваше личное пространство.
      </div>
      <form className="new-deck-form" onSubmit={createFolder}>
        <input
          placeholder="Название папки, например «Домашка 1»"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
        />
        <button className="btn" type="submit" disabled={creating}>
          {creating ? 'Создаю…' : '+ Новая папка'}
        </button>
      </form>

      {folders.length === 0 && <div className="empty">Пока нет ни одной папки с заданием.</div>}
      <div className="deck-grid">
        {folders.map((f) => (
          <div className="deck-card" key={f.id}>
            <h3>{f.name}</h3>
            <div className="count">{f.content ? `${f.content.length} симв.` : 'пусто'}</div>
            <div className="actions">
              <a className="btn small" href={`/student/tasks/${f.id}`}>
                Открыть
              </a>
              <button className="btn small danger" onClick={() => deleteFolder(f.id)}>
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
