'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react'

export interface Notification {
  id: string
  type: 'login' | 'logout' | 'edit' | 'warning' | 'info' | 'success' | 'wiki' | 'system' | 'alert'
  title: string
  message: string
  isRead: boolean
  createdAt: Date
  data?: any // Additional data like IP address, etc.
  uniqueKey?: string // 중복 방지를 위한 고유 키
  category?: 'document' | 'account' | 'notice' | 'wiki' | 'system' | 'auth' | 'security' | 'general'
  severity?: 'info' | 'success' | 'warning' | 'critical'
  link?: string // 이동할 페이지 (http 로 시작하면 새 탭)
}

/** 알림 센터 탭 */
export type NotificationGroup = 'document' | 'account' | 'notice'

/** 과거 카테고리/타입까지 포함해 알림을 문서 · 계정 · 안내 중 하나로 분류 */
export function getNotificationGroup(n: Pick<Notification, 'type' | 'category'>): NotificationGroup {
  if (n.category === 'document' || n.category === 'wiki' || n.type === 'edit' || n.type === 'wiki') return 'document'
  if (
    n.category === 'account' || n.category === 'auth' || n.category === 'security' ||
    n.type === 'login' || n.type === 'logout' || n.type === 'alert'
  ) return 'account'
  return 'notice'
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const STORAGE_KEY = 'user-notifications'
/** 한 번 띄운 uniqueKey — 지운 알림(환영 인사, 지난 로그인 등)이 다시 생기지 않게 */
const SEEN_KEYS_STORAGE_KEY = 'user-notifications-seen-keys'
const MAX_NOTIFICATIONS = 50
const MAX_SEEN_KEYS = 300

function loadSeenKeys(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEYS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

/** 더 이상 보여주지 않을 과거 알림 — 랑구팸 시절 환영 인사 */
function isRetired(n: Pick<Notification, 'message'>): boolean {
  return typeof n.message === 'string' && n.message.includes('랑구팸에 오신 것을 환영합니다')
}

function persist(list: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* 저장소 접근 불가 — 이번 세션 메모리에만 유지 */
  }
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    // Return a default context during SSR or when used outside provider
    return {
      notifications: [],
      unreadCount: 0,
      addNotification: () => {},
      markAsRead: () => {},
      markAllAsRead: () => {},
      removeNotification: () => {},
      clearAll: () => {}
    }
  }
  return context
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  // 최신 목록을 동기적으로 들고 있어 중복 검사와 즉시 저장이 가능하게 한다
  // (저장 직후 새로고침하는 흐름에서도 알림이 사라지지 않도록)
  const listRef = useRef<Notification[]>([])
  const seenKeysRef = useRef<Set<string> | null>(null)

  const commit = useCallback((next: Notification[]) => {
    listRef.current = next
    setNotifications(next)
    persist(next)
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = (JSON.parse(saved) as any[])
        .map((n) => ({ ...n, createdAt: new Date(n.createdAt) }) as Notification)
        .filter((n) => !isRetired(n))
      // 마운트 전에 추가된 알림이 있으면 앞에 둔다
      const merged = [...listRef.current, ...parsed.filter((p) => !listRef.current.some((c) => c.id === p.id))]
      commit(merged.slice(0, MAX_NOTIFICATIONS))
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }, [commit])

  const addNotification = useCallback((data: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    const current = listRef.current
    if (data.uniqueKey) {
      if (!seenKeysRef.current) {
        seenKeysRef.current = new Set([...loadSeenKeys(), ...current.flatMap((n) => (n.uniqueKey ? [n.uniqueKey] : []))])
      }
      if (seenKeysRef.current.has(data.uniqueKey)) return
      seenKeysRef.current.add(data.uniqueKey)
      try {
        localStorage.setItem(SEEN_KEYS_STORAGE_KEY, JSON.stringify(Array.from(seenKeysRef.current).slice(-MAX_SEEN_KEYS)))
      } catch {
        /* 무시 */
      }
    } else {
      // uniqueKey 가 없으면 5분 안의 같은 알림은 무시
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      const duplicate = current.some(
        (n) => n.type === data.type && n.title === data.title && n.message === data.message && n.createdAt.getTime() > fiveMinutesAgo
      )
      if (duplicate) return
    }
    const created: Notification = {
      ...data,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      isRead: false,
      createdAt: new Date(),
    }
    commit([created, ...current].slice(0, MAX_NOTIFICATIONS))
  }, [commit])

  const markAsRead = useCallback((id: string) => {
    commit(listRef.current.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
  }, [commit])

  const markAllAsRead = useCallback(() => {
    commit(listRef.current.map((n) => ({ ...n, isRead: true })))
  }, [commit])

  const removeNotification = useCallback((id: string) => {
    commit(listRef.current.filter((n) => n.id !== id))
  }, [commit])

  const clearAll = useCallback(() => commit([]), [commit])

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll,
    }),
    [notifications, addNotification, markAsRead, markAllAsRead, removeNotification, clearAll]
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
