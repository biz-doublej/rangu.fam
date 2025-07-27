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
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      return
    }

    setIsLoading(true)
    const success = await login(username, password)
    if (success) {
      router.push('/')
    }
    setIsLoading(false)
  }

  const demoAccounts = [
    { username: 'jaewon', name: '정재원', role: '멤버' },
    { username: 'minseok', name: '정민석', role: '멤버' },
    { username: 'jinkyu', name: '정진규', role: '멤버' },
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