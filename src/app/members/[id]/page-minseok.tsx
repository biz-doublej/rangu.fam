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
  Mountain,
  Camera,
  Plane,
  Languages,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Star,
  User
} from 'lucide-react'
import { Card } from '@/components/ui/Card'

function MinseokPortfolio() {
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('about')
  const [likes, setLikes] = useState(89)
  const [isLiked, setIsLiked] = useState(false)

  // 정민석 프로필 데이터
  const minseokData = {
    name: '정민석',
    title: '스위스 거주 • 모험가 & 언어학습자',
    bio: '스위스 알프스에서 새로운 꿈을 키워가고 있습니다. 자연을 사랑하고 다양한 문화와 언어를 배우며 인생의 새로운 장을 써나가고 있어요.',
    location: '취리히, 스위스',
    email: 'minseok@rangu.fam',
    avatar: '🏔️',
    socialLinks: {
      github: 'https://github.com/minseok',
      linkedin: 'https://linkedin.com/in/minseok-jung',
      instagram: 'https://instagram.com/minseok_swiss',
      website: 'https://minseok.blog'
    },
    stats: {
      projects: 8,
      followers: 567,
      following: 234,
      posts: 156
    },
    skills: [
      { name: '독일어', level: 85, category: '언어' },
      { name: '프랑스어', level: 70, category: '언어' },
      { name: '이탈리아어', level: 60, category: '언어' },
      { name: '스키', level: 90, category: '스포츠' },
      { name: '하이킹', level: 95, category: '아웃도어' },
      { name: '사진촬영', level: 80, category: '크리에이티브' },
      { name: '여행계획', level: 85, category: '라이프스타일' },
      { name: '문화적응', level: 88, category: '소프트스킬' }
    ],
    experience: [
      {
        company: '스위스 언어학교',
        position: '독일어 학습자',
        period: '2024.03 - 현재',
        description: '독일어 집중 과정 수료 및 현지 적응 프로그램 참여',
        achievements: ['B2 레벨 달성', '현지 친구들과 네트워킹'],
        isCurrent: true
      },
      {
        company: '알프스 가이드 투어',
        position: '투어 어시스턴트',
        period: '2024.06 - 2024.09',
        description: '한국인 관광객 대상 알프스 투어 가이드 보조',
        achievements: ['100+ 투어 진행', '고객 만족도 98%'],
        isCurrent: false
      },
      {
        company: '한국 기업',
        position: '마케팅 전문가',
        period: '2020.01 - 2023.12',
        description: '디지털 마케팅 및 브랜드 전략 수립',
        achievements: ['매출 150% 증가', '브랜드 인지도 향상'],
        isCurrent: false
      }
    ],
    projects: [
      {
        title: 'Swiss Life Blog',
        description: '스위스 생활 경험을 공유하는 개인 블로그',
        tech: ['WordPress', 'Photography', 'Content Creation'],
        status: 'completed',
        featured: true,
        liveUrl: 'https://minseok.blog'
      },
      {
        title: '알프스 포토 갤러리',
        description: '스위스 알프스 사진 작품 컬렉션',
        tech: ['Photography', 'Adobe Lightroom', 'Instagram'],
        status: 'ongoing',
        featured: true,
        liveUrl: 'https://instagram.com/minseok_alps'
      },
      {
        title: '스위스 생활 가이드',
        description: '한국인을 위한 스위스 적응 가이드북',
        tech: ['Notion', 'Research', 'Community'],
        status: 'in-progress',
        featured: false
      }
    ],
    recentPosts: [
      {
        content: '오늘 마터호른을 배경으로 한 일출 사진을 찍었어요! 스위스의 아름다운 자연에 감사합니다 🏔️✨',
        type: 'image',
        mediaUrl: '/images/matterhorn-sunrise.jpg',
        tags: ['사진', '마터호른', '일출', '자연'],
        likes: 124,
        createdAt: new Date('2025-01-19')
      },
      {
        content: '독일어 B2 시험에 합격했습니다! 1년 동안의 노력이 결실을 맺었네요. 다음 목표는 C1 레벨! 💪',
        type: 'text',
        tags: ['독일어', '시험', '성취', '학습'],
        likes: 67,
        createdAt: new Date('2025-01-17')
      },
      {
        content: '스위스에서 만난 친구들과 함께 치즈 퐁듀 파티를 했어요. 문화 교류의 즐거움! 🧀',
        type: 'image',
        mediaUrl: '/images/cheese-fondue.jpg',
        tags: ['치즈퐁듀', '친구', '문화교류', '스위스음식'],
        likes: 89,
        createdAt: new Date('2025-01-15')
      },
      {
        content: '스위스 생활 1년, 정말 많은 것을 배웠습니다. 새로운 블로그 포스트로 경험을 정리해봤어요.',
        type: 'link',
        linkUrl: 'https://minseok.blog/one-year-in-switzerland',
        tags: ['블로그', '스위스생활', '회고', '성장'],
        likes: 45,
        createdAt: new Date('2025-01-12')
      }
    ]
  }

  useEffect(() => {
    // 프로필 데이터 로드 시뮬레이션
    setTimeout(() => {
      setProfile(minseokData)
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
        title: '정민석의 포트폴리오',
        text: '스위스에서 새로운 꿈을 키워가는 정민석님의 이야기를 확인해보세요!',
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('링크가 클립보드에 복사되었습니다!')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">포트폴리오를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                {profile.avatar}
              </div>
              <div>
                <h1 className="font-bold text-gray-900">{profile.name}</h1>
                <p className="text-sm text-gray-500">@minseok_swiss</p>
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
              <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {profile.avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-xs">🇨🇭</span>
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
                  <Languages className="w-4 h-4 mr-1" />
                  독일어, 프랑스어, 한국어
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
                  className="p-2 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="w-5 h-5 text-green-700" />
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

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-xl mb-6 shadow-sm">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'about', label: '소개', icon: User },
              { id: 'projects', label: '프로젝트', icon: Mountain },
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
                    스킬 & 능력
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

                {/* 특별한 경험 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Plane className="w-5 h-5 mr-2 text-blue-500" />
                    스위스 생활 하이라이트
                  </h3>
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl mb-2">🏔️</div>
                        <div className="font-semibold text-gray-900">50+</div>
                        <div className="text-sm text-gray-600">알프스 등반</div>
                      </div>
                      <div>
                        <div className="text-2xl mb-2">🇨🇭</div>
                        <div className="font-semibold text-gray-900">4</div>
                        <div className="text-sm text-gray-600">칸톤 방문</div>
                      </div>
                      <div>
                        <div className="text-2xl mb-2">🗣️</div>
                        <div className="font-semibold text-gray-900">3</div>
                        <div className="text-sm text-gray-600">언어 구사</div>
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
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {profile.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-900">{profile.name}</span>
                          <span className="text-sm text-gray-500">@minseok_swiss</span>
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

export default MinseokPortfolio