'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { Footer } from '@/components/ui'
import { DemoNotificationTrigger } from '@/components/DemoNotificationTrigger'
import { GiftBoxLayer } from '@/components/GiftBoxLayer'

type Section = 'rangu' | 'wiki' | 'university' | 'admin' | 'member'

function detectSection(pathname: string | null): Section {
  if (!pathname) return 'rangu'
  if (pathname.startsWith('/university')) return 'university'
  if (pathname.startsWith('/wiki')) return 'wiki'
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/m/')) return 'member'
  return 'rangu'
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const section = detectSection(pathname)
  const isUniversity = section === 'university'
  const isMember = section === 'member'
  const isRangu = section === 'rangu'

  useEffect(() => {
    const html = document.documentElement
    html.dataset.section = section
    return () => {
      delete html.dataset.section
    }
  }, [section])

  // Member subdomain pages render fully autonomously — no shared chrome.
  if (isMember) {
    return (
      <div className="relative" data-section={section}>
        {children}
      </div>
    )
  }

  return (
    <div className="relative" data-section={section}>
      {!isUniversity && <DemoNotificationTrigger />}
      {children}
      {/* 랜덤 선물상자 — 랑구팸 메인 페이지에서만 (위키/멤버/대학/관리자 제외) */}
      {isRangu && <GiftBoxLayer />}
      {!isUniversity && <Footer />}
      {!isUniversity && (
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
