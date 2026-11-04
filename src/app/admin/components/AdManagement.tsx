'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Image as ImageIcon, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

interface Ad {
  id: string
  title: string
  linkUrl: string
  desktopImage: string
  mobileImage: string
  sortOrder: number
  isActive: boolean
}

type AdDraft = Pick<Ad, 'title' | 'linkUrl' | 'desktopImage' | 'mobileImage' | 'isActive'>

const EMPTY_DRAFT: AdDraft = { title: '', linkUrl: '', desktopImage: '', mobileImage: '', isActive: true }

const INPUT_CLASS =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none'
const BUTTON_CLASS =
  'inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40'

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: 'include', ...init })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.success) throw new Error(data?.error || '요청을 처리하지 못했습니다.')
  return data
}

async function uploadImage(file: File, kind: 'desktop' | 'mobile'): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('kind', kind)
  const data = await requestJson('/api/admin/ads/image', { method: 'POST', body: form })
  return data.url
}

function ImageField({
  label,
  hint,
  value,
  kind,
  onChange,
}: {
  label: string
  hint: string
  value: string
  kind: 'desktop' | 'mobile'
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)

  return (
    <div>
      <p className="mb-1 text-xs text-slate-400">
        {label} <span className="text-slate-600">{hint}</span>
      </p>
      <div className="flex h-24 items-center justify-center overflow-hidden rounded-md border border-slate-700 bg-black">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={`${label} 미리보기`} className="max-h-full max-w-full object-contain" />
        ) : (
          <ImageIcon className="h-5 w-5 text-slate-600" />
        )}
      </div>
      <label className={`${BUTTON_CLASS} mt-1.5 cursor-pointer`}>
        <Upload className="h-3.5 w-3.5" />
        {uploading ? '올리는 중' : '이미지 선택'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={uploading}
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            setUploading(true)
            try {
              onChange(await uploadImage(file, kind))
            } catch (error) {
              toast.error((error as Error).message)
            } finally {
              setUploading(false)
            }
          }}
        />
      </label>
    </div>
  )
}

function AdForm({
  draft,
  onChange,
  children,
}: {
  draft: AdDraft
  onChange: (draft: AdDraft) => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-400">
          광고 이름
          <input
            className={`${INPUT_CLASS} mt-1`}
            value={draft.title}
            maxLength={80}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
          />
        </label>
        <label className="text-xs text-slate-400">
          이동 주소
          <input
            className={`${INPUT_CLASS} mt-1`}
            value={draft.linkUrl}
            placeholder="https://"
            onChange={(event) => onChange({ ...draft, linkUrl: event.target.value })}
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ImageField
          label="PC 이미지"
          hint="가로:세로 5:1"
          kind="desktop"
          value={draft.desktopImage}
          onChange={(desktopImage) => onChange({ ...draft, desktopImage })}
        />
        <ImageField
          label="모바일 이미지"
          hint="가로:세로 3:1"
          kind="mobile"
          value={draft.mobileImage}
          onChange={(mobileImage) => onChange({ ...draft, mobileImage })}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => onChange({ ...draft, isActive: event.target.checked })}
          />
          사이트에 노출
        </label>
        <div className="flex gap-2">{children}</div>
      </div>
    </div>
  )
}

function AdCard({
  ad,
  isFirst,
  isLast,
  onMove,
  onChanged,
}: {
  ad: Ad
  isFirst: boolean
  isLast: boolean
  onMove: (direction: -1 | 1) => void
  onChanged: () => void
}) {
  const [draft, setDraft] = useState<AdDraft>(ad)
  const [saving, setSaving] = useState(false)

  useEffect(() => setDraft(ad), [ad])

  const save = async () => {
    setSaving(true)
    try {
      await requestJson(`/api/admin/ads/${ad.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      })
      toast.success('광고를 저장했습니다.')
      onChanged()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`"${ad.title}" 광고를 삭제할까요?`)) return
    try {
      await requestJson(`/api/admin/ads/${ad.id}`, { method: 'DELETE' })
      toast.success('광고를 삭제했습니다.')
      onChanged()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <li className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <AdForm draft={draft} onChange={setDraft}>
        <button type="button" className={BUTTON_CLASS} disabled={isFirst} onClick={() => onMove(-1)} aria-label="위로 이동">
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={BUTTON_CLASS} disabled={isLast} onClick={() => onMove(1)} aria-label="아래로 이동">
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={BUTTON_CLASS} onClick={remove}>
          <Trash2 className="h-3.5 w-3.5" />
          삭제
        </button>
        <button type="button" className={BUTTON_CLASS} disabled={saving} onClick={save}>
          {saving ? '저장 중' : '저장'}
        </button>
      </AdForm>
    </li>
  )
}

export function AdManagement() {
  const [ads, setAds] = useState<Ad[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<AdDraft>(EMPTY_DRAFT)

  const load = useCallback(async () => {
    try {
      const data = await requestJson('/api/admin/ads')
      setAds(data.ads)
      setLoadError('')
    } catch {
      setAds([])
      setLoadError('광고를 불러오지 못했습니다. 운영 DB에 광고 표가 없으면 생성 작업을 먼저 실행해 주세요.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const move = async (index: number, direction: -1 | 1) => {
    if (!ads) return
    const target = ads[index + direction]
    const current = ads[index]
    if (!target) return
    try {
      const headers = { 'content-type': 'application/json' }
      await requestJson(`/api/admin/ads/${current.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ sortOrder: target.sortOrder }),
      })
      await requestJson(`/api/admin/ads/${target.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ sortOrder: current.sortOrder }),
      })
      await load()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const create = async () => {
    try {
      await requestJson('/api/admin/ads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      })
      toast.success('광고를 추가했습니다.')
      setDraft(EMPTY_DRAFT)
      setCreating(false)
      await load()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">위키 광고</h3>
          <p className="mt-0.5 text-xs text-slate-500">위키 메인에서 5초마다 넘어갑니다. 위 순서대로 노출됩니다.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={BUTTON_CLASS} onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" />
            새로고침
          </button>
          <button type="button" className={BUTTON_CLASS} onClick={() => setCreating((value) => !value)}>
            <Plus className="h-3.5 w-3.5" />
            광고 추가
          </button>
        </div>
      </div>

      {loadError && <p className="text-xs text-amber-400">{loadError}</p>}

      {creating && (
        <div className="rounded-lg border border-cyan-500/30 bg-slate-900/50 p-4">
          <AdForm draft={draft} onChange={setDraft}>
            <button type="button" className={BUTTON_CLASS} onClick={() => setCreating(false)}>
              취소
            </button>
            <button type="button" className={BUTTON_CLASS} onClick={create}>
              추가
            </button>
          </AdForm>
        </div>
      )}

      {ads === null ? (
        <p className="text-xs text-slate-500">불러오는 중입니다.</p>
      ) : ads.length === 0 && !loadError ? (
        <p className="text-xs text-slate-500">등록된 광고가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {ads.map((ad, index) => (
            <AdCard
              key={ad.id}
              ad={ad}
              isFirst={index === 0}
              isLast={index === ads.length - 1}
              onMove={(direction) => move(index, direction)}
              onChanged={load}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
