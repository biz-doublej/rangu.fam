'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BUTTON_CLASS,
  Badge,
  DANGER_BUTTON_CLASS,
  EmptyState,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  Panel,
  formatDateTime,
  jsonInit,
  requestJson,
} from './adminUi'

interface Notice {
  id: string
  message: string
  linkUrl: string | null
  tone: 'info' | 'warning' | 'success'
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  createdBy: string | null
  createdAt: string
}

interface Draft {
  message: string
  linkUrl: string
  tone: Notice['tone']
  isActive: boolean
  startsAt: string
  endsAt: string
}

const TONES: Array<{ key: Notice['tone']; label: string }> = [
  { key: 'info', label: '안내' },
  { key: 'warning', label: '주의' },
  { key: 'success', label: '소식' },
]

const EMPTY: Draft = { message: '', linkUrl: '', tone: 'info', isActive: true, startsAt: '', endsAt: '' }

function toLocalInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function toPayload(draft: Draft) {
  return {
    ...draft,
    startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
    endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
  }
}

function NoticeForm({ draft, onChange, children }: { draft: Draft; onChange: (draft: Draft) => void; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <input
        className={INPUT_CLASS}
        placeholder="공지 내용 (200자 이내)"
        maxLength={200}
        value={draft.message}
        onChange={(event) => onChange({ ...draft, message: event.target.value })}
      />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className={INPUT_CLASS}
          placeholder="연결할 주소 (선택, https:// 또는 /wiki/...)"
          value={draft.linkUrl}
          onChange={(event) => onChange({ ...draft, linkUrl: event.target.value })}
        />
        <select
          aria-label="공지 종류"
          className="rounded-md border border-adm-rule bg-adm-well px-2 text-[13px] text-adm-ink"
          value={draft.tone}
          onChange={(event) => onChange({ ...draft, tone: event.target.value as Notice['tone'] })}
        >
          {TONES.map((tone) => (
            <option key={tone.key} value={tone.key}>
              {tone.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-adm-muted">
          시작 (비우면 바로)
          <input
            type="datetime-local"
            className={`${INPUT_CLASS} mt-1`}
            value={draft.startsAt}
            onChange={(event) => onChange({ ...draft, startsAt: event.target.value })}
          />
        </label>
        <label className="text-xs text-adm-muted">
          종료 (비우면 계속)
          <input
            type="datetime-local"
            className={`${INPUT_CLASS} mt-1`}
            value={draft.endsAt}
            onChange={(event) => onChange({ ...draft, endsAt: event.target.value })}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-[13px] text-adm-soft">
          <input type="checkbox" checked={draft.isActive} onChange={(event) => onChange({ ...draft, isActive: event.target.checked })} />
          노출
        </label>
        <div className="flex gap-2">{children}</div>
      </div>
    </div>
  )
}

function NoticeItem({ notice, onChanged }: { notice: Notice; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft>({
    message: notice.message,
    linkUrl: notice.linkUrl || '',
    tone: notice.tone,
    isActive: notice.isActive,
    startsAt: toLocalInput(notice.startsAt),
    endsAt: toLocalInput(notice.endsAt),
  })

  const save = async (body: unknown) => {
    try {
      await requestJson(`/api/admin/notices/${notice.id}`, jsonInit('PATCH', body))
      toast.success('공지를 저장했습니다.')
      setEditing(false)
      onChanged()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const remove = async () => {
    if (!window.confirm('이 공지를 삭제할까요?')) return
    try {
      await requestJson(`/api/admin/notices/${notice.id}`, { method: 'DELETE' })
      toast.success('공지를 삭제했습니다.')
      onChanged()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  if (editing) {
    return (
      <li className="rounded-md border border-adm-accent/40 p-3">
        <NoticeForm draft={draft} onChange={setDraft}>
          <button type="button" className={BUTTON_CLASS} onClick={() => setEditing(false)}>
            취소
          </button>
          <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => save(toPayload(draft))}>
            저장
          </button>
        </NoticeForm>
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-adm-rule p-3 text-[13px]">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Badge tone={notice.tone === 'warning' ? 'amber' : notice.tone === 'success' ? 'emerald' : 'cyan'}>
            {TONES.find((tone) => tone.key === notice.tone)?.label}
          </Badge>
          {!notice.isActive && <Badge>숨김</Badge>}
        </div>
        <p className="mt-1 text-sm text-adm-ink">{notice.message}</p>
        <p className="mt-0.5 text-adm-muted">
          {notice.linkUrl ? `${notice.linkUrl} · ` : ''}
          {notice.startsAt || notice.endsAt
            ? `${formatDateTime(notice.startsAt)} ~ ${formatDateTime(notice.endsAt)}`
            : '기간 제한 없음'}
        </p>
      </div>
      <div className="flex gap-1.5">
        <button type="button" className={BUTTON_CLASS} onClick={() => save({ isActive: !notice.isActive })}>
          {notice.isActive ? '숨기기' : '노출'}
        </button>
        <button type="button" className={BUTTON_CLASS} onClick={() => setEditing(true)}>
          수정
        </button>
        <button type="button" className={DANGER_BUTTON_CLASS} onClick={remove} aria-label="삭제">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  )
}

export function NoticesTab() {
  const [notices, setNotices] = useState<Notice[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)

  const load = useCallback(async () => {
    try {
      const data = await requestJson('/api/admin/notices')
      setNotices(data.notices)
      setLoadError('')
    } catch {
      setNotices([])
      setLoadError('공지를 불러오지 못했습니다. 유지보수 탭에서 관리자 도구 표를 먼저 만들어 주세요.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const create = async () => {
    try {
      await requestJson('/api/admin/notices', jsonInit('POST', toPayload(draft)))
      toast.success('공지를 추가했습니다.')
      setDraft(EMPTY)
      setCreating(false)
      load()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <Panel
      title="위키 공지"
      description="노출 중인 공지는 위키 모든 페이지 상단에 보입니다. 회원이 닫으면 그 공지는 다시 보이지 않습니다."
      actions={
        <button type="button" className={BUTTON_CLASS} onClick={() => setCreating((value) => !value)}>
          <Plus className="h-3.5 w-3.5" />
          공지 추가
        </button>
      }
    >
      {loadError && <p className="mb-3 text-[13px] text-adm-warn">{loadError}</p>}
      {creating && (
        <div className="mb-3 rounded-md border border-adm-accent/40 p-3">
          <NoticeForm draft={draft} onChange={setDraft}>
            <button type="button" className={BUTTON_CLASS} onClick={() => setCreating(false)}>
              취소
            </button>
            <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={create}>
              추가
            </button>
          </NoticeForm>
        </div>
      )}
      {notices === null ? (
        <EmptyState>불러오는 중입니다.</EmptyState>
      ) : notices.length === 0 && !loadError ? (
        <EmptyState>등록된 공지가 없습니다.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {notices.map((notice) => (
            <NoticeItem key={notice.id} notice={notice} onChanged={load} />
          ))}
        </ul>
      )}
    </Panel>
  )
}
