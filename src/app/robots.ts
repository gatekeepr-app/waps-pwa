import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://waps.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/explore', '/share/', '/login'],
        disallow: [
          '/api/',
          '/bookmarks',
          '/profile',
          '/add',
          '/tags',
          '/wap/',
          '/reader/',
          '/reset-password'
        ]
      }
    ],
    sitemap: `${BASE_URL}/sitemap.xml`
  }
}
