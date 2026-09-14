'use client';
import { useEffect, useState } from 'react';
import TeacherToggle from './components/TeacherToggle';

export default function HomePage() {
  const [isTeacher, setIsTeacher] = useState(null);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    fetch('/api/student/me')
      .then((r) => r.json())
      .then((d) => setStudent(d.student))
      .catch(() => setStudent(null));
  }, []);

  return (
    <div className="app-shell">
      <header className="top">
        <div>
          <h1>WordClass</h1>
          <div className="tag">папки с английскими словами · открытый доступ по ссылке</div>
        </div>
        <TeacherToggle onStatus={setIsTeacher} />
      </header>

      {isTeacher ? (
        <div className="add-word-box" style={{ marginTop: 22 }}>
          <h3 style={{ marginBottom: 8 }}>Режим учителя</h3>
          <p className="note" style={{ marginTop: 0 }}>
            Управляйте учениками, их папками со словами и PIN-кодами доступа.
          </p>
          <a className="btn" href="/students">
            Мои ученики →
          </a>
        </div>
      ) : student ? (
        <div className="add-word-box" style={{ marginTop: 22 }}>
          <h3 style={{ marginBottom: 8 }}>Здравствуйте, {student.name}!</h3>
          <a className="btn" href="/student">
            Перейти в свой кабинет →
          </a>
        </div>
      ) : (
        <div className="add-word-box" style={{ marginTop: 22 }}>
          <h3 style={{ marginBottom: 8 }}>Вход для ученика</h3>
          <p className="note" style={{ marginTop: 0 }}>
            Введите PIN-код, который вам дал учитель.
          </p>
          <a className="btn" href="/student-login">
            У меня есть PIN →
          </a>
        </div>
      )}

      <footer className="site">
        Фото:{' '}
        <a href="https://unsplash.com/?utm_source=slovoklass&utm_medium=referral" target="_blank" rel="noopener noreferrer">
          Unsplash
        </a>
      </footer>
    </div>
  );
}
