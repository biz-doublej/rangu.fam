'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Pause, RefreshCw, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BUTTON_CLASS,
  DANGER_BUTTON_CLASS,
  EmptyState,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  Panel,
  formatDateTime,
  jsonInit,
  requestJson,
} from './adminUi'

type Status = 'pending' | 'onhold' | 'approved' | 'rejected'

interface Submission {
  id: string
  type: 'create' | 'edit'
  status: Status
  targetTitle: string
  author: string
  content: string
  summary: string | null
  editSummary: string | null
  reason: string | null
  reviewedBy: string | null
  createdAt: string
}

const STATUS_TABS: Array<{ key: Status; label: string }> = [
  { key: 'pending', label: '대기' },
  { key: 'onhold', label: '보류' },
  { key: 'approved', label: '승인됨' },
  { key: 'rejected', label: '반려됨' },
]

function SubmissionItem({ submission, onDone }: { submission: Submission; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const actionable = submission.status === 'pending' || submission.status === 'onhold'

  const act = async (action: 'approve' | 'reject' | 'hold') => {
    if (action !== 'approve' && !reason.trim()) {
      toast.error('반려하거나 보류할 때는 사유를 적어 주세요.')
      return
    }
    setBusy(true)
    try {
      const data = await requestJson('/api/wiki/mod', jsonInit('POST', { action, submissionId: submission.id, reason }))
      toast.success(data.message || '처리했습니다.')
      onDone()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-md border border-slate-800 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-100">
            <span className="mr-1.5 text-[10px] text-slate-500">{submission.type === 'create' ? '새 문서' : '수정'}</span>
            {submission.targetTitle}
          </p>
          <p className="text-xs text-slate-500">
            {submission.author} · {formatDateTime(submission.createdAt)}
            {submission.editSummary || submission.summary ? ` · ${submission.editSummary || submission.summary}` : ''}
          </p>
          {submission.reason && (
            <p className="mt-1 text-xs text-amber-300">
              사유: {submission.reason}
              {submission.reviewedBy ? ` (${submission.reviewedBy})` : ''}
            </p>
          )}
        </div>
        <button type="button" className={BUTTON_CLASS} onClick={() => setOpen((value) => !value)}>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          내용
        </button>
      </div>

      {open && (
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-3 text-xs text-slate-300">
          {submission.content}
        </pre>
      )}

      {actionable && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className={INPUT_CLASS}
            placeholder="반려·보류 사유 (승인은 비워도 됩니다)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <div className="flex shrink-0 gap-2">
            <button type="button" disabled={busy} className={PRIMARY_BUTTON_CLASS} onClick={() => act('approve')}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              승인
            </button>
            {submission.status === 'pending' && (
              <button type="button" disabled={busy} className={BUTTON_CLASS} onClick={() => act('hold')}>
                <Pause className="h-3.5 w-3.5" />
                보류
              </button>
            )}
            <button type="button" disabled={busy} className={DANGER_BUTTON_CLASS} onClick={() => act('reject')}>
              <XCircle className="h-3.5 w-3.5" />
              반려
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

export function ReviewTab() {
  const [status, setStatus] = useState<Status>('pending')
  const [items, setItems] = useState<Submission[] | null>(null)

  const load = useCallback(async () => {
    setItems(null)
    try {
      const data = await requestJson(`/api/wiki/mod?status=${status}`)
      setItems(data.submissions || [])
    } catch (error) {
      toast.error((error as Error).message)
      setItems([])
    }
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Panel
      title="편집 검수"
      description="제출된 문서를 승인하면 바로 위키에 반영됩니다. 보류한 문서도 나중에 승인하거나 반려할 수 있습니다."
      actions={
        <button type="button" className={BUTTON_CLASS} onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatus(tab.key)}
            className={`rounded-md px-2.5 py-1 text-xs ${
              status === tab.key ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {items === null ? (
        <EmptyState>불러오는 중입니다.</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState>해당하는 문서가 없습니다.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {items.map((submission) => (
            <SubmissionItem key={submission.id} submission={submission} onDone={load} />
          ))}
        </ul>
      )}
    </Panel>
  )
}
