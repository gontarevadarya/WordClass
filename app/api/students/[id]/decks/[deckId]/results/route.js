import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getJSON, setJSON } from '@/lib/store';
import { isTeacherRequest, isThisStudent, canAccessStudent } from '@/lib/auth';

export async function GET(req, { params }) {
  if (!canAccessStudent(params.id)) {
    return NextResponse.json({ error: 'Нет доступа.' }, { status: 403 });
  }
  const results = await getJSON(`results:${params.id}:${params.deckId}`, []);
  return NextResponse.json({ results });
}

export async function POST(req, { params }) {
  if (!isThisStudent(params.id)) {
    return NextResponse.json({ error: 'Публиковать результат может только сам ученик.' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const correct = Number.isFinite(body.correct) ? body.correct : 0;
  const mistakes = Number.isFinite(body.mistakes) ? body.mistakes : 0;
  const results = await getJSON(`results:${params.id}:${params.deckId}`, []);
  results.push({ id: nanoid(10), correct, mistakes, date: Date.now() });
  await setJSON(`results:${params.id}:${params.deckId}`, results);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может очищать результаты.' }, { status: 403 });
  }
  await setJSON(`results:${params.id}:${params.deckId}`, []);
  return NextResponse.json({ ok: true });
}
