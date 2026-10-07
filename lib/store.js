import { Redis as UpstashRedis } from '@upstash/redis';
import IORedis from 'ioredis';

// Хранилище работает в двух режимах:
//  1) REDIS_URL  — обычный Redis (свой сервер в России, docker-compose, управляемый Redis хостера)
//  2) Upstash REST (UPSTASH_REDIS_REST_URL/TOKEN или KV_REST_API_URL/TOKEN) — как на Vercel
let client = null;
let mode = null;

function getClient() {
  if (client) return client;

  if (process.env.REDIS_URL) {
    client = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 });
    client.on('error', (e) => console.error('Redis error:', e.message));
    mode = 'redis';
    return client;
  }

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      'База данных не настроена: задайте REDIS_URL (свой Redis) либо UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN (Upstash).'
    );
  }
  client = new UpstashRedis({ url, token });
  mode = 'upstash';
  return client;
}

export async function getJSON(key, fallback) {
  const c = getClient();
  const value = await c.get(key);
  if (value === null || value === undefined) return fallback;
  // Upstash сам разбирает JSON-строки; ioredis всегда отдаёт строку.
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

export async function setJSON(key, value) {
  const c = getClient();
  await c.set(key, JSON.stringify(value));
  return true;
}

export async function deleteKey(key) {
  const c = getClient();
  await c.del(key);
  return true;
}

export function storeMode() {
  getClient();
  return mode;
}
