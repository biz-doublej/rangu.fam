'use client'

import React, { useMemo, useState } from 'react'
import { sortRowOrder } from '@/lib/tableColors'

export type TableSort = { column: number; direction: 1 | -1 } | null

/**
 * <정렬버튼> 표 — 머리글 줄은 그대로 두고 그 아래 줄들을 고른 열로 정렬한다.
 * 같은 열을 다시 누르면 오름차순 → 내림차순 → 원래 순서.
 * 칸 내용은 렌더러가 미리 그려 넘기므로(각주 번호가 문서 순서를 따르게) 여기서는 줄 순서만 바꾼다.
 */
export function WikiSortableTable({
  className,
  style,
  renderHead,
  bodyRows,
  sortKeys,
}: {
  className: string
  style: React.CSSProperties
  renderHead: (sort: TableSort, onSort: (column: number) => void) => React.ReactNode
  bodyRows: React.ReactElement[]
  /** 아래 줄마다 열별 정렬 글자 */
  sortKeys: string[][]
}) {
  const [sort, setSort] = useState<TableSort>(null)

  const order = useMemo(
    () => (sort ? sortRowOrder(sortKeys, sort.column, sort.direction) : sortKeys.map((_, index) => index)),
    [sort, sortKeys]
  )

  const onSort = (column: number) =>
    setSort((current) =>
      current?.column !== column ? { column, direction: 1 } : current.direction === 1 ? { column, direction: -1 } : null
    )

  return (
    <table className={`${className} wiki-sortable`} style={style}>
      <tbody>
        {renderHead(sort, onSort)}
        {order.map((index) => bodyRows[index])}
      </tbody>
    </table>
  )
}
