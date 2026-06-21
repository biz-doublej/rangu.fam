'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'

// 배포 직후 열린 탭(이전 빌드)이 새로 생긴 청크를 못 찾을 때 발생하는 로드 오류들.
// 이 경우 페이지를 새로고침하면 새 빌드 HTML을 받아 스스로 복구된다.
function isStaleChunkError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    /Loading chunk|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
      error.message || ''
    )
  )
}

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

    // 청크 로드 실패(배포로 인한 stale 빌드) → 1회 자동 새로고침으로 자가 복구.
    // sessionStorage 가드로 무한 새로고침 루프 방지.
    if (isStaleChunkError(error) && typeof window !== 'undefined') {
      const key = 'chunk-error-reloaded-at'
      try {
        const last = Number(window.sessionStorage.getItem(key) || 0)
        // 60초 내 재발이면 루프로 간주하고 수동 안내 화면 유지
        if (Date.now() - last > 60_000) {
          window.sessionStorage.setItem(key, String(Date.now()))
          window.location.reload()
        }
      } catch {
        /* sessionStorage 불가 환경이면 수동 새로고침 안내 화면 유지 */
      }
    }
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
