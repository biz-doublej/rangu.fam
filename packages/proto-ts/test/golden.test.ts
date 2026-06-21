import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { ServerMessage } from '../src/gen/rangu/tactics/v1/service'
import { Zone } from '../src/gen/rangu/tactics/v1/common'
import { GamePhase } from '../src/gen/rangu/tactics/v1/state'

// 실제 .NET 서버가 라이브 E2E 에서 쏜 ServerMessage 바이너리.
// 이걸 "생성된 TS 타입"으로 파싱 → 타입 드리프트(서버 C# ↔ 클라 TS) 0 검증.
const here = dirname(fileURLToPath(import.meta.url))
// 실제 서버가 라이브 E2E 에서 쏜 ServerMessage 바이너리 (커밋된 골든 fixture).
const bin = new Uint8Array(readFileSync(resolve(here, 'fixtures/server-snapshot.bin')))
const msg = ServerMessage.decode(bin)

describe('golden: 실제 서버 스냅샷이 생성 TS 타입으로 무손실 파싱되는가', () => {
  it('ServerMessage → snapshot 디코드 성공', () => {
    expect(msg.snapshot).toBeDefined()
  })

  it('phase=ACTION, round=1, viewer=seat0', () => {
    const s = msg.snapshot!
    expect(s.phase).toBe(GamePhase.PHASE_ACTION)
    expect(s.roundNumber).toBe(1)
    expect(s.viewer?.seat).toBe(0)
    expect(s.players.length).toBe(2)
  })

  it('🔒 마스킹: 상대(seat1) 손패=hidden, 내(seat0) 손패=revealed', () => {
    const s = msg.snapshot!
    const oppHand = s.cards.filter((c) => c.controller?.seat === 1 && c.zone === Zone.ZONE_HAND)
    expect(oppHand.length).toBeGreaterThan(0)
    expect(oppHand.every((c) => c.hidden !== undefined && c.revealed === undefined)).toBe(true)

    const myHand = s.cards.filter((c) => c.controller?.seat === 0 && c.zone === Zone.ZONE_HAND)
    expect(myHand.length).toBeGreaterThan(0)
    expect(myHand.every((c) => c.revealed !== undefined)).toBe(true)
  })

  it('내 유닛이 보드에 반영(state) — definitionId 공개', () => {
    const s = msg.snapshot!
    const myBoard = s.cards.filter((c) => c.controller?.seat === 0 && c.zone === Zone.ZONE_BATTLEFIELD)
    expect(myBoard.length).toBeGreaterThan(0)
    expect(myBoard[0].revealed?.definitionId).toBeTruthy()
  })

  it('상대 손패 definitionId 가 와이어에 전혀 없음(보안)', () => {
    const s = msg.snapshot!
    const leaked = s.cards.some((c) => c.controller?.seat === 1 && c.zone === Zone.ZONE_HAND && c.revealed !== undefined)
    expect(leaked).toBe(false)
  })
})
