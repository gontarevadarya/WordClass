import { NextResponse } from 'next/server';

// Превращаем технические ошибки базы данных в понятные сообщения.
function friendlyMessage(err) {
  const m = String((err && err.message) || '');
  if (/max retries|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|Connection is closed|ECONNRESET/i.test(m)) {
    return 'Нет связи с базой данных. Проверьте, что Redis запущен и адрес REDIS_URL указан верно.';
  }
  if (/WRONGPASS|invalid or missing auth token|NOAUTH|Unauthorized/i.test(m)) {
    return 'База данных не приняла пароль/токен доступа. Проверьте REDIS_URL (или токен Upstash). Подробности: ' + m;
  }
  return m || 'Внутренняя ошибка сервера.';
}

// Оборачивает обработчик маршрута: любая неожиданная ошибка возвращается как JSON
// с читаемым текстом, а не как «голая» страница 500 (из-за неё кнопки раньше зависали).
export function withErrorHandling(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      // Служебный сигнал Next.js («страница динамическая») — не ошибка, пробрасываем дальше.
      if (err && err.digest === 'DYNAMIC_SERVER_USAGE') throw err;
      console.error('API route error:', err);
      return NextResponse.json({ error: friendlyMessage(err) }, { status: 500 });
    }
  };
}
