import { NextResponse } from 'next/server';
import { getJSON, setJSON, deleteKey } from '@/lib/store';
import { isTeacherRequest } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api';

export const DELETE = withErrorHandling(async (req, { params }) => {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может удалять учеников.' }, { status: 403 });
  }
  const { id } = params;
  const students = (await getJSON('students', [])).filter((s) => s.id !== id);
  await setJSON('students', students);

  const decks = await getJSON('decks:' + id, []);
  for (const d of decks) {
    await deleteKey(`words:${id}:${d.id}`);
    await deleteKey(`results:${id}:${d.id}`);
  }
  await deleteKey('decks:' + id);
  await deleteKey('tasks:' + id);

  return NextResponse.json({ ok: true });
});

export const PATCH = withErrorHandling(async (req, { params }) => {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может менять имя ученика.' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const name = (body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Имя не может быть пустым.' }, { status: 400 });
  const students = await getJSON('students', []);
  const student = students.find((s) => s.id === params.id);
  if (!student) return NextResponse.json({ error: 'Ученик не найден.' }, { status: 404 });
  student.name = name;
  await setJSON('students', students);
  return NextResponse.json({ student });
});
