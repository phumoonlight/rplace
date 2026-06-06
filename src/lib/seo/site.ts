export const SITE_NAME = 'r/place clone'

export const SITE_DESCRIPTION =
  'A free, collaborative pixel canvas inspired by Reddit r/place. Place tiles, level up, and build pixel art with players around the world on a shared landscape or portrait canvas.'

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  'http://localhost:3000'

export const SITE_URL = rawSiteUrl.replace(/\/$/, '')
