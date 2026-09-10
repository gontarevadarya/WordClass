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
