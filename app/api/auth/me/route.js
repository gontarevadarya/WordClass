import { NextResponse } from 'next/server';
import { isTeacherRequest } from '@/lib/auth';

export async function GET() {
  return NextResponse.json({ isTeacher: isTeacherRequest() });
}
