import crypto from 'crypto';

const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is not set.');
  }
  return secret;
}

function sign(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verify(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  try {
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createTeacherToken() {
  return sign({ role: 'teacher', exp: Date.now() + THIRTY_DAYS_MS }, getSecret());
}

export function isTeacherToken(token) {
  const payload = verify(token, getSecret());
  return !!(payload && payload.role === 'teacher');
}

export function createStudentToken(studentId) {
  return sign({ role: 'student', studentId, exp: Date.now() + THIRTY_DAYS_MS }, getSecret());
}

// Returns the studentId if the token is valid, otherwise null.
export function readStudentToken(token) {
  const payload = verify(token, getSecret());
  if (payload && payload.role === 'student' && payload.studentId) return payload.studentId;
  return null;
}
