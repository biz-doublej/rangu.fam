'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function WikiRecentChangesPage() {
  const params = useSearchParams()
  const router = useRouter()
  const [namespace, setNamespace] = useState(params.get('namespace') || '')
  const [type, setType] = useState(params.get('type') || '')
  const [author, setAuthor] = useState(params.get('author') || '')
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const sp = new URLSearchParams()
      if (namespace) sp.set('namespace', namespace)
      if (type) sp.set('type', type)
      if (author) sp.set('author', author)
      const res = await fetch(`/api/wiki/recent?${sp.toString()}`)
      const data = await res.json()
      if (data.success) setItems(data.changes)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>최근 변경 필터</CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input value={namespace} onChange={(e) => setNamespace(e.target.value)} placeholder="네임스페이스" className="bg-gray-700 border-gray-600 text-gray-200" />
              <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="유형(create/edit/revert...)" className="bg-gray-700 border-gray-600 text-gray-200" />
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="작성자" className="bg-gray-700 border-gray-600 text-gray-200" />
              <Button onClick={load} className="bg-gray-700 hover:bg-gray-600 text-gray-200">적용</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>{isLoading ? '불러오는 중...' : '최근 변경'}</CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.map((it) => (
                <div key={`${it.title}-${it.revision?.revisionNumber}`} className="bg-gray-900 rounded px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <button className="text-blue-400 hover:underline" onClick={() => router.push(`/wiki/${encodeURIComponent(it.title)}`)}>
                      {it.title}
                    </button>
                    <span className="text-xs text-gray-500">{it.namespace}</span>
                  </div>
                  <div className="text-gray-400 mt-1">
                    r{it.revision.revisionNumber} · {it.revision.editType} · {it.revision.summary || '-'} · {new Date(it.revision.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
              {items.length === 0 && <div className="text-gray-400 text-sm">변경 내역이 없습니다.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


