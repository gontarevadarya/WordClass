'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import TeacherToggle from '../../../components/TeacherToggle';

export default function StudentTasksPage() {
  const { id } = useParams();
  const [isTeacher, setIsTeacher] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [folders, setFolders] = useState([]);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    const [sRes, tRes] = await Promise.all([fetch('/api/students'), fetch(`/api/students/${id}/tasks`)]);
    if (sRes.ok) {
      const sData = await sRes.json();
      const found = (sData.students || []).find((s) => s.id === id);
      setStudentName(found ? found.name : '');
    }
    const tData = await tRes.json();
    setFolders((tData.folders || []).slice().sort((a, b) => b.updatedAt - a.updatedAt));
  }, [id]);

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

  async function upload(e) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return setError('Выберите файл (.docx или .txt).');
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (name.trim()) formData.append('name', name.trim());
      const res = await fetch(`/api/students/${id}/tasks/upload`, { method: 'POST', body: formData });
      let data = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Сервер ответил неожиданно (код ${res.status}).`);
      }
      if (!res.ok) return setError(data.error || 'Не удалось загрузить файл.');
      setName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (err) {
      setError(err.message || 'Ошибка сети.');
    } finally {
      setUploading(false);
    }
  }

  async function deleteFolder(folderId) {
    if (!confirm('Удалить это задание? Ученик потеряет доступ к нему.')) return;
    await fetch(`/api/students/${id}/tasks/${folderId}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="app-shell">
      <a className="crumb" href={`/students/${id}`}>
        ← {studentName || 'Ученик'}
      </a>
      <header className="top">
        <h1>{studentName || '…'} — задания</h1>
        <TeacherToggle onStatus={setIsTeacher} />
      </header>

      <div className="add-word-box">
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Загрузить файл с заданием</h3>
        <p className="note" style={{ marginTop: 0 }}>
          Загрузите .docx или .txt — текст из файла попадёт в новую папку с заданием, которую ученик сможет открыть и
          свободно редактировать (дописывать ответы, менять текст).
        </p>
        <form onSubmit={upload}>
          <div className="row">
            <input type="file" accept=".docx,.txt" ref={fileInputRef} />
            <input
              placeholder="Название (необязательно)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ minWidth: 200 }}
            />
          </div>
          <button className="btn" type="submit" disabled={uploading}>
            {uploading ? 'Загружаю…' : 'Загрузить задание'}
          </button>
        </form>
        {error && <div className="error-note">{error}</div>}
      </div>

      <h3>Задания этого ученика</h3>
      {folders.length === 0 && <div className="empty">Пока нет ни одного задания.</div>}
      <div className="word-list">
        {folders.map((f) => (
          <div key={f.id}>
            <div className="word-row">
              <div className="txt">
                <div className="en">
                  {f.name} {f.fromTeacher ? '' : '(создано учеником)'}
                </div>
                <div className="ru">Обновлено: {new Date(f.updatedAt).toLocaleString('ru-RU')}</div>
              </div>
              <div className="row-actions">
                <button className="icon-btn" onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                  {expanded === f.id ? 'Скрыть' : 'Просмотреть'}
                </button>
                <button className="icon-btn" onClick={() => deleteFolder(f.id)}>
                  ✕
                </button>
              </div>
            </div>
            {expanded === f.id && (
              <div
                style={{
                  background: '#fff',
                  border: '1.5px solid var(--line)',
                  borderRadius: 10,
                  padding: 16,
                  margin: '4px 0 14px',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  maxHeight: 400,
                  overflowY: 'auto',
                }}
              >
                {f.content || <span className="note">Пусто.</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
