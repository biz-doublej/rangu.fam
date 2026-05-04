import React from 'react'
import type { Metadata } from 'next'
import { WikiShellLayoutFrame } from '@/components/wiki/WikiShell'

/**
 * Persistent wiki chrome.
 * Each page below this layout still uses `<WikiShell>` to declare its
 * `activeNav` / `pageHeader` / `rightRail`, but the topbar + sidebar are
 * mounted ONCE here so navigation between wiki pages doesn't rebuild
 * them. Page content fades-and-swaps inside this frame.
 *
 * 메타데이터 — 자식 페이지의 generateMetadata 가 override 가능.
 * 기본값: 사이트명 + 일반 설명.
 */
export const metadata: Metadata = {
  title: {
    default: '이랑위키',
    template: '%s | 이랑위키',
  },
  description: '랑구팸과 그 주변을 정리하는 협업 백과사전. 모두가 함께 만들어 갑니다.',
  // 위키 섹션 favicon — root layout 의 rang_web_logo 를 override.
  icons: {
    icon: '/irang_web_logo.png',
    shortcut: '/irang_web_logo.png',
    apple: '/irang_web_logo.png',
  },
  openGraph: {
    siteName: '이랑위키',
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary',
    title: '이랑위키',
    description: '랑구팸의 협업 백과사전',
  },
  alternates: {
    types: {
      'application/rss+xml': [
        { url: 'https://irang.wiki/api/wiki/feed', title: '이랑위키 — 최근 변경 (RSS)' },
      ],
    },
  },
}

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  return <WikiShellLayoutFrame>{children}</WikiShellLayoutFrame>
}
