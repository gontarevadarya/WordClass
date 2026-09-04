import { NextResponse } from 'next/server';
import { getJSON } from '@/lib/store';
import { createStudentToken } from '@/lib/session';
import { STUDENT_COOKIE } from '@/lib/auth';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const pin = (body.pin || '').trim();
  if (!pin) {
    return NextResponse.json({ error: 'Введите PIN-код.' }, { status: 400 });
  }
  const students = await getJSON('students', []);
  const student = students.find((s) => s.pin === pin);
  if (!student) {
    return NextResponse.json({ error: 'PIN не найден. Проверьте код у учителя.' }, { status: 401 });
  }
  const token = createStudentToken(student.id);
  const res = NextResponse.json({ student: { id: student.id, name: student.name } });
  res.cookies.set(STUDENT_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
