'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Github, 
  Linkedin, 
  Instagram, 
  Globe, 
  Mail, 
  MapPin, 
  Calendar,
  Code,
  User,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Star,
  Camera,
  Palette,
  Laptop,
  AlertCircle,
  Loader2,
  Edit,
  Plus,
  Save,
  X,
  UserPlus,
  UserMinus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { DDayWidget } from '@/components/ui'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProfileData {
  _id: string
  userId: {
    _id: string
    username: string
    email?: string
    profileImage?: string
    role?: string
  }
  username: string
  intro: string
  bio: string
  location: string
  website?: string
  phone?: string
  // 군대 관련 정보 추가
  militaryInfo?: {
    branch: string
    rank: string
    unit: string
    enlistmentDate: string
    dischargeDate: string
    trainingEndDate?: string
    daysServed: number
    daysRemaining: number
    totalServiceDays?: number
    motto: string
  }
  // 유학 관련 정보 추가
  studyAbroadInfo?: {
    country: string
    city: string
    university: string
    major: string
    departureDate: string
    program: string
    duration: string
    daysUntilDeparture: number
    motto: string
  }
  // 입시 관련 정보 추가
  examInfo?: {
    targetDate: string
    dDayDate: string
    school: string
    category: string
    attemptNumber: number
    status: string
    daysUntilExam: number
    daysUntilDeadline: number
    motto: string
  }
  // 프로젝트 진행 상황 정보 추가
  activeProjects?: Array<{
    name: string
    description: string
    category: string
    startDate: string
    endDate: string
    currentProgress: number
    status: string
    color: string
  }>
  skills: Array<{
    name: string
    level: number
    category: string
  }>
  projects: Array<{
    title: string
    description: string
    tech: string[]
    image?: string
    liveUrl?: string
    githubUrl?: string
    featured: boolean
    status: string
  }>
  experience: Array<{
    company: string
    position: string
    period: string
    description?: string
    achievements: string[]
    isCurrent: boolean
  }>
  socialLinks: {
    github?: string
    linkedin?: string
    website?: string
    instagram?: string
    twitter?: string
    blog?: string
  }
  recentPosts: Array<{
    content: string
    type: string
    mediaUrl?: string
    linkUrl?: string
    tags: string[]
    likes: number
    createdAt: string
  }>
  stats: {
    projects: number
    followers: number
    following: number
    posts: number
    views: number
  }
  viewCount: number
  likesReceived: number
}

function MemberPortfolio() {
  const params = useParams()
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('about')
  const [likes, setLikes] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [editingSocialLinks, setEditingSocialLinks] = useState(false)
  const [socialLinksForm, setSocialLinksForm] = useState({
    github: '',
    linkedin: '',
    website: '',
    instagram: '',
    twitter: '',
    blog: ''
  })
  const [editingSkills, setEditingSkills] = useState(false)
  const [skillsForm, setSkillsForm] = useState<Array<{name: string, level: number, category: string}>>([])
  const [editingProjects, setEditingProjects] = useState(false)
  const [projectsForm, setProjectsForm] = useState<Array<any>>([])
  const [editingExperience, setEditingExperience] = useState(false)
  const [experienceForm, setExperienceForm] = useState<Array<any>>([])
  const [editingPosts, setEditingPosts] = useState(false)
  const [postsForm, setPostsForm] = useState<Array<any>>([])
  const [editingProfileInfo, setEditingProfileInfo] = useState(false)
  const [profileInfoForm, setProfileInfoForm] = useState({
    intro: '',
    bio: '',
    location: '',
    website: '',
    phone: ''
  })
  const [userStatus, setUserStatus] = useState<'online' | 'idle' | 'dnd' | 'offline'>('offline')
  const [statusMessage, setStatusMessage] = useState('')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [currentProjectSlide, setCurrentProjectSlide] = useState(0)

  // 브라우저 확장 프로그램의 속성 제거 (bis_skin_checked 경고 해결)
  useEffect(() => {
    const removeExtensionAttributes = () => {
      try {
        const elements = document.querySelectorAll('[bis_skin_checked]')
        elements.forEach(el => {
          el.removeAttribute('bis_skin_checked')
        })
      } catch (error) {
        // 조용히 무시
      }
    }
    
    // 초기 로드 시와 DOM 변경 시 실행
    removeExtensionAttributes()
    const observer = new MutationObserver(removeExtensionAttributes)
    observer.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: true 
    })
    
    return () => observer.disconnect()
  }, [])

  // 편집 권한 체크
  const canEdit = user && profile && (
    // username 또는 user.id로 체크
    ((user.username === '정재원' || user.id === 'jaewon') && params.id === 'jaewon') ||
    ((user.username === '정민석' || user.id === 'minseok') && params.id === 'minseok') ||
    ((user.username === '정진규' || user.id === 'jingyu') && params.id === 'jingyu') ||
    ((user.username === '강한울' || user.id === 'hanul') && params.id === 'hanul') ||
    ((user.username === '이승찬' || user.id === 'mushbit') && params.id === 'seungchan') ||
    ((user.username === '임시멤버 이승찬' || user.id === 'seungchan') && (params.id === 'seungchan' || params.id === 'heeyeol'))
  )

  // 디버깅용 로그
  console.log('편집 권한 디버깅:', {
    user: user,
    'user.username': user?.username,
    'params.id': params.id,
    canEdit: canEdit,
    profile: !!profile
  })

  // 프로필 데이터 로드 함수
  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const userId = params.id as string
      console.log('프로필 요청 시작:', userId)
      
      const response = await fetch(`/api/profiles/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('프로필 응답 상태:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('프로필 API 에러 응답:', errorText)
        throw new Error(`프로필을 불러오는데 실패했습니다. (${response.status})`)
      }

      const data = await response.json()
      console.log('프로필 데이터:', data)
      
      if (data.success && data.profile) {
        setProfile(data.profile)
        setLikes(data.profile.likesReceived || 0)
        // 소셜 링크 폼 초기화
        setSocialLinksForm({
          github: data.profile.socialLinks?.github || '',
          linkedin: data.profile.socialLinks?.linkedin || '',
          website: data.profile.socialLinks?.website || data.profile.website || '',
          instagram: data.profile.socialLinks?.instagram || '',
          twitter: data.profile.socialLinks?.twitter || '',
          blog: data.profile.socialLinks?.blog || ''
        })
        // 스킬 폼 초기화
        setSkillsForm(data.profile.skills || [])
        // 프로젝트 폼 초기화
        setProjectsForm(data.profile.projects || [])
        // 경험 폼 초기화
        setExperienceForm(data.profile.experience || [])
        // 포스트 폼 초기화
        setPostsForm(data.profile.recentPosts || [])
        // 프로필 정보 폼 초기화
        setProfileInfoForm({
          intro: data.profile.intro || '',
          bio: data.profile.bio || '',
          location: data.profile.location || '',
          website: data.profile.website || '',
          phone: data.profile.phone || ''
        })
      } else {
        console.error('프로필 데이터 구조 문제:', data)
        throw new Error(data.error || '프로필 데이터가 없습니다.')
      }
    } catch (err) {
      console.error('프로필 로딩 오류 상세:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchProfile()
      fetchUserStatus()
    }
  }, [params.id])

  // 외부 클릭 시 상태 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      // 상태 메뉴나 상태 버튼을 클릭한 경우가 아닐 때만 메뉴 닫기
      if (showStatusMenu && !target?.closest('.status-menu-container')) {
        setShowStatusMenu(false)
      }
    }
    
    if (showStatusMenu) {
      // 약간의 딜레이를 주어 클릭 이벤트가 제대로 처리되도록 함
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showStatusMenu])

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikes(prev => isLiked ? prev - 1 : prev + 1)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${profile?.userId?.username || '사용자'}의 포트폴리오`,
        text: `${profile?.userId?.username || '사용자'}님의 포트폴리오를 확인해보세요!`,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('링크가 클립보드에 복사되었습니다!')
    }
  }

  const handleFollow = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }
    
    try {
      const response = await fetch(`/api/profiles/${params.id}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          action: isFollowing ? 'unfollow' : 'follow'
        })
      })
      
      if (response.ok) {
        setIsFollowing(!isFollowing)
        // 프로필 데이터 다시 로드하여 팔로워 수 업데이트
        fetchProfile()
      }
    } catch (error) {
      console.error('팔로우 처리 오류:', error)
    }
  }

  const fetchFollowers = async () => {
    try {
      const response = await fetch(`/api/profiles/${params.id}/followers`)
      if (response.ok) {
        const data = await response.json()
        setFollowers(data.followers || [])
        setShowFollowersModal(true)
      } else {
        // API 실패 시에도 빈 배열로 모달 열기
        console.log('팔로워 API 응답 실패, 빈 목록으로 표시')
        setFollowers([])
        setShowFollowersModal(true)
      }
    } catch (error) {
      console.error('팔로워 목록 로딩 오류:', error)
      // 에러 발생 시에도 빈 배열로 모달 열기
      setFollowers([])
      setShowFollowersModal(true)
    }
  }

  const fetchFollowing = async () => {
    try {
      const response = await fetch(`/api/profiles/${params.id}/following`)
      if (response.ok) {
        const data = await response.json()
        setFollowing(data.following || [])
        setShowFollowingModal(true)
      } else {
        // API 실패 시에도 빈 배열로 모달 열기
        console.log('팔로잉 API 응답 실패, 빈 목록으로 표시')
        setFollowing([])
        setShowFollowingModal(true)
      }
    } catch (error) {
      console.error('팔로잉 목록 로딩 오류:', error)
      // 에러 발생 시에도 빈 배열로 모달 열기
      setFollowing([])
      setShowFollowingModal(true)
    }
  }

  const saveSocialLinks = async () => {
    try {
      console.log('소셜 링크 저장 시도:', socialLinksForm)
      const response = await fetch(`/api/profiles/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          socialLinks: socialLinksForm
        })
      })

      console.log('응답 상태:', response.status)
      const responseData = await response.json()
      console.log('응답 데이터:', responseData)

      if (response.ok) {
        setEditingSocialLinks(false)
        
        // 즉시 로컬 상태 업데이트
        if (responseData.profile) {
          setProfile(responseData.profile)
        }
        
        // 백업으로 프로필 다시 로드
        fetchProfile()
        alert('소셜 링크가 저장되었습니다.')
      } else {
        alert(`저장에 실패했습니다. 오류: ${responseData.error || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('소셜 링크 저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const saveSkills = async () => {
    try {
      const response = await fetch(`/api/profiles/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skills: skillsForm
        })
      })

      if (response.ok) {
        setEditingSkills(false)
        
        // 응답 데이터 파싱
        const responseData = await response.json()
        
        // 즉시 로컬 상태 업데이트
        if (responseData.profile) {
          setProfile(responseData.profile)
        }
        
        fetchProfile()
        alert('스킬이 저장되었습니다.')
      } else {
        const responseData = await response.json()
        alert(`저장에 실패했습니다. 오류: ${responseData.error || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('스킬 저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const saveProjects = async () => {
    try {
      console.log('프로젝트 저장 시도:', projectsForm)
      const response = await fetch(`/api/profiles/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projects: projectsForm
        })
      })

      console.log('프로젝트 저장 응답 상태:', response.status)
      const responseData = await response.json()
      console.log('프로젝트 저장 응답 데이터:', responseData)

      if (response.ok) {
        setEditingProjects(false)
        
        // 즉시 로컬 상태 업데이트
        if (responseData.profile) {
          setProfile(responseData.profile)
        }
        
        // 백업으로 프로필 다시 로드
        fetchProfile()
        alert('프로젝트가 저장되었습니다.')
      } else {
        alert(`저장에 실패했습니다. 오류: ${responseData.error || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('프로젝트 저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const saveExperience = async () => {
    try {
      // 날짜 계산 및 기간 설정
      const processedExperience = experienceForm.map(exp => {
        const startDate = new Date(exp.startDate)
        const endDate = exp.isCurrent ? new Date() : new Date(exp.endDate)
        
        // 기간 계산 (개월 수)
        const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth())
        
        // 기간 텍스트 생성
        let periodText = `${exp.startDate} - `
        if (exp.isCurrent) {
          periodText += '현재'
        } else {
          periodText += exp.endDate
        }
        
        // 기간 표시 추가
        if (monthsDiff >= 12) {
          const years = Math.floor(monthsDiff / 12)
          const months = monthsDiff % 12
          if (months > 0) {
            periodText += ` (${years}년 ${months}개월)`
          } else {
            periodText += ` (${years}년)`
          }
        } else if (monthsDiff > 0) {
          periodText += ` (${monthsDiff}개월)`
        }
        
        return {
          ...exp,
          period: periodText
        }
      })

      console.log('경험 저장 시도:', processedExperience)
      const response = await fetch(`/api/profiles/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          experience: processedExperience
        })
      })

      console.log('경험 저장 응답 상태:', response.status)
      const responseData = await response.json()
      console.log('경험 저장 응답 데이터:', responseData)

      if (response.ok) {
        setEditingExperience(false)
        
        // 즉시 로컬 상태 업데이트
        if (responseData.profile) {
          setProfile(responseData.profile)
        }
        
        // 백업으로 프로필 다시 로드
        fetchProfile()
        alert('경험이 저장되었습니다.')
      } else {
        alert(`저장에 실패했습니다. 오류: ${responseData.error || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('경험 저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const savePosts = async () => {
    try {
      // isNew 플래그가 있는 새 포스트들 처리
      const cleanedPosts = postsForm.filter(post => post.content.trim()).map(post => {
        const cleanPost = { ...post }
        delete cleanPost.isNew // isNew 플래그 제거
        return cleanPost
      })

      console.log('포스트 저장 시도:', cleanedPosts)
      const response = await fetch(`/api/profiles/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recentPosts: cleanedPosts
        })
      })

      console.log('포스트 저장 응답 상태:', response.status)
      const responseData = await response.json()
      console.log('포스트 저장 응답 데이터:', responseData)

      if (response.ok) {
        setEditingPosts(false)
        
        // 즉시 로컬 상태 업데이트
        if (responseData.profile) {
          setProfile(responseData.profile)
        }
        
        // 백업으로 프로필 다시 로드
        fetchProfile()
        alert('포스트가 저장되었습니다.')
      } else {
        alert(`저장에 실패했습니다. 오류: ${responseData.error || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('포스트 저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const saveProfileInfo = async () => {
    try {
      console.log('프로필 정보 저장 시도:', profileInfoForm)
      const response = await fetch(`/api/profiles/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileInfoForm)
      })

      console.log('응답 상태:', response.status)
      const responseData = await response.json()
      console.log('응답 데이터:', responseData)

      if (response.ok) {
        setEditingProfileInfo(false)
        
        // 즉시 로컬 상태 업데이트
        if (responseData.profile) {
          setProfile(responseData.profile)
        }
        
        // 백업으로 프로필 다시 로드
        fetchProfile()
        alert('프로필 정보가 저장되었습니다.')
      } else {
        alert(`저장에 실패했습니다. 오류: ${responseData.error || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('프로필 정보 저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  // 사용자 상태 조회
  const fetchUserStatus = async () => {
    try {
      const response = await fetch(`/api/profiles/${params.id}/status`)
      if (response.ok) {
        const data = await response.json()
        setUserStatus(data.status)
        setStatusMessage(data.customMessage)
      }
    } catch (error) {
      console.error('상태 조회 오류:', error)
    }
  }

  // 사용자 상태 변경
  const changeUserStatus = async (newStatus: 'online' | 'idle' | 'dnd' | 'offline', customMessage?: string) => {
    console.log('🚀 상태 변경 시도:', { 
      newStatus, 
      customMessage, 
      userId: params.id, 
      currentStatus: userStatus,
      canEdit
    })
    
    try {
      const response = await fetch(`/api/profiles/${params.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          customMessage: customMessage
        })
      })

      console.log('📡 상태 변경 응답 상태:', response.status)
      const data = await response.json()
      console.log('📦 상태 변경 응답 데이터:', data)

      if (response.ok) {
        console.log('✅ 상태 변경 성공! 이전:', userStatus, '→ 새로운:', data.status)
        setUserStatus(data.status)
        setStatusMessage(data.customMessage)
        setShowStatusMenu(false)
      } else {
        console.error('❌ 상태 변경 실패:', data)
        alert(`상태 변경에 실패했습니다: ${data.error}`)
      }
    } catch (error) {
      console.error('💥 상태 변경 오류:', error)
      alert('상태 변경 중 오류가 발생했습니다.')
    }
  }

  // 상태별 색상 반환
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'idle':
        return 'bg-yellow-500'
      case 'dnd':
        return 'bg-red-500'
      case 'offline':
        return 'bg-gray-500'
      default:
        return 'bg-green-500'
    }
  }

  // 상태별 텍스트 반환
  const getStatusText = (status: string) => {
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
        return '온라인'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">포트폴리오를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">프로필을 찾을 수 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                {profile.userId?.profileImage ? (
                  <img src={profile.userId.profileImage} alt={profile.userId.username} className="w-full h-full rounded-full object-cover" />
                ) : (
                  profile.userId?.username?.charAt(0).toUpperCase() || '👤'
                )}
              </div>
              <div>
                <h1 className="font-bold text-gray-900">{profile.userId?.username || '사용자'}</h1>
                <p className="text-sm text-gray-500">@{profile.username}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {canEdit && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`p-2 rounded-full transition-colors ${
                    isEditing ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title="프로필 편집"
                >
                  <Edit className="w-5 h-5" />
                </button>
              )}
              {user && !canEdit && (
                <button
                  onClick={handleFollow}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    isFollowing 
                      ? 'text-gray-600 bg-gray-100 hover:bg-gray-200' 
                      : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4 mr-1 inline" />
                      언팔로우
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1 inline" />
                      팔로우
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleLike}
                className={`p-2 rounded-full transition-colors ${
                  isLiked ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:bg-gray-100'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {/* 군대 테마 헤더 (정진규 전용) */}
        {params.id === 'jingyu' && profile?.militaryInfo && (
        <motion.div
            className="bg-gradient-to-r from-green-800 to-green-600 rounded-2xl p-6 mb-6 text-white shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* D-Day 카운터 */}
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">🎖️</div>
                <div className="text-2xl font-bold text-yellow-300">
                  {profile.militaryInfo.daysServed < 0 ? 
                    `D${profile.militaryInfo.daysServed}` : 
                    `D-${profile.militaryInfo.daysRemaining}`
                  }
                </div>
                <div className="text-sm opacity-90">
                  {profile.militaryInfo.daysServed < 0 ? '입대까지' : '전역까지'}
                </div>
              </div>
              
              {/* 복무 현황 */}
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">⏱️</div>
                <div className="text-2xl font-bold text-yellow-300">
                  {profile.militaryInfo.daysServed < 0 ? 
                    `${Math.abs(profile.militaryInfo.daysServed)}일` : 
                    `${profile.militaryInfo.daysServed}일`
                  }
                </div>
                <div className="text-sm opacity-90">
                  {profile.militaryInfo.daysServed < 0 ? '입대 대기' : '복무 완료'}
                </div>
              </div>
              
              {/* 진행률 */}
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">📊</div>
                <div className="text-2xl font-bold text-yellow-300">
                  {profile.militaryInfo.daysServed < 0 ? 
                    '대기중' : 
                    `${Math.round((profile.militaryInfo.daysServed / (profile.militaryInfo.daysServed + profile.militaryInfo.daysRemaining)) * 100)}%`
                  }
                </div>
                <div className="text-sm opacity-90">
                  {profile.militaryInfo.daysServed < 0 ? '입대 준비' : '복무 진행률'}
                </div>
              </div>
            </div>
            
            {/* 진행바 */}
            <div className="mt-6">
              <div className="bg-green-900 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-yellow-300 h-full transition-all duration-1000"
                  style={{ 
                    width: profile.militaryInfo.daysServed < 0 ? '0%' : 
                    `${Math.round((profile.militaryInfo.daysServed / (profile.militaryInfo.totalServiceDays || 548)) * 100)}%` 
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-xs mt-2 opacity-90">
                <span>입대: {new Date(profile.militaryInfo.enlistmentDate).toLocaleDateString('ko-KR')}</span>
                <span>전역: {new Date(profile.militaryInfo.dischargeDate).toLocaleDateString('ko-KR')}</span>
              </div>
              {profile.militaryInfo.trainingEndDate && profile.militaryInfo.daysServed < 0 && (
                <div className="text-center text-xs mt-1 opacity-75">
                  훈련소 수료: {new Date(profile.militaryInfo.trainingEndDate).toLocaleDateString('ko-KR')} (18일)
                </div>
              )}
            </div>
            
            {/* 부대 정보 */}
            <div className="mt-4 text-center">
              <div className="text-lg font-semibold">{profile.militaryInfo.unit}</div>
              <div className="text-sm opacity-90">{profile.militaryInfo.rank} | {profile.militaryInfo.branch}</div>
              <div className="text-xs mt-2 italic opacity-80">"{profile.militaryInfo.motto}"</div>
            </div>
          </motion.div>
        )}

        {/* 군대 + 마법 테마 헤더 (이승찬 전용) */}
        {params.id === 'seungchan' && profile?.militaryInfo && (
          <motion.div
            className="bg-gradient-to-r from-purple-800 via-indigo-700 to-purple-600 rounded-2xl p-6 mb-6 text-white shadow-lg relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* 마법 이펙트 배경 */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-4 text-6xl animate-pulse">✨</div>
              <div className="absolute top-8 right-8 text-4xl animate-bounce">🪄</div>
              <div className="absolute bottom-4 left-8 text-5xl animate-pulse">🎖️</div>
              <div className="absolute bottom-8 right-4 text-3xl animate-bounce">⭐</div>
            </div>
            
            <div className="relative z-10">
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-yellow-300 mb-2">🪄 마술사의 군복무 여정 🎖️</div>
                <div className="text-lg opacity-90">LEE SEUNG CHAN</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* D-Day 카운터 */}
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">🎭</div>
                  <div className="text-2xl font-bold text-yellow-300">
                    {profile.militaryInfo.daysServed < 0 ? 
                      `D${profile.militaryInfo.daysServed}` : 
                      `D-${profile.militaryInfo.daysRemaining}`
                    }
                  </div>
                  <div className="text-sm opacity-90">
                    {profile.militaryInfo.daysServed < 0 ? '입대까지' : '전역까지'}
                  </div>
                </div>
                
                {/* 복무 현황 */}
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">🔮</div>
                  <div className="text-2xl font-bold text-yellow-300">
                    {profile.militaryInfo.daysServed < 0 ? 
                      `${Math.abs(profile.militaryInfo.daysServed)}일` : 
                      `${profile.militaryInfo.daysServed}일`
                    }
                  </div>
                  <div className="text-sm opacity-90">
                    {profile.militaryInfo.daysServed < 0 ? '마법 연마 시간' : '군복무 완료'}
                  </div>
                </div>
                
                {/* 진행률 */}
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">🏰</div>
                  <div className="text-2xl font-bold text-yellow-300">
                    {profile.militaryInfo.daysServed < 0 ? 
                      '준비중' : 
                      `${Math.round((profile.militaryInfo.daysServed / (profile.militaryInfo.daysServed + profile.militaryInfo.daysRemaining)) * 100)}%`
                    }
                  </div>
                  <div className="text-sm opacity-90">
                    {profile.militaryInfo.daysServed < 0 ? '호그와트 재학' : '복무 진행률'}
                  </div>
                </div>
              </div>
              
              {/* 마법 진행바 */}
              <div className="mt-6">
                <div className="bg-purple-900 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 h-full transition-all duration-1000 animate-pulse"
                    style={{ 
                      width: profile.militaryInfo.daysServed < 0 ? '0%' : 
                      `${Math.round((profile.militaryInfo.daysServed / (profile.militaryInfo.totalServiceDays || 548)) * 100)}%` 
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs mt-2 opacity-90">
                  <span>입대: {new Date(profile.militaryInfo.enlistmentDate).toLocaleDateString('ko-KR')}</span>
                  <span>전역: {new Date(profile.militaryInfo.dischargeDate).toLocaleDateString('ko-KR')}</span>
                </div>
                {profile.militaryInfo.trainingEndDate && profile.militaryInfo.daysServed < 0 && (
                  <div className="text-center text-xs mt-1 opacity-75">
                    훈련소 수료: {new Date(profile.militaryInfo.trainingEndDate).toLocaleDateString('ko-KR')} (18일)
                  </div>
                )}
              </div>
              
              {/* 부대 정보 + 마법학교 정보 */}
              <div className="mt-4 text-center">
                <div className="text-lg font-semibold">{profile.militaryInfo.unit}</div>
                <div className="text-sm opacity-90">{profile.militaryInfo.rank} | {profile.militaryInfo.branch}</div>
                <div className="text-sm mt-1 text-yellow-300">🏰 호그와트 마법학교 고급 마법반 재학 중</div>
                <div className="text-xs mt-2 italic opacity-80">"{profile.militaryInfo.motto}"</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 스위스 유학 테마 헤더 (정민석 전용) */}
        {params.id === 'minseok' && profile?.studyAbroadInfo && (
          <motion.div
            className="bg-gradient-to-r from-red-600 to-red-500 rounded-2xl p-6 mb-6 text-white shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* D-Day 카운터 */}
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">🇨🇭</div>
                <div className="text-2xl font-bold text-yellow-300">
                  D-{profile.studyAbroadInfo.daysUntilDeparture}
                </div>
                <div className="text-sm opacity-90">출국까지</div>
              </div>
              
              {/* 대학 정보 */}
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">🏫</div>
                <div className="text-lg font-bold text-yellow-300">
                  {profile.studyAbroadInfo.university}
                </div>
                <div className="text-sm opacity-90">{profile.studyAbroadInfo.major}</div>
              </div>
              
              {/* 유학 기간 */}
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">📚</div>
                <div className="text-2xl font-bold text-yellow-300">
                  {profile.studyAbroadInfo.duration}
                </div>
                <div className="text-sm opacity-90">{profile.studyAbroadInfo.program}</div>
              </div>
            </div>
            
            {/* 진행바 */}
            <div className="mt-6">
              <div className="bg-red-800 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-white to-gray-200 h-full transition-all duration-1000"
                  style={{ 
                    width: profile.studyAbroadInfo.daysUntilDeparture > 0 ? '10%' : '100%'
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-xs mt-2 opacity-90">
                <span>준비 시작</span>
                <span>출국: {new Date(profile.studyAbroadInfo.departureDate).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
            
            {/* 유학 정보 */}
            <div className="mt-4 text-center">
              <div className="text-lg font-semibold">{profile.studyAbroadInfo.city}, {profile.studyAbroadInfo.country}</div>
              <div className="text-sm opacity-90">{profile.studyAbroadInfo.program} | {profile.studyAbroadInfo.duration}</div>
              <div className="text-xs mt-2 italic opacity-80">"{profile.studyAbroadInfo.motto}"</div>
            </div>
          </motion.div>
        )}

        {/* 프로젝트 진행 상황 헤더 (정재원 전용) */}
        {params.id === 'jaewon' && profile?.activeProjects && (
          <motion.div
            className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 mb-6 text-white shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 text-center">
              <h3 className="text-2xl font-bold mb-2">🚀 진행 중인 프로젝트</h3>
              <p className="text-sm opacity-90">현재 {profile.activeProjects.length}개의 프로젝트를 동시에 진행하고 있습니다</p>
            </div>
            
            {/* 프로젝트 슬라이더 */}
            <div className="relative">
              {/* 이전/다음 버튼 */}
              <button
                onClick={() => {
                  const currentIndex = Math.floor(currentProjectSlide / 3);
                  if (currentIndex > 0) {
                    setCurrentProjectSlide((currentIndex - 1) * 3);
                  }
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-all duration-200"
                disabled={currentProjectSlide === 0}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => {
                  const maxIndex = Math.ceil((profile.activeProjects?.length || 0) / 3) - 1;
                  const currentIndex = Math.floor(currentProjectSlide / 3);
                  if (currentIndex < maxIndex) {
                    setCurrentProjectSlide((currentIndex + 1) * 3);
                  }
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-all duration-200"
                disabled={currentProjectSlide >= (profile.activeProjects?.length || 0) - 3}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              {/* 프로젝트 카드들 (3개씩 표시) */}
              <div className="overflow-hidden mx-12">
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${(currentProjectSlide / 3) * 100}%)` }}
                >
                  {Array.from({ length: Math.ceil((profile.activeProjects?.length || 0) / 3) }, (_, pageIndex) => (
                    <div key={pageIndex} className="w-full flex-shrink-0">
                      <div className="grid grid-cols-3 gap-4">
                        {(profile.activeProjects || [])
                          .slice(pageIndex * 3, pageIndex * 3 + 3)
                          .map((project, index) => (
                            <div key={pageIndex * 3 + index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-lg">{project.name}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  project.color === 'blue' ? 'bg-blue-500/30 text-blue-200' :
                                  project.color === 'green' ? 'bg-green-500/30 text-green-200' :
                                  project.color === 'purple' ? 'bg-purple-500/30 text-purple-200' :
                                  project.color === 'red' ? 'bg-red-500/30 text-red-200' :
                                  project.color === 'yellow' ? 'bg-yellow-500/30 text-yellow-200' :
                                  project.color === 'indigo' ? 'bg-indigo-500/30 text-indigo-200' :
                                  project.color === 'teal' ? 'bg-teal-500/30 text-teal-200' :
                                  'bg-gray-500/30 text-gray-200'
                                }`}>
                                  {project.category}
                                </span>
                              </div>
                              
                              <p className="text-sm opacity-90 mb-3">{project.description}</p>
                              
                              <div className="mb-2">
                                <div className="flex justify-between text-xs mb-1">
                                  <span>{project.status}</span>
                                  <span>{project.currentProgress}%</span>
                                </div>
                                <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-1000 ${
                                      project.color === 'blue' ? 'bg-blue-400' :
                                      project.color === 'green' ? 'bg-green-400' :
                                      project.color === 'purple' ? 'bg-purple-400' :
                                      project.color === 'red' ? 'bg-red-400' :
                                      project.color === 'yellow' ? 'bg-yellow-400' :
                                      project.color === 'indigo' ? 'bg-indigo-400' :
                                      project.color === 'teal' ? 'bg-teal-400' :
                                      'bg-gray-400'
                                    }`}
                                    style={{ width: `${project.currentProgress}%` }}
                                  ></div>
                                </div>
                              </div>
                              
                              <div className="text-xs opacity-75">
                                <div className="flex justify-between">
                                  <span>시작: {new Date(project.startDate).toLocaleDateString('ko-KR')}</span>
                                  <span>완료: {new Date(project.endDate).toLocaleDateString('ko-KR')}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 페이지 인디케이터 */}
            <div className="flex justify-center mt-4 space-x-2">
              {Array.from({ length: Math.ceil((profile.activeProjects?.length || 0) / 3) }, (_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentProjectSlide(index * 3)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    Math.floor(currentProjectSlide / 3) === index 
                      ? 'bg-white' 
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
            
            <div className="mt-4 text-center">
              <div className="text-sm opacity-90">
                💡 효율적인 시간 관리로 모든 프로젝트를 성공적으로 완수하겠습니다!
              </div>
            </div>
          </motion.div>
        )}

        {/* 입시 준비 테마 헤더 (강한울 전용) */}
        {params.id === 'hanul' && profile?.examInfo && (
          <motion.div
            className="bg-gradient-to-r from-orange-600 to-yellow-500 rounded-2xl p-6 mb-6 text-white shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold mb-4">🎓 입시 준비 현황</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* D-Day */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-sm opacity-90 mb-1">D-Day</div>
                  <div className="text-lg font-bold">9월 7일</div>
                </div>

                {/* 학교 */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-sm opacity-90 mb-1">학교</div>
                  <div className="text-lg font-bold">미정</div>
                </div>

                {/* 교과과정 */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-sm opacity-90 mb-1">교과과정</div>
                  <div className="text-lg font-bold">이공-교육 계열</div>
                </div>

                {/* 입시 종료 기한 */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-sm opacity-90 mb-1">입시 종료 기한</div>
                  <div className="text-lg font-bold">2026년 1월 1일</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 일반 프로필 헤더 */}
        <motion.div
          className={`${
            params.id === 'jingyu' ? 'bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200' :
            params.id === 'minseok' ? 'bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200' :
            params.id === 'jaewon' ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200' :
            params.id === 'hanul' ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200' :
            params.id === 'seungchan' ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200' :
            'bg-white'
          } rounded-2xl p-6 mb-6 shadow-sm`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* 프로필 이미지 */}
            <div className="relative">
              <div className={`w-24 h-24 ${
                params.id === 'jingyu' ? 'bg-gradient-to-r from-green-600 to-green-500' :
                params.id === 'minseok' ? 'bg-gradient-to-r from-red-600 to-red-500' :
                params.id === 'jaewon' ? 'bg-gradient-to-r from-purple-600 to-blue-600' :
                params.id === 'seungchan' ? 'bg-gradient-to-r from-purple-600 to-indigo-600' :
                'bg-gradient-to-r from-blue-500 to-purple-500'
              } rounded-full flex items-center justify-center text-white text-3xl font-bold`}>
                {profile.userId?.profileImage ? (
                  <img src={profile.userId.profileImage} alt={profile.userId.username} className="w-full h-full rounded-full object-cover" />
                ) : params.id === 'jingyu' ? (
                  '🪖'
                ) : params.id === 'minseok' ? (
                  '🏔️'
                ) : params.id === 'jaewon' ? (
                  '👨‍💻'
                ) : params.id === 'seungchan' ? (
                  '🪄'
                ) : (
                  profile.userId?.username?.charAt(0).toUpperCase() || '👤'
                )}
              </div>
              {/* 상태 표시기 */}
              <div className="absolute -bottom-2 -right-2">
                {canEdit ? (
                  <div className="relative status-menu-container">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('🎯 상태 메뉴 토글 클릭:', { 
                          현재메뉴상태: showStatusMenu, 
                          변경될상태: !showStatusMenu,
                          userStatus, 
                          canEdit 
                        })
                        setShowStatusMenu(!showStatusMenu)
                        console.log('🎯 상태 메뉴 토글 후:', !showStatusMenu)
                      }}
                      className={`w-8 h-8 rounded-full border-2 border-white cursor-pointer transition-colors hover:scale-110 ${getStatusColor(userStatus)}`}
                      title={`상태: ${getStatusText(userStatus)}`}
                    />
                    
                    {/* 상태 변경 드롭다운 */}
                    {showStatusMenu && (
                      <div 
                        className="absolute bottom-8 right-0 bg-white rounded-lg shadow-xl border p-2 w-48 z-[9999]"
                        onClick={(e) => e.stopPropagation()}
                        style={{ zIndex: 9999 }}
                        onMouseEnter={() => console.log('📋 드롭다운 메뉴 렌더링됨!')}
                      >
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500 px-2 py-1 border-b">상태 변경</div>
                          {[
                            { status: 'online' as const, text: '온라인', color: 'bg-green-500', icon: '🟢' },
                            { status: 'idle' as const, text: '자리 비움', color: 'bg-yellow-500', icon: '🟡' },
                            { status: 'dnd' as const, text: '방해금지', color: 'bg-red-500', icon: '🔴' },
                            { status: 'offline' as const, text: '오프라인', color: 'bg-gray-500', icon: '⚫' }
                          ].map((item) => (
                            <button
                              key={item.status}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('🔥 상태 버튼 클릭:', item.status, '현재 상태:', userStatus)
                                changeUserStatus(item.status)
                              }}
                              className={`w-full flex items-center p-3 hover:bg-gray-100 rounded-md transition-colors border ${
                                userStatus === item.status ? 'bg-blue-50 border-blue-200' : 'border-transparent'
                              }`}
                            >
                              <div className={`w-4 h-4 ${item.color} rounded-full mr-3`}></div>
                              <span className="text-sm font-medium">{item.text}</span>
                              {userStatus === item.status && (
                                <span className="ml-auto text-blue-500 font-bold">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    className={`w-8 h-8 rounded-full border-2 border-white ${getStatusColor(userStatus)}`}
                    title={`상태: ${getStatusText(userStatus)}`}
                  />
                )}
              </div>
            </div>

            {/* 프로필 정보 */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{profile.userId?.username || '사용자'}</h1>
                {canEdit && (
                  <button
                    onClick={() => setEditingProfileInfo(!editingProfileInfo)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    편집
                  </button>
                )}
              </div>
              
              {editingProfileInfo && canEdit ? (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">소개</label>
                    <input
                      type="text"
                      value={profileInfoForm.intro}
                      onChange={(e) => setProfileInfoForm(prev => ({ ...prev, intro: e.target.value }))}
                      placeholder="간단한 소개"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">자기소개</label>
                    <textarea
                      value={profileInfoForm.bio}
                      onChange={(e) => setProfileInfoForm(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="자세한 자기소개"
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">위치</label>
                    <input
                      type="text"
                      value={profileInfoForm.location}
                      onChange={(e) => setProfileInfoForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="서울, 대한민국"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">웹사이트</label>
                    <input
                      type="url"
                      value={profileInfoForm.website}
                      onChange={(e) => setProfileInfoForm(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://yourwebsite.com"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">전화번호</label>
                    <input
                      type="tel"
                      value={profileInfoForm.phone}
                      onChange={(e) => setProfileInfoForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="010-1234-5678"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      onClick={() => setEditingProfileInfo(false)}
                      className="px-3 py-1 text-sm text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={saveProfileInfo}
                      className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                <>
              <p className="text-lg text-blue-600 font-medium mb-2">{profile.userId?.role || profile.intro}</p>
              <p className="text-gray-600 mb-4 max-w-2xl">{profile.bio}</p>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                {profile.location && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {profile.location}
                  </div>
                )}
                {profile.userId?.email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    {profile.userId.email}
                  </div>
                )}
                    {profile.phone && (
                      <div className="flex items-center">
                        <span className="w-4 h-4 mr-1">📞</span>
                        {profile.phone}
              </div>
                    )}
                  </div>
                </>
              )}

              {/* 소셜 링크 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">소셜 링크</h4>
                  {canEdit && (
                    <button
                      onClick={() => setEditingSocialLinks(!editingSocialLinks)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      편집
                    </button>
                  )}
                </div>
                
                {editingSocialLinks && canEdit ? (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">GitHub</label>
                        <input
                          type="url"
                          value={socialLinksForm.github}
                          onChange={(e) => setSocialLinksForm(prev => ({ ...prev, github: e.target.value }))}
                          placeholder="https://github.com/username"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn</label>
                        <input
                          type="url"
                          value={socialLinksForm.linkedin}
                          onChange={(e) => setSocialLinksForm(prev => ({ ...prev, linkedin: e.target.value }))}
                          placeholder="https://linkedin.com/in/username"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
                        <input
                          type="url"
                          value={socialLinksForm.website}
                          onChange={(e) => setSocialLinksForm(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="https://yoursite.com"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Instagram</label>
                        <input
                          type="url"
                          value={socialLinksForm.instagram}
                          onChange={(e) => setSocialLinksForm(prev => ({ ...prev, instagram: e.target.value }))}
                          placeholder="https://instagram.com/username"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Twitter</label>
                        <input
                          type="url"
                          value={socialLinksForm.twitter}
                          onChange={(e) => setSocialLinksForm(prev => ({ ...prev, twitter: e.target.value }))}
                          placeholder="https://twitter.com/username"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Blog</label>
                        <input
                          type="url"
                          value={socialLinksForm.blog}
                          onChange={(e) => setSocialLinksForm(prev => ({ ...prev, blog: e.target.value }))}
                          placeholder="https://blog.com"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        onClick={() => setEditingSocialLinks(false)}
                        className="px-3 py-1 text-sm text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={saveSocialLinks}
                        className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
              <div className="flex gap-3">
                {profile.socialLinks?.github && (
                  <a 
                    href={profile.socialLinks.github}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="w-5 h-5 text-gray-700" />
                  </a>
                )}
                {profile.socialLinks?.linkedin && (
                  <a 
                    href={profile.socialLinks.linkedin}
                    className="p-2 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Linkedin className="w-5 h-5 text-blue-700" />
                  </a>
                )}
                {profile.socialLinks?.instagram && (
                  <a 
                    href={profile.socialLinks.instagram}
                    className="p-2 bg-pink-100 rounded-lg hover:bg-pink-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Instagram className="w-5 h-5 text-pink-700" />
                  </a>
                )}
                    {profile.socialLinks?.twitter && (
                      <a 
                        href={profile.socialLinks.twitter}
                        className="p-2 bg-sky-100 rounded-lg hover:bg-sky-200 transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <svg className="w-5 h-5 text-sky-700" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                      </a>
                    )}
                {(profile.socialLinks?.website || profile.website) && (
                  <a 
                    href={profile.socialLinks?.website || profile.website}
                    className="p-2 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe className="w-5 h-5 text-green-700" />
                  </a>
                    )}
                    {profile.socialLinks?.blog && (
                      <a 
                        href={profile.socialLinks.blog}
                        className="p-2 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                      </a>
                    )}
                    {!profile.socialLinks?.github && !profile.socialLinks?.linkedin && !profile.socialLinks?.instagram && !profile.socialLinks?.twitter && !profile.socialLinks?.website && !profile.website && !profile.socialLinks?.blog && (
                      <p className="text-sm text-gray-500">소셜 링크가 없습니다.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-1 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-gray-900">{profile.stats?.projects || 0}</div>
                <div className="text-sm text-gray-500">프로젝트</div>
              </div>
              <button 
                onClick={(e) => {
                  e.preventDefault()
                  console.log('팔로워 버튼 클릭됨')
                  fetchFollowers()
                }} 
                className="hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer"
              >
                <div className="text-xl font-bold text-gray-900">{profile.stats?.followers || 0}</div>
                <div className="text-sm text-gray-500">팔로워</div>
              </button>
              <button 
                onClick={(e) => {
                  e.preventDefault()
                  console.log('팔로잉 버튼 클릭됨')
                  fetchFollowing()
                }} 
                className="hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer"
              >
                <div className="text-xl font-bold text-gray-900">{profile.stats?.following || 0}</div>
                <div className="text-sm text-gray-500">팔로잉</div>
              </button>
              <div>
                <div className="text-xl font-bold text-gray-900">{profile.stats?.posts || 0}</div>
                <div className="text-sm text-gray-500">포스트</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-xl mb-6 shadow-sm">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'about', label: '소개', icon: User },
              { id: 'projects', label: '프로젝트', icon: Code },
              { id: 'experience', label: '경험', icon: Briefcase },
              { id: 'posts', label: '포스트', icon: MessageCircle }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* 소개 탭 */}
            {activeTab === 'about' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* 스킬 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Star className="w-5 h-5 mr-2 text-yellow-500" />
                    스킬
                  </h3>
                    {canEdit && (
                      <button
                        onClick={() => setEditingSkills(!editingSkills)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        편집
                      </button>
                    )}
                  </div>
                  
                  {editingSkills && canEdit ? (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      {skillsForm.map((skill, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">스킬명</label>
                            <input
                              type="text"
                              value={skill.name}
                              onChange={(e) => {
                                const newSkills = [...skillsForm]
                                newSkills[index].name = e.target.value
                                setSkillsForm(newSkills)
                              }}
                              placeholder="예: React"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">레벨 (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={skill.level}
                              onChange={(e) => {
                                const newSkills = [...skillsForm]
                                newSkills[index].level = parseInt(e.target.value) || 0
                                setSkillsForm(newSkills)
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">카테고리</label>
                            <input
                              type="text"
                              value={skill.category}
                              onChange={(e) => {
                                const newSkills = [...skillsForm]
                                newSkills[index].category = e.target.value
                                setSkillsForm(newSkills)
                              }}
                              placeholder="예: Frontend"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newSkills = skillsForm.filter((_, i) => i !== index)
                              setSkillsForm(newSkills)
                            }}
                            className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2">
                        <button
                          onClick={() => setSkillsForm([...skillsForm, { name: '', level: 0, category: '' }])}
                          className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors flex items-center"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          스킬 추가
                        </button>
                        <div className="space-x-2">
                          <button
                            onClick={() => setEditingSkills(false)}
                            className="px-3 py-1 text-sm text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                          >
                            취소
                          </button>
                          <button
                            onClick={saveSkills}
                            className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            저장
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.skills && profile.skills.length > 0 ? profile.skills.map((skill: any, index: number) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-900">{skill.name}</span>
                            <span className="text-sm text-gray-500">{skill.level}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-700"
                              style={{ width: `${skill.level}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-400 mt-1">{skill.category}</span>
                        </div>
                      )) : (
                        <p className="text-gray-500 col-span-2 text-center">아직 등록된 스킬이 없습니다.</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 프로젝트 탭 */}
            {activeTab === 'projects' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">프로젝트</h3>
                  {canEdit && (
                    <button
                      onClick={() => setEditingProjects(!editingProjects)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      편집
                    </button>
                  )}
                </div>
                
                {editingProjects && canEdit ? (
                  <div className="space-y-4">
                    {projectsForm.map((project, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                        <div className="space-y-3">
                          {/* 프로젝트 제목 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트 제목</label>
                            <input
                              type="text"
                              value={project.title || ''}
                              onChange={(e) => {
                                const newProjects = [...projectsForm]
                                newProjects[index].title = e.target.value
                                setProjectsForm(newProjects)
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="프로젝트 제목을 입력하세요"
                            />
                          </div>
                          
                          {/* 프로젝트 설명 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트 설명</label>
                            <textarea
                              value={project.description || ''}
                              onChange={(e) => {
                                const newProjects = [...projectsForm]
                                newProjects[index].description = e.target.value
                                setProjectsForm(newProjects)
                              }}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="프로젝트에 대한 설명을 입력하세요"
                            />
                          </div>
                          
                          {/* 기술 스택 (#태그) */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">기술 스택 (쉼표로 구분)</label>
                            <input
                              type="text"
                              value={project.tech ? project.tech.join(', ') : ''}
                              onChange={(e) => {
                                const newProjects = [...projectsForm]
                                newProjects[index].tech = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                                setProjectsForm(newProjects)
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="React, Node.js, MongoDB"
                            />
                          </div>
                          
                          {/* 링크들 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Live Demo URL</label>
                              <input
                                type="url"
                                value={project.liveUrl || ''}
                                onChange={(e) => {
                                  const newProjects = [...projectsForm]
                                  newProjects[index].liveUrl = e.target.value
                                  setProjectsForm(newProjects)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://example.com"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                              <input
                                type="url"
                                value={project.githubUrl || ''}
                                onChange={(e) => {
                                  const newProjects = [...projectsForm]
                                  newProjects[index].githubUrl = e.target.value
                                  setProjectsForm(newProjects)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://github.com/username/repo"
                              />
                            </div>
                          </div>
                          
                          {/* Featured 체크박스 */}
                          <div className="flex items-center justify-between">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={project.featured || false}
                                onChange={(e) => {
                                  const newProjects = [...projectsForm]
                                  newProjects[index].featured = e.target.checked
                                  setProjectsForm(newProjects)
                                }}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700">주요 프로젝트로 표시</span>
                            </label>
                            
                            <button
                              onClick={() => {
                                const newProjects = projectsForm.filter((_, i) => i !== index)
                                setProjectsForm(newProjects)
                              }}
                              className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-between pt-2">
                      <button
                        onClick={() => setProjectsForm([...projectsForm, { 
                          title: '', 
                          description: '', 
                          tech: [], 
                          liveUrl: '', 
                          githubUrl: '', 
                          featured: false 
                        }])}
                        className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        프로젝트 추가
                      </button>
                      <div className="space-x-2">
                        <button
                          onClick={() => setEditingProjects(false)}
                          className="px-3 py-1 text-sm text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={saveProjects}
                          className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          저장
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                {profile.projects && profile.projects.length > 0 ? profile.projects.map((project: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">{project.title}</h4>
                        <p className="text-gray-600 mb-3">{project.description}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {project.tech.map((tech: string, techIndex: number) => (
                            <span 
                              key={techIndex}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                      {project.featured && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          Featured
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      {project.liveUrl && (
                        <a 
                          href={project.liveUrl}
                          className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Live Demo
                        </a>
                      )}
                      {project.githubUrl && (
                        <a 
                          href={project.githubUrl}
                          className="flex items-center px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Github className="w-4 h-4 mr-1" />
                          GitHub
                        </a>
                      )}
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-center">아직 등록된 프로젝트가 없습니다.</p>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* 경험 탭 */}
            {activeTab === 'experience' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">경험</h3>
                  {canEdit && (
                    <button
                      onClick={() => setEditingExperience(!editingExperience)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      편집
                    </button>
                  )}
                </div>
                
                {editingExperience && canEdit ? (
                  <div className="space-y-4">
                    {experienceForm.map((exp, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                        <div className="space-y-3">
                          {/* 직책과 회사 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">직책</label>
                              <input
                                type="text"
                                value={exp.position || ''}
                                onChange={(e) => {
                                  const newExperience = [...experienceForm]
                                  newExperience[index].position = e.target.value
                                  setExperienceForm(newExperience)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="소프트웨어 엔지니어"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">회사</label>
                              <input
                                type="text"
                                value={exp.company || ''}
                                onChange={(e) => {
                                  const newExperience = [...experienceForm]
                                  newExperience[index].company = e.target.value
                                  setExperienceForm(newExperience)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="회사명"
                              />
                            </div>
                          </div>
                          
                          {/* 시작일과 종료일 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                              <input
                                type="date"
                                value={exp.startDate || ''}
                                onChange={(e) => {
                                  const newExperience = [...experienceForm]
                                  newExperience[index].startDate = e.target.value
                                  setExperienceForm(newExperience)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="date"
                                  value={exp.endDate || ''}
                                  onChange={(e) => {
                                    const newExperience = [...experienceForm]
                                    newExperience[index].endDate = e.target.value
                                    newExperience[index].isCurrent = false
                                    setExperienceForm(newExperience)
                                  }}
                                  disabled={exp.isCurrent}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                                <label className="flex items-center text-sm">
                                  <input
                                    type="checkbox"
                                    checked={exp.isCurrent || false}
                                    onChange={(e) => {
                                      const newExperience = [...experienceForm]
                                      newExperience[index].isCurrent = e.target.checked
                                      if (e.target.checked) {
                                        newExperience[index].endDate = ''
                                      }
                                      setExperienceForm(newExperience)
                                    }}
                                    className="mr-1"
                                  />
                                  현재
                                </label>
                              </div>
                            </div>
                          </div>
                          
                          {/* 설명 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">업무 설명</label>
                            <textarea
                              value={exp.description || ''}
                              onChange={(e) => {
                                const newExperience = [...experienceForm]
                                newExperience[index].description = e.target.value
                                setExperienceForm(newExperience)
                              }}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="담당했던 업무에 대해 설명하세요"
                            />
                          </div>
                          
                          {/* 성과 (한 줄씩) */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">주요 성과 (한 줄씩 입력)</label>
                            <textarea
                              value={exp.achievements ? exp.achievements.join('\n') : ''}
                              onChange={(e) => {
                                const newExperience = [...experienceForm]
                                newExperience[index].achievements = e.target.value.split('\n').filter(achievement => achievement.trim())
                                setExperienceForm(newExperience)
                              }}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="매출 20% 증가 달성&#10;새로운 시스템 구축&#10;팀 생산성 향상"
                            />
                          </div>
                          
                          {/* 삭제 버튼 */}
                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                const newExperience = experienceForm.filter((_, i) => i !== index)
                                setExperienceForm(newExperience)
                              }}
                              className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-between pt-2">
                      <button
                        onClick={() => setExperienceForm([...experienceForm, { 
                          position: '', 
                          company: '', 
                          startDate: '', 
                          endDate: '', 
                          isCurrent: false,
                          description: '', 
                          achievements: []
                        }])}
                        className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        경험 추가
                      </button>
                      <div className="space-x-2">
                        <button
                          onClick={() => setEditingExperience(false)}
                          className="px-3 py-1 text-sm text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={saveExperience}
                          className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          저장
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                {profile.experience && profile.experience.length > 0 ? profile.experience.map((exp: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{exp.position}</h4>
                        <p className="text-blue-600 font-medium">{exp.company}</p>
                        <p className="text-sm text-gray-500">{exp.period}</p>
                      </div>
                      {exp.isCurrent && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          현재
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3">{exp.description}</p>
                    {exp.achievements && exp.achievements.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">주요 성과</h5>
                        <ul className="space-y-1">
                          {exp.achievements.map((achievement: string, achIndex: number) => (
                            <li key={achIndex} className="text-sm text-gray-600 flex items-start">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              {achievement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )) : (
                  <p className="text-gray-500 text-center">아직 등록된 경험이 없습니다.</p>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* 포스트 탭 */}
            {activeTab === 'posts' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">포스트</h3>
                  {canEdit && (
                    <button
                      onClick={() => setEditingPosts(!editingPosts)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      편집
                    </button>
                  )}
                </div>
                
                {editingPosts && canEdit ? (
                  <div className="space-y-4">
                    {/* 새 포스트 작성 */}
                    <div className="bg-blue-50 rounded-lg p-4 border-2 border-dashed border-blue-300">
                      <h4 className="text-lg font-medium text-gray-900 mb-3">새 포스트 작성</h4>
                      <div className="space-y-3">
                        {/* 포스트 내용 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">포스트 내용</label>
                          <textarea
                            value={postsForm.find(p => p.isNew)?.content || ''}
                            onChange={(e) => {
                              const newPosts = [...postsForm]
                              let newPost = newPosts.find(p => p.isNew)
                              if (!newPost) {
                                newPost = { 
                                  content: '', 
                                  type: 'text', 
                                  tags: [], 
                                  likes: 0, 
                                  isNew: true,
                                  createdAt: new Date().toISOString()
                                }
                                newPosts.push(newPost)
                              }
                              newPost.content = e.target.value
                              setPostsForm(newPosts)
                            }}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="무엇을 공유하고 싶나요? 🤔"
                          />
                        </div>
                        
                        {/* 태그 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">태그 (쉼표로 구분)</label>
                          <input
                            type="text"
                            value={postsForm.find(p => p.isNew)?.tags?.join(', ') || ''}
                            onChange={(e) => {
                              const newPosts = [...postsForm]
                              let newPost = newPosts.find(p => p.isNew)
                              if (!newPost) {
                                newPost = { 
                                  content: '', 
                                  type: 'text', 
                                  tags: [], 
                                  likes: 0, 
                                  isNew: true,
                                  createdAt: new Date().toISOString()
                                }
                                newPosts.push(newPost)
                              }
                              newPost.tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                              setPostsForm(newPosts)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="개발, 일상, 팁"
                          />
                        </div>
                        
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              const newPost = postsForm.find(p => p.isNew)
                              if (newPost && newPost.content.trim()) {
                                delete newPost.isNew
                                savePosts()
                              }
                            }}
                            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            포스트 등록
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* 기존 포스트 편집 */}
                    {postsForm.filter(p => !p.isNew).map((post, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                        <div className="space-y-3">
                          {/* 포스트 내용 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">포스트 내용</label>
                            <textarea
                              value={post.content || ''}
                              onChange={(e) => {
                                const newPosts = [...postsForm]
                                const actualIndex = newPosts.findIndex(p => !p.isNew && newPosts.filter(p2 => !p2.isNew).indexOf(p) === index)
                                if (actualIndex !== -1) {
                                  newPosts[actualIndex].content = e.target.value
                                  setPostsForm(newPosts)
                                }
                              }}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="포스트 내용을 입력하세요"
                            />
                          </div>
                          
                          {/* 태그 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">태그 (쉼표로 구분)</label>
                            <input
                              type="text"
                              value={post.tags ? post.tags.join(', ') : ''}
                              onChange={(e) => {
                                const newPosts = [...postsForm]
                                const actualIndex = newPosts.findIndex(p => !p.isNew && newPosts.filter(p2 => !p2.isNew).indexOf(p) === index)
                                if (actualIndex !== -1) {
                                  newPosts[actualIndex].tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                                  setPostsForm(newPosts)
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="개발, 일상, 팁"
                            />
                          </div>
                          
                          {/* 좋아요 수 (참고용) */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">좋아요 수</label>
                            <input
                              type="number"
                              value={post.likes || 0}
                              onChange={(e) => {
                                const newPosts = [...postsForm]
                                const actualIndex = newPosts.findIndex(p => !p.isNew && newPosts.filter(p2 => !p2.isNew).indexOf(p) === index)
                                if (actualIndex !== -1) {
                                  newPosts[actualIndex].likes = parseInt(e.target.value) || 0
                                  setPostsForm(newPosts)
                                }
                              }}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              min="0"
                            />
                          </div>
                          
                          {/* 작성일 표시 */}
                          <div className="text-sm text-gray-500">
                            작성일: {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                          </div>
                          
                          {/* 삭제 버튼 */}
                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                const newPosts = postsForm.filter((_, i) => {
                                  if (postsForm[i].isNew) return true
                                  return postsForm.filter(p => !p.isNew).indexOf(postsForm[i]) !== index
                                })
                                setPostsForm(newPosts)
                              }}
                              className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-between pt-2">
                      <div></div>
                      <div className="space-x-2">
                        <button
                          onClick={() => setEditingPosts(false)}
                          className="px-3 py-1 text-sm text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={savePosts}
                          className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          저장
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                {profile.recentPosts && profile.recentPosts.length > 0 ? profile.recentPosts.map((post: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {profile.userId?.profileImage ? (
                          <img src={profile.userId.profileImage} alt={profile.userId.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          profile.userId?.username?.charAt(0).toUpperCase() || '👤'
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-900">{profile.userId?.username || '사용자'}</span>
                          <span className="text-sm text-gray-500">@{profile.username}</span>
                          <span className="text-sm text-gray-400">·</span>
                          <span className="text-sm text-gray-400">
                            {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-3">{post.content}</p>
                        {post.type === 'image' && post.mediaUrl && (
                          <div className="mb-3">
                            <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Camera className="w-8 h-8 text-gray-400" />
                            </div>
                          </div>
                        )}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {post.tags.map((tag: string, tagIndex: number) => (
                              <span 
                                key={tagIndex}
                                className="text-blue-600 text-sm hover:underline cursor-pointer"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <button className="flex items-center space-x-1 hover:text-red-500 transition-colors">
                            <Heart className="w-4 h-4" />
                            <span>{post.likes}</span>
                          </button>
                          <button className="flex items-center space-x-1 hover:text-blue-500 transition-colors">
                            <MessageCircle className="w-4 h-4" />
                            <span>댓글</span>
                          </button>
                          <button className="flex items-center space-x-1 hover:text-green-500 transition-colors">
                            <Share2 className="w-4 h-4" />
                            <span>공유</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-center">아직 등록된 포스트가 없습니다.</p>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* 팔로워 모달 */}
      {showFollowersModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowFollowersModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">팔로워</h3>
              <button 
                onClick={() => setShowFollowersModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {followers.length > 0 ? followers.map((follower: any, index: number) => (
                <div key={index} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    {follower.username?.charAt(0).toUpperCase() || '👤'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{follower.username}</div>
                    <div className="text-sm text-gray-500">@{follower.username}</div>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 text-center">아직 팔로워가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 팔로잉 모달 */}
      {showFollowingModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowFollowingModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">팔로잉</h3>
              <button 
                onClick={() => setShowFollowingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {following.length > 0 ? following.map((followed: any, index: number) => (
                <div key={index} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    {followed.username?.charAt(0).toUpperCase() || '👤'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{followed.username}</div>
                    <div className="text-sm text-gray-500">@{followed.username}</div>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 text-center">아직 팔로잉 중인 사람이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MemberPortfolio