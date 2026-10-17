'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

/**
 * 구글 로그인 버튼. 구글 브랜드 가이드(흰 바탕 + 컬러 G 로고 + 회색 테두리)를 따른다.
 * 첫 로그인이 곧 가입이므로 별도 회원가입 버튼은 두지 않는다.
 */
export function GoogleSignInButton({
  callbackUrl = '/',
  label = 'Google 계정으로 로그인',
  className = '',
  autoOpen = false,
  inline = false,
}: {
  callbackUrl?: string
  label?: string
  className?: string
  autoOpen?: boolean
  inline?: boolean
}) {
  const [open, setOpen] = useState(false)
  useEffect(() => { if (autoOpen) setOpen(true) }, [autoOpen])
  return (
    <>
    {!inline && !autoOpen && <button
      type="button"
      onClick={() => setOpen(true)}
      className={`inline-flex w-full items-center justify-center gap-3 rounded-md border border-[#DADCE0] bg-[#FFFFFF] px-4 py-2.5 text-sm font-medium text-[#1F1F1F] shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-colors hover:bg-[#F7F8F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F5D8C] ${className}`}
    >
      <GoogleMark className="h-[18px] w-[18px]" /><span>로그인 방법 선택</span>
    </button>}
    {(inline || open) && (
      <div className={inline ? '' : 'fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4'} role={inline ? undefined : 'dialog'} aria-modal={inline ? undefined : true} aria-labelledby={inline ? undefined : 'login-choice-title'}>
        <div className={inline ? 'w-full' : 'w-full max-w-md rounded-2xl bg-paper-50 p-6 shadow-2xl'}>
          <div className="flex items-start justify-between gap-4">
            <div>{!inline && <h2 id="login-choice-title" className="text-xl font-bold text-ink-500">이랑위키 로그인</h2>}<p className="mt-1 text-sm text-ink-300">로그인 방법을 선택하세요.</p></div>
            {!inline && <button type="button" onClick={() => setOpen(false)} className="text-xl text-ink-300" aria-label="닫기">×</button>}
          </div>
          <div className="wiki-login-providers mt-5 space-y-2">
            <a href={`/auth/start?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="inline-flex w-full items-center justify-center gap-3 rounded-md border border-[#DADCE0] bg-white px-4 py-3 text-sm font-medium text-[#1F1F1F] hover:bg-[#F7F8F8]"><GoogleMark className="h-[18px] w-[18px]" /><span>{label}</span></a>
            <a href={`/auth/naver/start?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="inline-flex w-full items-center justify-center gap-3 rounded-md bg-[#03C75A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#02b351]"><span className="flex h-[18px] w-[18px] items-center justify-center rounded-sm bg-white text-xs font-black text-[#03C75A]">N</span><span>네이버로 로그인</span></a>
          </div>
          <div className="mt-5 rounded-lg border border-ink-500/10 bg-paper-100 px-3 py-3 text-xs leading-5 text-ink-300">
            <p className="font-semibold text-ink-500">수집·이용 안내</p>
            <p className="mt-1">로그인 제공자의 계정 식별자, 이메일, 이름·닉네임, 프로필 이미지를 계정 생성·로그인 유지·위키 기여자 표시를 위해 사용합니다. 비밀번호는 서비스가 저장하지 않습니다.</p>
            <p className="mt-1">로그인하면 <Link href="/terms" className="underline hover:text-coral-500">이용약관</Link>과 <Link href="/privacy" className="underline hover:text-coral-500">개인정보처리방침</Link>에 동의합니다.</p>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
