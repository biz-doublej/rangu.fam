'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Compass, Home, Search } from 'lucide-react'
import { BRANDING } from '@/config/branding'

export default function NotFound() {
  const router = useRouter()
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{ background: '#FBF7EE' }}
    >
      <div className="w-full max-w-2xl text-center">
        {/* 큰 폴라로이드 404 카드 — 비스듬히 핀으로 꽂은 느낌 */}
        <div className="relative inline-block mb-10" style={{ transform: 'rotate(-3deg)' }}>
          <div
            className="relative bg-white p-5 pb-12 shadow-[0_18px_40px_-18px_rgba(43,33,24,0.45)]"
            style={{ width: 280, fontFamily: "'Caveat', 'Gowun Batang', cursive" }}
          >
            <div
              className="aspect-square w-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200/60 mb-3"
            >
              <div
                className="text-[120px] leading-none text-stone-700 font-bold"
                style={{ fontFamily: "'Gowun Batang', serif" }}
              >
                404
              </div>
              <div className="mt-2 text-sm tracking-[0.3em] text-stone-500 uppercase">
                Page Not Found
              </div>
            </div>
            <div className="text-stone-700 text-2xl">
              엇, 길을 잃었네요...
            </div>
            {/* 핀 — 폴라로이드 위쪽 */}
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-rose-500 border border-rose-700 shadow"
              aria-hidden="true"
            />
          </div>
          {/* 테이프 — 좌상단 */}
          <div
            className="absolute -top-3 -left-4 h-6 w-16 bg-yellow-200/70 rotate-[-15deg] rounded-sm"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
            aria-hidden="true"
          />
        </div>

        <h1
          className="text-3xl text-stone-800 mb-3"
          style={{ fontFamily: "'Gowun Batang', serif" }}
        >
          찾으시는 페이지가 없어요
        </h1>
        <p className="text-stone-600 leading-relaxed max-w-md mx-auto mb-8">
          주소가 바뀌었거나, 이미 사라진 페이지일 수 있습니다. 아래에서 가고 싶은 곳을 골라
          보세요.
        </p>

        {/* 액션 카드 — 메인/위키/뒤로 */}
        <div className="grid sm:grid-cols-3 gap-3 max-w-xl mx-auto mb-8">
          <Link
            href="/"
            className="group bg-white border border-stone-300 hover:border-stone-500 rounded-md px-4 py-4 text-left transition-colors shadow-sm hover:shadow-md"
          >
            <Home className="w-5 h-5 text-rose-500 mb-2" />
            <div className="text-sm font-semibold text-stone-800 mb-0.5">
              랑구팸 홈
            </div>
            <div className="text-xs text-stone-500">메인 페이지로 이동</div>
          </Link>
          <Link
            href={BRANDING.wikiPublicUrl}
            className="group bg-white border border-stone-300 hover:border-stone-500 rounded-md px-4 py-4 text-left transition-colors shadow-sm hover:shadow-md"
          >
            <BookOpen className="w-5 h-5 text-emerald-600 mb-2" />
            <div className="text-sm font-semibold text-stone-800 mb-0.5">
              이랑위키
            </div>
            <div className="text-xs text-stone-500">백과사전 탐색</div>
          </Link>
          <button
            type="button"
            onClick={() => router.back()}
            className="group bg-white border border-stone-300 hover:border-stone-500 rounded-md px-4 py-4 text-left transition-colors shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-5 h-5 text-amber-600 mb-2" />
            <div className="text-sm font-semibold text-stone-800 mb-0.5">
              이전 페이지
            </div>
            <div className="text-xs text-stone-500">방금 보던 곳으로</div>
          </button>
        </div>

        {/* 추가 링크 */}
        <div className="text-sm text-stone-500 flex flex-wrap items-center justify-center gap-4">
          <Link href="/about" className="hover:text-stone-800 hover:underline inline-flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" />
            소개
          </Link>
          <Link href="/members" className="hover:text-stone-800 hover:underline">
            멤버
          </Link>
          <Link href="/cards" className="hover:text-stone-800 hover:underline">
            카드
          </Link>
          <Link href="/university" className="hover:text-stone-800 hover:underline">
            랑구대학교
          </Link>
          <Link
            href="/wiki/search"
            className="hover:text-stone-800 hover:underline inline-flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />
            위키 검색
          </Link>
        </div>
      </div>
    </main>
  )
}
