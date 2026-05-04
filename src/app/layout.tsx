import type { Metadata, Viewport } from 'next'
import { Inter, Black_Han_Sans, Gaegu, Caveat } from 'next/font/google'
import './globals.css'
import React from 'react'
import { AppProviders } from '@/components/providers/AppProviders'
import { AppChrome } from '@/components/layout/AppChrome'

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
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${blackHanSans.variable} ${gaegu.variable} ${caveat.variable} min-h-screen`}
        suppressHydrationWarning
      >
        <AppProviders>
          <AppChrome>{children}</AppChrome>
        </AppProviders>
      </body>
    </html>
  )
}
