import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import React from 'react'
import { AppProviders } from '@/components/providers/AppProviders'
import { AppChrome } from '@/components/layout/AppChrome'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rangu.fam - 우정과 추억의 공간',
  description: '네 친구의 특별한 온라인 공간, Rangu.fam에 오신 것을 환영합니다.',
  keywords: ['rangu', 'fam', '친구', '위키', '달력'],
  authors: [{ name: 'Rangu.fam Team' }],
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
      <body className={`${inter.className} min-h-screen`} suppressHydrationWarning>
        <AppProviders>
          <AppChrome>{children}</AppChrome>
        </AppProviders>
      </body>
    </html>
  )
} 
