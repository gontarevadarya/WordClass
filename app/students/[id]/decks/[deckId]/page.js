'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import TeacherToggle from '../../../../components/TeacherToggle';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

export default function StudentDeckEditorPage() {
  const { id, deckId } = useParams();
  const [isTeacher, setIsTeacher] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [words, setWords] = useState([]);

  const [en, setEn] = useState('');
  const [ru, setRu] = useState('');
  const [manualQuery, setManualQuery] = useState('');
  const [imageResults, setImageResults] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageStatus, setImageStatus] = useState('');
  const [searching, setSearching] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [audioBase64, setAudioBase64] = useState(null);
  const [audioStatus, setAudioStatus] = useState('запись не сделана');
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);

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

  async function runImageSearch(query) {
    setSearching(true);
    setImageStatus('Ищу картинки…');
    try {
      const res = await fetch(`/api/unsplash?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        setImageStatus(data.error || 'Не получилось получить картинки.');
        setImageResults([]);
      } else if ((data.results || []).length === 0) {
        setImageStatus('Ничего не найдено, попробуйте другой запрос.');
        setImageResults([]);
      } else {
        setImageStatus(`Найдено по запросу «${query}» — нажмите на картинку, чтобы выбрать:`);
        setImageResults(data.results);
      }
    } catch (err) {
      setImageStatus('Ошибка сети: ' + err.message);
    }
    setSearching(false);
  }

  async function aiSearch() {
    if (!en.trim()) return setFormError('Сначала введите английское слово.');
    setFormError('');
    setSearching(true);
    setImageStatus('Анализирую слово…');
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Предложи короткий поисковый запрос на английском (2-4 слова) для Unsplash, который найдёт фотографию, ясно иллюстрирующую слово "${en.trim()}" в карточке для изучающих английский язык. Ответь только запросом, без кавычек и пояснений.`,
        }),
      });
      const data = await res.json();
      const query = res.ok && data.text ? data.text.replace(/["']/g, '').trim() : en.trim();
      if (!res.ok) setImageStatus(data.error + ' Ищу по самому слову.');
      await runImageSearch(query);
    } catch (err) {
      await runImageSearch(en.trim());
    }
  }

  async function translate() {
    if (!en.trim()) return setFormError('Сначала введите английское слово.');
    setFormError('');
    setTranslating(true);
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Переведи английское слово "${en.trim()}" на русский язык. Ответь только переводом (1-2 слова), без кавычек и пояснений.`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.text) setRu(data.text.replace(/["'.]/g, '').trim());
      else setFormError(data.error || 'Не удалось перевести автоматически.');
    } catch (err) {
      setFormError('Ошибка сети: ' + err.message);
    }
    setTranslating(false);
  }

  function pickImage(img) {
    setSelectedImage(img);
    fetch('/api/unsplash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ downloadLocation: img.downloadLocation }),
    }).catch(() => {});
  }

  async function toggleRecording() {
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunksRef.current = [];
        const mr = new MediaRecorder(stream);
        mr.ondataavailable = (e) => chunksRef.current.push(e.data);
        mr.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
          const b64 = await blobToBase64(blob);
          setAudioBase64(b64);
          setAudioStatus('запись готова ✓');
          stream.getTracks().forEach((t) => t.stop());
        };
        mr.start();
        mediaRecorderRef.current = mr;
        setRecording(true);
        setAudioStatus('идёт запись…');
      } catch (err) {
        setAudioStatus('Микрофон недоступен в этом браузере/окне. Загрузите готовый аудиофайл кнопкой рядом.');
      }
    } else {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  async function onFileChosen(e) {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setAudioBase64(b64);
    setAudioStatus('аудиофайл загружен ✓');
  }

  async function addWord() {
    if (!en.trim() || !ru.trim()) return setFormError('Заполните слово и перевод.');
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/students/${id}/decks/${deckId}/words`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ en: en.trim(), ru: ru.trim(), image: selectedImage, audio: audioBase64 }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Сервер ответил неожиданно (код ${res.status}). Проверьте подключение базы данных (Upstash Redis).`);
      }
      if (!res.ok) return setFormError(data.error || 'Не удалось сохранить слово.');
      setEn('');
      setRu('');
      setSelectedImage(null);
      setImageResults([]);
      setImageStatus('');
      setAudioBase64(null);
      setAudioStatus('запись не сделана');
      await load();
    } catch (err) {
      setFormError(err.message || 'Ошибка сети.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteWord(wordId) {
    await fetch(`/api/students/${id}/decks/${deckId}/words/${wordId}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="app-shell">
      <a className="crumb" href={`/students/${id}`}>
        ← Папки со словами
      </a>
      <header className="top">
        <h1>{deckName || '…'}</h1>
        <TeacherToggle onStatus={setIsTeacher} />
      </header>

      <div className="add-word-box">
        <div className="row">
          <div style={{ flex: 1, minWidth: 140 }}>
            <span className="field-label">Английское слово</span>
            <input placeholder="apple" value={en} onChange={(e) => setEn(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <span className="field-label">Перевод</span>
            <input placeholder="яблоко" value={ru} onChange={(e) => setRu(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>
        <div className="picker-row">
          <button className="btn secondary small" onClick={translate} disabled={translating}>
            {translating ? 'Перевожу…' : 'Перевести автоматически'}
          </button>
        </div>
        <div className="picker-row">
          <button className="btn secondary small" onClick={aiSearch} disabled={searching}>
            {searching ? 'Ищу…' : 'Подобрать картинки (анализ слова ИИ)'}
          </button>
          <input
            placeholder="или свой запрос по-английски…"
            value={manualQuery}
            onChange={(e) => setManualQuery(e.target.value)}
            style={{ maxWidth: 200 }}
          />
          <button
            className="btn secondary small"
            onClick={() => manualQuery.trim() && runImageSearch(manualQuery.trim())}
            disabled={searching}
          >
            Найти на Unsplash
          </button>
        </div>
        {imageStatus && <div className="note" style={{ marginTop: 0 }}>{imageStatus}</div>}
        <div className="image-grid">
          {imageResults.map((r) => (
            <button
              key={r.id}
              className={`thumb-wrap ${selectedImage && selectedImage.id === r.id ? 'selected' : ''}`}
              onClick={() => pickImage(r)}
              type="button"
            >
              <img src={r.thumb} alt="" />
            </button>
          ))}
        </div>
        {selectedImage && (
          <div className="selected-preview">
            <img src={selectedImage.thumb} alt="" />
            <div className="credit">
              Выбрано.
              <br />
              Фото:{' '}
              <a href={selectedImage.creditLink} target="_blank" rel="noopener noreferrer">
                {selectedImage.credit}
              </a>{' '}
              / Unsplash
            </div>
          </div>
        )}
        <div className="picker-row">
          <button className="btn secondary small" onClick={toggleRecording}>
            {recording ? '⏹ Остановить запись' : '🎙 Записать произношение'}
          </button>
          <button className="btn secondary small" onClick={() => fileInputRef.current.click()}>
            Загрузить аудиофайл
          </button>
          <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={onFileChosen} />
          <span className="audio-status">
            {recording && <span className="rec-dot"></span>}
            {audioStatus}
          </span>
        </div>
        <button className="btn" onClick={addWord} disabled={saving}>
          {saving ? 'Добавляю…' : 'Добавить слово'}
        </button>
        {formError && <div className="error-note">{formError}</div>}
      </div>

      <div className="word-list">
        {words.length === 0 && <div className="empty">В этой папке пока нет слов.</div>}
        {words.map((w) => (
          <div className="word-row" key={w.id}>
            {w.image ? (
              <img className="thumb" src={w.image.thumb} alt="" />
            ) : (
              <div className="thumb" style={{ width: 44, height: 44, background: 'var(--line)', borderRadius: 8 }} />
            )}
            <div className="txt">
              <div className="en">{w.en}</div>
              <div className="ru">{w.ru}</div>
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
              <button className="icon-btn" onClick={() => deleteWord(w.id)}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
