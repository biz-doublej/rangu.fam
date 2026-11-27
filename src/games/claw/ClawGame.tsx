'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { gcFetch, gcPost } from '@/components/gamecenter/useGamecenterMe'
import { isClawWin, type ClawOutcome } from './draw'
import styles from './claw.module.css'
import { CLAW_CANVAS, createClawMachine, type ClawMachine, type ClawMachineState } from './machine'
import { PLUSHES, findPlush, type PlushType } from './plushes'
import { PlushIcon } from './PlushIcon'

interface ClawState {
  balance: number
  tickets: number
  cost: number
  dex: Array<{ key: string; count: number }>
  misses: number
  winChance: number
  odds: { baseWin: number; pityStep: number; maxWin: number; gold: number }
  rewards: { newPlush: number; goldenRangu: number }
  pending: { playId: string; outcome: ClawOutcome } | null
}

interface Settlement {
  alreadySettled: boolean
  won: boolean
  plush: string
  firstOfKind: boolean
  awarded: number
  clipped: number
}

const percent = (value: number) => `${Math.round(value * 100)}%`

/**
 * 인형뽑기 화면.
 * 시작을 누르면 서버가 차감·추첨하고(/claw/play), 기계는 그 결과대로 연출한 뒤 정산한다(/claw/[playId]/settle).
 * 연출 도중 새로고침해도 정산하지 않은 판을 서버가 기억하고 있어 다시 이어서 진행한다.
 */
export function ClawGame({ onWalletChange }: { onWalletChange?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const machineRef = useRef<ClawMachine | null>(null)
  const playIdRef = useRef<string | null>(null)
  const resumedRef = useRef(false)
  const finishRef = useRef<(outcome: ClawOutcome) => void>(() => {})

  const [info, setInfo] = useState<ClawState | null>(null)
  const [machineState, setMachineState] = useState<ClawMachineState>('idle')
  const [status, setStatus] = useState('불러오는 중입니다.')
  const [timer, setTimer] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [unsettled, setUnsettled] = useState(false)
  const [muted, setMuted] = useState(false)
  const [heldDir, setHeldDir] = useState<-1 | 0 | 1>(0)
  const [toast, setToast] = useState<{ type: PlushType; bonus: string | null } | null>(null)
  const [toastShown, setToastShown] = useState(false)

  const loadInfo = useCallback(async () => {
    const data = await gcFetch<ClawState>('/api/gamecenter/claw')
    setInfo(data)
    return data
  }, [])

  const settle = useCallback(async () => {
    const playId = playIdRef.current
    if (!playId) return
    setBusy(true)
    try {
      const result = await gcPost<Settlement>(`/api/gamecenter/claw/${playId}/settle`)
      playIdRef.current = null
      setUnsettled(false)
      const type = findPlush(result.plush)
      if (result.won && type) {
        const bonus = result.awarded > 0 ? `+${result.awarded}P${result.firstOfKind ? ' · 도감 첫 등록' : ''}` : result.clipped > 0 ? '오늘 게임 보상 상한 도달' : null
        setToast({ type, bonus })
        setToastShown(true)
        setStatus(`${type.name} 획득!${result.awarded > 0 ? ` +${result.awarded}P` : ''}`)
      } else {
        setStatus('다시 도전해 보세요. 놓칠수록 집게 힘이 세져요.')
      }
      await loadInfo()
      onWalletChange?.()
    } catch (error) {
      // 정산에 실패해도 판은 서버에 남아 있다 — 다시 시도하거나 새로고침하면 이어진다.
      setUnsettled(true)
      setStatus(`결과를 저장하지 못했습니다. ${(error as Error).message}`)
    } finally {
      setBusy(false)
    }
  }, [loadInfo, onWalletChange])

  finishRef.current = () => {
    settle()
  }

  // 기계는 화면에 있는 동안만 존재한다. 떠날 때 엔진을 정리한다.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const machine = createClawMachine(canvas, {
      onState: setMachineState,
      onStatus: setStatus,
      onTimer: setTimer,
      onFinish: (outcome) => finishRef.current(outcome),
    })
    machineRef.current = machine
    return () => {
      machine.destroy()
      machineRef.current = null
    }
  }, [])

  // 처음 들어왔을 때: 정산하지 않은 판이 있으면 이어서 진행한다.
  useEffect(() => {
    let cancelled = false
    loadInfo()
      .then((data) => {
        if (cancelled) return
        if (data.pending && !resumedRef.current) {
          resumedRef.current = true
          playIdRef.current = data.pending.playId
          machineRef.current?.begin(data.pending.outcome)
          setStatus('진행하던 판을 이어서 합니다. 위치를 잡고 뽑기를 누르세요.')
        } else {
          setStatus('시작 버튼을 눌러 주세요.')
        }
      })
      .catch((error) => {
        if (!cancelled && (error as { status?: number }).status !== 401) setStatus((error as Error).message)
      })
    return () => {
      cancelled = true
    }
  }, [loadInfo])

  useEffect(() => {
    machineRef.current?.setMuted(muted)
  }, [muted])

  useEffect(() => {
    if (!toastShown) return
    const timeout = window.setTimeout(() => setToastShown(false), 2600)
    return () => window.clearTimeout(timeout)
  }, [toastShown, toast])

  const start = useCallback(async () => {
    if (busy || machineRef.current?.getState() !== 'idle' || playIdRef.current) return
    setBusy(true)
    setToastShown(false)
    try {
      const play = await gcPost<{ playId: string; outcome: ClawOutcome; paidWith: 'points' | 'ticket'; resumed: boolean; balance: number; tickets: number }>(
        '/api/gamecenter/claw/play'
      )
      playIdRef.current = play.playId
      setInfo((prev) => (prev ? { ...prev, balance: play.balance, tickets: play.tickets } : prev))
      machineRef.current?.begin(play.outcome)
      onWalletChange?.()
    } catch (error) {
      setStatus((error as Error).message)
    } finally {
      setBusy(false)
    }
  }, [busy, onWalletChange])

  const move = useCallback((dir: -1 | 0 | 1) => {
    machineRef.current?.setDir(dir)
    setHeldDir(machineRef.current?.getState() === 'ready' ? dir : 0)
  }, [])

  const drop = useCallback(() => {
    machineRef.current?.drop()
    setHeldDir(0)
  }, [])

  // 키보드: ← → 이동, 스페이스 뽑기
  useEffect(() => {
    const typing = (target: EventTarget | null) =>
      target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    const down = (event: KeyboardEvent) => {
      if (typing(event.target) || machineRef.current?.getState() !== 'ready') return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        if (!event.repeat) move(-1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        if (!event.repeat) move(1)
      } else if (event.key === ' ' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault()
        if (!event.repeat) drop()
      }
    }
    const up = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') move(0)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [drop, move])

  const playing = machineState === 'ready'
  const idle = machineState === 'idle'
  const canAfford = Boolean(info && (info.tickets > 0 || info.balance >= info.cost))
  const startLabel = !info
    ? '불러오는 중'
    : unsettled
      ? '결과 다시 저장하기'
      : !idle
        ? '진행 중'
        : info.tickets > 0
          ? `시작 (무료권 1장 사용 · ${info.tickets}장 남음)`
          : canAfford
            ? `시작 (${info.cost}P)`
            : `포인트 부족 (${info.cost}P 필요)`

  const stick = (dir: -1 | 1, label: string, glyph: string) => (
    <button
      type="button"
      className={`${styles.stick} ${heldDir === dir ? styles.stickHeld : ''}`}
      aria-label={label}
      disabled={!playing}
      onPointerDown={(event) => {
        event.preventDefault()
        move(dir)
      }}
      onPointerUp={() => move(0)}
      onPointerLeave={() => heldDir === dir && move(0)}
      onPointerCancel={() => move(0)}
      onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && !event.repeat && move(dir)}
      onKeyUp={(event) => (event.key === 'Enter' || event.key === ' ') && move(0)}
    >
      {glyph}
    </button>
  )

  const total = info?.dex.reduce((sum, entry) => sum + entry.count, 0) ?? 0
  const kinds = info?.dex.filter((entry) => entry.count > 0).length ?? 0

  return (
    <div className={styles.stage}>
      <section className={styles.cabinet} aria-label="인형뽑기 기계">
        <button
          type="button"
          className={styles.mute}
          onClick={() => setMuted((value) => !value)}
          aria-pressed={muted}
          aria-label={muted ? '소리 켜기' : '소리 끄기'}
        >
          {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
        </button>

        <div className={styles.marquee}>
          <div className={styles.bulbs} aria-hidden>
            {Array.from({ length: 18 }, (_, i) => {
              const t = i / 18
              return (
                <i
                  key={i}
                  style={t < 0.5 ? { left: `${(t / 0.5) * 100}%`, top: 0 } : { left: `${(1 - (t - 0.5) / 0.5) * 100}%`, bottom: 0 }}
                />
              )
            })}
          </div>
          <p className={styles.marqueeTitle}>이랑게임센터</p>
          <p className={styles.marqueeSub}>랑구 인형뽑기</p>
        </div>

        <div className={styles.window}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            width={CLAW_CANVAS.width}
            height={CLAW_CANVAS.height}
            role="img"
            aria-label="인형뽑기 기계 내부"
          />
          <div className={`${styles.toast} ${toastShown ? styles.toastShow : ''}`} role="status">
            {toast && (
              <>
                <b>획득!</b>
                <PlushIcon type={toast.type} size={90} />
                <span className={styles.toastName}>
                  {toast.type.name}
                  {toast.type.rare ? ' (희귀!)' : ''}
                </span>
                {toast.bonus && <span className={styles.toastBonus}>{toast.bonus}</span>}
              </>
            )}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.readout}>
            <div className={styles.lcd}>
              <small>포인트</small>
              <b>{info ? info.balance.toLocaleString('ko-KR') : '--'}</b>
            </div>
            <div className={styles.lcd}>
              <small>무료권</small>
              <b>{info ? info.tickets : '--'}</b>
            </div>
            <div className={styles.lcd}>
              <small>남은 시간</small>
              <b>{timer ?? '--'}</b>
            </div>
          </div>
          <div className={styles.sticks}>
            {stick(-1, '왼쪽으로 이동', '◀')}
            {stick(1, '오른쪽으로 이동', '▶')}
          </div>
          <button type="button" className={styles.grab} aria-label="집게 내리기" disabled={!playing} onClick={drop}>
            뽑기
          </button>
          <div className={styles.status} aria-live="polite">
            {status}
          </div>
          <button
            type="button"
            className={styles.coin}
            disabled={!info || busy || !idle || (!unsettled && !canAfford)}
            onClick={unsettled ? settle : start}
          >
            {startLabel}
          </button>
        </div>
      </section>

      <aside className={styles.shelf} aria-label="인형 도감">
        <div className="wiki-panel">
          <h2 className="text-base font-semibold text-[color:var(--wiki-ink)]">인형 도감</h2>
          <p className="mt-1 text-sm text-[color:var(--wiki-ink-muted)]">
            {total ? `${total}개 뽑음 · 도감 ${kinds}/${PLUSHES.length}` : '아직 뽑은 인형이 없어요.'}
          </p>
          <ul className={`${styles.grid} mt-3`}>
            {PLUSHES.map((type) => {
              const count = info?.dex.find((entry) => entry.key === type.key)?.count ?? 0
              return (
                <li key={type.key} className={`${styles.slot} ${count ? styles.slotGot : ''}`}>
                  <PlushIcon type={type} size={56} />
                  <div className={styles.slotName}>{count ? type.name : '???'}</div>
                  <div className={styles.slotCount}>{count ? `× ${count}` : type.rare ? '희귀' : ''}</div>
                </li>
              )
            })}
          </ul>
        </div>

        {info && (
          <div className="wiki-panel mt-3 text-sm leading-relaxed text-[color:var(--wiki-ink-soft)]">
            <h2 className="text-base font-semibold text-[color:var(--wiki-ink)]">확률과 보상</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                잡히는지와 어떤 인형인지는 시작할 때 서버 추첨으로 정해집니다. 집게 위치는 결과에 영향을 주지 않습니다.
              </li>
              <li>
                성공 확률은 {percent(info.odds.baseWin)}에서 시작해, 연속으로 놓칠 때마다 {percent(info.odds.pityStep)}씩 올라갑니다 (최대{' '}
                {percent(info.odds.maxWin)}). 지금 <strong className="text-[color:var(--wiki-ink)]">{percent(info.winChance)}</strong>
                {info.misses > 0 ? ` (연속 ${info.misses}번 놓침)` : ''}
              </li>
              <li>황금 랑구가 걸릴 확률은 판마다 {percent(info.odds.gold)}입니다.</li>
              <li>
                도감에 처음 등록되는 인형 +{info.rewards.newPlush}P, 황금 랑구 +{info.rewards.goldenRangu}P. 한 판 {info.cost}P 또는 무료권 1장.
              </li>
            </ul>
            <p className="mt-2 text-xs text-[color:var(--wiki-ink-muted)]">키보드: ← → 이동, 스페이스 뽑기</p>
          </div>
        )}
      </aside>
    </div>
  )
}
