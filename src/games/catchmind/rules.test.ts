import { describe, expect, it } from 'vitest'
import {
  CATCHMIND_REVEAL_MS,
  CATCHMIND_ROUND_MS,
  catchmindGame,
  catchmindRoundCount,
  normalizeGuess,
  wordHint,
  type CatchmindState,
  type CatchmindView,
} from './rules'
import { CATCHMIND_WORDS } from './words'

const users = (n: number) => Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, name: `사람${i}` }))
const start = (n = 4, seed = 3, now = 0) => catchmindGame.init(users(n), { now, seed, round: 0 })
const view = (state: CatchmindState, userId: string) => catchmindGame.view(state, userId) as CatchmindView
const guess = (state: CatchmindState, userId: string, text: string, now: number) => catchmindGame.apply(state, userId, { type: 'guess', text }, now)
const word = (state: CatchmindState) => state.words[state.round]
const stroke = (id: number, p: number[], c = 0, w = 6) => ({ t: 'stroke' as const, id, c, w, p })

describe('제시어', () => {
  it('충분히 많고 겹치지 않는다. 친구 관련 낱말이 들어 있다', () => {
    expect(CATCHMIND_WORDS.length).toBeGreaterThanOrEqual(60)
    expect(new Set(CATCHMIND_WORDS.map(normalizeGuess)).size).toBe(CATCHMIND_WORDS.length)
    expect(CATCHMIND_WORDS).toContain('이랑위키')
  })
})

describe('정답 판정', () => {
  it('공백과 대소문자를 무시한다', () => {
    expect(normalizeGuess(' 랑구  등반 ')).toBe('랑구등반')
    expect(normalizeGuess('PC방')).toBe(normalizeGuess('pc 방'))
    expect(normalizeGuess('떡볶이')).not.toBe(normalizeGuess('떡뽁이'))
    expect(normalizeGuess(null)).toBe('')
  })

  it('힌트는 글자 수와 띄어쓰기만 알려 준다', () => {
    expect(wordHint('랑구 등반')).toBe('○○ ○○')
    expect(wordHint('고양이')).toBe('○○○')
  })
})

describe('캐치마인드', () => {
  it('출제자는 들어온 순서대로, 모두 같은 횟수만큼 그린다', () => {
    expect([3, 4, 6, 8].map(catchmindRoundCount)).toEqual([6, 4, 6, 8])
    expect(start(4).drawers).toEqual(['u0', 'u1', 'u2', 'u3'])
    expect(start(3).drawers).toEqual(['u0', 'u1', 'u2', 'u0', 'u1', 'u2'])
    const state = start(5)
    expect(new Set(state.words).size).toBe(5)
    expect(start(5, 3).words).toEqual(state.words) // 같은 시드는 같은 제시어
  })

  it('제시어는 출제자에게만 보내고, 나머지는 글자 수만 본다', () => {
    const state = start()
    expect(view(state, 'u0')).toMatchObject({ drawer: 'u0', word: word(state) })
    for (const id of ['u1', 'u2', 'u3']) {
      const seen = view(state, id)
      expect(seen.word).toBeNull()
      expect(seen.hint).toBe(wordHint(word(state)))
      expect(JSON.stringify(seen)).not.toContain(word(state))
      expect(seen).not.toHaveProperty('words')
    }
  })

  it('공백·대소문자를 무시하고 맞힌다. 맞힌 답은 남에게 보이지 않는다', () => {
    const state = start()
    const answer = word(state)
    expect(guess(state, 'u1', '틀린 답', 1000)).toEqual({ ok: true })
    expect(guess(state, 'u1', ` ${Array.from(answer).join(' ')} `, 2000)).toEqual({ ok: true })
    expect(state.correct).toEqual(['u1'])

    const other = view(state, 'u2')
    expect(other.log).toEqual([
      { id: 1, userId: 'u1', text: '틀린 답', correct: false },
      { id: 2, userId: 'u1', text: null, correct: true },
    ])
    expect(JSON.stringify(other)).not.toContain(answer)
    // 맞힌 사람은 이제 제시어를 본다
    expect(view(state, 'u1').word).toBe(answer)
  })

  it('출제자·이미 맞힌 사람·방 밖 사람은 맞힐 수 없다', () => {
    const state = start()
    expect(guess(state, 'u0', word(state), 1000)).toEqual({ ok: false, error: '출제자는 맞힐 수 없습니다.' })
    guess(state, 'u1', word(state), 1000)
    expect(guess(state, 'u1', word(state), 5000)).toEqual({ ok: false, error: '이미 맞혔습니다.' })
    expect(guess(state, 'zz', word(state), 5000).ok).toBe(false)
    expect(guess(state, 'u2', '   ', 5000).ok).toBe(false)
    guess(state, 'u2', '아무거나', 6000)
    expect(guess(state, 'u2', '또', 6100)).toEqual({ ok: false, error: '조금 천천히 보내 주세요.' })
  })

  it('빨리 맞힐수록 점수가 높고, 맞힐 때마다 출제자도 점수를 얻는다', () => {
    const state = start()
    guess(state, 'u1', word(state), 10_000)
    guess(state, 'u2', word(state), 50_000)
    expect(state.scores).toMatchObject({ u1: 170, u2: 130, u0: 100, u3: 0 })
    expect(state.stats.u1).toEqual({ correct: 1, first: 1, drawnGuessed: 0 })
    expect(state.stats.u2).toEqual({ correct: 1, first: 0, drawnGuessed: 0 })
    expect(state.stats.u0).toEqual({ correct: 0, first: 0, drawnGuessed: 2 })
  })

  it('모두 맞히면 바로 공개, 아니면 80초에 공개 → 5초 뒤 다음 출제자', () => {
    const state = start()
    const first = word(state)
    for (const id of ['u1', 'u2', 'u3']) guess(state, id, first, 5000)
    expect(state.phase).toBe('reveal')
    expect(view(state, 'u3').word).toBe(first)
    expect(catchmindGame.tick(state, 5000 + CATCHMIND_REVEAL_MS - 1)).toBe(false)
    expect(catchmindGame.tick(state, 5000 + CATCHMIND_REVEAL_MS)).toBe(true)
    expect(state).toMatchObject({ phase: 'draw', round: 1, correct: [], strokes: [], log: [] })
    expect(view(state, 'u1').drawer).toBe('u1')

    const at = state.deadline
    expect(at).toBe(5000 + CATCHMIND_REVEAL_MS + CATCHMIND_ROUND_MS)
    expect(catchmindGame.tick(state, at - 1)).toBe(false)
    expect(catchmindGame.tick(state, at)).toBe(true)
    expect(state.phase).toBe('reveal')
  })

  it('마지막 라운드가 끝나면 결과가 나온다', () => {
    const state = start(4)
    let now = 0
    expect(catchmindGame.result(state)).toBeNull()
    while (state.phase !== 'done') {
      if (state.phase === 'draw') guess(state, state.active.find((id) => id !== state.drawers[state.round])!, word(state), now + 1000)
      now += CATCHMIND_ROUND_MS + CATCHMIND_REVEAL_MS
      catchmindGame.tick(state, now)
    }
    const result = catchmindGame.result(state)!
    expect(result.summary).toMatchObject({ completed: true, rounds: 4, playerCount: 4 })
    expect(result.players.every((player) => player.stats!.stayed === 1)).toBe(true)
    expect(result.players.reduce((sum, player) => sum + player.stats!.correct, 0)).toBe(4)
    expect(result.players.map((player) => player.rank).sort()[0]).toBe(1)
  })

  describe('그림', () => {
    it('출제자의 획만 받아 그대로 전달하고, 같은 id 는 이어 붙인다', () => {
      const state = start()
      expect(catchmindGame.stream!(state, 'u1', stroke(1, [0, 0, 10, 10]), 10)).toEqual({ ok: false, error: '출제자만 그릴 수 있습니다.' })
      expect(catchmindGame.stream!(state, 'u0', stroke(1, [0, 0, 10, 10], 2, 12), 10)).toEqual({
        ok: true,
        relay: { t: 'stroke', id: 1, c: 2, w: 12, p: [0, 0, 10, 10] },
      })
      catchmindGame.stream!(state, 'u0', stroke(1, [20, 20], 2, 12), 60)
      catchmindGame.stream!(state, 'u0', stroke(2, [5, 5, 6, 6]), 110)
      expect(state.strokes).toEqual([
        { id: 1, c: 2, w: 12, p: [0, 0, 10, 10, 20, 20] },
        { id: 2, c: 0, w: 6, p: [5, 5, 6, 6] },
      ])
      expect(state.pointCount).toBe(5)
    })

    it('정수 좌표·팔레트 색·정수 두께만 받는다', () => {
      const state = start()
      const bad = [
        stroke(1, [0.5, 0, 1, 1]),
        stroke(1, [0, 0, 801, 10]),
        stroke(1, [0, 0, 10, 601]),
        stroke(1, [-1, 0]),
        stroke(1, [1, 2, 3]),
        stroke(1, []),
        stroke(1, [0, 0], 99),
        stroke(1, [0, 0], 0, 0),
        stroke(1.5, [0, 0]),
        { t: 'stroke', id: 1, c: 0, w: 3, p: 'x' },
        { t: 'erase' },
        null,
      ]
      for (const payload of bad) expect(catchmindGame.stream!(state, 'u0', payload, 10).ok).toBe(false)
      expect(catchmindGame.stream!(state, 'u0', stroke(1, Array(802).fill(5)), 10).ok).toBe(false) // 한 번에 너무 많은 점
      expect(state.strokes).toEqual([])
    })

    it('한 라운드에 쌓을 수 있는 양에 한도가 있다', () => {
      const state = start()
      const chunk = Array(800).fill(7)
      let accepted = 0
      for (let i = 0; i < 400; i++) if (catchmindGame.stream!(state, 'u0', stroke(i, chunk), i).ok) accepted++
      expect(accepted).toBe(150) // 400점 × 150 = 60,000점
      expect(state.pointCount).toBe(60_000)
    })

    it('지우기, 그리고 늦게 들어온 사람에게 줄 지금까지의 그림', () => {
      const state = start()
      catchmindGame.stream!(state, 'u0', stroke(1, [0, 0, 10, 10]), 10)
      expect(catchmindGame.streamSnapshot!(state)).toEqual({ t: 'full', round: 0, strokes: [{ id: 1, c: 0, w: 6, p: [0, 0, 10, 10] }] })
      expect(catchmindGame.stream!(state, 'u0', { t: 'clear' }, 20)).toEqual({ ok: true, relay: { t: 'clear' } })
      expect(catchmindGame.streamSnapshot!(state)).toEqual({ t: 'full', round: 0, strokes: [] })
    })

    it('공개 단계에서는 그릴 수 없고, 다음 라운드는 빈 그림으로 시작한다', () => {
      const state = start()
      catchmindGame.stream!(state, 'u0', stroke(1, [0, 0, 10, 10]), 10)
      catchmindGame.tick(state, CATCHMIND_ROUND_MS)
      expect(catchmindGame.stream!(state, 'u0', stroke(2, [1, 1]), CATCHMIND_ROUND_MS + 1).ok).toBe(false)
      catchmindGame.tick(state, CATCHMIND_ROUND_MS + CATCHMIND_REVEAL_MS)
      expect(catchmindGame.streamSnapshot!(state)).toEqual({ t: 'full', round: 1, strokes: [] })
      expect(catchmindGame.stream!(state, 'u0', stroke(3, [1, 1]), CATCHMIND_ROUND_MS + CATCHMIND_REVEAL_MS + 1).ok).toBe(false) // 이제 u1 차례
    })
  })

  it('출제자가 나가면 그 라운드를 끝내고, 나간 사람의 차례는 건너뛴다', () => {
    const state = start(5)
    catchmindGame.abandon(state, 'u0', 1000)
    expect(state.phase).toBe('reveal')
    catchmindGame.abandon(state, 'u1', 1500)
    catchmindGame.tick(state, 1000 + CATCHMIND_REVEAL_MS)
    expect(state).toMatchObject({ phase: 'draw', round: 2 })
    expect(view(state, 'u3').drawer).toBe('u2')
  })

  it('3명 미만이 되면 승부 없이 끝난다', () => {
    const state = start(3)
    catchmindGame.abandon(state, 'u2', 1000)
    expect(state.phase).toBe('done')
    expect(catchmindGame.result(state)!.summary.completed).toBe(false)
  })
})
