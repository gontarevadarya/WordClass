'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherToggle({ onStatus }) {
  const [isTeacher, setIsTeacher] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        setIsTeacher(!!d.isTeacher);
        if (onStatus) onStatus(!!d.isTeacher);
      })
      .catch(() => {
        setIsTeacher(false);
        if (onStatus) onStatus(false);
      });
  }, [onStatus]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsTeacher(false);
    if (onStatus) onStatus(false);
    router.push('/');
    router.refresh();
  }

  if (isTeacher === null) return <div className="teacher-toggle">&nbsp;</div>;

  return (
    <div className="teacher-toggle">
      {isTeacher ? (
        <>
          <span className="teacher-badge">Режим учителя ✓</span>{' '}
          <button className="link-like" onClick={logout}>
            Выйти
          </button>
        </>
      ) : (
        <a className="link-like" href="/login">
          Я учитель
        </a>
      )}
    </div>
  );
}
