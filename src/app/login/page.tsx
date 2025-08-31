'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { LogIn, User, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rememberLogin, setRememberLogin] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  // 간단한 인코딩/디코딩 함수 (보안을 위한 기본적인 obfuscation)
  const encodeCredentials = (username: string, password: string) => {
    return btoa(JSON.stringify({ username, password }))
  }

  const decodeCredentials = (encoded: string) => {
    try {
      return JSON.parse(atob(encoded))
    } catch {
      return null
    }
  }

  // 컴포넌트 마운트 시 저장된 로그인 정보 불러오기
  React.useEffect(() => {
    const savedLoginInfo = localStorage.getItem('rangu_saved_login')
    if (savedLoginInfo) {
      const decoded = decodeCredentials(savedLoginInfo)
      if (decoded) {
        setUsername(decoded.username)
        setPassword(decoded.password)
        setRememberLogin(true)
      } else {
        console.error('저장된 로그인 정보 로드 실패')
        localStorage.removeItem('rangu_saved_login')
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      return
    }

    setIsLoading(true)
    const success = await login(username, password)
    
    if (success) {
      // 로그인 저장이 체크되어 있으면 로컬 스토리지에 저장
      if (rememberLogin) {
        const encoded = encodeCredentials(username, password)
        localStorage.setItem('rangu_saved_login', encoded)
      } else {
        // 체크 해제 시 저장된 정보 삭제
        localStorage.removeItem('rangu_saved_login')
      }
      
      router.push('/')
    }
    setIsLoading(false)
  }

  const demoAccounts = [
    { username: 'jaewon', name: '정재원', role: '멤버' },
    { username: 'minseok', name: '정민석', role: '멤버' },
    { username: 'jingyu', name: '정진규', role: '멤버' },
    { username: 'hanul', name: '강한울', role: '멤버' },
    { username: 'guest', name: '게스트', role: '비멤버' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* 배경 돌아가기 버튼 */}
      <motion.button
        className="fixed top-6 left-6 glass-button p-3 z-10"
        onClick={() => router.push('/')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft className="w-5 h-5 text-primary-600" />
      </motion.button>

      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 헤더 */}
          <div className="text-center mb-8">
            <motion.div
              className="w-20 h-20 bg-primary-100 rounded-full mx-auto mb-4 flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <LogIn className="w-10 h-10 text-primary-600" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gradient mb-2">로그인</h1>
            <p className="text-gray-600">Rangu.fam에 오신 것을 환영합니다</p>
          </div>

          {/* 로그인 폼 */}
          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <h2 className="text-xl font-semibold text-center text-primary-700">
                  계정 정보를 입력해주세요
                </h2>
              </CardHeader>

              <CardContent className="space-y-4">
                <Input
                  label="아이디"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="아이디를 입력하세요"
                  required
                />

                <div className="relative">
                  <Input
                    label="비밀번호"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-10 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* 로그인 저장 체크박스 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="rememberLogin"
                      checked={rememberLogin}
                      onChange={(e) => setRememberLogin(e.target.checked)}
                      className="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    />
                    <label 
                      htmlFor="rememberLogin" 
                      className="text-sm text-gray-700 cursor-pointer select-none"
                    >
                      로그인 정보 저장
                    </label>
                  </div>
                  {rememberLogin && (
                    <motion.p 
                      className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      💡 다음 방문 시 자동으로 로그인 정보가 입력됩니다. 공용 기기에서는 사용을 권장하지 않습니다.
                    </motion.p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="space-y-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  className="w-full"
                >
                  로그인
                </Button>

                <div className="text-center text-sm text-gray-500">
                  <p>계정이 없으신가요? 게스트로 로그인하세요</p>
                </div>
              </CardFooter>
            </form>
          </Card>

          {/* 데모 계정 정보 */}
          <motion.div
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card variant="glass">
              <CardHeader>
                <h3 className="text-lg font-semibold text-primary-700 text-center">
                  데모 계정 정보
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {demoAccounts.map((account, index) => (
                    <motion.div
                      key={account.username}
                      className="flex items-center justify-between p-3 glass-button cursor-pointer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setUsername(account.username)
                        setPassword(account.username === 'guest' ? 'guest123' : 'password123')
                        // 데모 계정 클릭 시 저장된 정보가 있다면 체크박스도 업데이트
                        const savedLoginInfo = localStorage.getItem('rangu_saved_login')
                        if (savedLoginInfo) {
                          const decoded = decodeCredentials(savedLoginInfo)
                          if (decoded) {
                            setRememberLogin(decoded.username === account.username)
                          } else {
                            setRememberLogin(false)
                          }
                        } else {
                          setRememberLogin(false)
                        }
                      }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">{account.name}</p>
                          <p className="text-sm text-gray-500">{account.role}</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        클릭하여 자동 입력
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-warm-50 rounded-xl">
                  <p className="text-sm text-gray-600 text-center">
                    💡 <strong>비밀번호:</strong> 멤버는 password123, 게스트는 guest123
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
} 