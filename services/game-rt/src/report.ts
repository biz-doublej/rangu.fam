import { createHmac } from 'crypto'
import type { MatchResult } from '../../../src/games/rooms/base'

/**
 * 판 결과를 본 서버(rangu-fam)에 보고한다.
 * POST {RANGU_FAM_URL}/api/gamecenter/internal/match-result
 * 헤더 X-GC-Signature = HMAC-SHA256(본문, GC_INTERNAL_SECRET)
 *
 * 이 서버는 DB 에 직접 붙지 않는다 — 포인트는 본 서버만 움직인다.
 * 본 서버는 matchId 로 중복을 걸러 주므로, 실패하면 같은 본문을 다시 보내도 안전하다.
 */

export interface ReportResponse {
  duplicate: boolean
  rewards: Record<string, number>
}

export type Reporter = (match: MatchResult) => Promise<ReportResponse | null>

const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000]

export function createReporter(opts: { ranguFamUrl: string; internalSecret: string; retryDelays?: number[] }): Reporter {
  const url = `${opts.ranguFamUrl}/api/gamecenter/internal/match-result`
  const delays = opts.retryDelays ?? RETRY_DELAYS_MS

  return async (match) => {
    const body = JSON.stringify(match)
    const signature = createHmac('sha256', opts.internalSecret).update(body).digest('hex')

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-gc-signature': signature },
          body,
        })
        if (response.ok) {
          const data = (await response.json()) as Partial<ReportResponse>
          return { duplicate: Boolean(data.duplicate), rewards: data.rewards ?? {} }
        }
        // 형식·서명 오류는 다시 보내도 같다
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          console.error(`[report] ${match.matchId} 거절됨 (${response.status})`)
          return null
        }
        console.error(`[report] ${match.matchId} 실패 (${response.status}), 다시 시도`)
      } catch (error) {
        console.error(`[report] ${match.matchId} 전송 오류, 다시 시도:`, (error as Error).message)
      }
      if (attempt < delays.length) await new Promise((resolve) => setTimeout(resolve, delays[attempt]))
    }
    console.error(`[report] ${match.matchId} 보고 포기 — 결과: ${body}`)
    return null
  }
}

export type GameDataFetcher = (need: string, userIds: string[]) => Promise<unknown | null>

/**
 * 판을 시작하기 전에 필요한 자료(퀴즈의 자기 답 등)를 본 서버에서 받아 온다.
 * POST {RANGU_FAM_URL}/api/gamecenter/internal/game-data — 서명은 결과 보고와 같다.
 */
export function createGameDataFetcher(opts: { ranguFamUrl: string; internalSecret: string }): GameDataFetcher {
  const url = `${opts.ranguFamUrl}/api/gamecenter/internal/game-data`
  return async (need, userIds) => {
    const body = JSON.stringify({ need, userIds })
    const signature = createHmac('sha256', opts.internalSecret).update(body).digest('hex')
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-gc-signature': signature },
          body,
        })
        if (response.ok) return ((await response.json()) as { data?: unknown }).data ?? null
        console.error(`[game-data] ${need} 실패 (${response.status})`)
        if (response.status < 500) return null
      } catch (error) {
        console.error(`[game-data] ${need} 전송 오류:`, (error as Error).message)
      }
    }
    return null
  }
}
