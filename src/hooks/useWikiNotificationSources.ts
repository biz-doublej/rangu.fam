'use client'

import { useEffect, useRef } from 'react'
import { useNotifications } from '@/contexts/NotificationContext'
import type { WikiSessionInfo } from '@/contexts/WikiAuthContext'

const WATCH_POLL_MS = 5 * 60 * 1000 // 5분 — 탭이 보일 때만
const LAST_LOGIN_IP_KEY = 'wiki-last-login-ip'
const watchSeenKey = (userId: string) => `wiki-watch-seen:${userId}`

type WatchedPage = { title: string; lastEditDate?: string | null; lastEditor?: string | null }

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/**
 * 이랑위키 알림 센터에 들어가는 알림을 만든다 (모두 이 브라우저에만 저장, DB 쓰기 없음).
 *
 * - 환영 인사: 처음 방문했을 때 한 번
 * - 로그인: 세션(토큰)이 새로 발급될 때마다 한 번 — 시각 · IP · 국가. 직전 로그인과 IP 가 다르면 경고
 * - 감시 문서: 감시 목록의 문서를 다른 사람이 고치면 (5분마다 확인, 첫 확인은 기준점만 기록)
 */
export function useWikiNotificationSources({
  userId,
  username,
  session,
}: {
  userId: string | null
  username: string | null
  session: WikiSessionInfo | null
}) {
  const { addNotification } = useNotifications()
  const addRef = useRef(addNotification)
  useEffect(() => {
    addRef.current = addNotification
  }, [addNotification])

  // 환영 인사
  useEffect(() => {
    addRef.current({
      type: 'info',
      category: 'notice',
      title: '이랑위키에 오신 것을 환영합니다',
      message: '누구나 읽고, 로그인하면 누구나 고칠 수 있는 작은 백과사전이에요. 처음이라면 도움말부터 둘러보세요.',
      uniqueKey: 'wiki-welcome-v1',
      link: '/wiki/이랑위키:도움말',
    })
  }, [])

  // 로그인 알림
  useEffect(() => {
    if (!session?.issuedAt || !username) return
    let previousIp: string | null = null
    try {
      previousIp = localStorage.getItem(LAST_LOGIN_IP_KEY)
    } catch {
      /* 무시 */
    }
    const isNewPlace = Boolean(previousIp && previousIp !== session.ipAddress)
    addRef.current({
      type: 'login',
      category: 'account',
      severity: isNewPlace ? 'warning' : 'info',
      title: isNewPlace ? '새로운 곳에서 로그인했어요' : '로그인했어요',
      message: isNewPlace
        ? `이전과 다른 IP에서 ${username} 계정에 로그인했어요. 본인이 아니면 보안을 확인하세요.`
        : `${username} 계정으로 로그인했습니다.`,
      uniqueKey: `login-${userId}-${session.issuedAt}`,
      link: isNewPlace ? 'https://myaccount.google.com/security' : undefined,
      data: {
        ipAddress: session.ipAddress,
        location: session.location,
        loggedInAt: formatTime(session.issuedAt),
      },
    })
    try {
      localStorage.setItem(LAST_LOGIN_IP_KEY, session.ipAddress)
    } catch {
      /* 무시 */
    }
  }, [session?.issuedAt, session?.ipAddress, session?.location, userId, username])

  // 감시 문서 수정 알림
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    let lastCheckedAt = 0

    const check = async () => {
      if (document.visibilityState !== 'visible') return
      // 탭을 자주 오가도 1분에 한 번만 확인
      if (Date.now() - lastCheckedAt < 60 * 1000) return
      lastCheckedAt = Date.now()
      try {
        const res = await fetch('/api/wiki/watchlist', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        if (cancelled || !data?.success || !Array.isArray(data.pages)) return

        let seen: Record<string, string> | null = null
        try {
          const raw = localStorage.getItem(watchSeenKey(userId))
          seen = raw ? JSON.parse(raw) : null
        } catch {
          seen = null
        }
        const isBaseline = seen === null
        const nextSeen: Record<string, string> = {}

        for (const page of data.pages as WatchedPage[]) {
          if (!page.lastEditDate) continue
          nextSeen[page.title] = page.lastEditDate
          const before = seen?.[page.title]
          const editedByOther = page.lastEditor && page.lastEditor !== username
          if (!isBaseline && before && page.lastEditDate > before && editedByOther) {
            addRef.current({
              type: 'edit',
              category: 'document',
              title: `감시 중인 문서가 바뀌었어요`,
              message: `${page.lastEditor}님이 "${page.title}" 문서를 수정했습니다.`,
              uniqueKey: `watch-${page.title}-${page.lastEditDate}`,
              link: `/wiki/${encodeURIComponent(page.title)}`,
              data: { pageName: page.title, editor: page.lastEditor, editedAt: page.lastEditDate },
            })
          }
        }
        try {
          localStorage.setItem(watchSeenKey(userId), JSON.stringify(nextSeen))
        } catch {
          /* 무시 */
        }
      } catch {
        /* 네트워크 오류는 다음 확인 때 재시도 */
      }
    }

    check()
    const timer = setInterval(check, WATCH_POLL_MS)
    const onVisible = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, username])
}
