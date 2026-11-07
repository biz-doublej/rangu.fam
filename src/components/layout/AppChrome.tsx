'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { Footer } from '@/components/ui'
import { GiftBoxLayer } from '@/components/GiftBoxLayer'
import { RANGU_ARCHIVE_MODE } from '@/config/archive'
import { detectSection } from '@/lib/appSection'

export function AppChrome({ children, hostname }: { children: React.ReactNode; hostname: string }) {
  const pathname = usePathname()
  const section = detectSection(pathname, hostname, RANGU_ARCHIVE_MODE)
  const isMember = section === 'member'
  const isRangu = section === 'rangu'
  const isArchive = section === 'archive'
  const isAdmin = section === 'admin'

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
      {children}
      {/* 랜덤 선물상자 — 랑구팸 메인 페이지에서만 (위키/멤버/대학/관리자 제외) */}
      {isRangu && !RANGU_ARCHIVE_MODE && <GiftBoxLayer />}
      {!isAdmin && <Footer />}
      {(
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: isAdmin
              ? {
                  background: 'rgb(var(--adm-ink))',
                  color: 'rgb(var(--adm-sheet))',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'Pretendard, sans-serif',
                }
              : isRangu
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
