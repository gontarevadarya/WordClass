/** @type {import('next').NextConfig} */
const nextConfig = {
  // Для сборки Docker-образа (свой сервер) включаем компактный standalone-режим.
  // На Vercel переменная не задана, поведение прежнее.
  output: process.env.BUILD_STANDALONE ? 'standalone' : undefined,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
};

module.exports = nextConfig;
