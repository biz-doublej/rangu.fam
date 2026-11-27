'use client'

import React, { useEffect, useState } from 'react'
import { useCountdown } from '@/components/gamecenter/useCountdown'
import type { RoomAck } from '@/components/gamecenter/useRoom'
import type { QuizView } from './rules'

const BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-panel)] px-3 py-2 text-sm text-[color:var(--wiki-ink)] hover:bg-[color:var(--wiki-bg-2)] disabled:cursor-not-allowed disabled:opacity-60'
const PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-[color:var(--wiki-accent)] px-4 py-2 text-sm font-medium text-[#fff] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
const KIND_LABEL = { choice: '4지선다', ox: 'OX', number: '숫자 근접', who: '누가 그랬을까' } as const

export function QuizPanel({
  state,
  userId,
  clockOffset,
  act,
}: {
  state: QuizView
  userId: string | null
  clockOffset: number
  act: (event: string, payload?: unknown) => Promise<RoomAck>
}) {
  const seconds = useCountdown(state.deadline, clockOffset, state.phase === 'question' || state.phase === 'penalty')
  const [numberText, setNumberText] = useState('')
  const nameOf = (id: string | null) => state.players.find((player) => player.userId === id)?.name ?? '나간 사람'
  const question = state.question
  const isSubject = Boolean(question && question.subject === userId)
  const inGame = Boolean(userId && state.active.includes(userId))
  const solverCount = question ? state.active.filter((id) => id !== question.subject).length : 0

  // 문제가 바뀌면 숫자 입력을 비운다
  useEffect(() => {
    setNumberText('')
  }, [state.index])

  const optionLabel = (value: number) => (question?.kind === 'number' ? `${value}${question.unit ?? ''}` : question?.options?.[value] ?? '?')
  const board = [...state.players].sort((a, b) => (state.scores[b.userId] ?? 0) - (state.scores[a.userId] ?? 0))

  return (
    <div className="wiki-panel space-y-4">
      {question && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--wiki-ink-muted)]">
            <span>
              문제 {state.index + 1}/{state.total} · {KIND_LABEL[question.kind]} · 주인공 {nameOf(question.subject)}
            </span>
            {state.phase === 'question' && (
              <span className={`text-sm font-semibold tabular-nums ${seconds <= 5 ? 'text-[color:var(--wiki-danger)]' : 'text-[color:var(--wiki-ink)]'}`}>{seconds}초</span>
            )}
          </div>
          <p className="text-lg font-semibold leading-snug text-[color:var(--wiki-ink)]">{question.text}</p>
        </>
      )}

      {state.phase === 'question' && question && (
        <>
          {isSubject ? (
            <div>
              <p className="mb-2 text-sm text-[color:var(--wiki-ink-soft)]">내 문제입니다. 풀지 않고, 몇 명이 맞힐지 예측하세요.</p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: solverCount + 1 }, (_, count) => (
                  <button
                    key={count}
                    type="button"
                    className={state.myPrediction === count ? PRIMARY : BUTTON}
                    disabled={state.myPrediction !== null}
                    aria-pressed={state.myPrediction === count}
                    onClick={() => act('room:action', { type: 'predict', value: count })}
                  >
                    {count}명
                  </button>
                ))}
              </div>
            </div>
          ) : !inGame ? (
            <p className="text-sm text-[color:var(--wiki-ink-muted)]">이번 판은 구경만 할 수 있습니다.</p>
          ) : question.kind === 'number' ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                if (numberText !== '') act('room:action', { type: 'answer', value: Number(numberText) })
              }}
            >
              <input
                type="number"
                inputMode="numeric"
                min={question.min ?? undefined}
                max={question.max ?? undefined}
                step={1}
                value={state.myAnswer !== null ? String(state.myAnswer) : numberText}
                disabled={state.myAnswer !== null}
                onChange={(event) => setNumberText(event.target.value)}
                aria-label="숫자 답"
                autoFocus
                className="w-28 rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-field)] px-2.5 py-2 text-center text-base text-[color:var(--wiki-ink)] focus:border-[color:var(--wiki-accent)] focus:outline-none"
              />
              <span className="text-sm text-[color:var(--wiki-ink-soft)]">
                {question.unit} ({question.min}~{question.max})
              </span>
              <button type="submit" className={PRIMARY} disabled={state.myAnswer !== null || numberText === ''}>
                내기
              </button>
            </form>
          ) : (
            <div className={`grid gap-2 ${question.kind === 'ox' ? 'grid-cols-2' : 'sm:grid-cols-2'}`}>
              {question.options!.map((option, value) => (
                <button
                  key={value}
                  type="button"
                  className={`${state.myAnswer === value ? PRIMARY : BUTTON} ${question.kind === 'ox' ? 'py-5 text-2xl font-bold' : 'justify-start text-left'}`}
                  disabled={state.myAnswer !== null}
                  aria-pressed={state.myAnswer === value}
                  onClick={() => act('room:action', { type: 'answer', value })}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-[color:var(--wiki-ink-muted)]">
            {state.answered.length}/{solverCount}명이 답을 냈습니다{state.predicted ? ' · 주인공 예측 완료' : ''}. 빨리 낼수록 점수가 높습니다.
          </p>
        </>
      )}

      {state.phase === 'reveal' && state.reveal && question && (
        <div className="space-y-2">
          <p className="rounded-md bg-[color:var(--wiki-accent-soft)] px-3 py-2 text-center text-base font-bold text-[color:var(--wiki-ink)]">
            정답: {state.reveal.truthLabel}
          </p>
          <ul className="space-y-1 text-sm">
            {state.players
              .filter((player) => player.userId !== question.subject)
              .map((player) => {
                const entry = state.reveal!.answers[player.userId]
                return (
                  <li key={player.userId} className="flex justify-between gap-3">
                    <span className="text-[color:var(--wiki-ink)]">
                      {player.name} <span className="text-[color:var(--wiki-ink-muted)]">— {entry ? optionLabel(entry.value) : '답 없음'}</span>
                    </span>
                    <span className={`shrink-0 font-semibold tabular-nums ${entry?.correct ? 'text-[color:var(--wiki-success)]' : 'text-[color:var(--wiki-ink-faint)]'}`}>
                      {entry?.correct ? `+${entry.gained}` : '오답'}
                    </span>
                  </li>
                )
              })}
          </ul>
          <p className="text-sm text-[color:var(--wiki-ink-soft)]">
            {nameOf(question.subject)} 님의 예측: {state.reveal.prediction === null ? '없음' : `${state.reveal.prediction}명`} · 실제 {state.reveal.correctCount}명
            {state.reveal.predictionHit && <strong className="text-[color:var(--wiki-success)]"> 적중!</strong>}
          </p>
        </div>
      )}

      {(state.phase === 'penalty' || state.phase === 'done') && (
        <div className="space-y-3 text-center">
          <p className="text-base font-semibold text-[color:var(--wiki-ink)]">
            {!state.completed ? '사람이 모자라 승부 없이 끝났습니다.' : '퀴즈가 끝났습니다!'}
          </p>
          {state.completed && state.loser && (
            <div className="rounded-md border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg)] px-4 py-3">
              <p className="text-xs text-[color:var(--wiki-ink-muted)]">벌칙 룰렛 — {nameOf(state.loser)} 님</p>
              {state.passUsedBy ? (
                <p className="mt-1 text-lg font-bold text-[color:var(--wiki-success)]">면제권을 써서 벌칙을 건너뛰었습니다</p>
              ) : (
                <p className="mt-1 text-lg font-bold text-[color:var(--wiki-ink)]">{state.penalty}</p>
              )}
              {state.phase === 'penalty' &&
                (state.loser === userId ? (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <button type="button" className={PRIMARY} onClick={() => act('room:action', { type: 'acceptPenalty' })}>
                      벌칙 받기
                    </button>
                    <button type="button" className={BUTTON} disabled={state.myPasses <= 0} onClick={() => act('room:action', { type: 'usePass' })}>
                      면제권 쓰기 ({state.myPasses}장)
                    </button>
                    <span className="w-full text-xs tabular-nums text-[color:var(--wiki-ink-muted)]">{seconds}초 안에 고르지 않으면 벌칙을 받습니다</span>
                  </div>
                ) : (
                  <p className="mt-2 text-xs tabular-nums text-[color:var(--wiki-ink-muted)]">고르는 중… {seconds}초</p>
                ))}
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="mb-1 text-sm font-semibold text-[color:var(--wiki-ink)]">점수</h3>
        <ol className="space-y-1 text-sm">
          {board.map((player) => (
            <li key={player.userId} className="flex justify-between gap-3">
              <span className={player.userId === userId ? 'font-semibold text-[color:var(--wiki-accent)]' : 'text-[color:var(--wiki-ink)]'}>
                {state.ranks[player.userId]}. {player.name}
                {(state.streak[player.userId] ?? 0) >= 2 && <span className="ml-1 text-xs text-[color:var(--wiki-warning)]">{state.streak[player.userId]}연속</span>}
                {!state.active.includes(player.userId) && <span className="ml-1 text-xs text-[color:var(--wiki-ink-muted)]">나감</span>}
              </span>
              <span className="shrink-0 tabular-nums text-[color:var(--wiki-ink-soft)]">{(state.scores[player.userId] ?? 0).toLocaleString('ko-KR')}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
