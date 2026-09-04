import { NextResponse } from 'next/server';
import { getJSON, setJSON } from '@/lib/store';
import { isThisStudent } from '@/lib/auth';

export async function PATCH(req, { params }) {
  if (!isThisStudent(params.id)) {
    return NextResponse.json({ error: 'Редактировать может только сам ученик.' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const folders = await getJSON('tasks:' + params.id, []);
  const folder = folders.find((f) => f.id === params.folderId);
  if (!folder) return NextResponse.json({ error: 'Папка не найдена.' }, { status: 404 });
  if (typeof body.name === 'string') folder.name = body.name.trim() || folder.name;
  if (typeof body.content === 'string') folder.content = body.content;
  folder.updatedAt = Date.now();
  await setJSON('tasks:' + params.id, folders);
  return NextResponse.json({ folder });
}

export async function DELETE(req, { params }) {
  if (!isThisStudent(params.id)) {
    return NextResponse.json({ error: 'Удалять может только сам ученик.' }, { status: 403 });
  }
  const folders = (await getJSON('tasks:' + params.id, [])).filter((f) => f.id !== params.folderId);
  await setJSON('tasks:' + params.id, folders);
  return NextResponse.json({ ok: true });
}
