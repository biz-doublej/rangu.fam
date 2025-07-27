'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User, MapPin, Calendar, Mail, Edit3, Save, X, 
  ArrowLeft, Star, MessageCircle, Share2, Camera,
  Briefcase, GraduationCap, Code, ExternalLink,
  Github, Linkedin, Globe, Award, Heart, Plus,
  Trash2, Edit
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import { useRouter, useParams } from 'next/navigation'
import { notFound } from 'next/navigation'

// 타입 정의
interface ProfileData {
  _id?: string
  userId?: string
  username: string
  intro: string
  bio: string
  location: string
  skills: Array<{
    name: string
    level: number
    category: string
  }>
  projects: Array<{
    title: string
    description: string
    tech: string[]
    githubUrl?: string
    liveUrl?: string
    featured: boolean
    status: string
  }>
  experience: Array<{
    company: string
    position: string
    period: string
    description?: string
    isCurrent: boolean
  }>
  education: Array<{
    school: string
    degree: string
    period: string
    description?: string
  }>
  socialLinks: {
    github?: string
    linkedin?: string
    website?: string
  }
  recentPosts: Array<{
    content: string
    type: string
    likes: number
    likedBy: string[]
    comments: Array<{
      userId: string
      username: string
      content: string
      createdAt: string
    }>
    createdAt: string
  }>
  viewCount: number
  isPublic: boolean
}

interface Member {
  id: string
  name: string
  role: string
  description: string
  avatar?: string
  email?: string
  status: string
  location?: string
  joinDate: Date
  personalPageUrl?: string
}

export default function MemberProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()

  // 상태 관리
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // UI 상태
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'skills' | 'activity'>('overview')
  const [isEditing, setIsEditing] = useState(false)
  
  // 편집 상태
  const [isEditingOverview, setIsEditingOverview] = useState(false)
  const [isEditingPortfolio, setIsEditingPortfolio] = useState(false)
  const [isEditingSkills, setIsEditingSkills] = useState(false)
  
  // 새 게시물 상태
  const [posts, setPosts] = useState<any[]>([])
  const [isAddingPost, setIsAddingPost] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [newPostContent, setNewPostContent] = useState('')
  const [editPostContent, setEditPostContent] = useState('')

  const isOwnPage = user?.memberId === params.id

  // 데이터 로딩
  useEffect(() => {
    loadProfileData()
  }, [params.id])

  const loadProfileData = async () => {
    try {
      setIsLoading(true)
      
      // 프로필 데이터 로드
      const profileResponse = await fetch(`/api/profiles?username=${params.id}`)
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        if (profileData.success) {
          setProfile(profileData.profile)
          setPosts(profileData.profile.recentPosts || [])
        }
      }
      
      // 멤버 데이터 로드
      const memberResponse = await fetch('/api/members')
      if (memberResponse.ok) {
        const memberData = await memberResponse.json()
        const foundMember = memberData.find((m: Member) => m.id === params.id)
        setMember(foundMember || null)
      }
      
      if (!profile && !member) {
        setError('프로필을 찾을 수 없습니다.')
      }
    } catch (err) {
      console.error('프로필 로딩 오류:', err)
      setError('프로필을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 프로필 업데이트
  const updateProfile = async (updateData: Partial<ProfileData>) => {
    if (!profile?._id) return
    
    try {
      const response = await fetch('/api/profiles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileId: profile._id,
          updateData
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setProfile(result.profile)
          return true
        }
      }
      return false
    } catch (error) {
      console.error('프로필 업데이트 오류:', error)
      return false
    }
  }

  // 새 게시물 추가
  const handleAddPost = async () => {
    if (!newPostContent.trim() || !profile) return
    
    const newPost = {
      content: newPostContent,
      type: 'text',
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: new Date().toISOString()
    }
    
    const updatedPosts = [newPost, ...posts]
    const success = await updateProfile({ recentPosts: updatedPosts })
    
    if (success) {
      setPosts(updatedPosts)
      setNewPostContent('')
      setIsAddingPost(false)
    }
  }

  // 게시물 편집
  const handleEditPost = (postId: string) => {
    const post = posts.find((_, index) => index.toString() === postId)
    if (post) {
      setEditPostContent(post.content)
      setEditingPostId(postId)
    }
  }

  const handleSavePostEdit = async () => {
    if (!editPostContent.trim() || editingPostId === null) return
    
    const updatedPosts = posts.map((post, index) => 
      index.toString() === editingPostId 
        ? { ...post, content: editPostContent }
        : post
    )
    
    const success = await updateProfile({ recentPosts: updatedPosts })
    
    if (success) {
      setPosts(updatedPosts)
      setEditingPostId(null)
      setEditPostContent('')
    }
  }

  // 게시물 삭제
  const handleDeletePost = async (postId: string) => {
    const updatedPosts = posts.filter((_, index) => index.toString() !== postId)
    const success = await updateProfile({ recentPosts: updatedPosts })
    
    if (success) {
      setPosts(updatedPosts)
    }
  }

  // 스킬 레벨 렌더링
  const renderSkillBar = (skill: any) => (
    <div key={skill.name} className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{skill.name}</span>
        <span className="text-sm text-gray-500">{skill.level}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${skill.level}%` }}
          transition={{ duration: 1, delay: 0.2 }}
        />
      </div>
      <span className="text-xs text-gray-500 mt-1">{skill.category}</span>
    </div>
  )

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-warm-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">프로필을 불러오고 있습니다...</p>
        </div>
      </div>
    )
  }

  // 오류 상태
  if (error || (!profile && !member)) {
    return notFound()
  }

  const displayName = profile?.username || member?.name || '알 수 없음'
  const displayRole = member?.role || '멤버'
  const displayDescription = profile?.intro || member?.description || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-warm-50">
      {/* 헤더 */}
      <header className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <motion.button
              className="glass-button p-2"
              onClick={() => router.push('/members')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5 text-primary-600" />
            </motion.button>
            <h1 className="text-xl font-bold text-gradient">{displayName}님의 프로필</h1>
            {isOwnPage && (
              <Button
                variant="glass"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    저장
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4 mr-2" />
                    편집
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="pt-20 pb-8">
        <div className="max-w-6xl mx-auto p-6">
          {/* 프로필 헤더 */}
          <motion.div
            className="glass-card rounded-3xl p-8 mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* 아바타 */}
              <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                  {displayName[0]?.toUpperCase()}
                </div>
                {isOwnPage && isEditing && (
                  <motion.button
                    className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-lg"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Camera className="w-4 h-4 text-gray-600" />
                  </motion.button>
                )}
              </div>

              {/* 기본 정보 */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">{displayName}</h1>
                    {isEditing && isOwnPage ? (
                      <Input
                        value={displayRole}
                        onChange={() => {}}
                        className="mb-2"
                        placeholder="역할을 입력하세요"
                      />
                    ) : (
                      <p className="text-lg text-primary-600 font-medium mb-2">{displayRole}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <motion.button
                      className="glass-button p-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Star className="w-5 h-5 text-yellow-500" />
                    </motion.button>
                    <motion.button
                      className="glass-button p-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Share2 className="w-5 h-5 text-gray-600" />
                    </motion.button>
                  </div>
                </div>

                {/* 소개 */}
                {isEditing && isOwnPage ? (
                  <Textarea
                    value={displayDescription}
                    onChange={() => {}}
                    rows={3}
                    placeholder="자기소개를 입력하세요"
                    className="mb-4"
                  />
                ) : (
                  <p className="text-gray-600 mb-4">{displayDescription}</p>
                )}

                {/* 기본 정보 */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {profile?.location || member?.location || '위치 정보 없음'}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    가입일: {member?.joinDate ? formatDate.short(member.joinDate) : '정보 없음'}
                  </div>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    조회수: {profile?.viewCount || 0}
                  </div>
                </div>

                {/* 소셜 링크 */}
                {profile?.socialLinks && (
                  <div className="flex space-x-3 mt-4">
                    {profile.socialLinks.github && (
                      <motion.a
                        href={profile.socialLinks.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass-button p-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Github className="w-5 h-5" />
                      </motion.a>
                    )}
                    {profile.socialLinks.linkedin && (
                      <motion.a
                        href={profile.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass-button p-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Linkedin className="w-5 h-5" />
                      </motion.a>
                    )}
                    {profile.socialLinks.website && (
                      <motion.a
                        href={profile.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass-button p-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Globe className="w-5 h-5" />
                      </motion.a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* 탭 네비게이션 */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex space-x-1 bg-white/50 backdrop-blur-sm rounded-2xl p-1">
              {[
                { id: 'overview', label: '개요', icon: User },
                { id: 'portfolio', label: '포트폴리오', icon: Briefcase },
                { id: 'skills', label: '기술 스택', icon: Code },
                { id: 'activity', label: '최근 활동', icon: MessageCircle }
              ].map((tab) => (
                <motion.button
                  key={tab.id}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-white shadow-md text-primary-600'
                      : 'text-gray-600 hover:text-primary-600'
                  }`}
                  onClick={() => setActiveTab(tab.id as any)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* 탭 콘텐츠 */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* 개요 탭 */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 경력 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center">
                        <Briefcase className="w-5 h-5 mr-2" />
                        경력
                      </h3>
                      {isOwnPage && isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {}}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {profile?.experience && profile.experience.length > 0 ? (
                        profile.experience.map((exp, index) => (
                          <div key={index} className="border-l-2 border-primary-200 pl-4 pb-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-800">{exp.position}</h4>
                                <p className="text-primary-600">{exp.company}</p>
                                <p className="text-sm text-gray-500">{exp.period}</p>
                                {exp.description && (
                                  <p className="text-sm text-gray-600 mt-2">{exp.description}</p>
                                )}
                              </div>
                              {isOwnPage && isEditing && (
                                <div className="flex space-x-1">
                                  <Button size="sm" variant="ghost">
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-8">경력 정보가 없습니다.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 교육 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center">
                        <GraduationCap className="w-5 h-5 mr-2" />
                        교육
                      </h3>
                      {isOwnPage && isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {}}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {profile?.education && profile.education.length > 0 ? (
                        profile.education.map((edu, index) => (
                          <div key={index} className="border-l-2 border-secondary-200 pl-4 pb-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-800">{edu.degree}</h4>
                                <p className="text-secondary-600">{edu.school}</p>
                                <p className="text-sm text-gray-500">{edu.period}</p>
                                {edu.description && (
                                  <p className="text-sm text-gray-600 mt-2">{edu.description}</p>
                                )}
                              </div>
                              {isOwnPage && isEditing && (
                                <div className="flex space-x-1">
                                  <Button size="sm" variant="ghost">
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-8">교육 정보가 없습니다.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 포트폴리오 탭 */}
            {activeTab === 'portfolio' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile?.projects && profile.projects.length > 0 ? (
                  profile.projects.map((project, index) => (
                    <Card key={index} hover>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="font-bold text-lg text-gray-800">{project.title}</h4>
                          {project.featured && (
                            <Star className="w-5 h-5 text-yellow-500 fill-current" />
                          )}
                        </div>
                        <p className="text-gray-600 mb-4">{project.description}</p>
                        
                        {/* 기술 스택 */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {project.tech.map((tech, techIndex) => (
                            <span
                              key={techIndex}
                              className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                        
                        {/* 링크 */}
                        <div className="flex space-x-2">
                          {project.githubUrl && (
                            <motion.a
                              href={project.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="glass-button p-2"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Github className="w-4 h-4" />
                            </motion.a>
                          )}
                          {project.liveUrl && (
                            <motion.a
                              href={project.liveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="glass-button p-2"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </motion.a>
                          )}
                          {isOwnPage && isEditing && (
                            <>
                              <Button size="sm" variant="ghost">
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-500">프로젝트가 없습니다.</p>
                    {isOwnPage && isEditing && (
                      <Button className="mt-4">
                        <Plus className="w-4 h-4 mr-2" />
                        프로젝트 추가
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 기술 스택 탭 */}
            {activeTab === 'skills' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {['Frontend', 'Backend', 'Language', 'Database', 'DevOps', 'Tools'].map(category => {
                  const categorySkills = profile?.skills?.filter(skill => skill.category === category) || []
                  
                  if (categorySkills.length === 0 && !isEditing) return null
                  
                  return (
                    <Card key={category}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-gray-800">{category}</h3>
                          {isOwnPage && isEditing && (
                            <Button size="sm" variant="ghost">
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {categorySkills.length > 0 ? (
                            categorySkills.map(skill => renderSkillBar(skill))
                          ) : (
                            <p className="text-gray-500 text-center py-4">스킬이 없습니다.</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* 최근 활동 탭 */}
            {activeTab === 'activity' && (
              <div className="space-y-6">
                {/* 새 글 작성 */}
                {isOwnPage && (
                  <Card>
                    <CardContent className="p-6">
                      {isAddingPost ? (
                        <div className="space-y-4">
                          <Textarea
                            placeholder="무슨 일이 일어나고 있나요?"
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            rows={3}
                            className="w-full"
                          />
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setIsAddingPost(false)
                                setNewPostContent('')
                              }}
                            >
                              취소
                            </Button>
                            <Button
                              onClick={handleAddPost}
                              disabled={!newPostContent.trim()}
                            >
                              게시
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setIsAddingPost(true)}
                          variant="glass"
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          새 글 작성
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 게시물 목록 */}
                <div className="space-y-4">
                  {posts.length > 0 ? (
                    posts.map((post, index) => (
                      <Card key={index}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold">
                                {displayName[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{displayName}</p>
                                <p className="text-sm text-gray-500">
                                  {formatDate.relative(new Date(post.createdAt))}
                                </p>
                              </div>
                            </div>
                            {isOwnPage && (
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditPost(index.toString())}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeletePost(index.toString())}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {editingPostId === index.toString() ? (
                            <div className="space-y-4">
                              <Textarea
                                value={editPostContent}
                                onChange={(e) => setEditPostContent(e.target.value)}
                                rows={3}
                                className="w-full"
                              />
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingPostId(null)
                                    setEditPostContent('')
                                  }}
                                >
                                  취소
                                </Button>
                                <Button onClick={handleSavePostEdit}>
                                  저장
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-700 mb-4">{post.content}</p>
                          )}

                          <div className="flex items-center space-x-4 text-gray-500">
                            <motion.button
                              className="flex items-center space-x-1 hover:text-red-500 transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Heart className="w-4 h-4" />
                              <span>{post.likes}</span>
                            </motion.button>
                            <motion.button
                              className="flex items-center space-x-1 hover:text-blue-500 transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>{post.comments?.length || 0}</span>
                            </motion.button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">아직 게시물이 없습니다.</p>
                      {isOwnPage && (
                        <p className="text-sm text-gray-400 mt-2">첫 번째 게시물을 작성해보세요!</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
} 