'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import JaewonPortfolio from './page-jaewon'
import MinseokPortfolio from './page-minseok'
import JinkyuPortfolio from './page-jinkyu'
import { motion } from 'framer-motion'
import { User, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function MemberPortfolioPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.id as string

  // 각 멤버별 컴포넌트 렌더링
  const renderMemberPortfolio = () => {
    switch (memberId) {
      case 'jaewon':
        return <JaewonPortfolio />
      case 'minseok':
        return <MinseokPortfolio />
      case 'jinkyu':
        return <JinkyuPortfolio />
      case 'seungchan':
        // TODO: 이승찬 포트폴리오 컴포넌트 추가 예정
        return <ComingSoonPage memberName="이승찬" />
      case 'heeyeol':
        // TODO: 윤희열 포트폴리오 컴포넌트 추가 예정
        return <ComingSoonPage memberName="윤희열" />
      case 'hanul':
        // TODO: 강한울 포트폴리오 컴포넌트 추가 예정
        return <ComingSoonPage memberName="강한울" />
      default:
        return <NotFoundPage />
    }
  }

  return renderMemberPortfolio()
}

// 준비 중 페이지
function ComingSoonPage({ memberName }: { memberName: string }) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* 아이콘 */}
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-6 flex items-center justify-center">
            <User className="w-12 h-12 text-white" />
          </div>

          {/* 제목 */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {memberName}님의 포트폴리오
          </h1>

          {/* 설명 */}
          <p className="text-lg text-gray-600 mb-6">
            현재 준비 중입니다. 곧 멋진 포트폴리오로 찾아뵙겠습니다! ✨
          </p>

          {/* 진행 상황 */}
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">개발 진행률</span>
              <span className="text-sm text-gray-500">30%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '30%' }}
                transition={{ duration: 1.5, delay: 0.5 }}
              />
            </div>
          </div>

          {/* 예정 기능 */}
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm text-left">
            <h3 className="font-semibold text-gray-900 mb-3">예정 기능</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                개인 프로필 & 소개
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                프로젝트 포트폴리오
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                경험 & 스킬
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-gray-300 rounded-full mr-2"></div>
                소셜 미디어 연동
              </li>
            </ul>
          </div>

          {/* 돌아가기 버튼 */}
          <button
            onClick={() => router.push('/members')}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            멤버 목록으로 돌아가기
          </button>
        </motion.div>
      </div>
    </div>
  )
}

// 404 페이지
function NotFoundPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* 404 아이콘 */}
          <div className="w-24 h-24 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="text-3xl">❓</span>
          </div>

          {/* 제목 */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            멤버를 찾을 수 없습니다
          </h1>

          {/* 설명 */}
          <p className="text-lg text-gray-600 mb-6">
            요청하신 멤버의 포트폴리오를 찾을 수 없습니다.
          </p>

          {/* 돌아가기 버튼 */}
          <button
            onClick={() => router.push('/members')}
            className="inline-flex items-center px-6 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            멤버 목록으로 돌아가기
          </button>
        </motion.div>
      </div>
    </div>
  )
}