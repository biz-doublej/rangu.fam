import type { Metadata, Viewport } from 'next'
import { Inter, Black_Han_Sans, Gaegu, Caveat } from 'next/font/google'
import './globals.css'
import './palette.css'
import React from 'react'
import { headers } from 'next/headers'
import { AppProviders } from '@/components/providers/AppProviders'
import { AppChrome } from '@/components/layout/AppChrome'
import { MOBILE_THEME_QUERY } from '@/lib/wikiAppearance'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

const blackHanSans = Black_Han_Sans({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-han',
  display: 'swap',
})

const gaegu = Gaegu({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-gaegu',
  display: 'swap',
})

const caveat = Caveat({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
})

// 그리기 전에 위키 외관을 정한다. 색이 '자동'(또는 미설정)이면 휴대폰은 다크, PC는 라이트 — src/lib/wikiAppearance.ts 와 같은 규칙
const WIKI_APPEARANCE_BOOTSTRAP = `try{var a=JSON.parse(localStorage.getItem('irangwiki-appearance')||'{}'),d=document.documentElement.dataset;if(a.fontSize)d.wikiFont=a.fontSize;if(a.width)d.wikiWidth=a.width;var c=a.color;if(c!=='dark'&&c!=='light')c=window.matchMedia('${MOBILE_THEME_QUERY}').matches?'dark':'light';d.wikiColor=c}catch(e){}`

export const metadata: Metadata = {
  title: 'Rangu.fam — 친구 다섯의 기록',
  description: '네 친구의 특별한 온라인 공간, Rangu.fam에 오신 것을 환영합니다.',
  keywords: ['rangu', 'fam', '친구', '기록', '추억'],
  authors: [{ name: 'Rangu.fam Team' }],
  icons: {
    icon: '/rang_web_logo.png',
    shortcut: '/rang_web_logo.png',
    apple: '/rang_web_logo.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // irang.wiki 는 /wiki 로 rewrite 되므로 서버 렌더에서도 호스트로 구역을 판정한다.
  const requestHeaders = headers()
  const hostname = (requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || '')
    .toLowerCase()
    .split(':')[0]

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 이랑위키 보기 설정을 첫 페인트 전에 적용 — 모든 위키 페이지에서 유지되도록 */}
        <script dangerouslySetInnerHTML={{ __html: WIKI_APPEARANCE_BOOTSTRAP }} />
      </head>
      <body
        className={`${inter.variable} ${blackHanSans.variable} ${gaegu.variable} ${caveat.variable} min-h-screen`}
        suppressHydrationWarning
      >
        <AppProviders>
          <AppChrome hostname={hostname}>{children}</AppChrome>
        </AppProviders>
      </body>
    </html>
  )
}
