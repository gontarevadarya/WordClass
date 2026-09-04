import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getJSON, setJSON } from '@/lib/store';
import { isTeacherRequest } from '@/lib/auth';
import { generateUniquePin } from '@/lib/students';

export async function GET() {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может видеть список учеников.' }, { status: 403 });
  }
  const students = await getJSON('students', []);
  return NextResponse.json({ students });
}

export async function POST(req) {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может добавлять учеников.' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const name = (body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Введите имя ученика.' }, { status: 400 });
  }
  const students = await getJSON('students', []);
  const pin = await generateUniquePin();
  const student = { id: nanoid(10), name, pin, createdAt: Date.now() };
  students.push(student);
  await setJSON('students', students);
  return NextResponse.json({ student });
}
