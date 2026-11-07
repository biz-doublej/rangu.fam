'use client'

import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface Notice {
  id: string
  message: string
  linkUrl: string | null
  tone: 'info' | 'warning' | 'success'
}

const STORAGE_KEY = 'irang-wiki-dismissed-notices'

function readDismissed(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

/** 운영 대시보드에서 등록한 공지를 위키 상단에 띄운다. 닫은 공지는 이 브라우저에서 다시 안 보인다. */
export function WikiNoticeBar() {
  const [notices, setNotices] = useState<Notice[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/wiki/notices')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.notices) return
        const dismissed = new Set(readDismissed())
        setNotices((data.notices as Notice[]).filter((notice) => !dismissed.has(notice.id)))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const dismiss = (id: string) => {
    setNotices((current) => current.filter((notice) => notice.id !== id))
    try {
      const next = Array.from(new Set([...readDismissed(), id])).slice(-50)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* 저장이 막혀 있으면 이번 화면에서만 닫는다 */
    }
  }

  if (notices.length === 0) return null

  return (
    <div className="wiki-notice-stack" role="region" aria-label="위키 공지">
      {notices.map((notice) => (
        <div key={notice.id} className={`wiki-notice wiki-notice--${notice.tone}`}>
          {notice.linkUrl ? (
            <a href={notice.linkUrl} className="wiki-notice__text" {...(notice.linkUrl.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>
              {notice.message}
            </a>
          ) : (
            <p className="wiki-notice__text">{notice.message}</p>
          )}
          <button type="button" className="wiki-notice__close" onClick={() => dismiss(notice.id)} aria-label="공지 닫기">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
