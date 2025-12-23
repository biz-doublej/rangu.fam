'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface Notification {
  id: string
  type: 'login' | 'logout' | 'edit' | 'warning' | 'info' | 'success' | 'wiki' | 'system' | 'alert'
  title: string
  message: string
  isRead: boolean
  createdAt: Date
  data?: any // Additional data like IP address, etc.
  uniqueKey?: string // 중복 방지를 위한 고유 키
  category?: 'wiki' | 'system' | 'auth' | 'security' | 'general'
  severity?: 'info' | 'success' | 'warning' | 'critical'
  link?: string // 이동할 페이지
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

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('user-notifications')
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications)
        setNotifications(parsed.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        })))
      } catch (error) {
        console.error('Failed to load notifications:', error)
      }
    }
  }, [])

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('user-notifications', JSON.stringify(notifications))
  }, [notifications])

  const addNotification = (notificationData: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    // uniqueKey를 사용한 중복 방지 (더 정확함)
    if (notificationData.uniqueKey) {
      const isDuplicateByKey = notifications.some(existing => 
        existing.uniqueKey === notificationData.uniqueKey
      )
      
      if (isDuplicateByKey) {
        console.log('중복 알림 방지됨 (uniqueKey):', notificationData.title)
        return
      }
    } else {
      // uniqueKey가 없는 경우 기존 방식 사용: 같은 타입, 제목, 메시지의 알림이 최근 5분 이내에 있는지 확인
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const isDuplicate = notifications.some(existing => 
        existing.type === notificationData.type &&
        existing.title === notificationData.title &&
        existing.message === notificationData.message &&
        existing.createdAt > fiveMinutesAgo
      )

      if (isDuplicate) {
        console.log('중복 알림 방지됨 (시간 기반):', notificationData.title)
        return
      }
    }

    const newNotification: Notification = {
      ...notificationData,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isRead: false,
      createdAt: new Date()
    }

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)) // Keep only latest 50 notifications
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    )
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
