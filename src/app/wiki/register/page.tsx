'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function WikiRegisterPage() {
  const { startSignUp, startSignIn } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-xl w-full">
        <CardHeader>
          <h1 className="text-2xl font-bold text-gray-800">회원가입 방식 변경 안내</h1>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>기존 위키 개별 회원가입은 종료되었습니다.</p>
          <p>회원가입은 `accounts.doublej.app`에서 통합으로 진행되며 완료 후 이랑위키/랑구팸에 공통 적용됩니다.</p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="button" variant="primary" className="w-full" onClick={() => startSignUp('/wiki')}>
            통합 회원가입 시작
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => startSignIn('/wiki')}>
            통합 로그인 시작
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
