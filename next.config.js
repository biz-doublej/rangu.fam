/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // 브라우저 확장 프로그램으로 인한 hydration 경고 억제
  reactStrictMode: false,
  // 개발 모드에서 특정 경고 무시
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      // 개발 서버 설정
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
  }),
}

module.exports = nextConfig 