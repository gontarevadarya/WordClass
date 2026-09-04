import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getJSON, setJSON } from '@/lib/store';
import { isThisStudent, canAccessStudent } from '@/lib/auth';

export async function GET(req, { params }) {
  if (!canAccessStudent(params.id)) {
    return NextResponse.json({ error: 'Нет доступа.' }, { status: 403 });
  }
  const folders = await getJSON('tasks:' + params.id, []);
  return NextResponse.json({ folders });
}

export async function POST(req, { params }) {
  if (!isThisStudent(params.id)) {
    return NextResponse.json({ error: 'Создавать папки с заданиями может только сам ученик.' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const name = (body.name || 'Новое задание').trim() || 'Новое задание';
  const folders = await getJSON('tasks:' + params.id, []);
  const folder = { id: nanoid(10), name, content: '', createdAt: Date.now(), updatedAt: Date.now() };
  folders.push(folder);
  await setJSON('tasks:' + params.id, folders);
  return NextResponse.json({ folder });
}
