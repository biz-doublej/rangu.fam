'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { Footer } from '@/components/ui'
import { DemoNotificationTrigger } from '@/components/DemoNotificationTrigger'
import { GiftBoxLayer } from '@/components/GiftBoxLayer'
import { RANGU_ARCHIVE_MODE } from '@/config/archive'

type Section = 'rangu' | 'archive' | 'wiki' | 'admin' | 'member'

function detectSection(pathname: string | null): Section {
  if (!pathname) return 'rangu'
  if (pathname.startsWith('/wiki')) return 'wiki'
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/m/')) return 'member'
  // 아카이브 모드의 랑구팸 메인은 스크랩북 테마 없이 기본 디자인으로
  if (RANGU_ARCHIVE_MODE && pathname === '/') return 'archive'
  return 'rangu'
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const section = detectSection(pathname)
  const isMember = section === 'member'
  const isRangu = section === 'rangu'
  const isArchive = section === 'archive'

  useEffect(() => {
    const html = document.documentElement
    html.dataset.section = section
    return () => {
      delete html.dataset.section
    }
  }, [section])

  // Member subdomain pages and the archive home render fully autonomously — no shared chrome.
  if (isMember || isArchive) {
    return (
      <div className="relative" data-section={section}>
        {children}
      </div>
    )
  }

  return (
    <div className="relative" data-section={section}>
      {!RANGU_ARCHIVE_MODE && <DemoNotificationTrigger />}
      {children}
      {/* 랜덤 선물상자 — 랑구팸 메인 페이지에서만 (위키/멤버/대학/관리자 제외) */}
      {isRangu && !RANGU_ARCHIVE_MODE && <GiftBoxLayer />}
      <Footer />
      {(
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: isRangu
              ? {
                  background: '#FBF7EE',
                  color: '#2B2118',
                  border: '1px solid rgba(43, 33, 24, 0.15)',
                  borderRadius: '14px',
                  boxShadow: '0 6px 20px -8px rgba(43, 33, 24, 0.35)',
                  fontFamily: 'Pretendard, sans-serif',
                }
              : {
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                },
          }}
        />
      )}
    </div>
  )
}
