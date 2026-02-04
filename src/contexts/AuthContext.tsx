'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { User, Member } from '@/types'

let MEMBERS: Member[] = []

async function loadMembers(): Promise<Member[]> {
  try {
    const response = await fetch('/api/members')
    if (response.ok) {
      const data = await response.json()
      MEMBERS = data
      return data
    }
  } catch (error) {
    console.error('멤버 목록을 불러오지 못했습니다:', error)
  }
  return MEMBERS
}

interface AuthContextType {
  user: User | null
  member: Member | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  register: (username: string, password: string, displayName?: string) => Promise<boolean>
  loginWithDiscord: (callbackUrl?: string) => void
  logout: () => Promise<void>
  isLoggedIn: boolean
  isMember: boolean
  canEdit: boolean
  linkedWikiUsername: string | null
}

interface AccountSessionData {
  id: string
  username: string
  email: string
  role: 'member' | 'guest'
  memberId?: string | null
  isLoggedIn: boolean
  discordId?: string | null
  discordUsername?: string | null
  discordAvatar?: string | null
  avatar?: string | null
  memberProfile?: Member | null
  wikiUsername?: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [linkedWikiUsername, setLinkedWikiUsername] = useState<string | null>(null)

  useEffect(() => {
    loadMembers()
  }, [])

  const applySession = useCallback((data: AccountSessionData | null) => {
    if (!data) {
      setUser(null)
      setMember(null)
      setLinkedWikiUsername(null)
      return
    }

    setUser({
      id: data.id,
      username: data.username || 'DoubleJ 사용자',
      email: data.email || '',
      role: data.role || 'guest',
      memberId: data.memberId || undefined,
      isLoggedIn: true,
      discordId: data.discordId || undefined,
      avatar: data.avatar || data.discordAvatar || undefined,
    })

    setMember(data.memberProfile || null)
    setLinkedWikiUsername(data.wikiUsername || data.username || null)
  }, [])

  const fetchAccountSession = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/account/session', {
        cache: 'no-store',
        credentials: 'include',
      })

      if (!response.ok) {
        applySession(null)
        return
      }

      const payload = await response.json()
      applySession(payload.data as AccountSessionData)
    } catch (error) {
      console.error('Account 세션 확인 실패:', error)
      applySession(null)
    } finally {
      setIsLoading(false)
    }
  }, [applySession])

  useEffect(() => {
    fetchAccountSession()
  }, [fetchAccountSession])

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        toast.error(data.error || '로그인에 실패했습니다.')
        return false
      }

      await fetchAccountSession()
      toast.success('DoubleJ 통합 로그인 완료!')
      return true
    } catch (error) {
      console.error('통합 로그인 실패:', error)
      toast.error('로그인 중 오류가 발생했습니다.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (
    username: string,
    password: string,
    displayName?: string
  ): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password, displayName }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        toast.error(data.error || '회원가입에 실패했습니다.')
        return false
      }

      await fetchAccountSession()
      toast.success('회원가입이 완료되었습니다.')
      return true
    } catch (error) {
      console.error('회원가입 실패:', error)
      toast.error('회원가입 중 오류가 발생했습니다.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithDiscord = (callbackUrl: string = '/') => {
    const url = `/api/auth/discord/start?callbackUrl=${encodeURIComponent(callbackUrl)}`
    window.location.href = url
  }

  const logout = async (): Promise<void> => {
    setIsLoading(true)
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      applySession(null)
      toast.success('로그아웃되었습니다.')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      toast.error('로그아웃 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    member,
    isLoading,
    login,
    register,
    loginWithDiscord,
    logout,
    isLoggedIn: !!user,
    isMember: user?.role === 'member',
    canEdit: user?.role === 'member',
    linkedWikiUsername,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { MEMBERS }
