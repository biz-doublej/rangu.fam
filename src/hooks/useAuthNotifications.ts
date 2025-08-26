'use client'

import { useEffect } from 'react'
import { useNotifications } from '@/contexts/NotificationContext'

export const useAuthNotifications = () => {
  const notificationsContext = useNotifications()
  const addNotification = notificationsContext?.addNotification || (() => {})

  const notifyLogin = (username: string, ipAddress?: string) => {
    addNotification({
      type: 'login',
      title: '로그인 성공',
      message: `${username}님, 안전하게 로그인되었습니다.`,
      uniqueKey: `login-${username}-${new Date().toDateString()}`, // 같은 날 같은 사용자 로그인은 하나만
      data: {
        ipAddress: ipAddress || '알 수 없음',
        timestamp: new Date().toISOString()
      }
    })
  }

  const notifyLogout = (username: string) => {
    addNotification({
      type: 'logout',
      title: '로그아웃',
      message: `${username}님이 로그아웃했습니다.`,
      data: {
        timestamp: new Date().toISOString()
      }
    })
  }

  const notifyLoginAttempt = (ipAddress?: string, success: boolean = false) => {
    if (success) return // Use notifyLogin for successful attempts
    
    addNotification({
      type: 'warning',
      title: '로그인 시도 실패',
      message: '잘못된 로그인 시도가 감지되었습니다.',
      data: {
        ipAddress: ipAddress || '알 수 없음',
        timestamp: new Date().toISOString()
      }
    })
  }

  const notifySecurityAlert = (message: string, ipAddress?: string) => {
    addNotification({
      type: 'warning',
      title: '보안 알림',
      message,
      data: {
        ipAddress: ipAddress || '알 수 없음',
        timestamp: new Date().toISOString()
      }
    })
  }

  const notifyWikiEdit = (pageName: string, username: string) => {
    addNotification({
      type: 'edit',
      title: '위키 편집',
      message: `${username}님이 "${pageName}" 페이지를 편집했습니다.`,
      uniqueKey: `wiki-edit-${pageName}-${username}-${new Date().toDateString()}`, // 같은 날 같은 사용자가 같은 페이지 편집 시 하나만
      data: {
        pageName,
        editor: username,
        timestamp: new Date().toISOString()
      }
    })
  }

  const notifySuccess = (title: string, message: string) => {
    addNotification({
      type: 'success',
      title,
      message,
      data: {
        timestamp: new Date().toISOString()
      }
    })
  }

  const notifyInfo = (title: string, message: string) => {
    addNotification({
      type: 'info',
      title,
      message,
      data: {
        timestamp: new Date().toISOString()
      }
    })
  }

  const notifyWikiPageCreated = (pageName: string, username: string) => {
    addNotification({
      type: 'success',
      title: '새 위키 페이지 생성',
      message: `${username}님이 "${pageName}" 페이지를 새로 생성했습니다.`,
      uniqueKey: `wiki-create-${pageName}-${username}`, // 같은 페이지 생성은 한 번만
      data: {
        pageName,
        creator: username,
        timestamp: new Date().toISOString()
      }
    })
  }

  const notifySecurityWarning = (action: string, details?: string) => {
    addNotification({
      type: 'warning',
      title: '보안 경고',
      message: `비정상적인 ${action}이(가) 감지되었습니다. ${details || ''}`,
      data: {
        action,
        details,
        timestamp: new Date().toISOString()
      }
    })
  }

  return {
    notifyLogin,
    notifyLogout,
    notifyLoginAttempt,
    notifySecurityAlert,
    notifyWikiEdit,
    notifyWikiPageCreated,
    notifySecurityWarning,
    notifySuccess,
    notifyInfo
  }
}