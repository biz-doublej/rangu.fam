'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Network, RefreshCw, Maximize2, Search } from 'lucide-react'

interface GraphNode {
  id: string
  degree: number
  isRedirect: boolean
  views: number
}
interface GraphEdge {
  source: string
  target: string
}
interface SimNode extends GraphNode {
  x: number
  y: number
  vx: number
  vy: number
}

const WIDTH = 1000
const HEIGHT = 680

export default function WikiGraphPage() {
  const router = useRouter()
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [stats, setStats] = useState<{ nodeCount: number; edgeCount: number; orphanCount: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // 시뮬레이션 상태
  const simRef = useRef<SimNode[]>([])
  const frameRef = useRef<number | null>(null)
  const [, forceTick] = useState(0)

  // 뷰 변환 (pan/zoom)
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/wiki/graph')
      const d = await r.json()
      if (r.ok && d?.success) {
        setNodes(d.nodes || [])
        setEdges(d.edges || [])
        setStats(d.stats || null)
      } else {
        setError(d?.error || '그래프를 불러오지 못했습니다.')
      }
    } catch {
      setError('그래프를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const edgeIndex = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const e of edges) {
      if (!m.has(e.source)) m.set(e.source, new Set())
      if (!m.has(e.target)) m.set(e.target, new Set())
      m.get(e.source)!.add(e.target)
      m.get(e.target)!.add(e.source)
    }
    return m
  }, [edges])

  // 초기 배치 + 포스 시뮬레이션
  useEffect(() => {
    if (nodes.length === 0) return
    // 원형 초기 배치 (결정적 — 랜덤 없이)
    const sim: SimNode[] = nodes.map((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2
      const radius = 200 + (i % 7) * 18
      return {
        ...n,
        x: WIDTH / 2 + Math.cos(angle) * radius,
        y: HEIGHT / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      }
    })
    simRef.current = sim
    const byId = new Map(sim.map((s) => [s.id, s]))

    let iterations = 0
    const MAX_ITER = 320
    const tick = () => {
      const arr = simRef.current
      const k = 0.86 // 감쇠
      // 반발력 (Coulomb)
      for (let a = 0; a < arr.length; a++) {
        for (let b = a + 1; b < arr.length; b++) {
          const na = arr[a]
          const nb = arr[b]
          let dx = na.x - nb.x
          let dy = na.y - nb.y
          let dist2 = dx * dx + dy * dy
          if (dist2 < 0.01) {
            dx = (a - b) * 0.5 + 0.1
            dy = 0.1
            dist2 = dx * dx + dy * dy
          }
          const dist = Math.sqrt(dist2)
          const force = 2600 / dist2
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          na.vx += fx
          na.vy += fy
          nb.vx -= fx
          nb.vy -= fy
        }
      }
      // 스프링 (엣지)
      for (const e of edges) {
        const s = byId.get(e.source)
        const t = byId.get(e.target)
        if (!s || !t) continue
        const dx = t.x - s.x
        const dy = t.y - s.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = (dist - 90) * 0.015
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        s.vx += fx
        s.vy += fy
        t.vx -= fx
        t.vy -= fy
      }
      // 중심 인력 + 적용
      for (const n of arr) {
        n.vx += (WIDTH / 2 - n.x) * 0.002
        n.vy += (HEIGHT / 2 - n.y) * 0.002
        n.vx *= k
        n.vy *= k
        n.x += Math.max(-12, Math.min(12, n.vx))
        n.y += Math.max(-12, Math.min(12, n.vy))
      }
      iterations++
      forceTick((v) => v + 1)
      if (iterations < MAX_ITER) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [nodes, edges])

  const matched = query.trim()
    ? new Set(
        nodes
          .filter((n) => n.id.toLowerCase().includes(query.trim().toLowerCase()))
          .map((n) => n.id)
      )
    : null

  const sim = simRef.current

  // pan/zoom 핸들러
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 1.12 : 0.89
    setTransform((t) => ({ ...t, k: Math.max(0.25, Math.min(3, t.k * delta)) }))
  }
  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return
    setTransform((t) => ({
      ...t,
      x: dragRef.current!.tx + (e.clientX - dragRef.current!.x),
      y: dragRef.current!.ty + (e.clientY - dragRef.current!.y),
    }))
  }
  const endDrag = () => {
    dragRef.current = null
  }

  const highlightSet = hover ? edgeIndex.get(hover) : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[color:var(--wiki-ink)]">
            <Network className="h-6 w-6 text-[color:var(--wiki-accent)]" />
            지식 그래프
          </h1>
          <p className="mt-1 text-sm text-[color:var(--wiki-ink-soft)]">
            문서 간 <strong>[[내부링크]]</strong> 연결망입니다. 점을 클릭하면 문서로 이동해요. 드래그로
            이동, 휠로 확대/축소.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg-2)] px-2">
            <Search className="h-3.5 w-3.5 text-[color:var(--wiki-ink-soft)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="문서 강조"
              className="w-32 bg-transparent py-1.5 text-xs text-[color:var(--wiki-ink)] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setTransform({ x: 0, y: 0, k: 1 })}
            className="inline-flex items-center gap-1 rounded-md border border-[color:var(--wiki-rule)] px-2 py-1.5 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)]"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            맞춤
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-md border border-[color:var(--wiki-rule)] px-2 py-1.5 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {stats && (
        <div className="mb-3 flex flex-wrap gap-3 text-xs text-[color:var(--wiki-ink-soft)]">
          <span>문서 {stats.nodeCount}개</span>
          <span>연결 {stats.edgeCount}개</span>
          <span className="text-amber-500">고립 {stats.orphanCount}개</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-6 text-center text-sm text-rose-300">
          {error}
        </div>
      )}

      {!error && (
        <div className="overflow-hidden rounded-xl border border-[color:var(--wiki-rule)] bg-[#0b1020]">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full cursor-grab active:cursor-grabbing"
            style={{ height: 'min(70vh, 680px)' }}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
          >
            <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
              {/* 엣지 */}
              {sim.length > 0 &&
                edges.map((e, idx) => {
                  const s = sim.find((n) => n.id === e.source)
                  const t = sim.find((n) => n.id === e.target)
                  if (!s || !t) return null
                  const active =
                    hover && (e.source === hover || e.target === hover)
                  return (
                    <line
                      key={idx}
                      x1={s.x}
                      y1={s.y}
                      x2={t.x}
                      y2={t.y}
                      stroke={active ? 'var(--wiki-accent, #6ea8fe)' : '#33415580'}
                      strokeWidth={active ? 1.6 : 0.7}
                    />
                  )
                })}
              {/* 노드 */}
              {sim.map((n) => {
                const r = Math.max(4, Math.min(16, 4 + n.degree * 1.6))
                const dim =
                  (matched && !matched.has(n.id)) ||
                  (hover && hover !== n.id && highlightSet && !highlightSet.has(n.id))
                const isOrphan = n.degree === 0
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    style={{ cursor: 'pointer', opacity: dim ? 0.18 : 1 }}
                    onClick={() => router.push(`/wiki/${encodeURIComponent(n.id)}`)}
                    onMouseEnter={() => setHover(n.id)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <circle
                      r={r}
                      fill={isOrphan ? '#f59e0b' : 'var(--wiki-accent, #4472C4)'}
                      stroke={hover === n.id || (matched && matched.has(n.id)) ? '#fff' : '#0b1020'}
                      strokeWidth={hover === n.id ? 2 : 1}
                    />
                    {(n.degree >= 3 || hover === n.id || (matched && matched.has(n.id))) && (
                      <text
                        x={0}
                        y={r + 11}
                        textAnchor="middle"
                        fontSize={hover === n.id ? 12 : 10}
                        fill={hover === n.id ? '#fff' : '#cbd5e1'}
                        style={{ pointerEvents: 'none' }}
                      >
                        {n.id}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>
        </div>
      )}

      {!error && !loading && nodes.length === 0 && (
        <p className="mt-4 text-center text-sm text-[color:var(--wiki-ink-soft)]">
          아직 표시할 문서가 없습니다.
        </p>
      )}

      <div className="mt-3 flex items-center gap-4 text-[11px] text-[color:var(--wiki-ink-soft)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--wiki-accent)' }} />
          연결된 문서 (클수록 링크 많음)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
          고립 문서 (들어오는/나가는 링크 없음)
        </span>
      </div>
    </div>
  )
}
