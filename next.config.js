/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: 'localhost', pathname: '/**' },
    ],
  },
  // 정적 확장 프로그램에서 hydration 오류 방지
  reactStrictMode: false,
  // 개발 환경에서 특정 설정
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      // 페이지 유지 시간
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
  }),
}

module.exports = nextConfig 
