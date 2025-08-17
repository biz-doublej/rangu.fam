'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, Member } from '@/types'
import { storage } from '@/lib/utils'
import toast from 'react-hot-toast'

// 멤버 데이터는 이제 API에서 가져옴
let MEMBERS: Member[] = []

// 멤버 데이터 로드 함수
async function loadMembers(): Promise<Member[]> {
  try {
    const response = await fetch('/api/members')
    if (response.ok) {
      const data = await response.json()
      MEMBERS = data
      return data
    }
  } catch (error) {
    console.error('멤버 데이터 로딩 오류:', error)
  }
  
  // 오류 시 기본 멤버 데이터 반환
  return [
    {
      id: 'jaewon',
      name: '정재원',
      role: '소프트웨어 엔지니어, 패션 모델',
      description: '코딩과 패션을 사랑하는 다재다능한 개발자입니다.',
      avatar: '/images/jaewon.jpg',
      email: 'jaewon@rangu.fam',
      status: 'active',
      location: '서울, 대한민국',
      joinDate: new Date('2020-01-01'),
      personalPageUrl: '/members/jaewon'
    },
    {
      id: 'minseok',
      name: '정민석',
      role: '스위스 거주',
      description: '스위스에서 새로운 꿈을 키워가고 있습니다.',
      avatar: '/images/minseok.jpg',
      email: 'minseok@rangu.fam',
      status: 'active',
      location: '취리히, 스위스',
      joinDate: new Date('2020-01-01'),
      personalPageUrl: '/members/minseok'
    },
    {
      id: 'jingyu',
      name: '정진규',
      role: '군 입대 중',
      description: '현재 군 복무 중이며, 전역 후 새로운 도전을 계획하고 있습니다.',
      avatar: '/images/jingyu.jpg',
      email: 'jingyu@rangu.fam',
      status: 'active',
      location: '대한민국',
      joinDate: new Date('2020-01-01'),
      personalPageUrl: '/members/jingyu'
    },
    {
      id: 'seungchan',
      name: '이승찬',
      role: '임시 멤버 (정진규 대체)',
      description: '2025년 7월부터 임시로 합류한 새로운 멤버입니다.',
      avatar: '/images/seungchan.jpg',
      email: 'seungchan@rangu.fam',
      status: 'active',
      location: '대한민국',
      joinDate: new Date('2025-07-21'),
      personalPageUrl: '/members/seungchan'
    },
    {
      id: 'heeyeol',
      name: '윤희열',
      role: '임시 멤버 (예정)',
      description: '2025년 9월부터 임시로 합류 예정인 새로운 멤버입니다.',
      avatar: '/images/heeyeol.jpg',
      email: 'heeyeol@rangu.fam',
      status: 'active',
      location: '대한민국',
      joinDate: new Date('2025-09-01'),
      personalPageUrl: '/members/heeyeol'
    },
    {
      id: 'hanul',
      name: '강한울',
      role: '무직(편돌이)',
      description: '자유로운 영혼으로 다양한 취미와 관심사를 탐구합니다.',
      avatar: '/images/hanul.jpg',
      email: 'hanul@rangu.fam',
      status: 'active',
      location: '서울, 대한민국',
      joinDate: new Date('2020-01-01'),
      personalPageUrl: '/members/hanul'
    }
  ]
}

// 더미 로그인 정보
const DEMO_CREDENTIALS = {
  jaewon: 'password123',
  minseok: 'password123',
  jingyu: 'password123',
  hanul: 'password123',
  guest: 'guest123'
}

// 상태별 기본 메시지 함수
const getDefaultStatusMessage = (status: string): string => {
  switch (status) {
    case 'online':
      return '온라인'
    case 'idle':
      return '자리 비움'
    case 'dnd':
      return '방해금지'
    case 'offline':
      return '오프라인'
    default:
      return '오프라인'
  }
}

interface AuthContextType {
  user: User | null
  member: Member | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  isLoggedIn: boolean
  isMember: boolean
  canEdit: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 페이지 로드 시 저장된 세션 확인 및 멤버 데이터 로드
    const initializeAuth = async () => {
      // 멤버 데이터 먼저 로드
      await loadMembers()
      
      const savedUser = storage.get<User>('rangu_user')
      if (savedUser) {
        setUser(savedUser)
        if (savedUser.memberId) {
          const foundMember = MEMBERS.find(m => m.id === savedUser.memberId)
          setMember(foundMember || null)
        }
      }
      setIsLoading(false)
    }
    
    initializeAuth()
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    
    try {
      // 멤버 로그인 확인
      const foundMember = MEMBERS.find(m => m.id === username || m.email === username)
      
      if (foundMember && DEMO_CREDENTIALS[username as keyof typeof DEMO_CREDENTIALS] === password) {
        const newUser: User = {
          id: foundMember.id,
          username: foundMember.name,
          email: foundMember.email!,
          role: 'member',
          memberId: foundMember.id,
          isLoggedIn: true
        }
        
        setUser(newUser)
        setMember(foundMember)
        storage.set('rangu_user', newUser)
        
        // 멤버 활동 상태를 온라인으로 업데이트 (로그인 시간 기록)
        try {
          await fetch('/api/members', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              memberId: foundMember.id,
              action: 'login',
              activity: '온라인'
            })
          })
          
          // 상태 시스템에서도 온라인으로 변경 (기존 설정이 있으면 유지, 없으면 온라인)
          const statusResponse = await fetch(`/api/profiles/${foundMember.id}/status`)
          let statusToSet = 'online'
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            // 기존에 설정된 상태가 있고 오프라인이 아니면 그 상태 유지
            if (statusData.status && statusData.status !== 'offline') {
              statusToSet = statusData.status
            }
          }
          
          await fetch(`/api/profiles/${foundMember.id}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: statusToSet,
              customMessage: getDefaultStatusMessage(statusToSet)
            })
          })
          
          console.log(`Login activity updated for ${foundMember.name} - set to ${statusToSet}`)
        } catch (error) {
          console.error('Failed to update member activity on login:', error)
        }
        
        toast.success(`환영합니다, ${foundMember.name}님!`)
        return true
      }
      
      // 게스트 로그인 확인
      if (username === 'guest' && password === 'guest123') {
        const guestUser: User = {
          id: 'guest',
          username: 'Guest',
          email: 'guest@rangu.fam',
          role: 'guest',
          isLoggedIn: true
        }
        
        setUser(guestUser)
        setMember(null)
        storage.set('rangu_user', guestUser)
        
        toast.success('게스트로 로그인했습니다!')
        return true
      }
      
      toast.error('아이디 또는 비밀번호가 올바르지 않습니다.')
      return false
      
    } catch (error) {
      toast.error('로그인 중 오류가 발생했습니다.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    if (user?.memberId || user?.id) {
      // 멤버 활동 상태를 오프라인으로 업데이트 (로그아웃 시간 기록)
      try {
        await fetch('/api/members', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            memberId: user.memberId || user.id,
            action: 'logout',
            activity: '오프라인'
          })
        })
        
        // 상태 시스템에서도 오프라인으로 변경
        await fetch(`/api/profiles/${user.memberId || user.id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'offline',
            customMessage: '오프라인'
          })
        })
        
        console.log(`Logout activity updated for ${user.username} - set to offline`)
      } catch (error) {
        console.error('Failed to update member activity on logout:', error)
      }
    }
    
    setUser(null)
    setMember(null)
    storage.remove('rangu_user')
    toast.success('로그아웃되었습니다.')
  }

  const value: AuthContextType = {
    user,
    member,
    isLoading,
    login,
    logout,
    isLoggedIn: !!user,
    isMember: user?.role === 'member',
    canEdit: user?.role === 'member'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { MEMBERS } 