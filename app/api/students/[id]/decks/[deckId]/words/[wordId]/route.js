import { NextResponse } from 'next/server';
import { getJSON, setJSON } from '@/lib/store';
import { isTeacherRequest } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api';

export const DELETE = withErrorHandling(async (req, { params }) => {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может удалять слова.' }, { status: 403 });
  }
  const words = (await getJSON(`words:${params.id}:${params.deckId}`, [])).filter((w) => w.id !== params.wordId);
  await setJSON(`words:${params.id}:${params.deckId}`, words);
  return NextResponse.json({ ok: true });
});

// Изменение слова: можно прислать любые из полей en, ru, image, audio.
// image: null / audio: null — убрать картинку / запись.
export const PATCH = withErrorHandling(async (req, { params }) => {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может менять слова.' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const words = await getJSON(`words:${params.id}:${params.deckId}`, []);
  const word = words.find((w) => w.id === params.wordId);
  if (!word) return NextResponse.json({ error: 'Слово не найдено.' }, { status: 404 });

  if (typeof body.en === 'string') {
    const en = body.en.trim();
    if (!en) return NextResponse.json({ error: 'Слово не может быть пустым.' }, { status: 400 });
    word.en = en;
  }
  if (typeof body.ru === 'string') {
    const ru = body.ru.trim();
    if (!ru) return NextResponse.json({ error: 'Перевод не может быть пустым.' }, { status: 400 });
    word.ru = ru;
  }
  if ('image' in body) word.image = body.image || null;
  if ('audio' in body) word.audio = body.audio || null;

  await setJSON(`words:${params.id}:${params.deckId}`, words);
  return NextResponse.json({ word });
});
