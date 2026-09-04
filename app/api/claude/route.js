import { NextResponse } from 'next/server';
import { isTeacherRequest } from '@/lib/auth';

export async function POST(req) {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Не авторизовано.' }, { status: 403 });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'Функции на базе ИИ (подбор запроса, автоперевод) не настроены на этом сайте — не задан ANTHROPIC_API_KEY.' },
      { status: 501 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const prompt = body.prompt || '';
  if (!prompt) return NextResponse.json({ error: 'Пустой запрос.' }, { status: 400 });

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!upstream.ok) {
    return NextResponse.json({ error: `Anthropic API вернул ошибку ${upstream.status}.` }, { status: 502 });
  }
  const data = await upstream.json();
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  return NextResponse.json({ text });
}
