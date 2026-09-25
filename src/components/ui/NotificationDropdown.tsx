'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, isToday, isYesterday, differenceInCalendarDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Bell, BellOff, CheckCheck, CheckCircle2, ExternalLink, FilePen, Globe2, Info, LogIn, LogOut,
  ShieldAlert, Trash2, X,
} from 'lucide-react'
import {
  useNotifications,
  getNotificationGroup,
  type Notification,
  type NotificationGroup,
} from '@/contexts/NotificationContext'

type Tab = 'all' | NotificationGroup

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'document', label: '문서' },
  { key: 'account', label: '계정' },
  { key: 'notice', label: '안내' },
]

const EMPTY_TEXT: Record<Tab, string> = {
  all: '새 알림이 없어요.',
  document: '감시 중인 문서가 바뀌거나 문서를 저장하면 여기에 알려드려요.',
  account: '로그인 기록이 여기에 쌓여요.',
  notice: '이랑위키 안내가 여기에 표시돼요.',
}

/** 알림 종류별 아이콘 + 톤 */
function visualFor(n: Notification): { Icon: React.ElementType; tone: 'accent' | 'success' | 'warning' | 'danger' | 'neutral' } {
  if (n.severity === 'critical' || n.type === 'alert') return { Icon: ShieldAlert, tone: 'danger' }
  if (n.type === 'login') return { Icon: n.severity === 'warning' ? ShieldAlert : LogIn, tone: n.severity === 'warning' ? 'warning' : 'success' }
  if (n.type === 'logout') return { Icon: LogOut, tone: 'neutral' }
  if (n.type === 'success') return { Icon: CheckCircle2, tone: 'success' }
  if (n.type === 'warning' || n.severity === 'warning') return { Icon: ShieldAlert, tone: 'warning' }
  if (getNotificationGroup(n) === 'document') return { Icon: FilePen, tone: 'accent' }
  return { Icon: Info, tone: 'neutral' }
}

function dayLabel(date: Date): string {
  if (isToday(date)) return '오늘'
  if (isYesterday(date)) return '어제'
  if (differenceInCalendarDays(new Date(), date) < 7) return '이번 주'
  return '이전'
}

export const NotificationDropdown: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('all')
  const [confirmClear, setConfirmClear] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications()
  const rootRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!isOpen) return
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) setConfirmClear(false)
  }, [isOpen])

  const unreadByTab = useMemo(() => {
    const counts: Record<Tab, number> = { all: 0, document: 0, account: 0, notice: 0 }
    for (const n of notifications) {
      if (n.isRead) continue
      counts.all += 1
      counts[getNotificationGroup(n)] += 1
    }
    return counts
  }, [notifications])

  const sections = useMemo(() => {
    const visible = notifications.filter((n) => tab === 'all' || getNotificationGroup(n) === tab)
    const grouped: Array<{ label: string; items: Notification[] }> = []
    for (const n of visible) {
      const label = dayLabel(n.createdAt)
      const last = grouped[grouped.length - 1]
      if (last?.label === label) last.items.push(n)
      else grouped.push({ label, items: [n] })
    }
    return grouped
  }, [notifications, tab])

  const open = (n: Notification) => {
    if (!n.isRead) markAsRead(n.id)
    if (!n.link) return
    if (/^https?:\/\//.test(n.link)) window.open(n.link, '_blank', 'noopener,noreferrer')
    else router.push(n.link)
    setIsOpen(false)
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `알림 ${unreadCount}개 읽지 않음` : '알림'}
        aria-expanded={isOpen}
        className="wiki-notify__bell"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unreadCount > 0 && <span className="wiki-notify__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div role="dialog" aria-label="알림" className="wiki-notify">
          <header className="wiki-notify__head">
            <div className="flex items-baseline gap-2">
              <h3 className="text-base font-bold text-[color:var(--wiki-ink)]">알림</h3>
              {unreadCount > 0 && (
                <span className="text-xs text-[color:var(--wiki-ink-muted)]">읽지 않은 알림 {unreadCount}개</span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="wiki-notify__icon-btn"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                title="모두 읽음으로 표시"
                aria-label="모두 읽음으로 표시"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="wiki-notify__icon-btn"
                onClick={() => setConfirmClear(true)}
                disabled={notifications.length === 0}
                title="모든 알림 지우기"
                aria-label="모든 알림 지우기"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button type="button" className="wiki-notify__icon-btn" onClick={() => setIsOpen(false)} aria-label="닫기">
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {confirmClear && (
            <div className="wiki-notify__confirm">
              <span>알림 {notifications.length}개를 모두 지울까요?</span>
              <span className="flex gap-1.5">
                <button type="button" className="wiki-editor__btn" onClick={() => setConfirmClear(false)}>취소</button>
                <button
                  type="button"
                  className="wiki-editor__btn wiki-editor__btn--danger"
                  onClick={() => {
                    clearAll()
                    setConfirmClear(false)
                  }}
                >
                  지우기
                </button>
              </span>
            </div>
          )}

          <nav className="wiki-notify__tabs" role="tablist" aria-label="알림 종류">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={tab === key ? 'is-active' : ''}
              >
                {label}
                {unreadByTab[key] > 0 && <span className="wiki-notify__tab-count">{unreadByTab[key]}</span>}
              </button>
            ))}
          </nav>

          <div className="wiki-notify__list">
            {sections.length === 0 ? (
              <div className="wiki-notify__empty">
                <BellOff className="h-7 w-7" aria-hidden="true" />
                <p>{EMPTY_TEXT[tab]}</p>
              </div>
            ) : (
              sections.map((section) => (
                <section key={section.label}>
                  <p className="wiki-notify__day">{section.label}</p>
                  <ul>
                    {section.items.map((n) => {
                      const { Icon, tone } = visualFor(n)
                      return (
                        <li key={n.id} className={`wiki-notify__item ${n.isRead ? '' : 'is-unread'}`}>
                          <button type="button" className="wiki-notify__item-main" onClick={() => open(n)}>
                            <span className={`wiki-notify__icon wiki-notify__icon--${tone}`}>
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1 text-left">
                              <span className="wiki-notify__title">{n.title}</span>
                              <span className="wiki-notify__message">{n.message}</span>
                              <span className="wiki-notify__meta">
                                <time dateTime={n.createdAt.toISOString()}>
                                  {formatDistanceToNow(n.createdAt, { addSuffix: true, locale: ko })}
                                </time>
                                {n.data?.ipAddress && (
                                  <span className="inline-flex items-center gap-1">
                                    <Globe2 className="h-3 w-3" aria-hidden="true" />
                                    {n.data.ipAddress}
                                    {n.data.location && ` · ${n.data.location}`}
                                  </span>
                                )}
                                {n.link && /^https?:\/\//.test(n.link) && (
                                  <span className="inline-flex items-center gap-0.5">
                                    보안 확인 <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                  </span>
                                )}
                              </span>
                            </span>
                          </button>
                          <span className="wiki-notify__actions">
                            {!n.isRead && (
                              <button
                                type="button"
                                className="wiki-notify__icon-btn"
                                onClick={() => markAsRead(n.id)}
                                title="읽음으로 표시"
                                aria-label="읽음으로 표시"
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              className="wiki-notify__icon-btn"
                              onClick={() => removeNotification(n.id)}
                              title="알림 지우기"
                              aria-label="알림 지우기"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                          {!n.isRead && <span className="wiki-notify__dot" aria-hidden="true" />}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>

          <footer className="wiki-notify__foot">
            <button
              type="button"
              onClick={() => {
                router.push('/wiki/watchlist')
                setIsOpen(false)
              }}
            >
              감시 목록 관리
            </button>
            <span>알림은 이 브라우저에만 저장돼요</span>
          </footer>
        </div>
      )}
    </div>
  )
}
