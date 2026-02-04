'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function WikiRegisterPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-xl w-full">
        <CardHeader>
          <h1 className="text-2xl font-bold text-gray-800">회원가입 방식 변경 안내</h1>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>기존 위키 개별 회원가입은 종료되었습니다.</p>
          <p>이제 DoubleJ 통합 로그인에서 아이디/비밀번호로 회원가입 후 이랑위키와 랑구팸을 함께 이용할 수 있습니다.</p>
        </CardContent>
        <CardFooter>
          <Button type="button" variant="primary" className="w-full" onClick={() => router.push('/login')}>
            통합 로그인/회원가입으로 이동
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
