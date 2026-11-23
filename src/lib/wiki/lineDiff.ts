/**
 * 줄 단위 비교 — 변환 전후 비교 화면용. 같은 줄은 그대로, 지운 줄과 새 줄을 표시한다.
 * 아주 긴 글(줄 수 곱이 너무 큰 경우)은 비교하지 않고 null 을 돌려준다.
 */

export type DiffRow = { kind: 'same' | 'removed' | 'added'; text: string }

const MAX_CELLS = 4_000_000

export function lineDiff(before: string, after: string): DiffRow[] | null {
  const a = (before || '').split('\n')
  const b = (after || '').split('\n')
  if (a.length * b.length > MAX_CELLS) return null

  // 가장 긴 공통 부분 (뒤에서부터 채운 표)
  const width = b.length + 1
  const table = new Uint32Array((a.length + 1) * width)
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * width + j] =
        a[i] === b[j] ? table[(i + 1) * width + j + 1] + 1 : Math.max(table[(i + 1) * width + j], table[i * width + j + 1])
    }
  }

  const rows: DiffRow[] = []
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      rows.push({ kind: 'same', text: a[i] })
      i++
      j++
    } else if (j < b.length && (i >= a.length || table[i * width + j + 1] >= table[(i + 1) * width + j])) {
      rows.push({ kind: 'added', text: b[j++] })
    } else {
      rows.push({ kind: 'removed', text: a[i++] })
    }
  }
  return rows
}
