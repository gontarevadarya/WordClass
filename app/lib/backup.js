// Резервная копия и перенос данных. Логика общая для страницы /backup (браузер)
// и для автоматического теста: сюда передаётся функция fetchFn(url, options).

async function getJson(fetchFn, url) {
  const res = await fetchFn(url);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* не JSON */
  }
  if (!res.ok) throw new Error((data && data.error) || `Ошибка ${res.status} при запросе ${url}`);
  return data;
}

async function postJson(fetchFn, url, body) {
  const res = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* не JSON */
  }
  if (!res.ok) throw new Error((data && data.error) || `Ошибка ${res.status} при записи данных`);
  return data;
}

// Собирает ВСЕ данные (под учителем) в один объект.
export async function exportAll(fetchFn, onProgress = () => {}) {
  const { students } = await getJson(fetchFn, '/api/students');
  const backup = { app: 'wordclass', version: 1, exportedAt: new Date().toISOString(), students: [] };

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    onProgress(`Читаю данные: ученик ${i + 1} из ${students.length} — ${s.name}`);
    const { decks } = await getJson(fetchFn, `/api/students/${s.id}/decks`);
    const { folders } = await getJson(fetchFn, `/api/students/${s.id}/tasks`);
    const deckData = [];
    for (const d of decks) {
      const { words } = await getJson(fetchFn, `/api/students/${s.id}/decks/${d.id}/words`);
      const { results } = await getJson(fetchFn, `/api/students/${s.id}/decks/${d.id}/results`);
      deckData.push({ id: d.id, name: d.name, createdAt: d.createdAt, words, results });
    }
    backup.students.push({
      id: s.id,
      name: s.name,
      pin: s.pin,
      createdAt: s.createdAt,
      decks: deckData,
      tasks: folders,
    });
  }
  return backup;
}

export function summarize(backup) {
  let decks = 0,
    words = 0,
    results = 0,
    tasks = 0;
  for (const s of backup.students || []) {
    tasks += (s.tasks || []).length;
    for (const d of s.decks || []) {
      decks += 1;
      words += (d.words || []).length;
      results += (d.results || []).length;
    }
  }
  return { students: (backup.students || []).length, decks, words, results, tasks };
}

export function validateBackup(backup) {
  if (!backup || backup.app !== 'wordclass' || !Array.isArray(backup.students)) {
    throw new Error('Это не файл резервной копии WordClass.');
  }
  if (backup.version !== 1) throw new Error('Неизвестная версия резервной копии.');
}

// Записывает копию на сайт. Ученики с теми же id заменяются, остальные не трогаются.
export async function importAll(backup, fetchFn, onProgress = () => {}) {
  validateBackup(backup);
  const warnings = [];
  const total = backup.students.length;
  for (let i = 0; i < total; i++) {
    const s = backup.students[i];
    onProgress(`Восстанавливаю: ученик ${i + 1} из ${total} — ${s.name}`);
    const decks = s.decks || [];
    const r = await postJson(fetchFn, '/api/import', {
      type: 'student',
      student: { id: s.id, name: s.name, pin: s.pin, createdAt: s.createdAt },
      decks: decks.map((d) => ({ id: d.id, name: d.name, createdAt: d.createdAt })),
      tasks: s.tasks || [],
    });
    if (r.pinChanged) {
      warnings.push(`У ученика «${s.name}» PIN ${s.pin} уже занят другим учеником — выдан новый PIN: ${r.pin}`);
    }
    for (let j = 0; j < decks.length; j++) {
      const d = decks[j];
      onProgress(`Восстанавливаю: ${s.name} — папка ${j + 1} из ${decks.length} («${d.name}»)`);
      await postJson(fetchFn, '/api/import', {
        type: 'deck',
        studentId: s.id,
        deckId: d.id,
        words: d.words || [],
        results: d.results || [],
      });
    }
  }
  return { warnings, summary: summarize(backup) };
}
