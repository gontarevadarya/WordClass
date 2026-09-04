'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function StudentExercisePage() {
  const { deckId } = useParams();
  const router = useRouter();
  const [studentId, setStudentId] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [allWords, setAllWords] = useState([]);
  const [round, setRound] = useState(0);
  const [matched, setMatched] = useState(new Set());
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [wrong, setWrong] = useState(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [published, setPublished] = useState(false);
  const [publishError, setPublishError] = useState('');

  const load = useCallback(
    async (sid) => {
      const [dRes, wRes] = await Promise.all([
        fetch(`/api/students/${sid}/decks`),
        fetch(`/api/students/${sid}/decks/${deckId}/words`),
      ]);
      const dData = await dRes.json();
      const wData = await wRes.json();
      const found = (dData.decks || []).find((d) => d.id === deckId);
      setDeckName(found ? found.name : '');
      setAllWords((wData.words || []).filter((w) => w.image));
    },
    [deckId]
  );

  useEffect(() => {
    fetch('/api/student/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.student) return router.push('/student-login');
        setStudentId(d.student.id);
        load(d.student.id);
      });
  }, [router, load]);

  const pairs = useMemo(() => {
    if (allWords.length < 3) return [];
    return shuffle(allWords).slice(0, Math.min(6, allWords.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allWords, round]);
  const leftOrder = useMemo(() => shuffle(pairs.map((p) => p.id)), [pairs]);
  const rightOrder = useMemo(() => shuffle(pairs.map((p) => p.id)), [pairs]);

  function byId(wid) {
    return pairs.find((p) => p.id === wid);
  }
  function clickLeft(wid) {
    if (matched.has(wid)) return;
    setSelectedLeft(wid);
  }
  function clickRight(wid) {
    if (!selectedLeft || matched.has(wid)) return;
    if (selectedLeft === wid) {
      const next = new Set(matched);
      next.add(wid);
      setMatched(next);
      setSelectedLeft(null);
      const w = byId(wid);
      if (w && w.audio) new Audio(w.audio).play().catch(() => {});
    } else {
      setWrongCount((c) => c + 1);
      setWrong({ left: selectedLeft, right: wid });
      setTimeout(() => {
        setWrong(null);
        setSelectedLeft(null);
      }, 700);
    }
  }
  function playAgain() {
    setMatched(new Set());
    setSelectedLeft(null);
    setWrong(null);
    setWrongCount(0);
    setPublished(false);
    setRound((r) => r + 1);
  }

  async function publish() {
    if (!studentId) return;
    setPublishError('');
    const res = await fetch(`/api/students/${studentId}/decks/${deckId}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correct: pairs.length, mistakes: wrongCount }),
    });
    const data = await res.json();
    if (!res.ok) return setPublishError(data.error || 'Не удалось опубликовать результат.');
    setPublished(true);
  }

  if (allWords.length > 0 && allWords.length < 3) {
    return (
      <div className="app-shell">
        <a className="crumb" href="/student">
          ← В мой кабинет
        </a>
        <div className="empty">В этой папке недостаточно слов с картинками для задания (нужно минимум 3).</div>
      </div>
    );
  }

  const done = pairs.length > 0 && matched.size === pairs.length;

  return (
    <div className="app-shell">
      <a className="crumb" href="/student">
        ← В мой кабинет
      </a>
      <header className="top">
        <h1>Соотнеси слово с картинкой</h1>
      </header>
      <div className="note" style={{ marginTop: 6 }}>
        Задание собрано автоматически из папки «{deckName}». Нажмите на слово слева, затем на картинку справа.
      </div>

      <div className="match-grid">
        <div className="match-col">
          <h4>Слова</h4>
          {leftOrder.map((wid) => {
            const w = byId(wid);
            if (!w) return null;
            const cls = [
              'match-item',
              matched.has(wid) ? 'correct' : '',
              selectedLeft === wid ? 'selected' : '',
              wrong && wrong.left === wid ? 'wrong' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button key={wid} className={cls} onClick={() => clickLeft(wid)} type="button">
                {w.en}
              </button>
            );
          })}
        </div>
        <div className="match-col">
          <h4>Картинки</h4>
          {rightOrder.map((wid) => {
            const w = byId(wid);
            if (!w) return null;
            const cls = [
              'match-item',
              'img-item',
              matched.has(wid) ? 'correct' : '',
              wrong && wrong.right === wid ? 'wrong' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button key={wid} className={cls} onClick={() => clickRight(wid)} type="button">
                <img src={w.image.thumb} alt="" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="score-line">
        Найдено пар: {matched.size} из {pairs.length}
        {wrongCount ? ` · ошибок: ${wrongCount}` : ''}
      </div>

      {done && (
        <>
          <div className="win-banner">Отлично, все пары найдены! 🎉</div>
          {published ? (
            <div className="note">Результат опубликован ✓</div>
          ) : (
            <div className="publish-box">
              <button className="btn" onClick={publish}>
                Опубликовать результат
              </button>
            </div>
          )}
          {publishError && <div className="error-note">{publishError}</div>}
        </>
      )}

      <div className="exercise-cta">
        <button className="btn secondary small" onClick={playAgain}>
          Новое задание
        </button>
      </div>
    </div>
  );
}
