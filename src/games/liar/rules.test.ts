import { describe, expect, it } from 'vitest'
import { LIAR_DESCRIBE_MS, LIAR_GUESS_MS, LIAR_VOTE_MS, liarGame, liarSpeaker, type LiarState } from './rules'
import { LIAR_CATEGORIES } from './words'

const users = (n: number) => Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, name: `사람${i}` }))
const start = (n = 4, seed = 7, now = 0) => liarGame.init(users(n), { now, seed, round: 0 })
const view = (state: LiarState, userId: string) => liarGame.view(state, userId) as any

/** 모두 한 줄씩 설명해 투표 단계까지 간다 */
function describeAll(state: LiarState, now = 1000) {
  while (state.phase === 'describe') {
    const speaker = liarSpeaker(state)!
    expect(liarGame.apply(state, speaker, { type: 'describe', text: '음 그런 느낌' }, now)).toEqual({ ok: true })
  }
}
const citizens = (state: LiarState) => state.active.filter((id) => id !== state.liar)
/** 시민 전원이 target 에게, target 은 다른 사람에게 투표 */
function voteFor(state: LiarState, target: string, now = 2000) {
  for (const voter of [...state.active]) {
    if (state.phase !== 'vote') break
    const choice = voter === target ? state.active.find((id) => id !== target)! : target
    liarGame.apply(state, voter, { type: 'vote', target: choice }, now)
  }
}

describe('제시어 팩', () => {
  it('분류마다 낱말이 10개이고 겹치지 않는다', () => {
    expect(LIAR_CATEGORIES.length).toBeGreaterThanOrEqual(10)
    for (const category of LIAR_CATEGORIES) {
      expect(category.words).toHaveLength(10)
      expect(new Set(category.words).size).toBe(10)
    }
  })

  it('랑구팸 분류에 멤버 다섯 명이 들어 있다', () => {
    const rangu = LIAR_CATEGORIES.find((category) => category.id === 'rangu')!
    for (const name of ['강한울', '정재원', '정민석', '이승찬', '정진규']) expect(rangu.words).toContain(name)
  })
})

describe('라이어 게임', () => {
  it('같은 시드는 같은 판, 라이어는 참가자 중 한 명', () => {
    expect(start(5, 11)).toEqual(start(5, 11))
    const liars = new Set(Array.from({ length: 60 }, (_, seed) => start(5, seed).liar))
    expect(liars.size).toBe(5) // 누구나 라이어가 될 수 있다
    const state = start()
    expect(state.active).toContain(state.liar)
    expect(state.choices).toContain(state.word)
  })

  it('라이어에게는 제시어를 보내지 않고, 라이어가 누구인지는 끝날 때까지 아무에게도 보내지 않는다', () => {
    const state = start()
    for (const player of state.players) {
      const seen = view(state, player.userId)
      expect(seen.liar).toBeNull()
      expect(seen.choices).toBeNull()
      if (player.userId === state.liar) {
        expect(seen).toMatchObject({ word: null, iAmLiar: true, category: state.category })
        expect(JSON.stringify(seen)).not.toContain(state.word)
      } else {
        expect(seen).toMatchObject({ word: state.word, iAmLiar: false })
        expect(JSON.stringify(seen)).not.toContain(`"liar":"${state.liar}"`)
      }
    }
  })

  it('정해진 순서대로 한 줄씩 설명한다 (4명 이하는 두 바퀴)', () => {
    const state = start(4)
    expect(state.rounds).toBe(2)
    const first = liarSpeaker(state)!
    const other = state.order[1]
    expect(liarGame.apply(state, other, { type: 'describe', text: '먼저' }, 10)).toEqual({ ok: false, error: '내 차례가 아닙니다.' })
    expect(liarGame.apply(state, first, { type: 'describe', text: '   ' }, 10).ok).toBe(false)
    expect(liarGame.apply(state, first, { type: 'describe', text: ' 길쭉한   것 ' }, 10)).toEqual({ ok: true })
    expect(state.descriptions[0]).toEqual({ userId: first, text: '길쭉한 것', round: 1 })
    expect(liarSpeaker(state)).toBe(other)
    describeAll(state)
    expect(state.descriptions).toHaveLength(8)
    expect(state.phase).toBe('vote')
    expect(start(6).rounds).toBe(1)
  })

  it('시민은 제시어를 그대로 말할 수 없다', () => {
    const state = start()
    const speaker = liarSpeaker(state)!
    const outcome = liarGame.apply(state, speaker, { type: 'describe', text: `정답은 ${state.word}` }, 10)
    if (speaker === state.liar) expect(outcome.ok).toBe(true)
    else expect(outcome).toEqual({ ok: false, error: '제시어를 그대로 말할 수는 없습니다.' })
  })

  it('30초 안에 설명하지 않으면 차례가 넘어간다', () => {
    const state = start(5)
    const first = liarSpeaker(state)!
    expect(liarGame.tick(state, LIAR_DESCRIBE_MS - 1)).toBe(false)
    expect(liarGame.tick(state, LIAR_DESCRIBE_MS)).toBe(true)
    expect(state.descriptions[0]).toMatchObject({ userId: first, text: '(시간 초과)' })
    expect(liarSpeaker(state)).not.toBe(first)
  })

  it('투표: 자기 자신은 못 찍고, 투표 중에는 누가 냈는지만 보인다', () => {
    const state = start(5)
    describeAll(state)
    const [a, b] = state.active
    expect(liarGame.apply(state, a, { type: 'vote', target: a }, 10).ok).toBe(false)
    expect(liarGame.apply(state, a, { type: 'vote', target: 'nobody' }, 10).ok).toBe(false)
    expect(liarGame.apply(state, a, { type: 'vote', target: b }, 10)).toEqual({ ok: true })
    expect(view(state, b)).toMatchObject({ voted: [a], votes: null, myVote: null })
    expect(view(state, a).myVote).toBe(b)
  })

  it('라이어가 지목되면 제시어를 맞힐 기회가 있다 — 틀리면 시민 승', () => {
    const state = start(5)
    describeAll(state)
    voteFor(state, state.liar)
    expect(state).toMatchObject({ phase: 'guess', accused: state.liar })
    expect(view(state, state.liar).choices).toEqual(state.choices)
    expect(view(state, citizens(state)[0]).choices).toBeNull()
    expect(liarGame.apply(state, citizens(state)[0], { type: 'guess', word: state.word }, 10).ok).toBe(false)
    expect(liarGame.apply(state, state.liar, { type: 'guess', word: '없는말' }, 10).ok).toBe(false)
    const wrong = state.choices.find((word) => word !== state.word)!
    liarGame.apply(state, state.liar, { type: 'guess', word: wrong }, 3000)
    expect(state).toMatchObject({ phase: 'done', winner: 'citizens', endReason: 'caught', liarGuess: wrong })
    expect(view(state, citizens(state)[0])).toMatchObject({ liar: state.liar, word: state.word })
  })

  it('지목된 라이어가 제시어를 맞히면 라이어 승', () => {
    const state = start(5)
    describeAll(state)
    voteFor(state, state.liar)
    liarGame.apply(state, state.liar, { type: 'guess', word: state.word }, 3000)
    expect(state).toMatchObject({ winner: 'liar', endReason: 'guessed' })
  })

  it('다른 사람이 지목되면 라이어 승', () => {
    const state = start(5)
    describeAll(state)
    voteFor(state, citizens(state)[0])
    expect(state).toMatchObject({ phase: 'done', winner: 'liar', endReason: 'escaped' })
  })

  it('표가 갈려 동률이거나 아무도 투표하지 않으면 라이어 승', () => {
    const tie = start(4)
    describeAll(tie)
    const [a, b, c, d] = tie.active
    liarGame.apply(tie, a, { type: 'vote', target: b }, 10)
    liarGame.apply(tie, b, { type: 'vote', target: a }, 10)
    liarGame.apply(tie, c, { type: 'vote', target: a }, 10)
    liarGame.apply(tie, d, { type: 'vote', target: b }, 10)
    expect(tie).toMatchObject({ winner: 'liar', endReason: 'tie' })

    const silent = start(4, 3, 0)
    describeAll(silent, 0)
    expect(liarGame.tick(silent, LIAR_VOTE_MS)).toBe(true)
    expect(silent).toMatchObject({ winner: 'liar', endReason: 'tie' })
  })

  it('라이어가 시간 안에 고르지 못하면 시민 승', () => {
    const state = start(5, 7, 0)
    describeAll(state, 0)
    voteFor(state, state.liar, 0)
    expect(liarGame.tick(state, LIAR_GUESS_MS)).toBe(true)
    expect(state).toMatchObject({ winner: 'citizens', endReason: 'caught' })
  })

  it('라이어가 나가면 시민 승, 시민이 나가 3명 미만이 되면 승부 없이 끝난다', () => {
    const left = start(5)
    liarGame.abandon(left, left.liar, 10)
    expect(left).toMatchObject({ winner: 'citizens', endReason: 'liar_left' })

    const small = start(3)
    liarGame.abandon(small, citizens(small)[0], 10)
    expect(small).toMatchObject({ phase: 'done', winner: null, endReason: 'aborted' })
    expect(liarGame.result(small)!.summary.completed).toBe(false)
  })

  it('설명할 차례인 시민이 나가면 다음 사람으로 넘어간다', () => {
    const state = start(6, 21)
    let speaker = liarSpeaker(state)!
    if (speaker === state.liar) {
      liarGame.apply(state, speaker, { type: 'describe', text: '음' }, 10)
      speaker = liarSpeaker(state)!
    }
    liarGame.abandon(state, speaker, 20)
    expect(state.phase).toBe('describe')
    expect(liarSpeaker(state)).not.toBe(speaker)
    expect(state.active).not.toContain(speaker)
  })

  it('결과: 이긴 쪽이 1위, 역할과 승패가 들어간다', () => {
    const state = start(5)
    expect(liarGame.result(state)).toBeNull()
    describeAll(state)
    voteFor(state, citizens(state)[0])
    const result = liarGame.result(state)!
    expect(result.summary).toMatchObject({ completed: true, winner: 'liar', reason: 'escaped', playerCount: 5 })
    const liar = result.players.find((player) => player.userId === state.liar)!
    expect(liar).toMatchObject({ rank: 1, role: 'liar', stats: { won: 1, stayed: 1 } })
    expect(result.players.filter((player) => player.role === 'citizen').every((player) => player.rank === 2 && player.stats!.won === 0)).toBe(true)
  })
})
