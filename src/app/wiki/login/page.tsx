'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  LogIn, 
  BookOpen, 
  Eye, 
  EyeOff, 
  Home, 
  UserPlus,
  ArrowLeft
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useWikiAuth } from '@/contexts/WikiAuthContext'
import { BRANDING } from '@/config/branding'

export default function WikiLoginPage() {
  const router = useRouter()
  const { login, isLoading } = useWikiAuth()
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [showRegisteredMessage, setShowRegisteredMessage] = useState(false)

  // URL 파라미터에서 회원가입 완료 상태 확인
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('registered') === 'true') {
      setShowRegisteredMessage(true)
      // 5초 후 메시지 숨김
      setTimeout(() => setShowRegisteredMessage(false), 5000)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}
    
    if (!formData.username.trim()) {
      newErrors.username = '아이디 또는 이메일을 입력해주세요.'
    }
    
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const success = await login(formData.username, formData.password)
      if (success) {
        router.push('/wiki')
      }
    } catch (error) {
      console.error('로그인 오류:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <BookOpen className="w-10 h-10 text-gray-400" />
            <h1 className="text-3xl font-bold text-gray-200">{BRANDING.brandWiki}</h1>
          </div>
          <p className="text-gray-400">위키에 로그인하여 문서를 편집하고 기여해보세요</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="text-center">
                <LogIn className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <h2 className="text-xl font-bold text-gray-200">위키 로그인</h2>
                <p className="text-sm text-gray-400">이랑위키 계정으로 로그인하세요</p>
              </div>
            </CardHeader>
            <CardContent>
              {/* 회원가입 완료 메시지 */}
              {showRegisteredMessage && (
                <motion.div
                  className="mb-4 p-4 bg-gray-700 border border-gray-600 rounded-lg"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                    <div>
                      <p className="text-green-400 font-medium">회원가입이 완료되었습니다!</p>
                      <p className="text-gray-400 text-sm">새로 만든 계정으로 로그인해주세요.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                    아이디 또는 이메일
                  </label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleInputChange}
                     placeholder="아이디 또는 이메일을 입력하세요"
                    className={`w-full bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-gray-500 ${errors.username ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-400">{errors.username}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                    비밀번호
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="비밀번호를 입력하세요"
                      className={`w-full pr-10 bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-gray-500 ${errors.password ? 'border-red-500' : ''}`}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-400">{errors.password}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-gray-200"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>로그인</span>
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-400">
                  아직 위키 계정이 없으신가요?{' '}
                  <button
                    onClick={() => router.push('/wiki/register')}
                    className="text-gray-300 hover:text-gray-100 font-medium hover:underline"
                    disabled={isSubmitting}
                  >
                    회원가입
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="mt-8 text-center space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex items-center justify-center space-x-4 text-sm">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-1 text-gray-400 hover:text-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              <Home className="w-4 h-4" />
              <span>메인사이트로</span>
            </button>
            
            <div className="text-gray-600">|</div>
            
            <button
              onClick={() => router.push('/wiki')}
              className="flex items-center space-x-1 text-gray-400 hover:text-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              <BookOpen className="w-4 h-4" />
              <span>위키 홈</span>
            </button>
          </div>

          <div className="text-xs text-gray-500">
            <p>이랑위키는 Rangu.fam이 운영하는 지식 공유 플랫폼입니다</p>
          </div>
        </motion.div>

        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-300 mb-1">위키 계정이란?</h3>
                  <p className="text-sm text-gray-400">
                    위키 계정은 메인 사이트 계정과 별도로 운영됩니다. 
                    위키에서 문서를 편집하고 토론에 참여하려면 위키 전용 계정이 필요합니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
} 
