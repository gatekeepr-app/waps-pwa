import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://waps.app',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1
    },
    {
      url: 'https://waps.app/explore',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9
    },
    {
      url: 'https://waps.app/privacy',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3
    },
    {
      url: 'https://waps.app/terms',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3
    },
    {
      url: 'https://waps.app/contact',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3
    }
  ]
}
