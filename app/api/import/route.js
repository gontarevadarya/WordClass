import { NextResponse } from 'next/server';
import { getJSON, setJSON } from '@/lib/store';
import { isTeacherRequest } from '@/lib/auth';
import { generateUniquePin } from '@/lib/students';
import { withErrorHandling } from '@/lib/api';

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

// Восстановление данных из резервной копии (только учитель).
//  type: 'student' — запись/замена ученика, списка его папок и его заданий
//  type: 'deck'    — запись слов и результатов одной папки
export const POST = withErrorHandling(async (req) => {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может восстанавливать данные.' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Пустой запрос.' }, { status: 400 });

  if (body.type === 'student') {
    const s = body.student || {};
    if (!ID_RE.test(s.id || '') || typeof s.name !== 'string' || !s.name.trim()) {
      return NextResponse.json({ error: 'Некорректные данные ученика.' }, { status: 400 });
    }
    const decks = Array.isArray(body.decks) ? body.decks : [];
    for (const d of decks) {
      if (!ID_RE.test(d.id || '') || typeof d.name !== 'string') {
        return NextResponse.json({ error: 'Некорректные данные папки.' }, { status: 400 });
      }
    }
    const students = await getJSON('students', []);
    let pin = String(s.pin || '');
    let pinChanged = false;
    if (!pin || students.some((x) => x.pin === pin && x.id !== s.id)) {
      pin = await generateUniquePin();
      pinChanged = true;
    }
    const record = { id: s.id, name: s.name.trim(), pin, createdAt: s.createdAt || Date.now() };
    const idx = students.findIndex((x) => x.id === s.id);
    if (idx >= 0) students[idx] = record;
    else students.push(record);
    await setJSON('students', students);
    await setJSON(
      'decks:' + s.id,
      decks.map((d) => ({ id: d.id, name: d.name, createdAt: d.createdAt || Date.now() }))
    );
    await setJSON('tasks:' + s.id, Array.isArray(body.tasks) ? body.tasks : []);
    return NextResponse.json({ ok: true, pinChanged, pin });
  }

  if (body.type === 'deck') {
    if (!ID_RE.test(body.studentId || '') || !ID_RE.test(body.deckId || '')) {
      return NextResponse.json({ error: 'Некорректные идентификаторы.' }, { status: 400 });
    }
    const students = await getJSON('students', []);
    if (!students.some((x) => x.id === body.studentId)) {
      return NextResponse.json({ error: 'Сначала нужно восстановить ученика.' }, { status: 400 });
    }
    await setJSON(`words:${body.studentId}:${body.deckId}`, Array.isArray(body.words) ? body.words : []);
    await setJSON(`results:${body.studentId}:${body.deckId}`, Array.isArray(body.results) ? body.results : []);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Неизвестный тип запроса.' }, { status: 400 });
});
