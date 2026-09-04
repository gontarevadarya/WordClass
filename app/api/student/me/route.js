import { NextResponse } from 'next/server';
import { getStudentId } from '@/lib/auth';
import { getJSON } from '@/lib/store';

export async function GET() {
  const studentId = getStudentId();
  if (!studentId) return NextResponse.json({ student: null });
  const students = await getJSON('students', []);
  const student = students.find((s) => s.id === studentId);
  if (!student) return NextResponse.json({ student: null });
  return NextResponse.json({ student: { id: student.id, name: student.name } });
}
