/**
 * 실시간 서버 통합 테스트 — 실제 소켓으로 접속해 오목 한 판을 두고 결과 보고까지 확인한다.
 *
 *   npm test        (services/game-rt 에서)
 */
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createServer, type Server as HttpServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'
import jwt from 'jsonwebtoken'
import { io as connect, type Socket } from 'socket.io-client'
import type { RoomSnapshot } from '../../../src/games/rooms/base'
import { QUIZ_PROMPTS } from '../../../src/games/quiz/prompts'
import { createGameDataFetcher, createReporter } from '../src/report'
import { createRtServer, type RtServer } from '../src/server'

const JWT_SECRET = 'test-rt-secret'
const INTERNAL_SECRET = 'test-internal-secret'
const USER_A = { userId: '11111111-1111-4111-8111-111111111111', name: '가' }
const USER_B = { userId: '22222222-2222-4222-8222-222222222222', name: '나' }
const USER_C = { userId: '33333333-3333-4333-8333-333333333333', name: '다' }

let rt: RtServer
let rtUrl = ''
let fam: HttpServer
let clock = Date.now()
/** 본 서버 흉내가 받은 결과 (서명 검증 포함) */
const reports: Array<{ body: any; signatureOk: boolean }> = []
const dataRequests: Array<{ body: any; signatureOk: boolean }> = []
let quizDataAvailable = true
const open: Socket[] = []

before(async () => {
  fam = createServer((request, response) => {
    let raw = ''
    request.on('data', (chunk) => (raw += chunk))
    request.on('end', () => {
      const expected = createHmac('sha256', INTERNAL_SECRET).update(raw).digest('hex')
      const body = JSON.parse(raw)
      if (request.url === '/api/gamecenter/internal/game-data') {
        dataRequests.push({ body, signatureOk: request.headers['x-gc-signature'] === expected })
        // 모든 참가자가 모든 질문에 답해 둔 것으로 한다 (사람·질문마다 다른 답)
        const answers: Record<string, Record<string, number>> = {}
        body.userIds.forEach((userId: string, u: number) => {
          answers[userId] = Object.fromEntries(
            QUIZ_PROMPTS.map((prompt, p) => [prompt.id, prompt.type === 'number' ? prompt.min + ((u + p) % (prompt.max - prompt.min + 1)) : (u + p) % (prompt.type === 'ox' ? 2 : 4)])
          )
        })
        response.writeHead(quizDataAvailable ? 200 : 503, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ success: true, data: { answers, passes: { [USER_C.userId]: 1 } } }))
        return
      }
      reports.push({ body, signatureOk: request.headers['x-gc-signature'] === expected && request.url === '/api/gamecenter/internal/match-result' })
      response.writeHead(200, { 'content-type': 'application/json' })
      const winner = body.players.find((player: any) => player.rank === 1)?.userId
      const loser = body.players.find((player: any) => player.userId !== winner)?.userId
      response.end(JSON.stringify({ success: true, duplicate: false, rewards: { [winner]: 20, [loser]: 5 } }))
    })
  })
  await new Promise<void>((resolve) => fam.listen(0, resolve))
  const famUrl = `http://127.0.0.1:${(fam.address() as AddressInfo).port}`
  rt = createRtServer({
    jwtSecret: JWT_SECRET,
    allowedOrigins: ['*'],
    report: createReporter({ ranguFamUrl: famUrl, internalSecret: INTERNAL_SECRET, retryDelays: [] }),
    gameData: createGameDataFetcher({ ranguFamUrl: famUrl, internalSecret: INTERNAL_SECRET }),
    now: () => clock,
  })
  await new Promise<void>((resolve) => rt.http.listen(0, resolve))
  rtUrl = `http://127.0.0.1:${(rt.http.address() as AddressInfo).port}`
})

after(async () => {
  for (const socket of open) socket.close()
  await rt.close()
  await new Promise((resolve) => fam.close(resolve))
})

const token = (user: { userId: string; name: string }, opts: jwt.SignOptions = {}) =>
  jwt.sign(user, JWT_SECRET, { expiresIn: 300, audience: 'game-rt', ...opts })

interface Client {
  socket: Socket
  state: () => RoomSnapshot | null
  /** 조건에 맞는 상태가 올 때까지 기다린다 */
  until: (check: (snapshot: RoomSnapshot | null) => boolean) => Promise<RoomSnapshot | null>
  emit: (event: string, payload?: unknown) => Promise<{ ok: boolean; error?: string; code?: string }>
}

async function client(user: { userId: string; name: string }, auth: string = token(user)): Promise<Client> {
  const socket = connect(rtUrl, { auth: { token: auth }, transports: ['websocket'], reconnection: false })
  open.push(socket)
  let latest: RoomSnapshot | null = null
  const waiters: Array<() => void> = []
  socket.on('room:state', (snapshot) => {
    latest = snapshot
    waiters.splice(0).forEach((wake) => wake())
  })
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve())
    socket.once('connect_error', reject)
  })
  return {
    socket,
    state: () => latest,
    emit: (event, payload = {}) => new Promise((resolve) => socket.emit(event, payload, resolve)),
    async until(check) {
      const deadline = Date.now() + 3000
      while (!check(latest)) {
        if (Date.now() > deadline) throw new Error(`기다리던 상태가 오지 않음: ${JSON.stringify(latest)?.slice(0, 300)}`)
        await Promise.race([new Promise<void>((resolve) => waiters.push(resolve)), new Promise((resolve) => setTimeout(resolve, 100))])
      }
      return latest
    },
  }
}

const place = (who: Client, x: number, y: number) => who.emit('room:action', { type: 'place', x, y })

test('토큰이 없거나 틀리거나 만료됐으면 접속할 수 없다', async () => {
  for (const bad of ['', 'garbage', jwt.sign(USER_A, 'wrong', { audience: 'game-rt' }), token(USER_A, { expiresIn: -10 }), jwt.sign(USER_A, JWT_SECRET)]) {
    await assert.rejects(client(USER_A, bad), /unauthorized/)
  }
})

test('방 만들기 → 코드로 입장 → 오목 한 판 → 서명된 결과 보고 → 보상 알림', async () => {
  const a = await client(USER_A)
  const b = await client(USER_B)

  const created = await a.emit('room:create', { game: 'omok' })
  assert.equal(created.ok, true)
  assert.match(created.code!, /^[A-HJKMNP-Z2-9]{6}$/)
  assert.deepEqual(await a.emit('room:start'), { ok: false, error: '인원이 모자랍니다.' })

  assert.equal((await b.emit('room:join', { code: created.code!.toLowerCase() })).ok, true)
  await a.until((s) => s?.players.length === 2)
  assert.deepEqual(await b.emit('room:start'), { ok: false, error: '방장만 할 수 있습니다.' })

  // 세 번째 사람은 들어올 수 없다
  const c = await client(USER_C)
  assert.deepEqual(await c.emit('room:join', { code: created.code }), { ok: false, error: '방이 가득 찼습니다.' })
  assert.deepEqual(await c.emit('room:join', { code: 'ZZZZZZ' }), { ok: false, error: '그 코드의 방이 없습니다.' })

  assert.equal((await a.emit('room:start')).ok, true)
  await b.until((s) => s?.phase === 'playing')

  assert.deepEqual(await place(b, 0, 0), { ok: false, error: '상대 차례입니다.' })
  // 흑(가)이 가로 다섯 개
  for (let i = 0; i < 4; i++) {
    assert.equal((await place(a, 3 + i, 7)).ok, true)
    assert.equal((await place(b, i, 0)).ok, true)
  }
  assert.equal((await place(a, 7, 7)).ok, true)

  const finished = await b.until((s) => s?.phase === 'finished' && s.lastRewards !== null)
  assert.equal((finished!.state as any).winner, 'black')
  assert.deepEqual(finished!.lastRewards, { [USER_A.userId]: 20, [USER_B.userId]: 5 })

  assert.equal(reports.length, 1)
  assert.equal(reports[0].signatureOk, true)
  assert.equal(reports[0].body.game, 'omok')
  assert.match(reports[0].body.matchId, /^[0-9a-f-]{36}$/)
  assert.deepEqual(reports[0].body.summary.reason, 'five')
  assert.deepEqual(
    reports[0].body.players.map((player: any) => [player.userId, player.rank]),
    [[USER_A.userId, 1], [USER_B.userId, 2]]
  )

  // 한 판 더: 새 matchId, 선공이 바뀐다
  assert.equal((await a.emit('room:start')).ok, true)
  const second = await b.until((s) => s?.phase === 'playing')
  assert.equal((second!.state as any).black, USER_B.userId)
  assert.equal((await b.emit('room:action', { type: 'resign' })).ok, true)
  await a.until((s) => s?.phase === 'finished' && s.lastRewards !== null)
  assert.equal(reports.length, 2)
  assert.notEqual(reports[1].body.matchId, reports[0].body.matchId)
  assert.equal(reports[1].body.summary.reason, 'resign')

  // 한 줄 채팅
  assert.equal((await a.emit('room:chat', { text: '  한 판 더?  ' })).ok, true)
  const chatted = await b.until((s) => Boolean(s?.chat.length))
  assert.equal(chatted!.chat.at(-1)!.text, '한 판 더?')

  await a.emit('room:leave')
  await b.emit('room:leave')
  assert.equal(rt.rooms.size, 0)
})

test('끊겼다 다시 접속하면 같은 판으로 돌아온다', async () => {
  const a = await client(USER_A)
  const b = await client(USER_B)
  const { code } = await a.emit('room:create', { game: 'omok' })
  await b.emit('room:join', { code })
  await a.emit('room:start')
  await place(a, 7, 7)

  b.socket.close()
  const gone = await a.until((s) => s?.players.find((player) => player.userId === USER_B.userId)?.connected === false)
  assert.equal(gone!.phase, 'playing')

  // 새 소켓 — 방 코드를 다시 보내지 않아도 자리를 되찾는다
  const back = await client(USER_B)
  const restored = await back.until((s) => s?.phase === 'playing')
  assert.equal((restored!.state as any).board[7][7], 1)
  assert.equal(restored!.players.find((player) => player.userId === USER_B.userId)!.connected, true)
  assert.equal((await place(back, 8, 8)).ok, true)

  await a.emit('room:leave')
  await back.emit('room:leave')
})

test('2분 넘게 돌아오지 않으면 자리가 비워지고, 30초 안에 두지 않으면 시간패', async () => {
  const before = reports.length
  const a = await client(USER_A)
  const b = await client(USER_B)
  const { code } = await a.emit('room:create', { game: 'omok' })
  await b.emit('room:join', { code })
  await a.emit('room:start')
  b.socket.close()
  await a.until((s) => s?.players.some((player) => !player.connected) === true)

  clock += 31_000 // 가(흑)의 차례가 30초를 넘김
  rt.tick()
  const timedOut = await a.until((s) => s?.phase === 'finished')
  assert.equal((timedOut!.state as any).endReason, 'timeout')
  assert.equal((timedOut!.state as any).winner, 'white')

  clock += 120_000
  rt.tick()
  const alone = await a.until((s) => s?.players.length === 1)
  assert.equal(alone!.hostId, USER_A.userId)
  await new Promise((resolve) => setTimeout(resolve, 100))
  assert.equal(reports.length, before + 1)
  await a.emit('room:leave')
})

test('같은 사용자가 새 탭으로 접속하면 이전 소켓이 끊기고 자리는 유지된다', async () => {
  const first = await client(USER_A)
  const { code } = await first.emit('room:create', { game: 'omok' })
  const replaced = new Promise<void>((resolve) => first.socket.once('session:replaced', () => resolve()))
  const closed = new Promise<void>((resolve) => first.socket.once('disconnect', () => resolve()))

  const second = await client(USER_A)
  await replaced
  await closed
  const state = await second.until((s) => s?.code === code)
  assert.equal(state!.players.length, 1)
  assert.equal(state!.players[0].connected, true) // 이전 소켓이 끊겨도 자리는 연결된 상태
  await second.emit('room:leave')
})

test('진행 중인 판이 있으면 다른 방으로 옮길 수 없다', async () => {
  const a = await client(USER_A)
  const b = await client(USER_B)
  const c = await client(USER_C)
  const { code } = await a.emit('room:create', { game: 'omok' })
  await b.emit('room:join', { code })
  await a.emit('room:start')
  const other = await c.emit('room:create', { game: 'omok' })

  const blocked = await a.emit('room:join', { code: other.code })
  assert.equal(blocked.ok, false)
  assert.match(blocked.error!, /진행 중인 판/)
  assert.equal((await c.emit('room:create', { game: 'chess' })).ok, false)

  await a.emit('room:leave')
  await b.emit('room:leave')
  await c.emit('room:leave')
  assert.equal(rt.rooms.size, 0)
})

test('라이어 게임: 라이어에게는 제시어가 가지 않고, 설명 → 투표 → 결과 보고까지 간다', async () => {
  const before = reports.length
  const clients = [await client(USER_A), await client(USER_B), await client(USER_C)]
  const [a, b, c] = clients
  const { code } = await a.emit('room:create', { game: 'liar' })
  assert.deepEqual(await a.emit('room:start'), { ok: false, error: '인원이 모자랍니다.' })
  await b.emit('room:join', { code })
  await c.emit('room:join', { code })
  assert.equal((await a.emit('room:start')).ok, true)
  for (const each of clients) await each.until((s) => s?.phase === 'playing')

  const views = clients.map((each) => each.state()!.state as any)
  const liars = views.filter((view) => view.iAmLiar)
  assert.equal(liars.length, 1)
  assert.equal(liars[0].word, null)
  const word = views.find((view) => !view.iAmLiar).word
  assert.equal(typeof word, 'string')
  for (const view of views) assert.equal(view.liar, null)

  // 차례대로 한 줄씩 (3명이면 두 바퀴)
  const byId = new Map([[USER_A.userId, a], [USER_B.userId, b], [USER_C.userId, c]])
  for (let i = 0; i < 6; i++) {
    const state = (await a.until((s) => (s?.state as any)?.descriptions.length === i))!.state as any
    assert.equal((await byId.get(state.speaker)!.emit('room:action', { type: 'describe', text: `단서 ${i}` })).ok, true)
  }
  await a.until((s) => (s?.state as any)?.phase === 'vote')

  // 모두 라이어가 아닌 한 사람을 지목 → 라이어 승
  const liarId = [...byId.entries()].find(([, each]) => (each.state()!.state as any).iAmLiar)![0]
  const scapegoat = [...byId.keys()].find((id) => id !== liarId)!
  for (const [id, each] of byId) {
    const target = id === scapegoat ? [...byId.keys()].find((other) => other !== id && other !== liarId) ?? liarId : scapegoat
    await each.emit('room:action', { type: 'vote', target: id === scapegoat ? liarId : target })
  }
  const done = await a.until((s) => s?.phase === 'finished')
  const final = done!.state as any
  assert.equal(final.liar, liarId)
  assert.equal(final.word, word)
  await new Promise((resolve) => setTimeout(resolve, 100))
  assert.equal(reports.length, before + 1)
  const report = reports.at(-1)!
  assert.equal(report.signatureOk, true)
  assert.equal(report.body.game, 'liar')
  assert.equal(report.body.players.find((player: any) => player.role === 'liar').userId, liarId)
  for (const each of clients) await each.emit('room:leave')
})

test('퀴즈 배틀: 시작할 때 본 서버에서 자기 답을 받아 오고, 정답은 공개 전까지 오지 않는다', async () => {
  const before = reports.length
  const clients = [await client(USER_A), await client(USER_B), await client(USER_C)]
  const [a, b, c] = clients
  const byId = new Map([[USER_A.userId, a], [USER_B.userId, b], [USER_C.userId, c]])
  const { code } = await a.emit('room:create', { game: 'quiz' })
  await b.emit('room:join', { code })
  await c.emit('room:join', { code })

  // 본 서버가 자료를 못 주면 시작하지 않는다
  quizDataAvailable = false
  const failed = await a.emit('room:start')
  assert.equal(failed.ok, false)
  assert.match(failed.error!, /자료를 불러오지 못했습니다/)
  quizDataAvailable = true

  dataRequests.length = 0
  assert.equal((await a.emit('room:start')).ok, true)
  assert.equal(dataRequests.length, 1)
  assert.equal(dataRequests[0].signatureOk, true)
  assert.equal(dataRequests[0].body.need, 'quiz')
  assert.deepEqual([...dataRequests[0].body.userIds].sort(), [...byId.keys()].sort())

  for (let index = 0; index < 9; index++) {
    const snapshot = await a.until((s) => (s?.state as any)?.phase === 'question' && (s!.state as any).index === index)
    const view = snapshot!.state as any
    assert.equal(view.total, 9)
    assert.equal(view.reveal, null)
    assert.equal('truth' in view.question, false)
    assert.equal(JSON.stringify(snapshot).includes('"truth"'), false)

    assert.equal((await byId.get(view.question.subject)!.emit('room:action', { type: 'predict', value: 0 })).ok, true)
    for (const [id, each] of byId) {
      if (id === view.question.subject) {
        assert.equal((await each.emit('room:action', { type: 'answer', value: 0 })).ok, false)
        continue
      }
      const value = view.question.kind === 'number' ? view.question.min : 0
      assert.equal((await each.emit('room:action', { type: 'answer', value })).ok, true)
    }
    const revealed = await a.until((s) => (s?.state as any)?.phase === 'reveal')
    assert.equal(typeof (revealed!.state as any).reveal.truth, 'number')
    clock += 6_000
    rt.tick()
  }

  const penalty = (await a.until((s) => (s?.state as any)?.phase === 'penalty'))!.state as any
  assert.equal(typeof penalty.penalty, 'string')
  // 면제권은 다(USER_C)만 한 장 있다
  const loser = byId.get(penalty.loser)!
  const usePass = await loser.emit('room:action', { type: 'usePass' })
  assert.equal(usePass.ok, penalty.loser === USER_C.userId)
  if (!usePass.ok) assert.equal((await loser.emit('room:action', { type: 'acceptPenalty' })).ok, true)

  await a.until((s) => s?.phase === 'finished')
  await new Promise((resolve) => setTimeout(resolve, 100))
  assert.equal(reports.length, before + 1)
  const report = reports.at(-1)!.body
  assert.equal(report.game, 'quiz')
  assert.equal(report.summary.completed, true)
  assert.equal(report.summary.questions, 9)
  assert.equal(report.summary.passUsedBy, penalty.loser === USER_C.userId ? USER_C.userId : null)
  assert.equal(report.players.length, 3)
  for (const player of report.players) assert.equal(player.stats.asSubject, 3)
  for (const each of clients) await each.emit('room:leave')
})

test('캐치마인드: 출제자의 획만 다른 사람에게 전달되고, 늦게 접속한 사람은 지금까지의 그림을 받는다', async () => {
  const before = reports.length
  const a = await client(USER_A)
  const b = await client(USER_B)
  const c = await client(USER_C)
  const { code } = await a.emit('room:create', { game: 'catchmind' })
  await b.emit('room:join', { code })
  await c.emit('room:join', { code })
  assert.equal((await a.emit('room:start')).ok, true)
  await c.until((s) => s?.phase === 'playing')

  // 제시어는 출제자(가)에게만
  const word = (a.state()!.state as any).word
  assert.equal(typeof word, 'string')
  assert.equal((b.state()!.state as any).word, null)
  assert.equal(JSON.stringify(b.state()).includes(word), false)

  const received: Record<string, any[]> = { a: [], b: [], c: [] }
  a.socket.on('room:stream', (payload) => received.a.push(payload))
  b.socket.on('room:stream', (payload) => received.b.push(payload))
  c.socket.on('room:stream', (payload) => received.c.push(payload))

  assert.equal((await a.emit('room:stream', { t: 'stroke', id: 1, c: 2, w: 6, p: [10, 10, 20, 20] })).ok, true)
  assert.equal((await a.emit('room:stream', { t: 'stroke', id: 1, c: 2, w: 6, p: [30, 30] })).ok, true)
  // 출제자가 아닌 사람, 형식이 틀린 획은 받지 않는다
  assert.equal((await b.emit('room:stream', { t: 'stroke', id: 9, c: 0, w: 6, p: [1, 1, 2, 2] })).ok, false)
  assert.equal((await a.emit('room:stream', { t: 'stroke', id: 2, c: 0, w: 6, p: [1.5, 1, 2, 2] })).ok, false)
  await new Promise((resolve) => setTimeout(resolve, 80))
  assert.deepEqual(received.b, [
    { t: 'stroke', id: 1, c: 2, w: 6, p: [10, 10, 20, 20] },
    { t: 'stroke', id: 1, c: 2, w: 6, p: [30, 30] },
  ])
  assert.deepEqual(received.c, received.b)
  assert.deepEqual(received.a, []) // 보낸 사람에게는 되돌려 보내지 않는다

  // 다시 접속한 사람에게는 지금까지의 그림 전체가 간다
  c.socket.close()
  const snapshots: any[] = []
  const socket = connect(rtUrl, { auth: { token: token(USER_C) }, transports: ['websocket'], reconnection: false })
  open.push(socket)
  socket.on('room:stream', (payload) => snapshots.push(payload))
  await new Promise<void>((resolve) => socket.once('connect', () => resolve()))
  await new Promise((resolve) => setTimeout(resolve, 100))
  assert.deepEqual(snapshots, [{ t: 'full', round: 0, strokes: [{ id: 1, c: 2, w: 6, p: [10, 10, 20, 20, 30, 30] }] }])

  // 공백·대소문자를 무시하고 맞힌다. 맞힌 답은 다른 사람에게 가지 않는다.
  assert.equal((await b.emit('room:action', { type: 'guess', text: ` ${Array.from(word).join(' ')} ` })).ok, true)
  const seen = (await a.until((s) => (s?.state as any)?.correct.length === 1))!.state as any
  assert.deepEqual(seen.log.at(-1), { id: 1, userId: USER_B.userId, text: null, correct: true })

  // 끝까지 진행 (3명 → 6라운드)
  for (let i = 0; i < 12; i++) {
    clock += 80_000
    rt.tick()
    await new Promise((resolve) => setTimeout(resolve, 15))
  }
  await a.until((s) => s?.phase === 'finished')
  await new Promise((resolve) => setTimeout(resolve, 100))
  assert.equal(reports.length, before + 1)
  const report = reports.at(-1)!.body
  assert.equal(report.game, 'catchmind')
  assert.equal(report.summary.rounds, 6)
  assert.equal(report.players.find((player: any) => player.userId === USER_B.userId).stats.correct, 1)
  assert.equal(report.players.find((player: any) => player.userId === USER_A.userId).stats.drawnGuessed, 1)
  await a.emit('room:leave')
  await b.emit('room:leave')
  socket.close()
})

test('윷놀이: 서버가 윷을 던지고, 시작 옵션(팀전)이 전달되며, 시드는 화면에 가지 않는다', async () => {
  const before = reports.length
  const extra = { userId: '44444444-4444-4444-8444-444444444444', name: '라' }
  const clients = [await client(USER_A), await client(USER_B), await client(USER_C), await client(extra)]
  const [a] = clients
  const byId = new Map([USER_A, USER_B, USER_C, extra].map((user, index) => [user.userId, clients[index]]))
  const { code } = await a.emit('room:create', { game: 'yut' })
  for (const each of clients.slice(1)) await each.emit('room:join', { code })
  assert.equal((await a.emit('room:start', { options: { team: true } })).ok, true)

  let view = (await a.until((s) => s?.phase === 'playing'))!.state as any
  assert.equal(view.team, true)
  assert.deepEqual(view.sides.map((side: any) => side.members), [
    [USER_A.userId, USER_C.userId],
    [USER_B.userId, extra.userId],
  ])
  assert.equal('seed' in view, false)
  assert.equal((await byId.get(USER_B.userId)!.emit('room:action', { type: 'throw' })).ok, false) // 차례가 아님

  // 끝까지: 차례인 사람이 던지고, 둘 수 있는 첫 수를 둔다
  for (let guard = 0; guard < 3000; guard++) {
    const snapshot = a.state()!
    if (snapshot.phase === 'finished') break
    view = snapshot.state as any
    const me = byId.get(view.thrower)!
    const mine = me.state()!.state as any
    if (mine.phase === 'throw' && mine.thrower === view.thrower) await me.emit('room:action', { type: 'throw' })
    else if (mine.phase === 'move' && mine.moves.length) await me.emit('room:action', { type: 'move', pending: mine.moves[0].pending, piece: mine.moves[0].piece })
    await new Promise((resolve) => setTimeout(resolve, 2))
  }
  const done = (await a.until((s) => s?.phase === 'finished'))!.state as any
  assert.equal(done.sides[done.winner].pieces.every((piece: any) => piece.pos === 99), true)
  await new Promise((resolve) => setTimeout(resolve, 100))
  assert.equal(reports.length, before + 1)
  const report = reports.at(-1)!.body
  assert.equal(report.game, 'yut')
  assert.equal(report.summary.team, true)
  assert.equal(report.players.filter((player: any) => player.rank === 1).length, 2) // 이긴 팀 두 명
  assert.ok(report.summary.throws >= 20)
  for (const each of clients) await each.emit('room:leave')
})
