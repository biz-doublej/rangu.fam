'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Link2, Plus, RotateCcw, Shuffle, X } from 'lucide-react'
import {
  LADDER_MAX,
  LADDER_MIN,
  LADDER_NAME_MAX,
  encodeLadderQuery,
  generateLadder,
  parseLadderQuery,
  traceLadder,
  validateLadderSetup,
  type LadderSetup,
} from './ladder'

const RANGU_FAM = ['강한울', '정재원', '정민석', '이승찬', '정진규']
const COLORS = ['#c2410c', '#1d4ed8', '#15803d', '#a21caf', '#0f766e', '#7c2d12', '#be123c', '#4d7c0f', '#6d28d9', '#334155']
const COL = 84
const ROW = 26
const PAD_Y = 10
const INPUT_CLASS =
  'w-full rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-field)] px-2.5 py-1.5 text-sm text-[color:var(--wiki-ink)] placeholder:text-[color:var(--wiki-ink-faint)] focus:border-[color:var(--wiki-accent)] focus:outline-none'
const BUTTON_CLASS =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-panel)] px-3 py-1.5 text-sm text-[color:var(--wiki-ink-soft)] hover:bg-[color:var(--wiki-bg-2)] disabled:cursor-not-allowed disabled:opacity-50'
const PRIMARY_CLASS =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-[color:var(--wiki-accent)] px-3 py-1.5 text-sm font-medium text-[#fff] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'

function newSeed(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0]
  return Math.floor(Math.random() * 0xffffffff)
}

/** 사다리 타기: 참가자·결과 입력 → 사다리 → 공유 링크. 상태는 주소의 쿼리스트링에 있다. */
export function LadderGame() {
  const router = useRouter()
  const pathname = usePathname() || '/wiki/game/ladder'
  const searchParams = useSearchParams()
  const setup = useMemo(() => parseLadderQuery(new URLSearchParams(searchParams?.toString() ?? '')), [searchParams])

  const go = (next: LadderSetup | null) => router.replace(next ? `${pathname}?${encodeLadderQuery(next)}` : pathname, { scroll: false })

  return setup ? (
    <LadderBoard
      key={encodeLadderQuery(setup)}
      setup={setup}
      onReshuffle={() => go({ ...setup, seed: newSeed() })}
      onReset={() => go(null)}
    />
  ) : (
    <LadderForm onCreate={(participants, results) => go({ participants, results, seed: newSeed() })} />
  )
}

function LadderForm({ onCreate }: { onCreate: (participants: string[], results: string[]) => void }) {
  const [rows, setRows] = useState<Array<{ name: string; result: string }>>(
    Array.from({ length: 4 }, () => ({ name: '', result: '' }))
  )
  const [error, setError] = useState<string | null>(null)

  const update = (index: number, patch: Partial<{ name: string; result: string }>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const checked = validateLadderSetup(
      rows.map((row) => row.name),
      rows.map((row) => row.result)
    )
    if (!checked.ok) {
      setError(checked.error)
      return
    }
    onCreate(checked.participants, checked.results)
  }

  return (
    <form onSubmit={submit} className="wiki-panel mx-auto max-w-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[color:var(--wiki-ink)]">참가자와 결과</h2>
        <button
          type="button"
          className={BUTTON_CLASS}
          onClick={() => setRows(RANGU_FAM.map((name, i) => ({ name, result: rows[i]?.result ?? '' })))}
        >
          랑구팸 5명 넣기
        </button>
      </div>
      <p className="mt-1 text-sm text-[color:var(--wiki-ink-muted)]">
        {LADDER_MIN}~{LADDER_MAX}명. 결과는 참가자 수만큼 적습니다 (예: 꽝, 통과, 커피 쏘기). 누가 어떤 결과에 닿을지는 사다리가 정합니다.
      </p>

      <ol className="mt-4 space-y-2">
        {rows.map((row, index) => (
          <li key={index} className="grid grid-cols-[1.25rem_1fr_1fr_auto] items-center gap-2">
            <span className="text-right text-xs tabular-nums text-[color:var(--wiki-ink-muted)]">{index + 1}</span>
            <input
              className={INPUT_CLASS}
              value={row.name}
              maxLength={LADDER_NAME_MAX}
              placeholder="참가자"
              aria-label={`참가자 ${index + 1}`}
              onChange={(event) => update(index, { name: event.target.value })}
            />
            <input
              className={INPUT_CLASS}
              value={row.result}
              maxLength={LADDER_NAME_MAX}
              placeholder="결과"
              aria-label={`결과 ${index + 1}`}
              onChange={(event) => update(index, { result: event.target.value })}
            />
            <button
              type="button"
              className={`${BUTTON_CLASS} px-2`}
              aria-label={`${index + 1}번 줄 지우기`}
              disabled={rows.length <= LADDER_MIN}
              onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ol>

      {error && (
        <p role="alert" className="wiki-mbox wiki-mbox--danger mt-3">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <button
          type="button"
          className={BUTTON_CLASS}
          disabled={rows.length >= LADDER_MAX}
          onClick={() => setRows((prev) => [...prev, { name: '', result: '' }])}
        >
          <Plus className="h-4 w-4" aria-hidden />
          한 명 추가
        </button>
        <button type="submit" className={PRIMARY_CLASS}>
          사다리 만들기
        </button>
      </div>
    </form>
  )
}

function LadderBoard({ setup, onReshuffle, onReset }: { setup: LadderSetup; onReshuffle: () => void; onReset: () => void }) {
  const columns = setup.participants.length
  const ladder = useMemo(() => generateLadder(setup.seed, columns), [setup.seed, columns])
  const paths = useMemo(() => setup.participants.map((_, start) => traceLadder(ladder, start)), [ladder, setup.participants])
  const rowCount = ladder.rungs.length

  /** 길이 그려진 참가자 */
  const [shown, setShown] = useState<number[]>([])
  /** 도착해서 결과가 공개된 참가자 */
  const [revealed, setRevealed] = useState<number[]>([])
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  const width = columns * COL
  const height = (rowCount + 1) * ROW + PAD_Y * 2
  const px = (x: number) => x * COL + COL / 2
  const py = (y: number) => y * ROW + PAD_Y
  const durationOf = (start: number) => Math.min(4, 0.9 + paths[start].points.length * 0.12)

  const run = (start: number) => {
    if (shown.includes(start)) return
    setShown((prev) => [...prev, start])
    if (reducedMotion) setRevealed((prev) => [...prev, start])
  }
  const revealAll = () => {
    const all = setup.participants.map((_, i) => i)
    setShown(all)
    setRevealed(all)
  }

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?${encodeLadderQuery(setup)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied('ok')
    } catch {
      setCopied('fail')
    }
  }

  const resultOwner = (column: number) => revealed.find((start) => paths[start].end === column)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={PRIMARY_CLASS} onClick={revealAll} disabled={revealed.length === columns}>
          전체 결과 보기
        </button>
        <button type="button" className={BUTTON_CLASS} onClick={share}>
          <Link2 className="h-4 w-4" aria-hidden />
          결과 링크 복사
        </button>
        <button type="button" className={BUTTON_CLASS} onClick={onReshuffle}>
          <Shuffle className="h-4 w-4" aria-hidden />
          다시 섞기
        </button>
        <button type="button" className={BUTTON_CLASS} onClick={onReset}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          처음부터
        </button>
        <span role="status" className="text-sm text-[color:var(--wiki-ink-muted)]">
          {copied === 'ok' && '링크를 복사했습니다. 이 링크를 연 사람도 같은 사다리를 봅니다.'}
          {copied === 'fail' && '복사하지 못했습니다. 주소창의 주소를 그대로 공유해 주세요.'}
        </span>
      </div>

      <p className="text-sm text-[color:var(--wiki-ink-muted)]">이름을 누르면 그 사람의 사다리를 탑니다.</p>

      <div className="wiki-panel overflow-x-auto">
        <div className="mx-auto" style={{ width }}>
          <div className="flex">
            {setup.participants.map((name, start) => (
              <div key={start} className="flex justify-center px-1" style={{ width: COL }}>
                <button
                  type="button"
                  onClick={() => run(start)}
                  aria-pressed={shown.includes(start)}
                  className="w-full truncate rounded-md border-2 px-1 py-1.5 text-sm font-semibold"
                  style={{
                    borderColor: COLORS[start],
                    color: shown.includes(start) ? '#fff' : COLORS[start],
                    background: shown.includes(start) ? COLORS[start] : 'transparent',
                  }}
                  title={name}
                >
                  {name}
                </button>
              </div>
            ))}
          </div>

          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="사다리" className="block">
            <g stroke="var(--wiki-rule-strong)" strokeWidth={3} strokeLinecap="round">
              {setup.participants.map((_, column) => (
                <line key={column} x1={px(column)} y1={py(0)} x2={px(column)} y2={py(rowCount + 1)} />
              ))}
              {ladder.rungs.map((line, row) =>
                line.map((on, gap) => on && <line key={`${row}-${gap}`} x1={px(gap)} y1={py(row + 1)} x2={px(gap + 1)} y2={py(row + 1)} />)
              )}
            </g>
            {shown.map((start) => (
              <polyline
                key={start}
                points={paths[start].points.map((point) => `${px(point.x)},${py(point.y)}`).join(' ')}
                fill="none"
                stroke={COLORS[start]}
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                style={
                  reducedMotion || revealed.includes(start)
                    ? undefined
                    : { animation: `gc-ladder-run ${durationOf(start)}s linear forwards` }
                }
                onAnimationEnd={() => setRevealed((prev) => (prev.includes(start) ? prev : [...prev, start]))}
              />
            ))}
          </svg>

          <div className="flex">
            {setup.results.map((result, column) => {
              const owner = resultOwner(column)
              return (
                <div key={column} className="px-1" style={{ width: COL }}>
                  <div
                    className="truncate rounded-md border px-1 py-1.5 text-center text-sm"
                    style={
                      owner === undefined
                        ? { borderColor: 'var(--wiki-rule-strong)', color: 'var(--wiki-ink-muted)' }
                        : { borderColor: COLORS[owner], color: COLORS[owner], fontWeight: 700 }
                    }
                    title={owner === undefined ? undefined : result}
                  >
                    {owner === undefined ? '?' : result}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <section className="wiki-panel" aria-live="polite" aria-labelledby="gc-ladder-result">
        <h2 id="gc-ladder-result" className="text-base font-semibold text-[color:var(--wiki-ink)]">
          결과
        </h2>
        {revealed.length === 0 ? (
          <p className="mt-1 text-sm text-[color:var(--wiki-ink-muted)]">아직 아무도 사다리를 타지 않았습니다.</p>
        ) : (
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {setup.participants.map(
              (name, start) =>
                revealed.includes(start) && (
                  <li key={start} className="flex items-center gap-2 text-sm text-[color:var(--wiki-ink)]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[start] }} aria-hidden />
                    <span className="font-medium">{name}</span>
                    <span className="text-[color:var(--wiki-ink-muted)]">→</span>
                    <span>{setup.results[paths[start].end]}</span>
                  </li>
                )
            )}
          </ul>
        )}
      </section>

      <style>{`@keyframes gc-ladder-run { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }`}</style>
    </div>
  )
}
