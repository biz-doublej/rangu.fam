'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
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

  return [
    {
      id: 'jaewon',
      name: '정재원',
      role: '소프트웨어 엔지니어, DoubleJ CEO',
      description: '코딩과 패션을 사랑하는 다재다능한 개발자입니다.',
      avatar: '/images/jaewon.jpg',
      email: 'jaewon@rangu.fam',
      status: 'active',
      location: '서울, 대한민국',
      joinDate: new Date('2020-01-01'),
      personalPageUrl: '/members/jaewon',
    },
    {
      id: 'minseok',
      name: '정민석',
      role: 'IMI 재학생',
      description: '스위스에서 새로운 꿈을 키워가고 있습니다.',
      avatar: '/images/minseok.jpg',
      email: 'minseok@rangu.fam',
      status: 'active',
      location: '취리히, 스위스',
      joinDate: new Date('2020-01-01'),
      personalPageUrl: '/members/minseok',
    },
    {
      id: 'jingyu',
      name: '정진규',
      role: '군 복무 중',
      description: '현재 군 복무 중이며, 전역 후 새로운 도전을 계획하고 있습니다.',
      avatar: '/images/jingyu.jpg',
      email: 'jingyu@rangu.fam',
      status: 'active',
      location: '대한민국',
      joinDate: new Date('2020-01-01'),
      personalPageUrl: '/members/jingyu',
    },
    {
      id: 'seungchan',
      name: '이승찬',
      role: '임시 멤버 (마술사)',
      description: '2025년 7월부터 임시로 합류한 마술사 멤버입니다.',
      avatar: '/images/seungchan.jpg',
      email: 'seungchan@rangu.fam',
      status: 'active',
      location: '대한민국',
      joinDate: new Date('2025-07-21'),
      personalPageUrl: '/members/seungchan',
    },
    {
      id: 'hanul',
      name: '강한울',
      role: '크리에이터',
      description: '다양한 취미와 관심사를 가진 크리에이터입니다.',
      avatar: '/images/hanul.jpg',
      email: 'hanul@rangu.fam',
      status: 'active',
      location: '서울, 대한민국',
      joinDate: new Date('2020-01-01'),
      personalPageUrl: '/members/hanul',
    },
  ]
}

interface AuthContextType {
  user: User | null
  member: Member | null
  isLoading: boolean
  login: () => Promise<boolean>
  logout: () => Promise<void>
  isLoggedIn: boolean
  isMember: boolean
  canEdit: boolean
  linkedWikiUsername: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [linkedWikiUsername, setLinkedWikiUsername] = useState<string | null>(null)

  useEffect(() => {
    loadMembers()
  }, [])

  const fetchAccountSession = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.discordId) {
      setUser(null)
      setMember(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/account/session', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('account session fetch failed')
      }

      const payload = await response.json()
      const data = payload.data

      const mappedUser: User = {
        id: data.discordId,
        username: data.discordUsername || session.user?.name || 'Discord 사용자',
        email: session.user?.email || '',
        role: data.memberId ? 'member' : 'guest',
        memberId: data.memberId || undefined,
        isLoggedIn: true,
        discordId: data.discordId,
        avatar: data.discordAvatar || session.user?.image,
      }

      setUser(mappedUser)
      setMember(data.memberProfile || null)
      setLinkedWikiUsername(data.wikiUsername || null)
    } catch (error) {
      console.error('Account 세션 확인 실패:', error)
      if (session?.user) {
        setUser({
          id: session.user.discordId || session.user.email || 'discord-user',
          username: session.user.name || 'Discord 사용자',
          email: session.user.email || '',
          role: 'guest',
          isLoggedIn: true,
          discordId: session.user.discordId,
          avatar: session.user.image || undefined,
        })
      } else {
        setUser(null)
      }
      setMember(null)
      setLinkedWikiUsername(null)
    } finally {
      setIsLoading(false)
    }
  }, [session, status])

  useEffect(() => {
    fetchAccountSession()
  }, [fetchAccountSession])

  const login = async (): Promise<boolean> => {
    try {
      await signIn('discord', { callbackUrl: '/' })
      return true
    } catch (error) {
      console.error('Discord 로그인 실패:', error)
      toast.error('디스코드 로그인에 실패했습니다.')
      return false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await signOut({ callbackUrl: '/' })
      setUser(null)
      setMember(null)
      setLinkedWikiUsername(null)
      toast.success('로그아웃되었습니다.')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      toast.error('로그아웃 중 오류가 발생했습니다.')
    }
  }

  const value: AuthContextType = {
    user,
    member,
    isLoading: isLoading || status === 'loading',
    login,
    logout,
    isLoggedIn: status === 'authenticated',
    isMember: !!user?.memberId,
    canEdit: !!member,
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
