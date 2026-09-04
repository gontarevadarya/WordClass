import { NextResponse } from 'next/server';
import { isTeacherRequest } from '@/lib/auth';

export async function GET(req) {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может искать картинки.' }, { status: 403 });
  }
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'На сервере не задан UNSPLASH_ACCESS_KEY.' },
      { status: 500 }
    );
  }
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim();
  if (!query) {
    return NextResponse.json({ error: 'Пустой запрос.' }, { status: 400 });
  }

  const upstream = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=8&orientation=squarish`,
    { headers: { Authorization: `Client-ID ${key}` } }
  );
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Unsplash вернул ошибку ${upstream.status}.` },
      { status: 502 }
    );
  }
  const data = await upstream.json();
  const results = (data.results || []).map((r) => ({
    id: r.id,
    thumb: r.urls.thumb,
    full: r.urls.regular,
    credit: (r.user && r.user.name) || 'Unsplash',
    creditLink:
      ((r.user && r.user.links && r.user.links.html) || 'https://unsplash.com') +
      '?utm_source=slovoklass&utm_medium=referral',
    downloadLocation: r.links && r.links.download_location,
  }));
  return NextResponse.json({ results });
}

// Called once a teacher actually picks a photo, per Unsplash API guidelines
// (triggers their required "download" tracking event) — access key never leaves the server.
export async function POST(req) {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Не авторизовано.' }, { status: 403 });
  }
  const key = process.env.UNSPLASH_ACCESS_KEY;
  const body = await req.json().catch(() => ({}));
  if (key && body.downloadLocation) {
    fetch(`${body.downloadLocation}?client_id=${key}`).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
