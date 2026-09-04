'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StudentBadge from '../../../components/StudentBadge';

export default function TaskFolderPage() {
  const { folderId } = useParams();
  const router = useRouter();
  const [studentId, setStudentId] = useState(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  const saveTimer = useRef(null);

  const load = useCallback(async (sid) => {
    const res = await fetch(`/api/students/${sid}/tasks`);
    const data = await res.json();
    const folder = (data.folders || []).find((f) => f.id === folderId);
    if (folder) {
      setName(folder.name);
      setContent(folder.content || '');
    }
  }, [folderId]);

  useEffect(() => {
    fetch('/api/student/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.student) return router.push('/student-login');
        setStudentId(d.student.id);
        load(d.student.id);
      });
  }, [router, load]);

  function scheduleSave(sid, patch) {
    setStatus('Сохраняю…');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/students/${sid}/tasks/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      setStatus(res.ok ? 'Сохранено ✓' : 'Не удалось сохранить');
    }, 500);
  }

  function onNameChange(e) {
    const v = e.target.value;
    setName(v);
    if (studentId) scheduleSave(studentId, { name: v });
  }
  function onContentChange(e) {
    const v = e.target.value;
    setContent(v);
    if (studentId) scheduleSave(studentId, { content: v });
  }

  return (
    <div className="app-shell">
      <a className="crumb" href="/student">
        ← В мой кабинет
      </a>
      <header className="top">
        <input
          value={name}
          onChange={onNameChange}
          style={{
            font: 'inherit',
            fontFamily: "'Fraunces',serif",
            fontWeight: 600,
            fontSize: '2.1rem',
            border: 'none',
            background: 'transparent',
            outline: 'none',
            width: '100%',
          }}
        />
        <StudentBadge />
      </header>
      <div className="note" style={{ marginTop: 4 }}>{status || 'Пишите что угодно — сохраняется автоматически.'}</div>
      <textarea
        value={content}
        onChange={onContentChange}
        placeholder="Здесь можно писать ответы, заметки, тренировать предложения — всё, что нужно для задания…"
        style={{
          width: '100%',
          minHeight: '50vh',
          marginTop: 16,
          padding: 16,
          borderRadius: 12,
          border: '1.5px solid var(--line)',
          fontFamily: "'Inter',sans-serif",
          fontSize: '1rem',
          lineHeight: 1.6,
          background: '#fff',
          resize: 'vertical',
        }}
      />
    </div>
  );
}
