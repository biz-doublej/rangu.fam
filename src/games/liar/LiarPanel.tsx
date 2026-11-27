'use client'

import React, { useState } from 'react'
import { useCountdown } from '@/components/gamecenter/useCountdown'
import type { RoomAck } from '@/components/gamecenter/useRoom'
import { LIAR_DESCRIPTION_MAX } from './rules'

const BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-panel)] px-3 py-1.5 text-sm text-[color:var(--wiki-ink-soft)] hover:bg-[color:var(--wiki-bg-2)] disabled:cursor-not-allowed disabled:opacity-50'
const PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-[color:var(--wiki-accent)] px-4 py-2 text-sm font-medium text-[#fff] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'

/** 서버가 보내 주는 라이어 게임 화면 상태 (src/games/liar/rules.ts 의 view) */
export interface LiarViewState {
  players: Array<{ userId: string; name: string }>
  active: string[]
  phase: 'describe' | 'vote' | 'guess' | 'done'
  deadline: number
  category: string
  word: string | null
  iAmLiar: boolean
  rounds: number
  speaker: string | null
  descriptions: Array<{ userId: string; text: string; round: number }>
  voted: string[]
  myVote: string | null
  votes: Record<string, string> | null
  accused: string | null
  choices: string[] | null
  liar: string | null
  liarGuess: string | null
  winner: 'liar' | 'citizens' | null
  endReason: string | null
}

const END_TEXT: Record<string, string> = {
  caught: '라이어가 지목됐고 제시어를 맞히지 못했습니다',
  guessed: '라이어가 지목됐지만 제시어를 맞혔습니다',
  escaped: '엉뚱한 사람이 지목됐습니다',
  tie: '표가 갈려 아무도 지목되지 않았습니다',
  liar_left: '라이어가 자리를 떠났습니다',
  aborted: '사람이 모자라 승부 없이 끝났습니다',
}

export function LiarPanel({
  state,
  userId,
  clockOffset,
  act,
}: {
  state: LiarViewState
  userId: string | null
  clockOffset: number
  act: (event: string, payload?: unknown) => Promise<RoomAck>
}) {
  const [text, setText] = useState('')
  const seconds = useCountdown(state.deadline, clockOffset, state.phase !== 'done')
  const nameOf = (id: string | null) => state.players.find((player) => player.userId === id)?.name ?? '나간 사람'
  const myTurn = state.phase === 'describe' && state.speaker === userId
  const inGame = Boolean(userId && state.active.includes(userId))

  const describe = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return
    const result = await act('room:action', { type: 'describe', text })
    if (result.ok) setText('')
  }

  return (
    <div className="wiki-panel space-y-4">
      <div className="rounded-md border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg)] px-4 py-3 text-center">
        <p className="text-xs text-[color:var(--wiki-ink-muted)]">분류 · {state.category}</p>
        {state.phase === 'done' ? (
          <p className="mt-1 text-xl font-bold text-[color:var(--wiki-ink)]">제시어는 “{state.word}”</p>
        ) : state.iAmLiar ? (
          <p className="mt-1 text-xl font-bold text-[color:var(--wiki-danger)]">당신은 라이어입니다</p>
        ) : (
          <p className="mt-1 text-xl font-bold text-[color:var(--wiki-ink)]">제시어 “{state.word}”</p>
        )}
        {state.phase !== 'done' && (
          <p className="mt-1 text-xs text-[color:var(--wiki-ink-muted)]">
            {state.iAmLiar ? '제시어를 모릅니다. 들키지 않게 아는 척 설명하세요.' : '라이어가 눈치채지 못하게, 하지만 시민끼리는 통하게 설명하세요.'}
          </p>
        )}
      </div>

      <p role="status" className="text-center text-base font-semibold text-[color:var(--wiki-ink)]">
        {state.phase === 'describe' && (
          <>
            {myTurn ? '내가 설명할 차례입니다' : `${nameOf(state.speaker)} 님이 설명하는 중`}{' '}
            <span className="tabular-nums text-[color:var(--wiki-ink-muted)]">{seconds}초</span>
          </>
        )}
        {state.phase === 'vote' && (
          <>
            라이어라고 생각하는 사람에게 투표하세요 <span className="tabular-nums text-[color:var(--wiki-ink-muted)]">{seconds}초</span>
          </>
        )}
        {state.phase === 'guess' && (
          <>
            {nameOf(state.accused)} 님이 지목됐습니다 — 라이어가 제시어를 고르는 중{' '}
            <span className="tabular-nums text-[color:var(--wiki-ink-muted)]">{seconds}초</span>
          </>
        )}
        {state.phase === 'done' &&
          (state.winner === null
            ? END_TEXT.aborted
            : `${state.winner === 'liar' ? '라이어 승리' : '시민 승리'} — 라이어는 ${nameOf(state.liar)} 님. ${END_TEXT[state.endReason || ''] || ''}`)}
      </p>

      <ol className="space-y-1.5">
        {state.descriptions.length === 0 && <li className="text-sm text-[color:var(--wiki-ink-muted)]">아직 설명이 없습니다.</li>}
        {state.descriptions.map((entry, index) => (
          <li key={index} className="flex gap-2 text-sm">
            <span className={`shrink-0 font-medium ${entry.userId === userId ? 'text-[color:var(--wiki-accent)]' : 'text-[color:var(--wiki-ink)]'}`}>
              {nameOf(entry.userId)}
            </span>
            <span className="break-words text-[color:var(--wiki-ink-soft)]">{entry.text}</span>
          </li>
        ))}
      </ol>

      {myTurn && (
        <form onSubmit={describe} className="flex gap-2">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={LIAR_DESCRIPTION_MAX}
            placeholder={`한 줄 설명 (${LIAR_DESCRIPTION_MAX}자)`}
            aria-label="설명"
            autoFocus
            className="min-w-0 flex-1 rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-field)] px-2.5 py-2 text-sm text-[color:var(--wiki-ink)] focus:border-[color:var(--wiki-accent)] focus:outline-none"
          />
          <button type="submit" className={PRIMARY} disabled={!text.trim()}>
            말하기
          </button>
        </form>
      )}

      {state.phase === 'vote' && (
        <div>
          <div className="grid gap-2 sm:grid-cols-2">
            {state.players
              .filter((player) => state.active.includes(player.userId) && player.userId !== userId)
              .map((player) => (
                <button
                  key={player.userId}
                  type="button"
                  disabled={!inGame}
                  aria-pressed={state.myVote === player.userId}
                  onClick={() => act('room:action', { type: 'vote', target: player.userId })}
                  className={state.myVote === player.userId ? PRIMARY : BUTTON}
                >
                  {player.name}
                </button>
              ))}
          </div>
          <p className="mt-2 text-center text-xs text-[color:var(--wiki-ink-muted)]">
            {state.voted.length}/{state.active.length}명 투표함 {state.myVote && '· 마감 전까지 바꿀 수 있습니다'}
          </p>
        </div>
      )}

      {state.phase === 'guess' && state.choices && (
        <div>
          <p className="mb-2 text-center text-sm text-[color:var(--wiki-ink-soft)]">들켰습니다! 제시어를 맞히면 역전합니다.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {state.choices.map((word) => (
              <button key={word} type="button" className={BUTTON} onClick={() => act('room:action', { type: 'guess', word })}>
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.phase === 'done' && state.votes && (
        <div className="text-sm text-[color:var(--wiki-ink-soft)]">
          <h3 className="mb-1 font-semibold text-[color:var(--wiki-ink)]">투표 결과</h3>
          <ul className="grid gap-1 sm:grid-cols-2">
            {state.players.map((player) => (
              <li key={player.userId}>
                {player.name} → {state.votes![player.userId] ? nameOf(state.votes![player.userId]) : '기권'}
              </li>
            ))}
          </ul>
          {state.liarGuess && <p className="mt-2">라이어가 고른 낱말: “{state.liarGuess}”</p>}
        </div>
      )}
    </div>
  )
}
