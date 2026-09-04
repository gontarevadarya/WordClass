'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function StudentStudyPage() {
  const { deckId } = useParams();
  const router = useRouter();
  const [studentId, setStudentId] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [words, setWords] = useState([]);

  const load = useCallback(async (sid) => {
    const [dRes, wRes] = await Promise.all([
      fetch(`/api/students/${sid}/decks`),
      fetch(`/api/students/${sid}/decks/${deckId}/words`),
    ]);
    const dData = await dRes.json();
    const wData = await wRes.json();
    const found = (dData.decks || []).find((d) => d.id === deckId);
    setDeckName(found ? found.name : '');
    setWords(wData.words || []);
  }, [deckId]);

  useEffect(() => {
    fetch('/api/student/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.student) return router.push('/student-login');
        setStudentId(d.student.id);
        load(d.student.id);
      });
  }, [router, load]);

  return (
    <div className="app-shell">
      <a className="crumb" href="/student">
        ← В мой кабинет
      </a>
      <header className="top">
        <h1>{deckName || '…'}</h1>
      </header>
      <div className="study-grid">
        {words.length === 0 && <div className="empty">В папке пока нет слов.</div>}
        {words.map((w) => (
          <div className="study-card" key={w.id}>
            {w.image && <img src={w.image.thumb} alt="" />}
            <div className="en">{w.en}</div>
            <div className="ru">{w.ru}</div>
            {w.audio && (
              <button className="btn small secondary" onClick={() => new Audio(w.audio).play().catch(() => {})}>
                ▶ Слушать
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="exercise-cta">
        <a
          className="btn"
          href={`/student/deck/${deckId}/exercise`}
          style={{ pointerEvents: words.length < 3 ? 'none' : 'auto', opacity: words.length < 3 ? 0.5 : 1 }}
        >
          Перейти к заданию →
        </a>
      </div>
    </div>
  );
}
