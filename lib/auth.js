import { cookies } from 'next/headers';
import { isTeacherToken, readStudentToken } from '@/lib/session';

export const TEACHER_COOKIE = 'wc_teacher';
export const STUDENT_COOKIE = 'wc_student';

export function isTeacherRequest() {
  const token = cookies().get(TEACHER_COOKIE)?.value;
  return isTeacherToken(token);
}

// Returns the logged-in student's id, or null if not logged in as a student.
export function getStudentId() {
  const token = cookies().get(STUDENT_COOKIE)?.value;
  return readStudentToken(token);
}

// True if the current request is the teacher, or is the student whose id matches studentId.
export function canAccessStudent(studentId) {
  if (isTeacherRequest()) return true;
  return getStudentId() === studentId;
}

// True only if the current request is exactly this student (not the teacher).
export function isThisStudent(studentId) {
  return getStudentId() === studentId;
}
