'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentBadge({ onStudent }) {
  const [student, setStudent] = useState(null);
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/student/me')
      .then((r) => r.json())
      .then((d) => {
        setStudent(d.student);
        setChecked(true);
        if (onStudent) onStudent(d.student);
      })
      .catch(() => setChecked(true));
  }, [onStudent]);

  async function logout() {
    await fetch('/api/student-logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  if (!checked) return <div className="teacher-toggle">&nbsp;</div>;

  if (!student) {
    return (
      <div className="teacher-toggle">
        <a className="link-like" href="/student-login">
          Войти по PIN
        </a>
      </div>
    );
  }

  return (
    <div className="teacher-toggle">
      <span className="teacher-badge">{student.name}</span>{' '}
      <button className="link-like" onClick={logout}>
        Выйти
      </button>
    </div>
  );
}
