'use client';
import { useState, useRef } from 'react';
import { resizeImageFile, emojiToImageDataUrl } from '../lib/imageTools';
import { EMOJI_GROUPS, firstGrapheme } from '../lib/emojiData';

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

/**
 * Форма слова. Используется и для добавления нового слова, и для редактирования.
 *  - initial: существующее слово (для редактирования) или undefined
 *  - onSubmit(changes): вернуть строку с ошибкой или null/undefined при успехе.
 *      При редактировании в changes попадают только изменённые поля.
 *  - resetOnSuccess: очистить форму после успешного добавления
 */
export default function WordForm({ initial, submitLabel, onSubmit, onCancel, resetOnSuccess }) {
  const editing = !!initial;

  const [en, setEn] = useState(initial?.en || '');
  const [ru, setRu] = useState(initial?.ru || '');
  const [image, setImage] = useState(initial?.image || null);
  const [audio, setAudio] = useState(initial?.audio || null);
  const [imageChanged, setImageChanged] = useState(false);
  const [audioChanged, setAudioChanged] = useState(false);

  const [tab, setTab] = useState('upload');
  const [manualQuery, setManualQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState('');
  const [searching, setSearching] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');
  const [processingImage, setProcessingImage] = useState(false);

  const [recording, setRecording] = useState(false);
  const [audioStatus, setAudioStatus] = useState(initial?.audio ? 'запись есть' : 'записи нет');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioFileRef = useRef(null);
  const imageFileRef = useRef(null);

  function chooseImage(img) {
    setImage(img);
    setImageChanged(true);
  }

  // ---------- картинка: своя ----------
  async function onImageFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setProcessingImage(true);
    setError('');
    try {
      const dataUrl = await resizeImageFile(file);
      chooseImage({ thumb: dataUrl, custom: true });
    } catch (err) {
      setError(err.message || 'Не удалось обработать картинку.');
    } finally {
      setProcessingImage(false);
      if (imageFileRef.current) imageFileRef.current.value = '';
    }
  }

  // ---------- картинка: эмодзи ----------
  function pickEmoji(emoji) {
    if (!emoji) return;
    try {
      chooseImage({ thumb: emojiToImageDataUrl(emoji), emoji, custom: true });
    } catch (err) {
      setError('Не удалось создать картинку из эмодзи.');
    }
  }

  // ---------- картинка: поиск Unsplash ----------
  async function runSearch(query) {
    setSearching(true);
    setSearchStatus('Ищу картинки…');
    try {
      const res = await fetch(`/api/unsplash?q=${encodeURIComponent(query)}`);
      let data = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Сервер ответил неожиданно (код ${res.status}).`);
      }
      if (!res.ok) {
        setSearchStatus(data.error || 'Не получилось получить картинки.');
        setSearchResults([]);
      } else if ((data.results || []).length === 0) {
        setSearchStatus('Ничего не найдено, попробуйте другой запрос.');
        setSearchResults([]);
      } else {
        setSearchStatus(`Найдено по запросу «${query}» — нажмите на картинку, чтобы выбрать:`);
        setSearchResults(data.results);
      }
    } catch (err) {
      setSearchStatus('Ошибка: ' + err.message);
    }
    setSearching(false);
  }

  async function aiSearch() {
    if (!en.trim()) return setError('Сначала введите английское слово.');
    setError('');
    setSearching(true);
    setSearchStatus('Анализирую слово…');
    let query = en.trim();
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Предложи короткий поисковый запрос на английском (2-4 слова) для Unsplash, который найдёт фотографию, ясно иллюстрирующую слово "${en.trim()}" в карточке для изучающих английский язык. Ответь только запросом, без кавычек и пояснений.`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.text) query = data.text.replace(/["']/g, '').trim() || query;
    } catch {
      /* ищем по самому слову */
    }
    await runSearch(query);
  }

  function pickSearchResult(img) {
    chooseImage(img);
    fetch('/api/unsplash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ downloadLocation: img.downloadLocation }),
    }).catch(() => {});
  }

  async function translate() {
    if (!en.trim()) return setError('Сначала введите английское слово.');
    setError('');
    setTranslating(true);
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Переведи английское слово "${en.trim()}" на русский язык. Ответь только переводом (1-2 слова), без кавычек и пояснений.`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.text) setRu(data.text.replace(/["'.]/g, '').trim());
      else setError(data.error || 'Автоперевод недоступен — введите перевод вручную.');
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    }
    setTranslating(false);
  }

  // ---------- звук ----------
  async function toggleRecording() {
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunksRef.current = [];
        const mr = new MediaRecorder(stream);
        mr.ondataavailable = (e) => chunksRef.current.push(e.data);
        mr.onstop = async () => {
          // формат берём тот, в котором реально записал браузер (Safari и Chrome пишут по-разному)
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
          setAudio(await blobToBase64(blob));
          setAudioChanged(true);
          setAudioStatus('запись готова ✓');
          stream.getTracks().forEach((t) => t.stop());
        };
        mr.start();
        mediaRecorderRef.current = mr;
        setRecording(true);
        setAudioStatus('идёт запись…');
      } catch {
        setAudioStatus('Микрофон недоступен. Разрешите доступ к микрофону в браузере или загрузите готовый аудиофайл.');
      }
    } else {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  async function onAudioFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setAudio(await fileToBase64(file));
    setAudioChanged(true);
    setAudioStatus('аудиофайл загружен ✓');
    if (audioFileRef.current) audioFileRef.current.value = '';
  }

  function removeAudio() {
    setAudio(null);
    setAudioChanged(true);
    setAudioStatus('записи нет');
  }

  // ---------- сохранение ----------
  async function submit() {
    if (!en.trim() || !ru.trim()) return setError('Заполните слово и перевод.');
    if (recording) return setError('Сначала остановите запись.');
    setError('');
    setSaving(true);
    try {
      const changes = { en: en.trim(), ru: ru.trim() };
      if (!editing || imageChanged) changes.image = image;
      if (!editing || audioChanged) changes.audio = audio;
      const err = await onSubmit(changes);
      if (err) {
        setError(err);
      } else if (resetOnSuccess) {
        setEn('');
        setRu('');
        setImage(null);
        setAudio(null);
        setImageChanged(false);
        setAudioChanged(false);
        setSearchResults([]);
        setSearchStatus('');
        setAudioStatus('записи нет');
      }
    } catch (e) {
      setError(e.message || 'Ошибка сети.');
    } finally {
      setSaving(false);
    }
  }

  return (
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
        <button type="button" className="btn secondary small" onClick={translate} disabled={translating}>
          {translating ? 'Перевожу…' : 'Перевести автоматически'}
        </button>
      </div>

      <span className="field-label">Картинка</span>
      {image ? (
        <div className="selected-preview">
          <img src={image.thumb} alt="" />
          <div>
            {image.credit ? (
              <div className="credit">
                Фото:{' '}
                <a href={image.creditLink} target="_blank" rel="noopener noreferrer">
                  {image.credit}
                </a>{' '}
                / Unsplash
              </div>
            ) : (
              <div className="credit">{image.emoji ? `Эмодзи ${image.emoji}` : 'Своя картинка'}</div>
            )}
            <button
              type="button"
              className="btn danger small"
              onClick={() => {
                setImage(null);
                setImageChanged(true);
              }}
            >
              Убрать картинку
            </button>
          </div>
        </div>
      ) : (
        <div className="note" style={{ marginTop: 0 }}>
          Картинка не выбрана.
        </div>
      )}

      <div className="tabs">
        <button type="button" className={`tab-btn ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
          Своя картинка
        </button>
        <button type="button" className={`tab-btn ${tab === 'emoji' ? 'active' : ''}`} onClick={() => setTab('emoji')}>
          Эмодзи
        </button>
        <button type="button" className={`tab-btn ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>
          Поиск Unsplash
        </button>
      </div>

      {tab === 'upload' && (
        <div className="tab-panel">
          <div className="note" style={{ marginTop: 0 }}>
            Выберите файл с картинкой (JPG, PNG, WebP) на вашем компьютере — он автоматически уменьшится и сохранится на сайте.
          </div>
          <div className="picker-row" style={{ marginTop: 8 }}>
            <input type="file" accept="image/*" ref={imageFileRef} onChange={onImageFile} />
            {processingImage && <span className="audio-status">обрабатываю…</span>}
          </div>
        </div>
      )}

      {tab === 'emoji' && (
        <div className="tab-panel">
          {EMOJI_GROUPS.map((g) => (
            <div key={g.title}>
              <div className="field-label" style={{ marginTop: 6 }}>
                {g.title}
              </div>
              <div className="emoji-grid">
                {g.items.map((e) => (
                  <button type="button" key={e} className="emoji-btn" onClick={() => pickEmoji(e)}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="picker-row" style={{ marginTop: 10 }}>
            <input
              placeholder="или вставьте свой эмодзи"
              value={customEmoji}
              onChange={(e) => setCustomEmoji(e.target.value)}
              style={{ maxWidth: 220 }}
            />
            <button
              type="button"
              className="btn secondary small"
              onClick={() => {
                const g = firstGrapheme(customEmoji);
                if (g) pickEmoji(g);
              }}
            >
              Использовать
            </button>
          </div>
          <div className="note" style={{ marginTop: 0 }}>
            Эмодзи с клавиатуры: на Mac — Ctrl+Cmd+Пробел, на Windows — Win+точка.
          </div>
        </div>
      )}

      {tab === 'search' && (
        <div className="tab-panel">
          <div className="picker-row">
            <button type="button" className="btn secondary small" onClick={aiSearch} disabled={searching}>
              {searching ? 'Ищу…' : 'Подобрать картинки (анализ слова ИИ)'}
            </button>
            <input
              placeholder="или свой запрос по-английски…"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              style={{ maxWidth: 220 }}
            />
            <button
              type="button"
              className="btn secondary small"
              onClick={() => manualQuery.trim() && runSearch(manualQuery.trim())}
              disabled={searching}
            >
              Найти
            </button>
          </div>
          {searchStatus && (
            <div className="note" style={{ marginTop: 0 }}>
              {searchStatus}
            </div>
          )}
          <div className="image-grid">
            {searchResults.map((r) => (
              <button
                type="button"
                key={r.id}
                className={`thumb-wrap ${image && image.id === r.id ? 'selected' : ''}`}
                onClick={() => pickSearchResult(r)}
              >
                <img src={r.thumb} alt="" />
              </button>
            ))}
          </div>
          <div className="note">
            Фото Unsplash подгружаются с зарубежных серверов: у учеников в России они могут открываться медленно или не
            открываться совсем. Надёжнее — своя картинка или эмодзи.
          </div>
        </div>
      )}

      <span className="field-label" style={{ marginTop: 14 }}>
        Произношение
      </span>
      <div className="picker-row">
        <button type="button" className="btn secondary small" onClick={toggleRecording}>
          {recording ? '⏹ Остановить запись' : audio ? '🎙 Записать заново' : '🎙 Записать произношение'}
        </button>
        <button type="button" className="btn secondary small" onClick={() => audioFileRef.current.click()}>
          Загрузить аудиофайл
        </button>
        <input ref={audioFileRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={onAudioFile} />
        {audio && !recording && (
          <>
            <button type="button" className="btn secondary small" onClick={() => new Audio(audio).play().catch(() => {})}>
              ▶ Прослушать
            </button>
            <button type="button" className="btn danger small" onClick={removeAudio}>
              Удалить запись
            </button>
          </>
        )}
        <span className="audio-status">
          {recording && <span className="rec-dot"></span>}
          {audioStatus}
        </span>
      </div>

      <div className="picker-row" style={{ marginTop: 12 }}>
        <button type="button" className="btn" onClick={submit} disabled={saving}>
          {saving ? 'Сохраняю…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn secondary" onClick={onCancel} disabled={saving}>
            Отмена
          </button>
        )}
      </div>
      {error && <div className="error-note">{error}</div>}
    </div>
  );
}
