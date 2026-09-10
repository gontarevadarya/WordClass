import { NextResponse } from 'next/server';

// Wraps an App Router route handler so that any thrown error (e.g. Redis
// misconfiguration) comes back as a real JSON body with a readable message,
// instead of Next's generic HTML 500 page (which breaks client-side
// `res.json()` calls and used to make buttons hang forever).
export function withErrorHandling(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      console.error('API route error:', err);
      return NextResponse.json(
        { error: err && err.message ? err.message : 'Внутренняя ошибка сервера.' },
        { status: 500 }
      );
    }
  };
}
