'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import TeacherToggle from '../../../../components/TeacherToggle';
import WordForm from '../../../../components/WordForm';

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    throw new Error(`Сервер ответил неожиданно (код ${res.status}). Проверьте подключение базы данных.`);
  }
}

export default function StudentDeckEditorPage() {
  const { id, deckId } = useParams();
  const [isTeacher, setIsTeacher] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [renameError, setRenameError] = useState('');
  const [words, setWords] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    const [dRes, wRes] = await Promise.all([
      fetch(`/api/students/${id}/decks`),
      fetch(`/api/students/${id}/decks/${deckId}/words`),
    ]);
    const dData = await dRes.json();
    const wData = await wRes.json();
    const found = (dData.decks || []).find((d) => d.id === deckId);
    setDeckName(found ? found.name : '');
    setWords(wData.words || []);
  }, [id, deckId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isTeacher === false) {
    return (
      <div className="app-shell">
        <TeacherToggle onStatus={setIsTeacher} />
        <div className="empty">Эта страница доступна только учителю.</div>
      </div>
    );
  }

  async function saveDeckName() {
    const name = nameDraft.trim();
    if (!name) return setRenameError('Название не может быть пустым.');
    setRenameError('');
    try {
      const res = await fetch(`/api/students/${id}/decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await readJson(res);
      if (!res.ok) return setRenameError(data.error || 'Не удалось переименовать.');
      setDeckName(name);
      setRenaming(false);
    } catch (e) {
      setRenameError(e.message);
    }
  }

  async function addWord(changes) {
    const res = await fetch(`/api/students/${id}/decks/${deckId}/words`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
    const data = await readJson(res);
    if (!res.ok) return data.error || 'Не удалось сохранить слово.';
    await load();
    return null;
  }

  async function saveWord(wordId, changes) {
    const res = await fetch(`/api/students/${id}/decks/${deckId}/words/${wordId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
    const data = await readJson(res);
    if (!res.ok) return data.error || 'Не удалось сохранить изменения.';
    setEditingId(null);
    await load();
    return null;
  }

  async function deleteWord(wordId) {
    if (!confirm('Удалить это слово?')) return;
    await fetch(`/api/students/${id}/decks/${deckId}/words/${wordId}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="app-shell">
      <a className="crumb" href={`/students/${id}`}>
        ← Папки со словами
      </a>
      <header className="top">
        {renaming ? (
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="new-deck-form" style={{ marginTop: 0 }}>
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveDeckName()}
                autoFocus
              />
              <button className="btn small" onClick={saveDeckName}>
                Сохранить
              </button>
              <button className="btn secondary small" onClick={() => setRenaming(false)}>
                Отмена
              </button>
            </div>
            {renameError && <div className="error-note">{renameError}</div>}
          </div>
        ) : (
          <h1>
            {deckName || '…'}{' '}
            <button
              className="icon-btn"
              title="Переименовать папку"
              onClick={() => {
                setNameDraft(deckName);
                setRenameError('');
                setRenaming(true);
              }}
            >
              ✎ Переименовать
            </button>
          </h1>
        )}
        <TeacherToggle onStatus={setIsTeacher} />
      </header>

      <h3 style={{ marginTop: 18 }}>Новое слово</h3>
      <WordForm submitLabel="Добавить слово" resetOnSuccess onSubmit={addWord} />

      <h3 style={{ marginTop: 28 }}>Слова в папке</h3>
      <div className="word-list">
        {words.length === 0 && <div className="empty">В этой папке пока нет слов.</div>}
        {words.map((w) =>
          editingId === w.id ? (
            <WordForm
              key={w.id}
              initial={w}
              submitLabel="Сохранить изменения"
              onSubmit={(changes) => saveWord(w.id, changes)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="word-row" key={w.id}>
              {w.image ? (
                <img className="thumb" src={w.image.thumb} alt="" />
              ) : (
                <div className="thumb" style={{ width: 64, height: 64, background: 'var(--line)', borderRadius: 10 }} />
              )}
              <div className="txt">
                <div className="en">{w.en}</div>
                <div className="ru">{w.ru}</div>
                {w.image && w.image.credit && (
                  <div className="credit">
                    Фото:{' '}
                    <a href={w.image.creditLink} target="_blank" rel="noopener noreferrer">
                      {w.image.credit}
                    </a>{' '}
                    / Unsplash
                  </div>
                )}
              </div>
              <div className="row-actions">
                {w.audio ? (
                  <button className="icon-btn" onClick={() => new Audio(w.audio).play().catch(() => {})}>
                    ▶ Слушать
                  </button>
                ) : (
                  <span className="note" style={{ margin: 0 }}>
                    нет записи
                  </span>
                )}
                <button className="icon-btn" onClick={() => setEditingId(w.id)}>
                  ✎ Изменить
                </button>
                <button className="icon-btn" onClick={() => deleteWord(w.id)}>
                  ✕
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
