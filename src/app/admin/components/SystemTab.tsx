'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Play, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { BUTTON_CLASS, Badge, DANGER_BUTTON_CLASS, INPUT_CLASS, Panel, jsonInit, requestJson } from './adminUi'
import type { DashboardData } from './OverviewTab'

interface MaintenanceTask {
  key: string
  label: string
  description: string
  /** 다시 실행해도 되는 작업 */
  repeatable?: boolean
  isDone: (data: any) => boolean | null
}

const TASKS: MaintenanceTask[] = [
  {
    key: 'admin-tools',
    label: '관리자 도구 표',
    description: '신고와 위키 공지를 저장하는 표를 만듭니다.',
    isDone: (data) => Boolean(data.status?.reports && data.status?.notices),
  },
  {
    key: 'user-settings',
    label: '계정 설정 표',
    description: '네이버 연결, 표시 이름 변경, 로그인 내역에 필요한 칸을 만듭니다.',
    isDone: (data) => Boolean(data.status?.loginEvents && data.status?.userColumns),
  },
  {
    key: 'wiki-ads',
    label: '위키 광고 표',
    description: '광고 표를 만들고, 비어 있으면 첫 광고 2개를 등록합니다.',
    isDone: (data) => Boolean(data.tableExists),
  },
  {
    key: 'wiki-stats',
    label: '일별 조회수 표',
    description: '인기 문서와 연보에 쓰는 일별 조회수 표를 만듭니다.',
    isDone: (data) => Boolean(data.wikiPageViewDailyExists),
  },
  {
    key: 'wiki-features',
    label: '투표 표',
    description: '문서 투표 기능에 쓰는 표를 만듭니다.',
    isDone: (data) => Boolean(data.wikiPollVotesExists),
  },
  {
    key: 'recompute-links',
    label: '역링크 다시 계산',
    description: '문서 사이의 링크 정보를 다시 계산합니다. 링크 목록이 이상할 때 실행하세요.',
    repeatable: true,
    isDone: () => null,
  },
]

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`
}

function MaintenanceRow({ task }: { task: MaintenanceTask }) {
  const [state, setState] = useState<boolean | null | 'loading' | 'error'>('loading')
  const [running, setRunning] = useState(false)

  const check = useCallback(async () => {
    // 다시 실행하는 작업은 확인 요청 자체가 무거우므로 상태를 묻지 않는다.
    if (task.repeatable) {
      setState(null)
      return
    }
    setState('loading')
    try {
      setState(task.isDone(await requestJson(`/api/admin/maintenance/${task.key}`)))
    } catch {
      setState('error')
    }
  }, [task])

  useEffect(() => {
    check()
  }, [check])

  const run = async () => {
    if (!window.confirm(`"${task.label}" 작업을 실행할까요?`)) return
    setRunning(true)
    try {
      const data = await requestJson(`/api/admin/maintenance/${task.key}?confirm=1`)
      toast.success(data.message || '작업을 완료했습니다.')
      check()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-100">{task.label}</span>
          {state === 'loading' ? (
            <Badge>확인 중</Badge>
          ) : state === 'error' ? (
            <Badge tone="rose">확인 실패</Badge>
          ) : state === true ? (
            <Badge tone="emerald">적용됨</Badge>
          ) : state === false ? (
            <Badge tone="amber">적용 필요</Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-slate-500">{task.description}</p>
      </div>
      <button
        type="button"
        className={BUTTON_CLASS}
        disabled={running || (state === true && !task.repeatable)}
        onClick={run}
      >
        <Play className="h-3.5 w-3.5" />
        {running ? '실행 중' : '실행'}
      </button>
    </li>
  )
}

function DangerAction({ title, description, endpoint, confirmText }: { title: string; description: string; endpoint: string; confirmText: string }) {
  const [typed, setTyped] = useState('')
  const [running, setRunning] = useState(false)

  const run = async () => {
    setRunning(true)
    try {
      const data = await requestJson(endpoint, jsonInit('POST', { confirm: true, confirmText: typed }))
      toast.success(data.message || '완료했습니다.')
      setTyped('')
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="rounded-md border border-rose-500/30 p-3 text-xs">
      <p className="text-sm font-medium text-rose-200">{title}</p>
      <p className="mt-0.5 text-slate-400">{description}</p>
      <div className="mt-2 flex gap-2">
        <input
          className={INPUT_CLASS}
          placeholder={`확인하려면 "${confirmText}" 입력`}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
        <button type="button" className={DANGER_BUTTON_CLASS} disabled={typed !== confirmText || running} onClick={run}>
          실행
        </button>
      </div>
    </div>
  )
}

export function SystemTab({ data, onRefresh }: { data: DashboardData | null; onRefresh: () => void }) {
  const system = data?.system
  const rows: Array<[string, string]> = system
    ? [
        ['운영 버전', system.revision],
        ['DB 응답', `${system.dbLatencyMs}ms`],
        ['현재 인스턴스 가동', formatUptime(system.instanceUptimeSeconds)],
        ['메모리 사용', `${system.memoryMb}MB`],
        ['Node.js', system.nodeVersion],
        ['업로드 이미지', `${data!.stats.images.total}개 · ${(data!.stats.images.bytes / 1024 / 1024).toFixed(1)}MB`],
      ]
    : []

  return (
    <div className="space-y-4">
      <Panel
        title="서버 상태"
        description="지금 응답한 서버 인스턴스 기준입니다. 인스턴스는 요청이 없으면 꺼졌다가 다시 켜집니다."
        actions={
          <button type="button" className={BUTTON_CLASS} onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
            새로고침
          </button>
        }
      >
        <dl className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-md bg-slate-900 p-2.5">
              <dt className="text-slate-500">{label}</dt>
              <dd className="mt-0.5 break-all font-mono text-slate-200">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="유지보수 작업" description="배포 후 DB에 표나 칸을 추가하는 작업입니다. 모두 여러 번 실행해도 안전합니다.">
        <ul className="divide-y divide-slate-800">
          {TASKS.map((task) => (
            <MaintenanceRow key={task.key} task={task} />
          ))}
        </ul>
      </Panel>

      <Panel title="위험 작업" description="되돌릴 수 없습니다. 확인 문구를 정확히 입력해야 실행됩니다.">
        <div className="grid gap-3 lg:grid-cols-2">
          <DangerAction
            title="랭킹·통계 초기화"
            description="모든 회원의 편집 수, 생성 문서 수, 토론 수, 평판을 0으로 만듭니다."
            endpoint="/api/admin/reset-rankings"
            confirmText="랭킹초기화"
          />
          <DangerAction
            title="검수 큐 초기화"
            description="대기·보류·처리 완료를 포함한 모든 제출 기록을 지웁니다."
            endpoint="/api/admin/reset-submissions"
            confirmText="검수큐초기화"
          />
        </div>
      </Panel>
    </div>
  )
}
