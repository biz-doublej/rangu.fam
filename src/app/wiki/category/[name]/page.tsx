'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'

export default function WikiCategoryPage() {
  const params = useParams()
  const router = useRouter()
  const raw = Array.isArray(params.name) ? params.name.join('/') : (params.name as string)
  const name = decodeURIComponent(raw || '')
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!name) return
      setIsLoading(true)
      try {
        const res = await fetch(`/api/wiki/categories?name=${encodeURIComponent(name)}`)
        const data = await res.json()
        if (data.success) setItems(data.pages)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [name])

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>분류: {name}</CardHeader>
          <CardContent>
            {isLoading ? '불러오는 중...' : (
              <div className="space-y-2">
                {items.map((p) => (
                  <div key={p.slug} className="bg-gray-900 rounded px-3 py-2">
                    <button className="text-blue-400 hover:underline" onClick={() => router.push(`/wiki/${encodeURIComponent(p.title)}`)}>
                      {p.title}
                    </button>
                    {p.summary && (
                      <div className="text-xs text-gray-400 mt-1">{p.summary}</div>
                    )}
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-sm text-gray-400">이 분류에 속한 문서가 없습니다.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


