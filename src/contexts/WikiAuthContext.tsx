'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNotifications } from './NotificationContext'

// 위키 사용자 타입 정의
interface WikiUser {
  id: string
  username: string
  displayName: string
  email: string
  role: 'viewer' | 'editor' | 'moderator' | 'admin' | 'owner'
  permissions: {
    canEdit: boolean
    canDelete: boolean
    canProtect: boolean
    canBan: boolean
    canManageUsers: boolean
  }
  avatar?: string
  bio?: string
  signature?: string
  edits: number
  pagesCreated: number
  reputation: number
  preferences: {
    theme: 'light' | 'dark' | 'auto'
    timezone: string
    emailNotifications: boolean
    showEmail: boolean
    autoWatchPages: boolean
  }
  isActive: boolean
  lastLogin: Date
  mainUserId?: string
}

interface WikiAuthContextType {
  wikiUser: WikiUser | null
  isLoading: boolean
  login: () => Promise<boolean>
  register: (userData: {
    username: string
    email: string
    password: string
    displayName?: string
    mainUserId?: string
  }) => Promise<boolean>
  logout: () => Promise<void>
  isLoggedIn: boolean
  hasPermission: (permission: keyof WikiUser['permissions']) => boolean
  isAdmin: boolean
  isModerator: boolean
}

const WikiAuthContext = createContext<WikiAuthContextType | undefined>(undefined)

export function WikiAuthProvider({ children }: { children: React.ReactNode }) {
  const [wikiUser, setWikiUser] = useState<WikiUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { addNotification } = useNotifications()

  // 페이지 로드 시 인증 상태 확인
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/wiki/auth/me', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.user) {
          setWikiUser(data.user)
        }
      }
    } catch (error) {
      console.error('위키 인증 상태 확인 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/wiki/auth/discord-login', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        toast.error(errorBody.error || '위키 로그인에 실패했습니다.')
        return false
      }

      const data = await response.json()

      if (data.success) {
        setWikiUser(data.user)

        if (data.loginNotification) {
          addNotification({
            type: data.loginNotification.type,
            title: data.loginNotification.title,
            message: data.loginNotification.message,
            data: data.loginNotification.data,
          })
        }

        toast.success('디스코드로 위키에 입장했습니다!')
        return true
      }

      toast.error(data.error || '위키 로그인에 실패했습니다.')
      return false
    } catch (error) {
      console.error('디스코드 위키 로그인 오류:', error)
      toast.error('로그인 중 오류가 발생했습니다.')
      return false
    }
  }

  const register = async (userData: {
    username: string
    email: string
    password: string
    displayName?: string
    mainUserId?: string
  }): Promise<boolean> => {
    try {
      const response = await fetch('/api/wiki/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })

      // 응답이 비어있거나 잘못된 경우 체크
      if (!response.ok) {
        console.error('HTTP 오류:', response.status, response.statusText)
        toast.error(`서버 오류 (${response.status})`)
        return false
      }

      const text = await response.text()
      if (!text) {
        console.error('빈 응답 받음')
        toast.error('서버에서 빈 응답을 받았습니다.')
        return false
      }

      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error('JSON 파싱 오류:', parseError, '응답 텍스트:', text)
        toast.error('서버 응답 형식이 올바르지 않습니다.')
        return false
      }

      if (data.success) {
        toast.success('위키 계정이 생성되었습니다! 로그인해주세요.')
        return true
      } else {
        toast.error(data.error || '회원가입에 실패했습니다.')
        return false
      }
    } catch (error) {
      console.error('위키 회원가입 오류:', error)
      toast.error('회원가입 중 오류가 발생했습니다.')
      return false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      const currentUsername = wikiUser?.displayName || wikiUser?.username
      
      const response = await fetch('/api/wiki/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        setWikiUser(null)
        
        // 로그아웃 알림 추가
        if (currentUsername) {
          addNotification({
            type: 'logout',
            title: '로그아웃',
            message: `${currentUsername}님이 로그아웃했습니다.`,
            data: {
              timestamp: new Date().toISOString()
            }
          })
        }
        
        toast.success('위키에서 로그아웃했습니다.')
      }
    } catch (error) {
      console.error('위키 로그아웃 오류:', error)
      toast.error('로그아웃 중 오류가 발생했습니다.')
    }
  }

  const hasPermission = (permission: keyof WikiUser['permissions']): boolean => {
    return wikiUser?.permissions[permission] || false
  }

  const isLoggedIn = !!wikiUser
  const isAdmin = wikiUser?.role === 'admin' || wikiUser?.role === 'owner'
  const isModerator = isAdmin || wikiUser?.role === 'moderator'

  const value: WikiAuthContextType = {
    wikiUser,
    isLoading,
    login,
    register,
    logout,
    isLoggedIn,
    hasPermission,
    isAdmin,
    isModerator
  }

  return (
    <WikiAuthContext.Provider value={value}>
      {children}
    </WikiAuthContext.Provider>
  )
}

export function useWikiAuth() {
  const context = useContext(WikiAuthContext)
  if (context === undefined) {
    throw new Error('useWikiAuth must be used within a WikiAuthProvider')
  }
  return context
} 