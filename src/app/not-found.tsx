import React from 'react'

export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary-600">페이지를 찾을 수 없습니다</h1>
        <p className="text-gray-400 mt-2">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
        <a href="/" className="inline-block mt-6 px-4 py-2 rounded-lg bg-primary-600 text-white">홈으로 가기</a>
      </div>
    </div>
  )
}

