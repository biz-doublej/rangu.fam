'use client'

import React, { useState } from 'react'
import { Swords, Bot, Info } from 'lucide-react'
import { useBattle } from './useBattle'
import { BattleBoard } from './BattleBoard'
import { PRESETS, presetById, MEMBER_COLOR } from '@/lib/battle/presets'

export function BattleTab({ userId }: { userId?: string }) {
  void userId // 연습(오프라인) 모드는 계정 불필요. 영속/랭크는 서버 API(/api/cards/battle) 사용 예정.
  const { state, error, start, act, reset } = useBattle()
  const [myId, setMyId] = useState(PRESETS[0].id)
  const [oppId, setOppId] = useState(PRESETS[1].id)

  if (state) {
    return <BattleBoard state={state} error={error} act={act} onExit={reset} />
  }

  const begin = () => {
    const mine = presetById(myId)
    const opp = presetById(oppId)
    if (mine && opp) start(mine.deck, opp.deck)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#16172e] to-[#0c0d1c] p-6 text-white">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-amber-300" />
          <h3 className="text-lg font-black">랑구 배틀 · 연습 모드</h3>
        </div>
        <p className="mt-1 text-sm text-white/60">
          공격 토큰을 번갈아 주고받는 룬테라식 카드 배틀. AI와 한 판 둬보세요.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <DeckPicker title="내 덱" selected={myId} onSelect={setMyId} />
          <DeckPicker title="상대 (AI) 덱" icon={<Bot className="h-4 w-4" />} selected={oppId} onSelect={setOppId} />
        </div>

        <button
          onClick={begin}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-400 px-7 py-2.5 font-bold text-black transition hover:bg-amber-300"
        >
          <Swords className="h-4 w-4" /> 대전 시작
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-ink-500/15 bg-paper-50/70 px-4 py-3 text-xs leading-relaxed text-ink-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" />
        <p>
          지금은 <strong className="text-ink-500">브라우저에서 엔진을 직접 구동하는 연습 모드</strong>예요(서버·계정 불필요).
          전적·랭킹·멤버 간 PvP는 서버 배포 후 활성화됩니다. 일격·잠행·속공·흡혈 등 키워드와 주문(즉발/순간)이 모두 동작합니다.
        </p>
      </div>
    </div>
  )
}

function DeckPicker({
  title, icon, selected, onSelect,
}: {
  title: string
  icon?: React.ReactNode
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white/80">
        {icon} {title}
      </p>
      <div className="space-y-2">
        {PRESETS.map((p) => {
          const active = selected === p.id
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
                active ? 'border-amber-300 bg-amber-300/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div>
                <p className="text-sm font-bold text-white">{p.name}</p>
                <p className="text-[11px] text-white/50">{p.subtitle}</p>
              </div>
              <div className="flex gap-1">
                {p.members.map((m) => (
                  <span key={m} className="h-3 w-3 rounded-full" style={{ background: MEMBER_COLOR[m] }} />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
