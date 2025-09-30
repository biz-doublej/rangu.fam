'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'

interface Submission {
  _id: string
  type: 'create' | 'edit'
  status: 'pending' | 'approved' | 'rejected' | 'onhold'
  targetTitle: string
  targetSlug: string
  namespace: string
  author: string
  content: string
  editSummary?: string
  reason?: string
  createdAt: string
}

export default function WikiModPage() {
  const router = useRouter()
  const [list, setList] = useState<Submission[]>([])
  const [status, setStatus] = useState('pending')
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({})

  const load = async () => {
    const res = await fetch(`/api/wiki/mod?status=${status}`, { credentials: 'include' })
    const data = await res.json()
    if (data.success) setList(data.submissions || [])
  }

  useEffect(() => { load() }, [status])

  const act = async (submissionId: string, action: 'approve'|'reject'|'hold') => {
    const res = await fetch('/api/wiki/mod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, submissionId, reason: reasonMap[submissionId] || '' })
    })
    const data = await res.json()
    if (data.success) load()
    else alert(data.error || '처리 실패')
  }

  return (
    <div className="min-h-screen theme-surface text-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">운영자 대시보드</h1>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-2 py-1">
            <option value="pending">대기</option>
            <option value="approved">승인</option>
            <option value="rejected">불허</option>
            <option value="onhold">보류</option>
          </select>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="text-gray-300">총 {list.length}건</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {list.map((s) => (
                <div key={s._id} className="p-3 bg-gray-900 rounded border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-300">
                      <div className="font-medium">[{s.type}] {s.targetTitle} <span className="text-gray-500">({s.namespace})</span></div>
                      <div className="text-gray-400">작성자: {s.author} · {new Date(s.createdAt).toLocaleString()}</div>
                    </div>
                    {s.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Button className="bg-green-700 hover:bg-green-600" onClick={() => act(s._id, 'approve')}>승인</Button>
                        <Button className="bg-yellow-700 hover:bg-yellow-600" onClick={() => act(s._id, 'hold')}>보류</Button>
                        <Button className="bg-red-700 hover:bg-red-600" onClick={() => act(s._id, 'reject')}>불허</Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <textarea
                      value={reasonMap[s._id] || ''}
                      onChange={(e) => setReasonMap((m) => ({ ...m, [s._id]: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                      placeholder="사유(선택)"
                    />
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-gray-400">내용 보기</summary>
                    <pre className="mt-2 text-xs whitespace-pre-wrap text-gray-300">{s.content}</pre>
                  </details>
                </div>
              ))}
              {list.length === 0 && (
                <div className="text-center text-gray-500 py-12">항목이 없습니다.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


