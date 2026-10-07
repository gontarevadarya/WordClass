'use client';
import { useState, useRef } from 'react';
import TeacherToggle from '../components/TeacherToggle';
import { exportAll, importAll, summarize, validateBackup } from '../lib/backup';

function describe(sum) {
  return `учеников: ${sum.students}, папок со словами: ${sum.decks}, слов: ${sum.words}, результатов: ${sum.results}, заданий: ${sum.tasks}`;
}

export default function BackupPage() {
  const [isTeacher, setIsTeacher] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [doneText, setDoneText] = useState('');
  const [warnings, setWarnings] = useState([]);
  const fileRef = useRef(null);

  const call = (url, opts) => fetch(url, opts);

  async function download() {
    setBusy(true);
    setError('');
    setDoneText('');
    setWarnings([]);
    try {
      const backup = await exportAll(call, setProgress);
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `wordclass-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      setDoneText(`Копия сохранена в файл. В ней — ${describe(summarize(backup))}.`);
      setProgress('');
    } catch (e) {
      setError(e.message || 'Не удалось создать копию.');
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    const file = fileRef.current && fileRef.current.files && fileRef.current.files[0];
    if (!file) return setError('Сначала выберите файл резервной копии.');
    setBusy(true);
    setError('');
    setDoneText('');
    setWarnings([]);
    try {
      let backup;
      try {
        backup = JSON.parse(await file.text());
      } catch {
        throw new Error('Не удалось прочитать файл. Это точно файл резервной копии WordClass (.json)?');
      }
      validateBackup(backup);
      const sum = summarize(backup);
      if (!confirm(`Восстановить данные из копии?\n\nВ файле: ${describe(sum)}.\n\nУченики с теми же данными будут заменены.`)) {
        setBusy(false);
        return;
      }
      const result = await importAll(backup, call, setProgress);
      setWarnings(result.warnings);
      setDoneText(`Готово! Восстановлено: ${describe(result.summary)}.`);
      setProgress('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setError(e.message || 'Не удалось восстановить данные.');
    } finally {
      setBusy(false);
    }
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
      <a className="crumb" href="/students">
        ← Мои ученики
      </a>
      <header className="top">
        <h1>Резервная копия и перенос</h1>
        <TeacherToggle onStatus={setIsTeacher} />
      </header>

      <div className="add-word-box">
        <h3 style={{ marginTop: 0 }}>1. Скачать копию всех данных</h3>
        <p className="note" style={{ marginTop: 0 }}>
          В один файл попадёт всё: ученики и их PIN-коды, папки со словами, картинки, записи голоса, результаты, задания.
          Нажмите на <b>старом</b> сайте, чтобы перенести данные на новый (или просто для надёжности).
        </p>
        <button className="btn" onClick={download} disabled={busy}>
          {busy ? 'Подождите…' : 'Скачать резервную копию'}
        </button>
      </div>

      <div className="add-word-box">
        <h3 style={{ marginTop: 0 }}>2. Восстановить из копии</h3>
        <p className="note" style={{ marginTop: 0 }}>
          Нажмите на <b>новом</b> сайте и выберите скачанный файл. Ученики с теми же данными будут заменены, остальные не
          тронутся. PIN-коды останутся прежними.
        </p>
        <div className="picker-row">
          <input type="file" accept=".json,application/json" ref={fileRef} />
        </div>
        <button className="btn" onClick={restore} disabled={busy}>
          {busy ? 'Подождите…' : 'Восстановить данные'}
        </button>
      </div>

      {progress && <div className="note">{progress}</div>}
      {error && <div className="error-note">{error}</div>}
      {doneText && <div className="win-banner">{doneText}</div>}
      {warnings.map((w, i) => (
        <div key={i} className="error-note">
          {w}
        </div>
      ))}
    </div>
  );
}
