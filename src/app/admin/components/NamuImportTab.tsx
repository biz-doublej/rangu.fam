'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { detectNamuMarkup } from '@/lib/wiki/convert/detect'
import { useNamuConversion } from '@/hooks/useNamuConversion'
import { attributionNote, isUsableSourceUrl } from '@/lib/wiki/convert/attribution'
import { NamuConvertView } from '@/components/wiki/NamuConvertView'
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, BUTTON_CLASS, Panel, jsonInit, requestJson } from './adminUi'

/**
 * 관리 화면 '나무위키 가져오기' — 나무위키 문서 원문을 붙여 넣어 이랑위키 문법으로 바꾼 뒤 새 문서로 만든다.
 * 출처 주소는 꼭 받는다 (라이선스상 출처 표시가 필요하다).
 */
export function NamuImportTab() {
  const [title, setTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [raw, setRaw] = useState('')
  const [converting, setConverting] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<{ title: string; pending: boolean } | null>(null)

  const conversion = useNamuConversion(converting)
  const markers = useMemo(() => detectNamuMarkup(raw).markers, [raw])
  const urlOk = isUsableSourceUrl(sourceUrl)

  const convert = () => {
    if (!raw.trim()) {
      toast.error('나무위키 원문을 붙여 넣어 주세요.')
      return
    }
    setCreated(null)
    setConverting(raw)
  }

  const create = async () => {
    const pageTitle = title.trim()
    if (!pageTitle) return toast.error('만들 문서 제목을 적어 주세요.')
    if (!urlOk) return toast.error('출처 주소(나무위키 문서 주소)를 적어 주세요.')
    if (!converting || conversion.loading || !conversion.text.trim()) return toast.error('먼저 변환해 주세요.')
    setBusy(true)
    try {
      const url = sourceUrl.trim()
      const data = await requestJson(
        '/api/wiki/pages',
        jsonInit('POST', {
          title: pageTitle,
          content: conversion.text.trimEnd() + attributionNote(url, pageTitle),
          editSummary: `나무위키 문법 변환 (출처: ${url})`,
        })
      )
      setCreated({ title: pageTitle, pending: Boolean(data?.pending) })
      toast.success(data?.pending ? '승인 대기열에 올렸습니다.' : '문서를 만들었습니다.')
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      title="나무위키 문서 가져오기"
      description="나무위키 문서의 원문(편집 화면의 글)을 붙여 넣으면 이랑위키 문법으로 바꿔 새 문서로 만듭니다. 나무위키 글은 CC BY-NC-SA 2.0 KR이라 출처 주소를 꼭 적어야 하며, 문서 끝에 출처 안내가 자동으로 붙습니다."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[13px] text-adm-soft">
          만들 문서 제목
          <input className={`${INPUT_CLASS} mt-1`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 강한울" />
        </label>
        <label className="block text-[13px] text-adm-soft">
          출처 주소 <span className="text-adm-pencil">(필수)</span>
          <input
            className={`${INPUT_CLASS} mt-1`}
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://namu.wiki/w/문서이름"
          />
        </label>
      </div>

      <label className="mt-3 block text-[13px] text-adm-soft">
        나무위키 원문
        <textarea
          className={`${INPUT_CLASS} mt-1 h-56 font-mono`}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={'나무위키 편집 화면의 글을 통째로 붙여 넣으세요.\n[include(틀:…)] {{{#!wiki …}}} 같은 나무위키 문법이 이랑위키 문법으로 바뀝니다.'}
        />
      </label>
      {raw.trim() && (
        <p className="mt-1 text-xs text-adm-muted">
          {markers.length ? `나무위키 표지 ${markers.length}가지: ${markers.map((marker) => marker.label).join(', ')}` : '나무위키만의 표지는 보이지 않습니다 (이미 이랑위키 문법일 수 있음).'}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={BUTTON_CLASS} onClick={convert}>
          <Wand2 className="h-3.5 w-3.5" />
          변환하기
        </button>
        <button
          type="button"
          className={PRIMARY_BUTTON_CLASS}
          onClick={create}
          disabled={busy || !converting || conversion.loading || !title.trim() || !urlOk}
        >
          {busy ? '만드는 중…' : '문서 만들기'}
        </button>
      </div>

      {created && (
        <p className="mt-3 text-[13px] text-adm-ink">
          {created.pending ? '승인 대기열에 올렸습니다: ' : '만들었습니다: '}
          <Link className="text-adm-accent hover:underline" href={`/wiki/${encodeURIComponent(created.title)}`} target="_blank">
            {created.title}
          </Link>
        </p>
      )}

      {converting !== null && (
        <div className="mt-4">
          <NamuConvertView source={converting} conversion={conversion} />
          <p className="mt-2 text-xs text-adm-muted">
            저장할 때 편집 요약은 &lsquo;나무위키 문법 변환 (출처: 주소)&rsquo;, 문서 끝에는 출처·라이선스 안내가 붙습니다. 나무위키 그림은
            가져오지 않으니 그림은 따로 올려 주소를 바꿔 주세요.
          </p>
        </div>
      )}
    </Panel>
  )
}
