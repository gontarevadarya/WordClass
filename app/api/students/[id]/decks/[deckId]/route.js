import { NextResponse } from 'next/server';
import { getJSON, setJSON, deleteKey } from '@/lib/store';
import { isTeacherRequest } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api';

export const DELETE = withErrorHandling(async (req, { params }) => {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может удалять папки со словами.' }, { status: 403 });
  }
  const decks = (await getJSON('decks:' + params.id, [])).filter((d) => d.id !== params.deckId);
  await setJSON('decks:' + params.id, decks);
  await deleteKey(`words:${params.id}:${params.deckId}`);
  await deleteKey(`results:${params.id}:${params.deckId}`);
  return NextResponse.json({ ok: true });
});

export const PATCH = withErrorHandling(async (req, { params }) => {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может переименовывать папки.' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const name = (body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Название не может быть пустым.' }, { status: 400 });
  const decks = await getJSON('decks:' + params.id, []);
  const deck = decks.find((d) => d.id === params.deckId);
  if (!deck) return NextResponse.json({ error: 'Папка не найдена.' }, { status: 404 });
  deck.name = name;
  await setJSON('decks:' + params.id, decks);
  return NextResponse.json({ deck });
});
