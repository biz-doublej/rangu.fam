'use client'

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Copy, Crown, Flag, LogOut, Send, WifiOff } from 'lucide-react'
import { GamecenterFrame } from '@/components/gamecenter/GamecenterFrame'
import { useGamecenterMe } from '@/components/gamecenter/useGamecenterMe'
import { useRoom, type RoomAck } from '@/components/gamecenter/useRoom'
import { LiarPanel, type LiarViewState } from '@/games/liar/LiarPanel'
import { OmokBoard, useTurnSeconds } from '@/games/omok/OmokBoard'
import type { OmokState } from '@/games/omok/rules'
import { QuizPanel } from '@/games/quiz/QuizPanel'
import type { QuizView } from '@/games/quiz/rules'
import { CHAT_MAX_LENGTH, normalizeRoomCode, type RoomSnapshot } from '@/games/rooms/base'

const BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-panel)] px-3 py-1.5 text-sm text-[color:var(--wiki-ink-soft)] hover:bg-[color:var(--wiki-bg-2)] disabled:cursor-not-allowed disabled:opacity-50'
const PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-[color:var(--wiki-accent)] px-4 py-2 text-sm font-medium text-[#fff] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'

const END_TEXT: Record<string, string> = {
  five: '다섯 알을 이었습니다',
  resign: '기권',
  timeout: '시간 초과',
  abandon: '자리를 비움',
  draw: '판이 가득 차 무승부',
}

export default function GamecenterRoomPage() {
  return (
    <Suspense fallback={null}>
      <RoomScreen />
    </Suspense>
  )
}

function RoomScreen() {
  const router = useRouter()
  const params = useParams<{ code: string }>()
  const searchParams = useSearchParams()
  const rawCode = String(params?.code ?? '')
  const creating = rawCode === 'new'
  const code = creating ? null : normalizeRoomCode(rawCode)
  const game = searchParams?.get('game') || 'omok'

  const { me, error: meError, loading, reload } = useGamecenterMe()
  const [joinError, setJoinError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // 연결될 때마다(재접속 포함): 새 방이면 만들고, 아니면 그 코드로 들어간다
  const { status, room, userId, error: rtError, send, clockOffset } = useRoom({
    onConnect: async (emit) => {
      if (creating) {
        const made = await emit('room:create', { game })
        if (made.ok && made.code) router.replace(`/wiki/game/room/${made.code}`)
        else setJoinError(made.error || '방을 만들지 못했습니다.')
        return
      }
      if (!code) return
      const joined = await emit('room:join', { code })
      setJoinError(joined.ok ? null : joined.error || '방에 들어가지 못했습니다.')
    },
  })

  const act = useCallback(
    async (event: string, payload?: unknown) => {
      const result: RoomAck = await send(event, payload)
      setNotice(result.ok ? null : result.error || '요청을 처리하지 못했습니다.')
      return result
    },
    [send]
  )

  // 판이 끝나 보상이 도착하면 위쪽의 내 포인트를 새로 읽는다
  const rewardKey = room?.lastRewards ? room.lastResult?.matchId : null
  useEffect(() => {
    if (rewardKey) reload()
  }, [rewardKey, reload])

  const leave = async () => {
    if (room?.phase === 'playing' && !window.confirm('진행 중인 판에서 나가면 기권으로 처리됩니다. 나갈까요?')) return
    await send('room:leave')
    router.push('/wiki/game')
  }

  const inRoom = room && code && room.code === code ? room : null

  return (
    <GamecenterFrame active="lobby" subtitle="방 — 코드를 친구에게 알려 주세요." me={me} loading={loading} error={meError}>
      {me && (
        <div className="space-y-4">
          {!creating && !code && (
            <p role="alert" className="wiki-mbox wiki-mbox--danger">
              방 코드가 올바르지 않습니다.{' '}
              <Link href="/wiki/game" className="underline">
                로비로 돌아가기
              </Link>
            </p>
          )}
          {status === 'unavailable' && (
            <p role="alert" className="wiki-mbox wiki-mbox--danger">
              {rtError || '실시간 서버에 연결할 수 없습니다.'}
            </p>
          )}
          {status === 'replaced' && (
            <p role="alert" className="wiki-mbox wiki-mbox--danger">
              다른 탭에서 접속해 이 화면의 연결이 끊겼습니다. 이 탭에서 계속하려면 새로고침하세요.
            </p>
          )}
          {status === 'reconnecting' && (
            <p role="status" className="wiki-mbox flex items-center gap-2">
              <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
              연결이 끊겨 다시 붙는 중입니다. 자리는 2분간 유지됩니다.
            </p>
          )}
          {joinError && status === 'connected' && (
            <p role="alert" className="wiki-mbox wiki-mbox--danger">
              {joinError}{' '}
              <Link href="/wiki/game" className="underline">
                로비로 돌아가기
              </Link>
            </p>
          )}
          {notice && (
            <p role="alert" className="wiki-mbox wiki-mbox--danger">
              {notice}
            </p>
          )}

          {!inRoom ? (
            !joinError &&
            (creating || code) &&
            (status === 'connecting' || status === 'connected') && (
              <p className="py-10 text-center text-sm text-[color:var(--wiki-ink-muted)]">{creating ? '방을 만드는 중입니다.' : '방에 들어가는 중입니다.'}</p>
            )
          ) : (
            <RoomView room={inRoom} userId={userId} clockOffset={clockOffset} act={act} onLeave={leave} />
          )}
        </div>
      )}
    </GamecenterFrame>
  )
}

function RoomView({
  room,
  userId,
  clockOffset,
  act,
  onLeave,
}: {
  room: RoomSnapshot
  userId: string | null
  clockOffset: number
  act: (event: string, payload?: unknown) => Promise<RoomAck>
  onLeave: () => void
}) {
  const [copied, setCopied] = useState(false)
  const isHost = room.hostId === userId
  const present = room.players.filter((player) => player.connected).length
  const nameOf = (id: string) => room.players.find((player) => player.userId === id)?.name ?? '나간 사람'

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 space-y-4">
        <div className="wiki-panel flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[color:var(--wiki-ink-muted)]">{room.gameName} 방 코드</p>
            <p className="font-mono text-2xl font-bold tracking-[0.3em] text-[color:var(--wiki-ink)]">{room.code}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BUTTON} onClick={copyLink}>
              <Copy className="h-4 w-4" aria-hidden />
              {copied ? '복사했습니다' : '초대 링크 복사'}
            </button>
            <button type="button" className={BUTTON} onClick={onLeave}>
              <LogOut className="h-4 w-4" aria-hidden />
              나가기
            </button>
          </div>
        </div>

        {room.phase === 'lobby' && (
          <div className="wiki-panel text-center">
            <p className="text-sm text-[color:var(--wiki-ink-soft)]">
              {present < room.minPlayers
                ? `${room.minPlayers}명부터 시작할 수 있습니다 (지금 ${present}명, 최대 ${room.maxPlayers}명). 방 코드나 초대 링크를 보내 주세요.`
                : isHost
                  ? '모두 모였습니다. 시작해 주세요.'
                  : '방장이 시작하기를 기다리는 중입니다.'}
            </p>
            {isHost && (
              <button type="button" className={`${PRIMARY} mt-3`} disabled={present < room.minPlayers} onClick={() => act('room:start')}>
                시작
              </button>
            )}
          </div>
        )}

        {room.phase !== 'lobby' && room.game === 'omok' && room.state != null && (
          <OmokPanel room={room} state={room.state as OmokState} userId={userId} clockOffset={clockOffset} isHost={isHost} present={present} act={act} nameOf={nameOf} />
        )}
        {room.phase !== 'lobby' && room.game === 'liar' && room.state != null && (
          <LiarPanel state={room.state as LiarViewState} userId={userId} clockOffset={clockOffset} act={act} />
        )}
        {room.phase !== 'lobby' && room.game === 'quiz' && room.state != null && (
          <QuizPanel state={room.state as QuizView} userId={userId} clockOffset={clockOffset} act={act} />
        )}
        {room.phase === 'finished' && room.game !== 'omok' && (
          <FinishedBar room={room} userId={userId} isHost={isHost} present={present} act={act} />
        )}
      </div>

      <aside className="space-y-4">
        <div className="wiki-panel">
          <h2 className="text-sm font-semibold text-[color:var(--wiki-ink)]">
            참가자 {room.players.length}/{room.maxPlayers}
          </h2>
          <ul className="mt-2 space-y-1.5">
            {room.players.map((player) => (
              <li key={player.userId} className="flex items-center gap-2 text-sm">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${player.connected ? 'bg-[color:var(--wiki-success)]' : 'bg-[color:var(--wiki-ink-faint)]'}`}
                  aria-hidden
                />
                <span className={`min-w-0 truncate ${player.userId === userId ? 'font-semibold text-[color:var(--wiki-ink)]' : 'text-[color:var(--wiki-ink-soft)]'}`}>
                  {player.name}
                  {player.userId === userId && ' (나)'}
                </span>
                {player.userId === room.hostId && <Crown className="h-3.5 w-3.5 shrink-0 text-[color:var(--wiki-warning)]" aria-label="방장" />}
                {!player.connected && <span className="shrink-0 text-xs text-[color:var(--wiki-ink-muted)]">연결 끊김</span>}
              </li>
            ))}
          </ul>
        </div>
        <ChatBox room={room} userId={userId} act={act} />
      </aside>
    </div>
  )
}

function OmokPanel({
  room,
  state,
  userId,
  clockOffset,
  isHost,
  present,
  act,
  nameOf,
}: {
  room: RoomSnapshot
  state: OmokState
  userId: string | null
  clockOffset: number
  isHost: boolean
  present: number
  act: (event: string, payload?: unknown) => Promise<RoomAck>
  nameOf: (id: string) => string
}) {
  const seconds = useTurnSeconds(state, clockOffset)
  const myColor = userId === state.black ? 'black' : userId === state.white ? 'white' : null
  const playing = room.phase === 'playing' && !state.endReason
  const myTurn = playing && myColor === state.turn
  const turnUser = state.turn === 'black' ? state.black : state.white
  const winnerId = state.winner === 'black' ? state.black : state.winner === 'white' ? state.white : null
  const myReward = userId && room.lastRewards ? room.lastRewards[userId] : undefined

  const stone = (color: 'black' | 'white') => (
    <span
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border"
      style={{ background: color === 'black' ? '#1b1b1f' : '#f5f5f2', borderColor: color === 'black' ? '#000' : '#9a9a94' }}
      aria-hidden
    />
  )

  return (
    <div className="wiki-panel">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[color:var(--wiki-ink-soft)]">
          <span className="inline-flex items-center gap-1.5">
            {stone('black')} 흑 {nameOf(state.black)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            {stone('white')} 백 {nameOf(state.white)}
          </span>
        </div>
        {playing && (
          <button
            type="button"
            className={BUTTON}
            disabled={!myColor}
            onClick={() => window.confirm('기권할까요?') && act('room:action', { type: 'resign' })}
          >
            <Flag className="h-4 w-4" aria-hidden />
            기권
          </button>
        )}
      </div>

      <p role="status" className="mb-3 text-center text-base font-semibold text-[color:var(--wiki-ink)]">
        {playing ? (
          <>
            {myTurn ? '내 차례입니다' : `${nameOf(turnUser)} 님 차례`}{' '}
            <span className={`tabular-nums ${seconds <= 10 ? 'text-[color:var(--wiki-danger)]' : 'text-[color:var(--wiki-ink-muted)]'}`}>{seconds}초</span>
          </>
        ) : winnerId ? (
          `${winnerId === userId ? '이겼습니다!' : `${nameOf(winnerId)} 님 승리`} — ${END_TEXT[state.endReason || ''] || ''}`
        ) : (
          END_TEXT.draw
        )}
      </p>

      <div className="flex justify-center">
        <OmokBoard state={state} canPlace={myTurn} onPlace={(x, y) => act('room:action', { type: 'place', x, y })} />
      </div>

      {room.phase === 'finished' && (
        <div className="mt-4 text-center">
          <p className="text-sm text-[color:var(--wiki-ink-soft)]">
            {!room.lastRewards
              ? '결과를 저장하는 중입니다.'
              : myReward
                ? `이번 판 보상 +${myReward}P`
                : '이번 판은 보상이 없습니다 (같은 상대와 하루 3판까지, 9수 이상 둔 판만 보상).'}
          </p>
          {isHost ? (
            <button type="button" className={`${PRIMARY} mt-3`} disabled={present < room.minPlayers} onClick={() => act('room:start')}>
              한 판 더 (선공 교대)
            </button>
          ) : (
            <p className="mt-2 text-sm text-[color:var(--wiki-ink-muted)]">방장이 다시 시작하면 한 판 더 둡니다.</p>
          )}
        </div>
      )}
    </div>
  )
}

/** 라이어·퀴즈가 끝난 뒤: 받은 보상과 한 판 더 */
function FinishedBar({
  room,
  userId,
  isHost,
  present,
  act,
}: {
  room: RoomSnapshot
  userId: string | null
  isHost: boolean
  present: number
  act: (event: string, payload?: unknown) => Promise<RoomAck>
}) {
  const myReward = userId && room.lastRewards ? room.lastRewards[userId] : undefined
  return (
    <div className="wiki-panel text-center">
      <p className="text-sm text-[color:var(--wiki-ink-soft)]">
        {!room.lastRewards ? '결과를 저장하는 중입니다.' : myReward ? `이번 판 보상 +${myReward}P` : '이번 판은 보상이 없습니다.'}
      </p>
      {isHost ? (
        <button type="button" className={`${PRIMARY} mt-3`} disabled={present < room.minPlayers} onClick={() => act('room:start')}>
          한 판 더
        </button>
      ) : (
        <p className="mt-2 text-sm text-[color:var(--wiki-ink-muted)]">방장이 다시 시작하면 한 판 더 합니다.</p>
      )}
    </div>
  )
}

function ChatBox({ room, userId, act }: { room: RoomSnapshot; userId: string | null; act: (event: string, payload?: unknown) => Promise<RoomAck> }) {
  const [text, setText] = useState('')
  const listRef = useRef<HTMLUListElement>(null)
  const lastId = room.chat[room.chat.length - 1]?.id

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [lastId])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return
    const result = await act('room:chat', { text })
    if (result.ok) setText('')
  }

  return (
    <div className="wiki-panel">
      <h2 className="text-sm font-semibold text-[color:var(--wiki-ink)]">한 줄 채팅</h2>
      <ul ref={listRef} className="mt-2 h-40 space-y-1 overflow-y-auto text-sm" aria-live="polite">
        {room.chat.length === 0 && <li className="text-[color:var(--wiki-ink-muted)]">아직 아무 말도 없습니다.</li>}
        {room.chat.map((message) => (
          <li key={message.id} className="break-words">
            <span className={`font-medium ${message.userId === userId ? 'text-[color:var(--wiki-accent)]' : 'text-[color:var(--wiki-ink)]'}`}>{message.name}</span>{' '}
            <span className="text-[color:var(--wiki-ink-soft)]">{message.text}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={CHAT_MAX_LENGTH}
          placeholder="한마디"
          aria-label="채팅 입력"
          className="min-w-0 flex-1 rounded-md border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-field)] px-2.5 py-1.5 text-sm text-[color:var(--wiki-ink)] focus:border-[color:var(--wiki-accent)] focus:outline-none"
        />
        <button type="submit" className={BUTTON} aria-label="보내기" disabled={!text.trim()}>
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  )
}
