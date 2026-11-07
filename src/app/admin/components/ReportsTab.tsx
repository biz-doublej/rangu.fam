'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { BUTTON_CLASS, Badge, EmptyState, Panel, formatDateTime, jsonInit, requestJson } from './adminUi'

interface Report {
  id: string
  pageTitle: string
  reason: string
  reporter: string
  status: 'open' | 'resolved'
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
}

const FILTERS = [
  { key: 'open', label: '처리 전' },
  { key: 'resolved', label: '처리 완료' },
  { key: 'all', label: '전체' },
] as const

export function ReportsTab() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('open')
  const [reports, setReports] = useState<Report[] | null>(null)

  const load = useCallback(async () => {
    setReports(null)
    try {
      const data = await requestJson(`/api/wiki/mod/reports?status=${filter}`)
      setReports(data.reports || [])
    } catch (error) {
      toast.error((error as Error).message)
      setReports([])
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (report: Report, status: 'open' | 'resolved') => {
    try {
      await requestJson('/api/wiki/mod/reports', jsonInit('PATCH', { id: report.id, status }))
      toast.success(status === 'resolved' ? '처리 완료로 바꿨습니다.' : '다시 열었습니다.')
      load()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <Panel
      title="문서 신고"
      description="회원이 문서 화면에서 보낸 신고입니다. 문서를 고친 뒤 처리 완료로 바꿔 주세요."
      actions={
        <button type="button" className={BUTTON_CLASS} onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-md px-2.5 py-1 text-xs ${
              filter === item.key ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {reports === null ? (
        <EmptyState>불러오는 중입니다.</EmptyState>
      ) : reports.length === 0 ? (
        <EmptyState>신고가 없습니다.</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-800">
          {reports.map((report) => (
            <li key={report.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 text-xs">
                <div className="flex items-center gap-2">
                  <a
                    href={`/wiki/${encodeURIComponent(report.pageTitle)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-slate-100 hover:text-cyan-300"
                  >
                    {report.pageTitle}
                  </a>
                  <Badge tone={report.status === 'open' ? 'amber' : 'emerald'}>
                    {report.status === 'open' ? '처리 전' : '처리 완료'}
                  </Badge>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-slate-300">{report.reason}</p>
                <p className="mt-1 text-slate-500">
                  {report.reporter} · {formatDateTime(report.createdAt)}
                  {report.resolvedBy ? ` · ${report.resolvedBy} 처리` : ''}
                </p>
              </div>
              <button
                type="button"
                className={BUTTON_CLASS}
                onClick={() => setStatus(report, report.status === 'open' ? 'resolved' : 'open')}
              >
                {report.status === 'open' ? '처리 완료' : '다시 열기'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
