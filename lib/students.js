import { getJSON } from '@/lib/store';

export async function generateUniquePin() {
  const students = await getJSON('students', []);
  const used = new Set(students.map((s) => s.pin));
  let pin;
  do {
    pin = String(Math.floor(1000 + Math.random() * 9000));
  } while (used.has(pin));
  return pin;
}
