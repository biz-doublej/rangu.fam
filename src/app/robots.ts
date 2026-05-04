import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/auth/',
          '/settings/',
          '/m/', // 멤버 페이지는 서브도메인으로만 노출
        ],
      },
    ],
    sitemap: [
      'https://rangu-fam.com/sitemap.xml',
      'https://irang.wiki/sitemap.xml',
    ],
  }
}
