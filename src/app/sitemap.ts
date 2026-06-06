import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/site'

const sitemap = (): MetadataRoute.Sitemap => {
  const now = new Date()
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 1,
    },
  ]
}

export default sitemap
