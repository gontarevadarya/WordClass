import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getJSON, setJSON } from '@/lib/store';
import { isTeacherRequest, canAccessStudent } from '@/lib/auth';

export async function GET(req, { params }) {
  if (!canAccessStudent(params.id)) {
    return NextResponse.json({ error: 'Нет доступа.' }, { status: 403 });
  }
  const decks = await getJSON('decks:' + params.id, []);
  return NextResponse.json({ decks });
}

export async function POST(req, { params }) {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может создавать папки со словами.' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const name = (body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Название папки не может быть пустым.' }, { status: 400 });
  const decks = await getJSON('decks:' + params.id, []);
  const deck = { id: nanoid(10), name, createdAt: Date.now() };
  decks.push(deck);
  await setJSON('decks:' + params.id, decks);
  return NextResponse.json({ deck });
}
