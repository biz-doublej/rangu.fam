import {
  SUB,
  applyClimbAction,
  createClimb,
  stepClimb,
  type ClimbAction,
  type ClimbInput,
  type ClimbMap,
  type ClimbState,
} from './engine'

/**
 * 맵이 실제로 완주 가능한지 엔진으로 탐색한다 (테스트와 맵 생성 스크립트가 쓴다).
 * "조금 걷고 → 힘을 모아 뛴다"를 한 수로 보고, 더 높은 발판부터 넓혀 가며 정상까지의 입력 기록을 찾는다.
 */

interface Node {
  state: ClimbState
  inputs: ClimbInput[]
}

const WALKS = [0, 6, 12, 20, 32, 48, 70]
const CHARGES = [4, 8, 12, 16, 20, 24, 28, 32, 36]

function act(node: Node, map: ClimbMap, action: ClimbAction) {
  node.inputs.push({ frame: node.state.frame, action })
  applyClimbAction(node.state, action)
}

function run(node: Node, map: ClimbMap, ticks: number) {
  for (let i = 0; i < ticks && !node.state.over; i++) stepClimb(node.state, map)
}

/** 발판 위에서 완전히 멈출 때까지 기다린다 (얼음 미끄러짐·낙하 포함) */
function settle(node: Node, map: ClimbMap) {
  for (let i = 0; i < 900 && !node.state.over; i++) {
    if (node.state.ground >= 0 && node.state.vx === 0) return
    stepClimb(node.state, map)
  }
}

function clone(node: Node): Node {
  return { state: { ...node.state }, inputs: [...node.inputs] }
}

export interface ClimbSolution {
  inputs: ClimbInput[]
  /** 탐색하며 서 본 발판 수 */
  explored: number
}

export function solveClimb(map: ClimbMap, maxExpansions = 4000): ClimbSolution | null {
  const start: Node = { state: createClimb(map), inputs: [] }
  const open: Node[] = [start]
  const seen = new Set<string>()
  const keyOf = (state: ClimbState) => `${state.ground}:${Math.floor(state.x / (SUB * 10))}`
  seen.add(keyOf(start.state))
  let expansions = 0

  while (open.length && expansions < maxExpansions) {
    // 가장 높이 올라간 상태부터 넓힌다
    let bestIndex = 0
    for (let i = 1; i < open.length; i++) if (open[i].state.y < open[bestIndex].state.y) bestIndex = i
    const node = open.splice(bestIndex, 1)[0]
    expansions++

    for (const walkDir of [-1, 1]) {
      for (const walk of WALKS) {
        if (walk === 0 && walkDir === 1) continue
        const walked = clone(node)
        if (walk > 0) {
          act(walked, map, walkDir < 0 ? 'leftOn' : 'rightOn')
          run(walked, map, walk)
          act(walked, map, walkDir < 0 ? 'leftOff' : 'rightOff')
          settle(walked, map)
          if (walked.state.ground !== node.state.ground) continue // 걷다가 떨어지는 수는 버린다
        }
        for (const jumpDir of [-1, 0, 1]) {
          for (const charge of CHARGES) {
            const next = clone(walked)
            if (jumpDir) act(next, map, jumpDir < 0 ? 'leftOn' : 'rightOn')
            act(next, map, 'jumpOn')
            run(next, map, charge)
            act(next, map, 'jumpOff')
            run(next, map, 2)
            if (jumpDir) act(next, map, jumpDir < 0 ? 'leftOff' : 'rightOff')
            settle(next, map)
            if (next.state.completedAt !== null) {
              // 화면과 같은 규칙: 기록은 끝난 프레임의 'end' 로 닫는다
              next.inputs.push({ frame: next.state.frame, action: 'end' })
              return { inputs: next.inputs, explored: seen.size }
            }
            if (next.state.over || next.state.ground < 0) continue
            // 더 높은 곳으로 간 수만 넓힌다 (떨어지는 수는 볼 필요가 없다)
            if (next.state.y >= node.state.y) continue
            const key = keyOf(next.state)
            if (seen.has(key)) continue
            seen.add(key)
            open.push(next)
          }
        }
      }
    }
  }
  return null
}
