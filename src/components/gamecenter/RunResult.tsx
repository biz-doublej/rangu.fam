'use client'

import React from 'react'
import { reasonLabel } from '@/lib/gamecenter/games'

export interface RunFinish {
  alreadyFinished: boolean
  status: 'verified' | 'rejected'
  rejectReason?: 'invalid_inputs' | 'score_mismatch' | 'too_fast' | 'expired'
  score: number | null
  result: Record<string, any> | null
  awards: Array<{ reason: string; amount: number; clipped: number }>
  awarded: number
  balance: number
  personalBest: boolean
}

const REJECT_TEXT: Record<string, string> = {
  invalid_inputs: '입력 기록의 형식이 올바르지 않습니다.',
  score_mismatch: '서버가 다시 실행한 결과와 점수가 다릅니다.',
  too_fast: '기록의 길이가 실제로 흐른 시간보다 깁니다.',
  expired: '시작한 지 너무 오래된 판입니다.',
}

/** 서버 검증 결과와 받은 포인트 */
export function RunAwards({ finish }: { finish: RunFinish }) {
  if (finish.status === 'rejected') {
    return (
      <p role="alert" className="wiki-mbox wiki-mbox--danger">
        이 판은 기록으로 인정되지 않았습니다. {REJECT_TEXT[finish.rejectReason || ''] || ''}
      </p>
    )
  }
  if (finish.awards.length === 0) {
    return <p className="text-sm text-[color:var(--wiki-ink-muted)]">이번 판에서 받은 포인트는 없습니다.</p>
  }
  return (
    <ul className="space-y-1 text-sm">
      {finish.awards.map((award, index) => (
        <li key={index} className="flex justify-between gap-3">
          <span className="text-[color:var(--wiki-ink-soft)]">
            {reasonLabel(award.reason)}
            {award.clipped > 0 && <span className="text-[color:var(--wiki-ink-muted)]"> (하루 상한으로 {award.clipped}P 줄어듦)</span>}
          </span>
          <span className="font-semibold tabular-nums text-[color:var(--wiki-success)]">+{award.amount}P</span>
        </li>
      ))}
      <li className="flex justify-between gap-3 border-t border-[color:var(--wiki-rule)] pt-1 font-semibold text-[color:var(--wiki-ink)]">
        <span>합계</span>
        <span className="tabular-nums">+{finish.awarded}P</span>
      </li>
    </ul>
  )
}
