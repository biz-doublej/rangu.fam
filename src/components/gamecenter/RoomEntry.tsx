'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DoorOpen, Plus } from 'lucide-react'
import { ROOM_CODE_LENGTH, normalizeRoomCode } from '@/games/rooms/base'

const ROOM_KINDS = [
  { game: 'omok', label: '오목' },
  { game: 'liar', label: '라이어' },
  { game: 'quiz', label: '퀴즈' },
]

/** 로비의 ‘방 만들기 / 코드로 입장’. 실제 접속은 방 화면에서 한다. */
export function RoomEntry() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const join = (event: React.FormEvent) => {
    event.preventDefault()
    const normalized = normalizeRoomCode(code)
    if (!normalized) {
      setError(`방 코드는 ${ROOM_CODE_LENGTH}자리입니다.`)
      return
    }
    router.push(`/wiki/game/room/${normalized}`)
  }

  return (
    <section id="rooms" className="wiki-panel scroll-mt-24" aria-labelledby="gc-rooms">
      <h2 id="gc-rooms" className="text-base font-semibold text-[color:var(--wiki-ink)]">
        친구와 함께
      </h2>
      <p className="mt-1 text-sm text-[color:var(--wiki-ink-muted)]">방을 만들어 코드를 알려 주거나, 받은 코드로 들어갑니다.</p>
      <div className="mt-3 flex flex-wrap items-start gap-3">
        {ROOM_KINDS.map((kind) => (
          <button
            key={kind.game}
            type="button"
            onClick={() => router.push(`/wiki/game/room/new?game=${kind.game}`)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--wiki-accent)] px-3 py-2 text-sm font-medium text-[#fff] hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {kind.label} 방 만들기
          </button>
        ))}
        <form onSubmit={join} className="flex items-start gap-2">
          <div>
            <input
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase())
                setError(null)
              }}
              maxLength={ROOM_CODE_LENGTH + 2}
              placeholder="방 코드"
              aria-label="방 코드"
              autoCapitalize="characters"
              autoComplete="off"
              className="w-32 rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-field)] px-2.5 py-2 text-center font-mono text-sm tracking-widest text-[color:var(--wiki-ink)] focus:border-[color:var(--wiki-accent)] focus:outline-none"
            />
            {error && (
              <p role="alert" className="mt-1 text-xs text-[color:var(--wiki-danger)]">
                {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-panel)] px-3 py-2 text-sm text-[color:var(--wiki-ink-soft)] hover:bg-[color:var(--wiki-bg-2)]"
          >
            <DoorOpen className="h-4 w-4" aria-hidden />
            코드로 입장
          </button>
        </form>
      </div>
      <p className="mt-3 text-sm text-[color:var(--wiki-ink-muted)]">
        퀴즈 배틀은 각자{' '}
        <Link href="/wiki/game/quiz/answers" className="text-[color:var(--wiki-link)] hover:underline">
          내 답 채우기
        </Link>
        에서 10개 이상 답해 둬야 시작할 수 있습니다.
      </p>
    </section>
  )
}
