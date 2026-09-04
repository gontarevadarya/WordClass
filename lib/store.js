import { Redis } from '@upstash/redis';

let redis = null;
function getRedis() {
  if (!redis) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        'Redis is not configured. In the Vercel dashboard, add a Redis/KV storage integration to this project so KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) are set.'
      );
    }
    redis = new Redis({ url, token });
  }
  return redis;
}

export async function getJSON(key, fallback) {
  const r = getRedis();
  const value = await r.get(key);
  if (value === null || value === undefined) return fallback;
  // @upstash/redis auto-parses JSON-looking strings; guard both cases.
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value;
}

export async function setJSON(key, value) {
  const r = getRedis();
  await r.set(key, JSON.stringify(value));
  return true;
}

export async function deleteKey(key) {
  const r = getRedis();
  await r.del(key);
  return true;
}
