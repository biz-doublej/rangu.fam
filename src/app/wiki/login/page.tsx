'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { BookOpenCheck, LogIn, UserCircle, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useWikiAuth } from '@/contexts/WikiAuthContext'

export default function WikiLoginPage() {
  const router = useRouter()
  const { isLoggedIn, linkedWikiUsername, startSignIn, startSignUp } = useAuth()
  const { wikiUser, isLoading } = useWikiAuth()

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#020617] text-white px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.12),transparent_40%)]" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="bg-slate-900/70 border-white/10">
          <CardHeader>
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-black/30 border border-white/20 flex items-center justify-center">
                <BookOpenCheck className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-center">이랑위키 로그인</h1>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 text-sm text-white/80">
            <p className="text-center">
              이랑위키 로그인/회원가입은 DoubleJ 통합 계정 플랫폼으로 이동하여 진행합니다.
            </p>
            <div className="rounded-2xl bg-black/20 border border-white/10 p-3">
              <p className="text-xs text-white/60 mb-1">현재 연결된 계정</p>
              <p className="font-semibold flex items-center gap-1">
                <UserCircle className="w-4 h-4 text-primary-300" />
                {linkedWikiUsername || wikiUser?.username || '미연결'}
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            {isLoggedIn ? (
              <Button
                type="button"
                variant="primary"
                className="w-full"
                loading={isLoading}
                onClick={() => router.push('/wiki')}
              >
                위키로 이동
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  onClick={() => startSignIn('/wiki')}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  통합 로그인
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full border border-white/20 text-white"
                  onClick={() => startSignUp('/wiki')}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  통합 회원가입
                </Button>
                <p className="text-xs text-white/60 text-center">
                  로그인 완료 후 자동으로 `/wiki`로 복귀합니다.
                </p>
              </>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
