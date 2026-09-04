import { NextResponse } from 'next/server';
import { createTeacherToken } from '@/lib/session';
import { TEACHER_COOKIE } from '@/lib/auth';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const password = body.password;
  const expected = process.env.TEACHER_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { error: 'На сервере не задан пароль учителя (переменная окружения TEACHER_PASSWORD).' },
      { status: 500 }
    );
  }
  if (!password || password !== expected) {
    return NextResponse.json({ error: 'Неверный пароль.' }, { status: 401 });
  }

  const token = createTeacherToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TEACHER_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
