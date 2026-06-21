/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloud Run / 컨테이너 배포용 standalone 출력
  output: 'standalone',
  // 워크스페이스 TS 패키지를 Next 가 트랜스파일 (랑구 택틱스 FE)
  transpilePackages: ['@rangu/proto-ts', '@rangu/battle-core', '@rangu/ui'],
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: 'rangu-fam.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.rangu-fam.com', pathname: '/**' },
      { protocol: 'https', hostname: 'irang.wiki', pathname: '/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/**' },
    ],
  },
  // 정적 확장 프로그램에서 hydration 오류 방지
  reactStrictMode: false,
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
  }),
  // 정적 페이지 → DoubleJ Account 의 공식 페이지로 영구 redirect
  async redirects() {
    return [
      {
        source: '/about/company',
        destination: 'https://accounts.doublej.app/company',
        permanent: true,
      },
      {
        source: '/privacy',
        destination: 'https://accounts.doublej.app/privacy',
        permanent: true,
      },
      {
        source: '/terms',
        destination: 'https://accounts.doublej.app/terms',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig

