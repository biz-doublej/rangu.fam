'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { GamecenterFrame } from '@/components/gamecenter/GamecenterFrame'
import { gcFetch, useGamecenterMe } from '@/components/gamecenter/useGamecenterMe'
import { QUIZ_MIN_ANSWERS, QUIZ_PROMPTS, quizAnswerLabel } from '@/games/quiz/prompts'

const BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-panel)] px-3 py-2 text-sm text-[color:var(--wiki-ink)] hover:bg-[color:var(--wiki-bg-2)] disabled:cursor-not-allowed disabled:opacity-50'
const PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-[color:var(--wiki-accent)] px-4 py-2 text-sm font-medium text-[#fff] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
const TYPE_LABEL = { choice: '4지선다', ox: 'OX', number: '숫자' } as const

/** 내 답 채우기 — 카드를 넘기며 답한다. 여기 적은 답이 퀴즈 배틀의 문제가 된다. */
export default function GamecenterQuizAnswersPage() {
  const { me, error, loading } = useGamecenterMe()
  const [answers, setAnswers] = useState<Record<string, number> | null>(null)
  const [index, setIndex] = useState(0)
  const [numberText, setNumberText] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    gcFetch<{ answers: Record<string, number> }>('/api/gamecenter/quiz/answers')
      .then((data) => {
        if (cancelled) return
        setAnswers(data.answers)
        // 아직 답하지 않은 첫 질문부터
        const first = QUIZ_PROMPTS.findIndex((prompt) => data.answers[prompt.id] === undefined)
        setIndex(first === -1 ? 0 : first)
      })
      .catch((err) => !cancelled && (err as { status?: number }).status !== 401 && setNotice((err as Error).message))
    return () => {
      cancelled = true
    }
  }, [])

  const prompt = QUIZ_PROMPTS[index]
  const current = answers?.[prompt.id]
  const done = useMemo(() => (answers ? QUIZ_PROMPTS.filter((entry) => answers[entry.id] !== undefined).length : 0), [answers])

  useEffect(() => {
    setNumberText(prompt.type === 'number' && current !== undefined ? String(current) : '')
    setNotice(null)
  }, [index, prompt.type, current])

  const move = useCallback((delta: number) => setIndex((value) => (value + delta + QUIZ_PROMPTS.length) % QUIZ_PROMPTS.length), [])

  const save = async (answer: number | null, advance = true) => {
    setSaving(true)
    setNotice(null)
    try {
      await gcFetch('/api/gamecenter/quiz/answers', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ promptId: prompt.id, answer }),
      })
      setAnswers((prev) => {
        const next = { ...(prev ?? {}) }
        if (answer === null) delete next[prompt.id]
        else next[prompt.id] = answer
        return next
      })
      if (advance && answer !== null) move(1)
    } catch (err) {
      setNotice((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <GamecenterFrame
      active="lobby"
      subtitle="내 답 채우기 — 여기 적은 답이 퀴즈 배틀에서 “○○의 답은?” 문제가 됩니다."
      me={me}
      loading={loading}
      error={error}
    >
      {me && (
        <div className="mx-auto max-w-xl space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-[color:var(--wiki-ink)]">
                {done}/{QUIZ_PROMPTS.length}개 답함
              </span>
              <span className={done >= QUIZ_MIN_ANSWERS ? 'text-[color:var(--wiki-success)]' : 'text-[color:var(--wiki-ink-muted)]'}>
                {done >= QUIZ_MIN_ANSWERS ? '퀴즈 배틀에 참가할 수 있습니다' : `${QUIZ_MIN_ANSWERS}개 이상 답하면 참가할 수 있습니다`}
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--wiki-bg-2)]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={QUIZ_PROMPTS.length}
              aria-valuenow={done}
              aria-label="답한 질문 수"
            >
              <div className="h-full rounded-full bg-[color:var(--wiki-accent)]" style={{ width: `${(done / QUIZ_PROMPTS.length) * 100}%` }} />
            </div>
          </div>

          {!answers ? (
            <p className="py-10 text-center text-sm text-[color:var(--wiki-ink-muted)]">{notice || '불러오는 중입니다.'}</p>
          ) : (
            <section className="wiki-panel" aria-live="polite">
              <div className="flex items-center justify-between text-xs text-[color:var(--wiki-ink-muted)]">
                <span>
                  {index + 1} / {QUIZ_PROMPTS.length} · {TYPE_LABEL[prompt.type]}
                </span>
                {current !== undefined && <span className="text-[color:var(--wiki-success)]">내 답: {quizAnswerLabel(prompt, current)}</span>}
              </div>
              <h2 className="mt-2 min-h-[3.5rem] text-xl font-semibold leading-snug text-[color:var(--wiki-ink)]">{prompt.text}</h2>

              <div className="mt-4">
                {prompt.type === 'choice' && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {prompt.options.map((option, value) => (
                      <button
                        key={value}
                        type="button"
                        className={`${current === value ? PRIMARY : BUTTON} justify-start text-left`}
                        aria-pressed={current === value}
                        disabled={saving}
                        onClick={() => save(value)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
                {prompt.type === 'ox' && (
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 0].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`${current === value ? PRIMARY : BUTTON} py-5 text-2xl font-bold`}
                        aria-pressed={current === value}
                        aria-label={value === 1 ? 'O, 그렇다' : 'X, 아니다'}
                        disabled={saving}
                        onClick={() => save(value)}
                      >
                        {value === 1 ? 'O' : 'X'}
                      </button>
                    ))}
                  </div>
                )}
                {prompt.type === 'number' && (
                  <form
                    className="flex flex-wrap items-center gap-2"
                    onSubmit={(event) => {
                      event.preventDefault()
                      if (numberText !== '') save(Number(numberText))
                    }}
                  >
                    <input
                      type="number"
                      inputMode="numeric"
                      min={prompt.min}
                      max={prompt.max}
                      step={1}
                      value={numberText}
                      onChange={(event) => setNumberText(event.target.value)}
                      aria-label="숫자 답"
                      className="w-28 rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-field)] px-2.5 py-2 text-center text-base text-[color:var(--wiki-ink)] focus:border-[color:var(--wiki-accent)] focus:outline-none"
                    />
                    <span className="text-sm text-[color:var(--wiki-ink-soft)]">
                      {prompt.unit} ({prompt.min}~{prompt.max})
                    </span>
                    <button type="submit" className={PRIMARY} disabled={saving || numberText === ''}>
                      저장
                    </button>
                  </form>
                )}
              </div>

              {notice && (
                <p role="alert" className="wiki-mbox wiki-mbox--danger mt-3">
                  {notice}
                </p>
              )}

              <div className="mt-5 flex items-center justify-between gap-2">
                <button type="button" className={BUTTON} onClick={() => move(-1)} aria-label="이전 질문">
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  이전
                </button>
                {current !== undefined && (
                  <button type="button" className="text-xs text-[color:var(--wiki-ink-muted)] underline" disabled={saving} onClick={() => save(null, false)}>
                    이 답 지우기
                  </button>
                )}
                <button type="button" className={BUTTON} onClick={() => move(1)} aria-label="다음 질문">
                  {current === undefined ? '건너뛰기' : '다음'}
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </section>
          )}

          <p className="text-center text-sm text-[color:var(--wiki-ink-muted)]">
            답은 같은 방에서 퀴즈를 하는 사람들에게 문제로 공개됩니다.{' '}
            <Link href="/wiki/game#rooms" className="text-[color:var(--wiki-link)] hover:underline">
              로비에서 퀴즈 방 만들기
            </Link>
          </p>
        </div>
      )}
    </GamecenterFrame>
  )
}
