import { NextResponse } from 'next/server';
import { getJSON, setJSON } from '@/lib/store';
import { isTeacherRequest } from '@/lib/auth';
import { generateUniquePin } from '@/lib/students';

export async function POST(req, { params }) {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может менять PIN.' }, { status: 403 });
  }
  const students = await getJSON('students', []);
  const student = students.find((s) => s.id === params.id);
  if (!student) return NextResponse.json({ error: 'Ученик не найден.' }, { status: 404 });
  student.pin = await generateUniquePin();
  await setJSON('students', students);
  return NextResponse.json({ student });
}
