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
  Shield,
  Target,
  Award,
  Gamepad2,
  ChefHat,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Star,
  User,
  Clock
} from 'lucide-react'
import { Card } from '@/components/ui/Card'

function JinkyuPortfolio() {
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('about')
  const [likes, setLikes] = useState(73)
  const [isLiked, setIsLiked] = useState(false)

  // 정진규 프로필 데이터
  const jinkyuData = {
    name: '정진규',
    title: '대한민국 육군 복무 중 • 게이머 & 요리사',
    bio: '현재 군 복무 중이며, 전역 후 새로운 도전을 계획하고 있습니다. 게임과 요리를 사랑하고, 책임감 있는 리더십을 발휘하고 있어요.',
    location: '대한민국 (군 복무 중)',
    email: 'jinkyu@rangu.fam',
    avatar: '🪖',
    socialLinks: {
      github: 'https://github.com/jinkyu',
      linkedin: 'https://linkedin.com/in/jinkyu-jung',
      instagram: 'https://instagram.com/jinkyu_gamer',
      website: 'https://jinkyu.gaming'
    },
    stats: {
      projects: 12,
      followers: 445,
      following: 167,
      posts: 89
    },
    militaryInfo: {
      branch: '대한민국 육군',
      rank: '일병',
      unit: '보병 부대',
      enlistmentDate: '2024.03.04',
      dischargeDate: '2025.09.03',
      specialties: ['사격술', '전술', '팀워크', '리더십']
    },
    skills: [
      { name: '게임 전략', level: 95, category: '게임' },
      { name: 'FPS 게임', level: 90, category: '게임' },
      { name: '요리', level: 85, category: '생활' },
      { name: '한식 요리', level: 88, category: '생활' },
      { name: '리더십', level: 80, category: '군사' },
      { name: '팀워크', level: 92, category: '군사' },
      { name: '체력관리', level: 85, category: '건강' },
      { name: '책임감', level: 90, category: '인성' }
    ],
    experience: [
      {
        company: '대한민국 육군',
        position: '일병 (보병)',
        period: '2024.03 - 2025.09 (예정)',
        description: '국방의 의무를 다하며 리더십과 팀워크를 배우고 있습니다',
        achievements: ['우수 사병 선정', '부대 내 요리 담당', '게임 대회 우승'],
        isCurrent: true
      },
      {
        company: '게임 클랜',
        position: '클랜 리더',
        period: '2022.01 - 2024.02',
        description: '온라인 게임 클랜을 운영하며 팀원들과 협력',
        achievements: ['클랜 랭킹 1위 달성', '50명 규모 클랜 운영'],
        isCurrent: false
      },
      {
        company: '로컬 카페',
        position: '아르바이트 (주방)',
        period: '2021.06 - 2023.12',
        description: '카페에서 음료 제조 및 간단한 요리 담당',
        achievements: ['고객 만족도 향상', '신메뉴 개발 참여'],
        isCurrent: false
      }
    ],
    projects: [
      {
        title: 'Gaming Community Hub',
        description: '게이머들을 위한 커뮤니티 플랫폼 (전역 후 개발 예정)',
        tech: ['React', 'Node.js', 'Discord API', 'Gaming'],
        status: 'planned',
        featured: true
      },
      {
        title: '요리 레시피 블로그',
        description: '군 생활 중 배운 요리 레시피 공유',
        tech: ['Blog', 'Photography', 'Recipe'],
        status: 'in-progress',
        featured: true,
        liveUrl: 'https://jinkyu-cooking.blog'
      },
      {
        title: '게임 전략 가이드',
        description: 'FPS 게임 초보자를 위한 전략 가이드',
        tech: ['Video Editing', 'Gaming', 'Tutorial'],
        status: 'completed',
        featured: false,
        liveUrl: 'https://youtube.com/jinkyu-gaming'
      }
    ],
    recentPosts: [
      {
        content: '오늘 부대에서 김치찌개를 만들었는데 전우들이 정말 맛있다고 하네요! 🍲 군 생활 중에도 요리 실력이 늘고 있어요.',
        type: 'text',
        tags: ['요리', '군생활', '김치찌개', '전우'],
        likes: 45,
        createdAt: new Date('2025-01-18')
      },
      {
        content: '전역 후 계획하고 있는 게이밍 커뮤니티 플랫폼 아이디어를 정리해봤어요. 많은 게이머들이 함께할 수 있는 공간을 만들고 싶습니다!',
        type: 'text',
        tags: ['게임', '커뮤니티', '전역후계획', '개발'],
        likes: 67,
        createdAt: new Date('2025-01-15')
      },
      {
        content: '군 생활 300일 돌파! 이제 절반 정도 지났네요. 많은 것을 배우고 있습니다 💪',
        type: 'text',
        tags: ['군생활', '300일', '성장', '목표'],
        likes: 89,
        createdAt: new Date('2025-01-12')
      },
      {
        content: '새로운 FPS 게임 전략 영상을 업로드했어요! 초보자들에게 도움이 되길 바랍니다.',
        type: 'link',
        linkUrl: 'https://youtube.com/watch?v=jinkyu-fps-guide',
        tags: ['게임', '전략', '영상', 'FPS'],
        likes: 34,
        createdAt: new Date('2025-01-10')
      }
    ]
  }

  useEffect(() => {
    // 프로필 데이터 로드 시뮬레이션
    setTimeout(() => {
      setProfile(jinkyuData)
      setIsLoading(false)
    }, 1000)
  }, [])

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikes(prev => isLiked ? prev - 1 : prev + 1)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: '정진규의 포트폴리오',
        text: '군 복무 중인 정진규님의 이야기와 전역 후 계획을 확인해보세요!',
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('링크가 클립보드에 복사되었습니다!')
    }
  }

  const calculateDaysServed = () => {
    const enlistmentDate = new Date('2024-03-04')
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - enlistmentDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const calculateDaysLeft = () => {
    const dischargeDate = new Date('2025-09-03')
    const today = new Date()
    const diffTime = Math.abs(dischargeDate.getTime() - today.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">포트폴리오를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-gray-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                {profile.avatar}
              </div>
              <div>
                <h1 className="font-bold text-gray-900">{profile.name}</h1>
                <p className="text-sm text-gray-500">@jinkyu_soldier</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
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
        {/* 프로필 헤더 */}
        <motion.div
          className="bg-white rounded-2xl p-6 mb-6 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* 프로필 이미지 */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-r from-green-600 to-gray-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {profile.avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-600 rounded-full border-2 border-white flex items-center justify-center">
                <Shield className="w-3 h-3 text-white" />
              </div>
            </div>

            {/* 프로필 정보 */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{profile.name}</h1>
              <p className="text-lg text-green-600 font-medium mb-2">{profile.title}</p>
              <p className="text-gray-600 mb-4 max-w-2xl">{profile.bio}</p>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {profile.location}
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  {profile.email}
                </div>
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-1" />
                  {profile.militaryInfo.rank}
                </div>
              </div>

              {/* 소셜 링크 */}
              <div className="flex gap-3">
                <a 
                  href={profile.socialLinks.github}
                  className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="w-5 h-5 text-gray-700" />
                </a>
                <a 
                  href={profile.socialLinks.linkedin}
                  className="p-2 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Linkedin className="w-5 h-5 text-blue-700" />
                </a>
                <a 
                  href={profile.socialLinks.instagram}
                  className="p-2 bg-pink-100 rounded-lg hover:bg-pink-200 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="w-5 h-5 text-pink-700" />
                </a>
                <a 
                  href={profile.socialLinks.website}
                  className="p-2 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Gamepad2 className="w-5 h-5 text-purple-700" />
                </a>
              </div>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-1 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-gray-900">{profile.stats.projects}</div>
                <div className="text-sm text-gray-500">프로젝트</div>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{profile.stats.followers}</div>
                <div className="text-sm text-gray-500">팔로워</div>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{profile.stats.following}</div>
                <div className="text-sm text-gray-500">팔로잉</div>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{profile.stats.posts}</div>
                <div className="text-sm text-gray-500">포스트</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 군 복무 현황 카드 */}
        <motion.div
          className="bg-gradient-to-r from-green-600 to-gray-600 rounded-2xl p-6 mb-6 text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            군 복무 현황
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{calculateDaysServed()}</div>
              <div className="text-sm opacity-90">복무일</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{calculateDaysLeft()}</div>
              <div className="text-sm opacity-90">남은 일수</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{profile.militaryInfo.rank}</div>
              <div className="text-sm opacity-90">계급</div>
            </div>
            <div>
              <div className="text-2xl font-bold">18</div>
              <div className="text-sm opacity-90">개월 복무</div>
            </div>
          </div>
        </motion.div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-xl mb-6 shadow-sm">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'about', label: '소개', icon: User },
              { id: 'projects', label: '프로젝트', icon: Target },
              { id: 'experience', label: '경험', icon: Briefcase },
              { id: 'posts', label: '포스트', icon: MessageCircle }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-green-600 border-b-2 border-green-600'
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Star className="w-5 h-5 mr-2 text-yellow-500" />
                    스킬 & 특기
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.skills.map((skill: any, index: number) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-900">{skill.name}</span>
                          <span className="text-sm text-gray-500">{skill.level}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-700"
                            style={{ width: `${skill.level}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400 mt-1">{skill.category}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 군 복무 정보 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-green-600" />
                    군 복무 정보
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">소속 부대</div>
                        <div className="font-medium text-gray-900">{profile.militaryInfo.unit}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">입대일</div>
                        <div className="font-medium text-gray-900">{profile.militaryInfo.enlistmentDate}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">전역 예정일</div>
                        <div className="font-medium text-gray-900">{profile.militaryInfo.dischargeDate}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">군별</div>
                        <div className="font-medium text-gray-900">{profile.militaryInfo.branch}</div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="text-sm text-gray-500 mb-2">특기사항</div>
                      <div className="flex flex-wrap gap-2">
                        {profile.militaryInfo.specialties.map((specialty: string, index: number) => (
                          <span 
                            key={index}
                            className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
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
                {profile.projects.map((project: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">{project.title}</h4>
                        <p className="text-gray-600 mb-3">{project.description}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {project.tech.map((tech: string, techIndex: number) => (
                            <span 
                              key={techIndex}
                              className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {project.featured && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                            Featured
                          </span>
                        )}
                        {project.status === 'planned' && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            전역 후 예정
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {project.liveUrl && (
                        <a 
                          href={project.liveUrl}
                          className="flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          보기
                        </a>
                      )}
                    </div>
                  </div>
                ))}
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
                {profile.experience.map((exp: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{exp.position}</h4>
                        <p className="text-green-600 font-medium">{exp.company}</p>
                        <p className="text-sm text-gray-500">{exp.period}</p>
                      </div>
                      {exp.isCurrent && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          현재
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3">{exp.description}</p>
                    {exp.achievements.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">주요 성과</h5>
                        <ul className="space-y-1">
                          {exp.achievements.map((achievement: string, achIndex: number) => (
                            <li key={achIndex} className="text-sm text-gray-600 flex items-start">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              {achievement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
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
                {profile.recentPosts.map((post: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-gray-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {profile.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-900">{profile.name}</span>
                          <span className="text-sm text-gray-500">@jinkyu_soldier</span>
                          <span className="text-sm text-gray-400">·</span>
                          <span className="text-sm text-gray-400">
                            {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-3">{post.content}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {post.tags.map((tag: string, tagIndex: number) => (
                            <span 
                              key={tagIndex}
                              className="text-green-600 text-sm hover:underline cursor-pointer"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <button className="flex items-center space-x-1 hover:text-red-500 transition-colors">
                            <Heart className="w-4 h-4" />
                            <span>{post.likes}</span>
                          </button>
                          <button className="flex items-center space-x-1 hover:text-green-500 transition-colors">
                            <MessageCircle className="w-4 h-4" />
                            <span>댓글</span>
                          </button>
                          <button className="flex items-center space-x-1 hover:text-blue-500 transition-colors">
                            <Share2 className="w-4 h-4" />
                            <span>공유</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default JinkyuPortfolio