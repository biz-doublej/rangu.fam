import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import React from 'react'
import { Toaster } from 'react-hot-toast'
import { Footer } from '@/components/ui'
import { DemoNotificationTrigger } from '@/components/DemoNotificationTrigger'
import { SnowOverlay } from '@/components/ui/SnowOverlay'
import { AppProviders } from '@/components/providers/AppProviders'

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
          <div className="relative">
            <DemoNotificationTrigger />
            <SnowOverlay />
            {children}
            <Footer />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                },
              }}
            />
          </div>
        </AppProviders>
      </body>
    </html>
  )
} 
