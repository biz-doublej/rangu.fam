'use client'

import { useEffect, useRef } from 'react'
import { useNotifications } from '@/contexts/NotificationContext'

const POLL_INTERVAL_MS = 2 * 60 * 1000 // 2분
const MAX_ITEMS_PER_POLL = 10

/**
 * 관리자용 위키 알림 — 검수 대기중인 문서 생성/수정 요청을 Notification Center에 띄운다.
 *
 * `enabled` 가 true(= 관리자 로그인 상태)일 때만 `/api/wiki/mod?status=pending` 을
 * 주기적으로 폴링한다. 알림은 submission id 기반 uniqueKey 로 중복 방지되므로
 * 같은 요청이 여러 번 쌓이지 않는다.
 */
export function useWikiAdminNotifications(enabled: boolean) {
  const { addNotification } = useNotifications()

  // addNotification 은 Provider 리렌더마다 새 함수라 deps에 넣으면 폴링이 계속 리셋됨 → ref로 우회
  const addRef = useRef(addNotification)
  useEffect(() => {
    addRef.current = addNotification
  }, [addNotification])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    const check = async () => {
      try {
        const r = await fetch('/api/wiki/mod?status=pending', { credentials: 'include' })
        if (!r.ok) return
        const d = await r.json().catch(() => null)
        if (cancelled || !d?.success || !Array.isArray(d.submissions)) return

        for (const sub of d.submissions.slice(0, MAX_ITEMS_PER_POLL)) {
          const id = sub._id || sub.id
          if (!id) continue
          const isCreate = sub.type === 'create'
          addRef.current({
            type: 'wiki',
            category: 'wiki',
            severity: 'info',
            title: isCreate ? '새 문서 생성 요청' : '문서 수정 요청',
            message: `${sub.author || '알 수 없음'}님이 "${sub.targetTitle}" 문서 ${
              isCreate ? '생성' : '수정'
            }을 요청했습니다. 검수가 필요합니다.`,
            uniqueKey: `wiki-submission-${id}`,
            link: '/wiki/mod',
            data: {
              submissionId: id,
              targetTitle: sub.targetTitle,
              submittedAt: sub.createdAt,
            },
          })
        }
      } catch {
        /* 네트워크 오류는 조용히 무시 — 다음 폴링에서 재시도 */
      }
    }

    check()
    const timer = setInterval(check, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [enabled])
}
