'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 에러 모니터링 — 향후 Sentry/등 연결할 수 있는 자리
    console.error('Global error boundary:', error)
  }, [error])

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{ background: '#FBF7EE' }}
    >
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 mb-5">
          <AlertCircle className="w-8 h-8 text-rose-600" />
        </div>
        <h1
          className="text-2xl text-stone-800 mb-2"
          style={{ fontFamily: "'Gowun Batang', serif" }}
        >
          예상치 못한 오류가 발생했어요
        </h1>
        <p className="text-stone-600 leading-relaxed mb-2">
          잠시 후 다시 시도해 주세요. 같은 오류가 반복되면 운영팀에 알려주시기 바랍니다.
        </p>
        {error.digest && (
          <p className="text-xs text-stone-400 mb-6 font-mono">
            오류 ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 bg-stone-800 text-white px-5 py-2.5 rounded-md hover:bg-stone-900 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-white border border-stone-300 text-stone-700 px-5 py-2.5 rounded-md hover:border-stone-500 transition-colors"
          >
            <Home className="w-4 h-4" />
            홈으로
          </Link>
        </div>
      </div>
    </main>
  )
}
