import { NextResponse } from 'next/server';
import { getJSON, setJSON, deleteKey } from '@/lib/store';
import { isTeacherRequest } from '@/lib/auth';

export async function DELETE(req, { params }) {
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
}
