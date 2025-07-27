'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  UserPlus, 
  BookOpen, 
  Eye, 
  EyeOff, 
  Home, 
  LogIn,
  ArrowLeft,
  Check,
  X,
  User,
  Mail,
  Lock
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useWikiAuth } from '@/contexts/WikiAuthContext'
import { useAuth } from '@/contexts/AuthContext'

interface FormErrors {
  username?: string
  email?: string
  password?: string
  confirmPassword?: string
  displayName?: string
  general?: string
}

export default function WikiRegisterPage() {
  const router = useRouter()
  const { register, isLoading } = useWikiAuth()
  const { user: mainUser } = useAuth() // 메인 사이트 로그인 정보
  
  const [formData, setFormData] = useState({
    username: '',
    email: mainUser?.email || '',
    password: '',
    confirmPassword: '',
    displayName: mainUser?.username || '',
    linkMainAccount: !!mainUser // 메인 계정이 있으면 기본적으로 연결
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [passwordStrength, setPasswordStrength] = useState(0)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // 입력 시 해당 필드 에러 제거
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }
    
    // 비밀번호 강도 체크
    if (name === 'password') {
      checkPasswordStrength(value)
    }
  }

  const checkPasswordStrength = (password: string) => {
    let strength = 0
    
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++
    
    setPasswordStrength(strength)
  }

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1: return { text: '매우 약함', color: 'text-red-400' }
      case 2: return { text: '약함', color: 'text-orange-400' }
      case 3: return { text: '보통', color: 'text-yellow-400' }
      case 4: return { text: '강함', color: 'text-green-400' }
      case 5: return { text: '매우 강함', color: 'text-green-300' }
      default: return { text: '', color: '' }
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    // 사용자명 검증
    if (!formData.username.trim()) {
      newErrors.username = '사용자명을 입력해주세요.'
    } else if (formData.username.length < 3) {
      newErrors.username = '사용자명은 3자 이상이어야 합니다.'
    } else if (formData.username.length > 20) {
      newErrors.username = '사용자명은 20자 이하여야 합니다.'
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = '사용자명은 영문, 숫자, _, - 만 사용할 수 있습니다.'
    }
    
    // 이메일 검증
    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.'
    }
    
    // 비밀번호 검증
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.'
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다.'
    } else if (passwordStrength < 3) {
      newErrors.password = '더 강한 비밀번호를 사용해주세요.'
    }
    
    // 비밀번호 확인 검증
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.'
    }
    
    // 표시 이름 검증
    if (!formData.displayName.trim()) {
      newErrors.displayName = '표시 이름을 입력해주세요.'
    } else if (formData.displayName.length > 50) {
      newErrors.displayName = '표시 이름은 50자 이하여야 합니다.'
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
    setErrors({})
    
    try {
      const success = await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        displayName: formData.displayName.trim(),
        mainUserId: formData.linkMainAccount && mainUser ? mainUser.memberId : undefined
      })
      
      if (success) {
        // 회원가입 성공 시 로그인 페이지로 이동
        router.push('/wiki/login?registered=true')
      }
    } catch (error) {
      console.error('회원가입 오류:', error)
      setErrors({ general: '회원가입 중 오류가 발생했습니다.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* 헤더 */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <BookOpen className="w-10 h-10 text-gray-400" />
            <h1 className="text-3xl font-bold text-gray-200">이랑위키</h1>
          </div>
          <p className="text-gray-400">새 위키 계정을 만들어 편집에 참여하세요</p>
        </motion.div>

        {/* 회원가입 폼 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="text-center">
                <UserPlus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <h2 className="text-xl font-bold text-gray-200">위키 계정 만들기</h2>
                <p className="text-sm text-gray-400">이랑위키에서 문서를 편집하고 토론에 참여하세요</p>
              </div>
            </CardHeader>
            <CardContent>
              {errors.general && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-400 text-sm">
                  {errors.general}
                </div>
              )}

              {/* 메인 계정 연결 정보 */}
              {mainUser && (
                <div className="mb-6 p-4 bg-gray-700 border border-gray-600 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">메인 계정 연결</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    현재 <strong>{mainUser.username}</strong>으로 로그인되어 있습니다. 
                    위키 계정과 연결하시겠습니까?
                  </p>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="linkMainAccount"
                      checked={formData.linkMainAccount}
                      onChange={handleInputChange}
                      className="rounded border-gray-600 text-gray-400 focus:ring-gray-500 bg-gray-700"
                    />
                    <span className="text-sm text-gray-400">메인 계정과 연결하기</span>
                  </label>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 사용자명 */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                    사용자명 *
                  </label>
                  <div className="relative">
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="3-20자의 영문, 숫자, _, -"
                      className={`w-full pl-10 bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-gray-500 ${errors.username ? 'border-red-500' : ''}`}
                      disabled={isSubmitting}
                    />
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-400">{errors.username}</p>
                  )}
                </div>

                {/* 이메일 */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                    이메일 *
                  </label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="your@email.com"
                      className={`w-full pl-10 bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-gray-500 ${errors.email ? 'border-red-500' : ''}`}
                      disabled={isSubmitting}
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                  )}
                </div>

                {/* 표시 이름 */}
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">
                    표시 이름 *
                  </label>
                  <Input
                    id="displayName"
                    name="displayName"
                    type="text"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    placeholder="다른 사용자에게 표시될 이름"
                    className={`w-full bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-gray-500 ${errors.displayName ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.displayName && (
                    <p className="mt-1 text-sm text-red-400">{errors.displayName}</p>
                  )}
                </div>

                {/* 비밀번호 */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                    비밀번호 *
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="8자 이상의 안전한 비밀번호"
                      className={`w-full pl-10 pr-10 bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-gray-500 ${errors.password ? 'border-red-500' : ''}`}
                      disabled={isSubmitting}
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* 비밀번호 강도 표시 */}
                  {formData.password && (
                    <div className="mt-1">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              passwordStrength <= 1 ? 'bg-red-500' :
                              passwordStrength <= 2 ? 'bg-orange-500' :
                              passwordStrength <= 3 ? 'bg-yellow-500' :
                              passwordStrength <= 4 ? 'bg-green-500' : 'bg-green-400'
                            }`}
                            style={{ width: `${(passwordStrength / 5) * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs ${getPasswordStrengthText().color}`}>
                          {getPasswordStrengthText().text}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-400">{errors.password}</p>
                  )}
                </div>

                {/* 비밀번호 확인 */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                    비밀번호 확인 *
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="비밀번호를 다시 입력하세요"
                      className={`w-full pl-10 pr-10 bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-gray-500 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      disabled={isSubmitting}
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      disabled={isSubmitting}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* 비밀번호 일치 표시 */}
                  {formData.confirmPassword && (
                    <div className="mt-1 flex items-center space-x-1">
                      {formData.password === formData.confirmPassword ? (
                        <>
                          <Check className="w-3 h-3 text-green-400" />
                          <span className="text-xs text-green-400">비밀번호가 일치합니다</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 text-red-400" />
                          <span className="text-xs text-red-400">비밀번호가 일치하지 않습니다</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* 회원가입 버튼 */}
                <Button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-gray-200"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>계정 만들기</span>
                    </>
                  )}
                </Button>
              </form>

              {/* 로그인 링크 */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-400">
                  이미 위키 계정이 있으신가요?{' '}
                  <button
                    onClick={() => router.push('/wiki/login')}
                    className="text-gray-300 hover:text-gray-100 font-medium hover:underline"
                    disabled={isSubmitting}
                  >
                    로그인하기
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 하단 링크 */}
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
            <p>계정을 만들면 <a href="/wiki/policy" className="hover:text-gray-300">이용 정책</a>에 동의하는 것으로 간주됩니다</p>
          </div>
        </motion.div>

        {/* 정보 카드 */}
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
                  <h3 className="font-medium text-gray-300 mb-1">위키 계정의 장점</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• 모든 문서를 자유롭게 편집할 수 있습니다</li>
                    <li>• 토론에 참여하여 의견을 나눌 수 있습니다</li>
                    <li>• 문서 변경 사항을 추적하고 알림을 받을 수 있습니다</li>
                    <li>• 개인 사용자 페이지를 만들 수 있습니다</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
} 