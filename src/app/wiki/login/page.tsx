'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { BookOpenCheck, Link2, LogIn, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useWikiAuth } from '@/contexts/WikiAuthContext'

export default function WikiLoginPage() {
  const router = useRouter()
  const { isLoggedIn, linkedWikiUsername } = useAuth()
  const { login, isLoading, wikiUser } = useWikiAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleWikiLogin = async () => {
    setIsSubmitting(true)
    const success = await login()
    setIsSubmitting(false)
    if (success) {
      router.push('/wiki')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-4xl grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-6">
            <motion.div
              className="w-20 h-20 bg-gray-900 rounded-full mx-auto mb-4 flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <BookOpenCheck className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">이랑위키 로그인</h1>
            <p className="text-gray-400">
              Discord 계정으로 인증하고, 연결된 위키 계정으로 자동 로그인하세요.
            </p>
          </div>

          <Card className="bg-gray-900/70 border-gray-800">
            <CardHeader>
              <h2 className="text-lg font-semibold text-white text-center">
                1단계 · Discord 로그인
              </h2>
            </CardHeader>
            <CardContent className="text-sm text-gray-300 space-y-3">
              <p>
                먼저 Rangu.fam 메인 로그인 페이지에서 Discord 로그인을 완료해주세요. 로그인 후
                계정 설정에서 기존 위키 계정을 연결하면 여기서 바로 토큰을 발급할 수 있어요.
              </p>
              <Button
                type="button"
                variant="ghost"
                className="w-full border border-white/10 text-white"
                onClick={() => router.push('/login')}
              >
                Discord 로그인 페이지 열기
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/70 border-gray-800 mt-4">
            <CardHeader>
              <h2 className="text-lg font-semibold text-white text-center">
                2단계 · 계정 연동하기
              </h2>
            </CardHeader>
            <CardContent className="text-sm text-gray-300 space-y-2">
              <p>
                계정 설정 페이지에서 기존 Rangu 아이디와 위키 계정을 연결할 수 있습니다. 한 번만
                설정해두면 이후에는 Discord만으로 모든 로그인이 가능합니다.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                type="button"
                variant="ghost"
                className="w-full border border-white/10 text-white"
                onClick={() => router.push('/settings/account')}
              >
                계정 설정 바로가기
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold text-gray-800 text-center">
                최종 단계 · 위키 토큰 발급
              </h3>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <p>
                디스코드로 인증된 상태라면 아래 버튼을 눌러 위키 토큰을 발급받을 수 있습니다. 발급
                후에는 자동으로 위키 메인 페이지로 이동합니다.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <span className="mt-1">
                    <UserCircle className="w-4 h-4 text-primary-500" />
                  </span>
                  <span>
                    현재 연결된 위키 계정:{' '}
                    <strong>{linkedWikiUsername || wikiUser?.username || '미연결'}</strong>
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="mt-1">
                    <Link2 className="w-4 h-4 text-primary-500" />
                  </span>
                  <span>
                    연결된 계정이 없다면 계정 설정 페이지에서 기존 위키 아이디와 비밀번호를 입력해
                    주세요.
                  </span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={!isLoggedIn}
                loading={isSubmitting || isLoading}
                onClick={handleWikiLogin}
              >
                {isLoggedIn ? '위키 로그인' : '먼저 Discord에 로그인하세요'}
              </Button>
              {!isLoggedIn && (
                <p className="text-xs text-gray-500 text-center">
                  Discord 인증이 필요합니다. 먼저 상단 버튼을 눌러 로그인해주세요.
                </p>
              )}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <h4 className="text-lg font-semibold text-gray-800">도움말</h4>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>
                • 계정 연동은 한 번만 하면 됩니다. <br />• 위키 계정 비밀번호는 서버에서만 사용하고
                저장되지 않습니다. <br />• 토큰 발급 후에는 기존처럼 문서를 편집하고 토론에 참여할
                수 있습니다.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
