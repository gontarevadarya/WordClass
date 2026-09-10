import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getJSON, setJSON } from '@/lib/store';
import { isTeacherRequest, canAccessStudent } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api';

export const GET = withErrorHandling(async (req, { params }) => {
  if (!canAccessStudent(params.id)) {
    return NextResponse.json({ error: 'Нет доступа.' }, { status: 403 });
  }
  const words = await getJSON(`words:${params.id}:${params.deckId}`, []);
  return NextResponse.json({ words });
});

export const POST = withErrorHandling(async (req, { params }) => {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может добавлять слова.' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const en = (body.en || '').trim();
  const ru = (body.ru || '').trim();
  if (!en || !ru) return NextResponse.json({ error: 'Заполните слово и перевод.' }, { status: 400 });

  const words = await getJSON(`words:${params.id}:${params.deckId}`, []);
  const word = { id: nanoid(10), en, ru, image: body.image || null, audio: body.audio || null };
  words.push(word);
  await setJSON(`words:${params.id}:${params.deckId}`, words);
  return NextResponse.json({ word });
});
