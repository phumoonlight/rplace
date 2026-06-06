import type { MetadataRoute } from 'next'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo/site'

const manifest = (): MetadataRoute.Manifest => ({
  name: SITE_NAME,
  short_name: 'r/place',
  description: SITE_DESCRIPTION,
  start_url: '/',
  display: 'standalone',
  orientation: 'any',
  background_color: '#0a0a0a',
  theme_color: '#0a0a0a',
  categories: ['games', 'entertainment', 'social'],
})

export default manifest
