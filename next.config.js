/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost'],
  },
  // 브라우저 확장 프로그램으로 인한 hydration 경고 억제
  reactStrictMode: false,
  // 컴파일러 최적화
  compiler: {
    // 개발 모드에서 React DevTools 경고 감소
    ...(process.env.NODE_ENV === 'development' && {
      removeConsole: false,
    }),
  },
  // 개발 모드에서 특정 경고 무시
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      // 개발 서버 설정
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
    // Webpack 설정으로 경고 억제
    webpack: (config, { dev }) => {
      if (dev) {
        // 개발 모드에서 hydration 경고 감소
        config.infrastructureLogging = {
          level: 'error',
        }
      }
      return config
    },
  }),
}

module.exports = nextConfig 