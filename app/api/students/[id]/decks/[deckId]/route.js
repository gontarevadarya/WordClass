import { NextResponse } from 'next/server';
import { getJSON, setJSON, deleteKey } from '@/lib/store';
import { isTeacherRequest } from '@/lib/auth';

export async function DELETE(req, { params }) {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может удалять папки со словами.' }, { status: 403 });
  }
  const decks = (await getJSON('decks:' + params.id, [])).filter((d) => d.id !== params.deckId);
  await setJSON('decks:' + params.id, decks);
  await deleteKey(`words:${params.id}:${params.deckId}`);
  await deleteKey(`results:${params.id}:${params.deckId}`);
  return NextResponse.json({ ok: true });
}
