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
  Laptop
} from 'lucide-react'
import { Card } from '@/components/ui/Card'

function JaewonPortfolio() {
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('about')
  const [likes, setLikes] = useState(128)
  const [isLiked, setIsLiked] = useState(false)

  // 정재원 프로필 데이터
  const jaewonData = {
    name: '정재원',
    title: '소프트웨어 엔지니어 & 패션 모델',
    bio: '코딩과 패션을 사랑하는 다재다능한 개발자입니다. 기술과 미학의 완벽한 조화를 추구하며, 사용자 경험을 최우선으로 하는 개발을 지향합니다.',
    location: '서울, 대한민국',
    email: 'jaewon@rangu.fam',
    avatar: '👨‍💻',
    socialLinks: {
      github: 'https://github.com/GabrielJung0727',
      linkedin: 'https://www.linkedin.com/in/gabriel-jung-76a074356/',
      instagram: 'https://instagram.com/dev.gabrieljung',
      website: 'https://jaewon.dev'
    },
    stats: {
      projects: 15,
      followers: 1247,
      following: 89,
      posts: 42
    },
    skills: [
      { name: 'React', level: 95, category: 'Frontend' },
      { name: 'TypeScript', level: 90, category: 'Language' },
      { name: 'Node.js', level: 85, category: 'Backend' },
      { name: 'Python', level: 80, category: 'Language' },
      { name: 'UI/UX Design', level: 85, category: 'Design' },
      { name: 'Photography', level: 75, category: 'Creative' }
    ],
    experience: [
      {
        company: 'Tech Startup',
        position: '프론트엔드 개발자',
        period: '2023.03 - 현재',
        description: 'React 기반 웹 애플리케이션 개발 및 사용자 경험 개선',
        achievements: ['성능 30% 향상', '사용자 만족도 95% 달성'],
        isCurrent: true
      },
      {
        company: 'Fashion Model Agency',
        position: '패션 모델',
        period: '2022.01 - 현재',
        description: '브랜드 모델링 및 패션쇼 참여',
        achievements: ['주요 브랜드 5개 계약', '패션위크 참여'],
        isCurrent: true
      }
    ],
    projects: [
      {
        title: 'Rangu.fam',
        description: '친구들과 함께하는 개인 공간 웹사이트',
        tech: ['Next.js', 'TypeScript', 'MongoDB', 'Tailwind CSS'],
        status: 'completed',
        featured: true,
        liveUrl: 'https://rangu.fam',
        githubUrl: 'https://github.com/jaewon/rangu-fam'
      },
      {
        title: 'Portfolio Website',
        description: '개인 포트폴리오 및 블로그 사이트',
        tech: ['React', 'Gatsby', 'GraphQL', 'Styled Components'],
        status: 'completed',
        featured: true,
        liveUrl: 'https://jaewon.dev'
      },
      {
        title: 'Fashion Gallery',
        description: '패션 작품 갤러리 웹앱',
        tech: ['Vue.js', 'Firebase', 'Nuxt.js'],
        status: 'in-progress',
        featured: false
      }
    ],
    recentPosts: [
      {
        content: '새로운 프로젝트 Rangu.fam을 완성했습니다! 친구들과 함께 만든 특별한 공간이에요. 🚀',
        type: 'text',
        tags: ['개발', '프로젝트', 'Next.js'],
        likes: 34,
        createdAt: new Date('2025-01-20')
      },
      {
        content: '오늘 패션쇼 촬영이 있었어요. 기술과 패션의 만남이 정말 흥미롭네요! 📸',
        type: 'image',
        mediaUrl: '/images/jaewon-fashion.jpg',
        tags: ['패션', '모델링', '촬영'],
        likes: 67,
        createdAt: new Date('2025-01-18')
      },
      {
        content: 'TypeScript의 새로운 기능들을 정리한 블로그 포스트를 올렸습니다.',
        type: 'link',
        linkUrl: 'https://jaewon.dev/blog/typescript-new-features',
        tags: ['TypeScript', '개발', '블로그'],
        likes: 23,
        createdAt: new Date('2025-01-15')
      }
    ]
  }

  useEffect(() => {
    // 프로필 데이터 로드 시뮬레이션
    setTimeout(() => {
      setProfile(jaewonData)
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
        title: '정재원의 포트폴리오',
        text: '정재원님의 개발자 & 모델 포트폴리오를 확인해보세요!',
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('링크가 클립보드에 복사되었습니다!')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">포트폴리오를 불러오는 중...</p>
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
                {profile.avatar}
              </div>
              <div>
                <h1 className="font-bold text-gray-900">{profile.name}</h1>
                <p className="text-sm text-gray-500">@jaewon_dev</p>
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
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {profile.avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
            </div>

            {/* 프로필 정보 */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{profile.name}</h1>
              <p className="text-lg text-blue-600 font-medium mb-2">{profile.title}</p>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Star className="w-5 h-5 mr-2 text-yellow-500" />
                    스킬
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
                            className="bg-blue-600 h-2 rounded-full transition-all duration-700"
                            style={{ width: `${skill.level}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400 mt-1">{skill.category}</span>
                      </div>
                    ))}
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
                    {exp.achievements.length > 0 && (
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
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {profile.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-900">{profile.name}</span>
                          <span className="text-sm text-gray-500">@jaewon_dev</span>
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
                              className="text-blue-600 text-sm hover:underline cursor-pointer"
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
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default JaewonPortfolio