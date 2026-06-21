'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellOff,
  CornerUpRight,
  Edit,
  Eye,
  FileText,
  History,
  Lock,
  MessageSquare,
  Radar,
  Share2,
  Shield,
  Sparkles,
  Star,
  X
} from 'lucide-react'
import NamuWikiRenderer from '@/components/ui/NamuWikiRenderer'
import WikiEditor from '@/components/ui/WikiEditor'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useWikiAuth } from '@/contexts/WikiAuthContext'
import { formatDate } from '@/lib/utils'
import { parseRedirectTarget } from '@/lib/wiki/redirect'
import { WikiShell, WikiPageHeader, DocumentFunctionsPanel, WikiMeter, WikiTableOfContents } from '@/components/wiki'

type WikiTabType = 'document' | 'edit' | 'history' | 'discussion'

interface WikiPageData {
  id: string
  title: string
  slug: string
  namespace: string
  content: string
  summary: string
  categories: string[]
  tags: string[]
  creator: string
  creatorId: string
  lastEditor: string
  lastEditorId: string
  lastEditDate: string
  lastEditSummary: string
  currentRevision: number
  protection: {
    level: 'none' | 'autoconfirmed' | 'sysop'
    reason: string
    expiry: string | null
  }
  isRedirect: boolean
  redirectTarget: string | null
  isDeleted: boolean
  isStub: boolean
  isFeatured: boolean
  views: number
  uniqueViews: number
  edits: number
  watchers: string[]
  discussions: any[]
  incomingLinks: string[]
  outgoingLinks: string[]
  tableOfContents: any[]
  revisions: any[]
  createdAt?: string
  updatedAt?: string
}

const TEMPLATE_CATEGORIES = ['인물', '학교', '게임', '음악', '연구', '케미', '개발', '내각', '스포츠', '기업']
const LEGACY_CEREMONY_SLUG = '50호 기념 2025 시상식'

// 위키 페이지 별칭 — DB에 문서가 없어도 적절한 곳으로 안내
const PAGE_ALIASES: Record<string, string> = {
  '대문': '/wiki',
  'main': '/wiki',
  'home': '/wiki',
  '홈': '/wiki',
  '도움말': '/wiki/이랑위키:도움말',
  '편집 도움말': '/wiki/이랑위키:편집%20도움말',
  '문법 안내': '/wiki/이랑위키:문법%20안내',
  '규정': '/wiki/이랑위키:기본방침',
}

function mapIncomingProtection(level: any): 'none' | 'semi' | 'full' | 'admin' {
  switch (level) {
    case 'semi':
    case 'full':
    case 'admin':
    case 'none':
      return level
    case 'autoconfirmed':
      return 'semi'
    case 'sysop':
      return 'admin'
    default:
      return 'none'
  }
}

function extractCategories(value: string) {
  const names = new Set<string>()
  const regex = /\[\[분류:([^\]]+)\]\]/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(value)) !== null) {
    match[1].trim().split('|').forEach(part => {
      const cleaned = part.replace(/^\{?|\}?$/g, '').trim()
      if (cleaned) names.add(cleaned)
    })
  }
  return Array.from(names)
}

export default function WikiDocumentPage() {
  const router = useRouter()
  const params = useParams()
  const { wikiUser, isLoggedIn, isModerator } = useWikiAuth()

  const rawSlug = Array.isArray(params.slug) ? params.slug.join('/') : params.slug || ''
  const slug = decodeURIComponent(rawSlug)

  // Legacy redirect: 50호 시상식
  useEffect(() => {
    if (slug === LEGACY_CEREMONY_SLUG) router.replace('/wiki/workshop/awards-2025')
  }, [slug, router])

  const [currentPage, setCurrentPage] = useState<WikiPageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<WikiTabType>('document')
  // 넘겨주기로 도착한 경우 출발 문서 제목 (?from= 파라미터)
  const [redirectedFrom, setRedirectedFrom] = useState<string | null>(null)

  const [editContent, setEditContent] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [currentRevision, setCurrentRevision] = useState<number | null>(null)

  const [revisions, setRevisions] = useState<any[]>([])
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(false)
  const [diffView, setDiffView] = useState<{ a?: any; b?: any } | null>(null)

  const [discussions, setDiscussions] = useState<any[]>([])
  const [newDiscussion, setNewDiscussion] = useState({ topic: '', content: '' })

  const [protectLevel, setProtectLevel] = useState<'none' | 'semi' | 'full' | 'admin'>('none')
  const [protectReason, setProtectReason] = useState('')
  const [isProtecting, setIsProtecting] = useState(false)

  // 감시 목록 상태 — 현재 페이지가 감시 중인지 + 토글 액션
  const [isWatching, setIsWatching] = useState(false)
  const [isWatchActing, setIsWatchActing] = useState(false)

  // 404 시 비슷한 문서 제안
  const [suggestions, setSuggestions] = useState<Array<{ title: string; slug: string; snippet?: string | null }>>([])

  // 토론 답글 입력 상태 (discussionId → input 텍스트)
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({})
  const [expandedDiscussions, setExpandedDiscussions] = useState<Record<string, boolean>>({})

  // 이미지 lightbox (article 안의 모든 <img> 클릭 시 풀화면 보기)
  const [lightbox, setLightbox] = useState<{ src: string; alt?: string } | null>(null)

  // articleRef 안의 모든 <img> 에 click 리스너 (delegation)
  React.useEffect(() => {
    const el = articleRef.current
    if (!el || !currentPage) return

    const onImgClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName !== 'IMG') return
      // 이미 링크 안에 있는 이미지는 lightbox 대신 링크 동작 우선
      if (target.closest('a')) return
      const img = target as HTMLImageElement
      const src = img.currentSrc || img.src
      if (!src || src.endsWith('default-music-cover.jpg')) return
      // placeholder 박스 (data-fallback-attempt='replaced') 도 제외
      if ((img.dataset as any).fallbackAttempt === 'replaced') return
      e.preventDefault()
      setLightbox({ src, alt: img.alt })
    }

    // 이미지에 cursor 표시
    const imgs = el.querySelectorAll('img')
    imgs.forEach((img) => {
      ;(img as HTMLElement).style.cursor = 'zoom-in'
    })

    el.addEventListener('click', onImgClick)
    return () => el.removeEventListener('click', onImgClick)
  }, [currentPage, activeTab])

  // ESC 로 lightbox 닫기
  React.useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  const [templateType, setTemplateType] = useState('')
  const [templateCommand, setTemplateCommand] = useState('')

  const [showFunctionsModal, setShowFunctionsModal] = useState(false)
  const [scanlinesOn, setScanlinesOn] = useState(false)
  const articleRef = useRef<HTMLElement | null>(null)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  useEffect(() => {
    if (!actionFeedback) return
    const t = setTimeout(() => setActionFeedback(null), 2800)
    return () => clearTimeout(t)
  }, [actionFeedback])

  // ── Section [편집] links + red-link toggle ─────────────────────
  // Runs whenever the article body content changes (or tab returns to
  // 'document'). Walks the rendered DOM and (a) injects a small
  // `[편집]` button beside each heading, (b) batch-checks internal
  // wiki-link existence and toggles `.wiki-redlink` on missing ones.
  useEffect(() => {
    if (activeTab !== 'document') return
    const el = articleRef.current
    if (!el || !currentPage?.content) return

    let cancelled = false

    // (a) section edit links
    const headings = Array.from(
      el.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')
    )
    const cleanups: Array<() => void> = []
    headings.forEach(h => {
      if (h.querySelector('.wiki-section-edit')) return
      const heading = (h.textContent || '').trim()
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'wiki-section-edit'
      btn.setAttribute('aria-label', `${heading} 섹션 편집`)
      btn.textContent = '편집'
      const onClick = (ev: Event) => {
        ev.preventDefault()
        ev.stopPropagation()
        try { sessionStorage.setItem('wiki:scrollToHeading', heading) } catch {}
        setActiveTab('edit')
      }
      btn.addEventListener('click', onClick)
      h.appendChild(btn)
      cleanups.push(() => {
        btn.removeEventListener('click', onClick)
        if (btn.parentNode === h) h.removeChild(btn)
      })
    })

    // (b) red-link existence check
    const anchors = Array.from(
      el.querySelectorAll<HTMLAnchorElement>('a[href^="/wiki/"]')
    ).filter(a => {
      const href = a.getAttribute('href') || ''
      // Skip section links / anchors / category-prefix that never resolve as a doc.
      if (!href.startsWith('/wiki/')) return false
      if (href.includes('#')) return false
      if (/^\/wiki\/(category|search|recent|workshop|random|main|mod|login|register)(\b|\/)/i.test(href)) return false
      return true
    })

    const titles: string[] = []
    const titleByAnchor = new Map<HTMLAnchorElement, string>()
    anchors.forEach(a => {
      const href = a.getAttribute('href') || ''
      const t = decodeURIComponent(href.replace(/^\/wiki\//, '')).trim()
      if (!t) return
      titleByAnchor.set(a, t)
      titles.push(t)
    })

    const uniqueTitles = Array.from(new Set(titles))
    if (uniqueTitles.length > 0) {
      ;(async () => {
        try {
          const res = await fetch('/api/wiki/exists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titles: uniqueTitles })
          })
          if (!res.ok) return
          const data = await res.json()
          if (cancelled || !data?.success) return
          const exists: Record<string, boolean> = data.exists || {}
          titleByAnchor.forEach((t, a) => {
            if (exists[t] === false) {
              a.classList.add('wiki-redlink')
              a.setAttribute('title', `"${t}" 문서가 아직 없습니다 — 클릭해 새로 만들어보세요.`)
            } else {
              a.classList.remove('wiki-redlink')
            }
          })
        } catch {
          /* ignore */
        }
      })()
    }

    return () => {
      cancelled = true
      cleanups.forEach(fn => fn())
    }
  }, [currentPage?.content, currentPage?.currentRevision, activeTab])

  // After landing on the editor tab from a section [편집] click,
  // scroll the editor textarea to that heading line.
  useEffect(() => {
    if (activeTab !== 'edit') return
    let raw: string | null = null
    try { raw = sessionStorage.getItem('wiki:scrollToHeading') } catch {}
    if (!raw) return
    try { sessionStorage.removeItem('wiki:scrollToHeading') } catch {}
    const target = raw.trim()
    if (!target) return
    requestAnimationFrame(() => {
      const ta = document.querySelector<HTMLTextAreaElement>('.wiki-editor-shell textarea, textarea')
      if (!ta) return
      const lines = ta.value.split('\n')
      const lineIdx = lines.findIndex(line => {
        const headingMatch = line.match(/^=+\s*(.+?)\s*=+\s*$/) || line.match(/^#+\s*(.+)$/)
        return !!(headingMatch && headingMatch[1].trim() === target)
      })
      if (lineIdx < 0) return
      const charPos = lines.slice(0, lineIdx).reduce((sum, l) => sum + l.length + 1, 0)
      ta.focus()
      ta.setSelectionRange(charPos, charPos + (lines[lineIdx]?.length || 0))
      // Scroll roughly to the line
      const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 18
      ta.scrollTop = Math.max(0, lineIdx * lineHeight - 80)
    })
  }, [activeTab])

  const canShowProtectUI =
    isLoggedIn &&
    (wikiUser?.permissions?.canProtect ||
      wikiUser?.role === 'moderator' ||
      wikiUser?.role === 'admin' ||
      wikiUser?.role === 'owner')

  // 이 문서 자체가 넘겨주기 문서인지 (?noredirect=1 보기에서 안내 박스용)
  const pageRedirectTarget = currentPage
    ? parseRedirectTarget(currentPage.content) ||
      (currentPage.isRedirect ? currentPage.redirectTarget : null)
    : null

  /* ── Load page ──────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      if (!slug) { setIsLoading(false); return }
      if (slug === LEGACY_CEREMONY_SLUG) { setIsLoading(false); return }

      // 별칭 처리 — DB lookup 전에 즉시 리디렉트
      const aliasTarget = PAGE_ALIASES[slug]
      if (aliasTarget) {
        router.replace(aliasTarget)
        return
      }

      try {
        setIsLoading(true)
        setPageError(null)
        const r = await fetch(`/api/wiki/pages?title=${encodeURIComponent(slug)}`)
        const d = await r.json()
        if (d.success && d.page) {
          // 넘겨주기(#redirect 대상 / #REDIRECT [[대상]] / #넘겨주기 대상) 자동 이동
          // ?noredirect=1 이면 넘겨주기 문서 원본을 그대로 보여준다 (편집/확인용)
          const search = new URLSearchParams(window.location.search)
          const noRedirect = search.get('noredirect') === '1'
          const fromParam = search.get('from')
          const redirectTo =
            parseRedirectTarget(d.page.content) ||
            (d.page.isRedirect ? d.page.redirectTarget : null)
          if (
            redirectTo &&
            !noRedirect &&
            redirectTo !== (d.page.title || slug) && // 자기 자신으로 넘겨주기 방지
            redirectTo !== fromParam // A↔B 왕복 루프 방지
          ) {
            router.replace(
              `/wiki/${encodeURIComponent(redirectTo)}?from=${encodeURIComponent(d.page.title || slug)}`
            )
            return
          }
          setRedirectedFrom(fromParam)
          setCurrentPage(d.page)
          setEditContent(d.page.content)
          setCurrentRevision(d.page.currentRevision)
          setProtectLevel(mapIncomingProtection(d.page.protection?.level))
          // 감시 상태: watchers 배열에 현재 사용자 id 포함 여부
          const myId = (wikiUser as any)?.id || (wikiUser as any)?._id
          setIsWatching(
            Array.isArray(d.page.watchers) && myId ? d.page.watchers.includes(myId) : false
          )
        } else {
          setRedirectedFrom(null)
          setCurrentPage(null)
          setActiveTab('edit')
          setEditContent('')
          setPageError(d.error || '문서를 찾을 수 없습니다. 새 문서를 작성해 보세요.')
          // 비슷한 제목 제안 (검색 API)
          try {
            const sr = await fetch(`/api/wiki/search?q=${encodeURIComponent(slug)}&limit=5`)
            const sd = await sr.json()
            if (sd.success && Array.isArray(sd.results)) {
              setSuggestions(sd.results.map((x: any) => ({
                title: x.title,
                slug: x.slug,
                snippet: x.snippet,
              })))
            }
          } catch {}
        }
      } catch (err) {
        console.error('문서 로딩 실패:', err)
        setCurrentPage(null)
        setPageError('문서를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [slug, router])

  /* ── Revisions / discussions / save / protect / template ── */
  const loadRevisions = async () => {
    if (!slug) return
    setIsLoadingRevisions(true)
    try {
      const r = await fetch(`/api/wiki/pages/revisions?title=${encodeURIComponent(slug)}&limit=50`)
      const d = await r.json()
      if (d.success) setRevisions(d.revisions || [])
    } finally {
      setIsLoadingRevisions(false)
    }
  }

  const loadDiscussions = async () => {
    if (!slug) return
    try {
      const r = await fetch(`/api/wiki/discussions?title=${encodeURIComponent(slug)}`)
      const d = await r.json()
      if (d.success) setDiscussions(d.discussions || [])
    } catch {}
  }

  useEffect(() => {
    if (activeTab === 'history') loadRevisions()
    if (activeTab === 'discussion') loadDiscussions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleSave = async () => {
    if (!editContent.trim()) { alert('내용이 비어 있습니다.'); return }
    if (!isLoggedIn) {
      alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.')
      router.push('/auth/start?callbackUrl=%2Fwiki')
      return
    }
    try {
      const method = currentPage ? 'PUT' : 'POST'
      const categories = extractCategories(editContent)
      const body = {
        title: currentPage?.title || slug,
        content: editContent,
        summary: editSummary || '문서 편집',
        editSummary: editSummary || '문서 편집',
        namespace: currentPage?.namespace || 'main',
        expectedRevision: currentPage ? currentRevision : undefined,
        categories: categories.length > 0 ? categories : undefined
      }

      const res = await fetch('/api/wiki/pages', {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      if (res.status === 401) {
        alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.')
        router.push('/auth/start?callbackUrl=%2Fwiki')
        return
      }

      const data = await res.json()
      if (data.success) {
        window.location.reload()
      } else {
        if (res.status === 409 && data.conflict?.currentRevision) {
          alert('편집 충돌: 화면을 새로고침하여 최신 내용을 반영하세요.')
          return
        }
        alert('저장에 실패했습니다: ' + (data.error || '알 수 없는 오류'))
      }
    } catch (err) {
      console.error('저장 오류:', err)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  // 감시 목록 토글
  const handleWatchToggle = async () => {
    if (!isLoggedIn) {
      router.push(`/auth/start?callbackUrl=${encodeURIComponent(`/wiki/${slug}`)}`)
      return
    }
    if (!currentPage) return
    setIsWatchActing(true)
    const action = isWatching ? 'remove' : 'add'
    try {
      const res = await fetch('/api/wiki/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: currentPage.title, action }),
      })
      const data = await res.json()
      if (data.success) {
        setIsWatching(action === 'add')
      } else {
        alert(data.error || '감시 목록 변경에 실패했습니다.')
      }
    } catch (e) {
      alert('감시 목록 변경 중 오류가 발생했습니다.')
    } finally {
      setIsWatchActing(false)
    }
  }

  const handleProtect = async () => {
    if (!isLoggedIn) { router.push('/auth/start?callbackUrl=%2Fwiki'); return }
    try {
      setIsProtecting(true)
      const res = await fetch('/api/wiki/pages/protect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: currentPage?.title || slug,
          level: protectLevel,
          reason: protectReason
        })
      })
      const data = await res.json()
      if (data.success) window.location.reload()
      else alert(data.error || '보호 설정에 실패했습니다.')
    } catch (e) {
      console.error(e)
      alert('보호 설정 중 오류가 발생했습니다.')
    } finally {
      setIsProtecting(false)
    }
  }

  const loadTemplateByType = async (type: string) => {
    if (!type) return
    try {
      const res = await fetch(
        `/api/wiki/pages?title=${encodeURIComponent(`템플릿:${type}`)}&namespace=template`
      )
      if (!res.ok) { alert('템플릿을 찾을 수 없습니다.'); return }
      const data = await res.json()
      if (data?.page?.content) {
        if (editContent && !confirm('현재 내용을 템플릿으로 대체할까요?')) return
        setEditContent(data.page.content)
      } else {
        alert('템플릿 내용이 비어 있습니다.')
      }
    } catch {
      alert('템플릿 불러오기 중 오류가 발생했습니다.')
    }
  }

  const handleTemplateCommand = async () => {
    const cmd = templateCommand.trim()
    if (!cmd) return
    const m = cmd.match(/^\/(템플릿|template)\s+(.+)$/i)
    if (m) await loadTemplateByType(m[2].trim())
    else alert('명령어 형식: /템플릿 인물')
  }

  const handleAddDiscussion = async () => {
    if (!isLoggedIn) { router.push('/auth/start?callbackUrl=%2Fwiki'); return }
    if (!newDiscussion.topic.trim() || !newDiscussion.content.trim()) {
      alert('주제와 내용을 입력해 주세요.')
      return
    }
    try {
      const res = await fetch('/api/wiki/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: slug, topic: newDiscussion.topic, content: newDiscussion.content })
      })
      const d = await res.json()
      if (d.success) {
        setNewDiscussion({ topic: '', content: '' })
        loadDiscussions()
      } else {
        alert(d.error || '토론 작성 실패')
      }
    } catch {
      alert('토론 작성 중 오류가 발생했습니다.')
    }
  }

  // 토론 답글 작성
  const handleReplyToDiscussion = async (discussionId: string, content: string) => {
    if (!isLoggedIn) { router.push('/auth/start?callbackUrl=%2Fwiki'); return }
    if (!content.trim()) return
    try {
      const res = await fetch('/api/wiki/discussions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ discussionId, action: 'reply', payload: { content } }),
      })
      const d = await res.json()
      if (d.success) loadDiscussions()
      else alert(d.error || '답글 작성 실패')
    } catch {
      alert('답글 작성 중 오류가 발생했습니다.')
    }
  }

  // 토론 상태 변경 (open/resolved/closed)
  const handleChangeDiscussionStatus = async (discussionId: string, status: string) => {
    try {
      const res = await fetch('/api/wiki/discussions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ discussionId, action: 'status', payload: { status } }),
      })
      const d = await res.json()
      if (d.success) loadDiscussions()
    } catch {}
  }

  /* ── Quick toolbar handlers ────────────────────── */
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href)
      setActionFeedback('문서 링크가 복사되었습니다.')
    } catch {
      setActionFeedback('링크 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.')
    }
  }

  const handleEditMode = () => {
    if (!isLoggedIn) {
      router.push('/auth/start?callbackUrl=%2Fwiki')
      return
    }
    setActiveTab('edit')
  }

  const handleWatch = async () => {
    if (!isLoggedIn || !currentPage) return
    const res = await fetch('/api/wiki/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: currentPage.title, action: 'watch' })
    })
    const data = await res.json()
    if (data.success) setActionFeedback('이 문서를 감시 목록에 추가했습니다.')
    else alert(data.error || '감시 목록 추가에 실패했습니다.')
  }

  const handleReport = async () => {
    const reason = prompt('신고 사유를 입력하세요.')
    if (!reason) return
    try {
      const res = await fetch('/api/wiki/mod/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: slug, reason })
      })
      const d = await res.json()
      if (d.success) setActionFeedback('신고가 접수되었습니다.')
      else alert(d.error || '신고 실패')
    } catch {
      alert('신고 처리 중 오류가 발생했습니다.')
    }
  }

  /* ── Render ────────────────────────────────────── */
  if (isLoading) {
    return (
      <WikiShell>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--wiki-rule-strong)] border-t-[color:var(--wiki-accent)]" />
            <p className="text-sm text-[color:var(--wiki-ink-soft)]">문서를 불러오는 중입니다…</p>
          </div>
        </div>
      </WikiShell>
    )
  }

  const tabs = [
    { key: 'document', label: '문서', icon: Eye },
    { key: 'edit', label: '편집', icon: Edit },
    { key: 'history', label: '역사', icon: History },
    { key: 'discussion', label: '토론', icon: MessageSquare }
  ]

  const titleDisplay = currentPage?.title || slug
  const protectionLevel = currentPage?.protection?.level || 'none'
  const protectionLabel: Record<string, string> = {
    semi: '준보호',
    autoconfirmed: '준보호',
    full: '완전보호',
    sysop: '완전보호',
    admin: '관리자 전용',
  }
  const protectionBadge =
    protectionLevel !== 'none' ? (
      <span
        className="ml-2 inline-flex items-center gap-1 rounded-sm border border-[color:var(--wiki-danger)]/40 bg-[color:var(--wiki-danger)]/10 px-1.5 py-0.5 align-middle text-[11px] font-medium text-[color:var(--wiki-danger)]"
        title={`${protectionLabel[protectionLevel] || '보호된 문서'}${
          currentPage?.protection?.reason ? ' · ' + currentPage.protection.reason : ''
        }`}
      >
        <Lock className="h-3 w-3" />
        {protectionLabel[protectionLevel] || '보호'}
      </span>
    ) : undefined

  const headerMeta: Array<{ label: string; value: React.ReactNode; icon?: React.ElementType }> = []
  if (currentPage) {
    // 한국어 평균 읽기 속도 ~ 분당 500자 (참고치). content 부피 ÷ 500 → 분
    const contentLen = currentPage.content?.length || 0
    const readMin = Math.max(1, Math.round(contentLen / 500))
    const sectionCount = (currentPage.tableOfContents || []).length

    headerMeta.push(
      { label: '읽기', value: `약 ${readMin}분`, icon: Eye },
      { label: '글자', value: contentLen.toLocaleString(), icon: undefined },
    )
    if (sectionCount > 0) {
      headerMeta.push({ label: '섹션', value: `${sectionCount}개` })
    }
    headerMeta.push(
      { label: '조회', value: `${currentPage.views.toLocaleString()}회` },
      { label: '편집', value: `${currentPage.edits.toLocaleString()}회`, icon: History },
      { label: '리비전', value: `r${currentPage.currentRevision}` },
      { label: '최근', value: formatDate.relative(new Date(currentPage.lastEditDate)), icon: Sparkles },
      { label: '편집자', value: currentPage.lastEditor }
    )
  }

  const headerActions = (
    <>
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex items-center gap-1 rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2.5 py-1 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)] hover:text-[color:var(--wiki-link)]"
      >
        <Share2 className="w-3.5 h-3.5" />
        링크 복사
      </button>
      {isLoggedIn && currentPage && (
        <button
          type="button"
          onClick={handleWatch}
          className="inline-flex items-center gap-1 rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2.5 py-1 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)] hover:text-[color:var(--wiki-link)]"
        >
          <Star className="w-3.5 h-3.5" />
          감시
        </button>
      )}
      {currentPage && (
        <button
          type="button"
          onClick={handleReport}
          className="inline-flex items-center gap-1 rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2.5 py-1 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-danger)] hover:text-[color:var(--wiki-danger)]"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          신고
        </button>
      )}
      {currentPage && (
        <button
          type="button"
          onClick={() => setScanlinesOn(v => !v)}
          aria-pressed={scanlinesOn}
          className={`inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 text-xs ${
            scanlinesOn
              ? 'border-[color:var(--wiki-cyan)] bg-[color:var(--wiki-cyan)]/10 text-[color:var(--wiki-cyan)]'
              : 'border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-cyan)] hover:text-[color:var(--wiki-cyan)]'
          }`}
          title="본문에 스캔 라인 오버레이 토글"
        >
          <Radar className="w-3.5 h-3.5" />
          스캔
        </button>
      )}
      {currentPage && (
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1 rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2.5 py-1 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)] hover:text-[color:var(--wiki-link)]"
          title="문서 인쇄 / PDF 저장 (Ctrl+P)"
        >
          <FileText className="w-3.5 h-3.5" />
          인쇄
        </button>
      )}
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2.5 py-1 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)] hover:text-[color:var(--wiki-link)]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        뒤로
      </button>
    </>
  )

  return (
    <WikiShell
      activeNav="main"
      pageHeader={
        <WikiPageHeader
          title={titleDisplay}
          titleBadge={protectionBadge}
          hatnote={
            currentPage?.namespace && currentPage.namespace !== 'main' ? (
              <>이 문서는 <strong>{currentPage.namespace}</strong> 네임스페이스의 문서입니다.</>
            ) : (
              <>이 문서는 이랑위키의 일반 문서입니다. 잘못된 정보가 있다면 직접 편집해 주세요.</>
            )
          }
          meta={headerMeta}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(k) => setActiveTab(k as WikiTabType)}
          actions={headerActions}
        />
      }
      rightRail={
        currentPage ? (
          <>
            {/* 목차 (sticky, scroll-spy) — 문서 탭에서만 */}
            {activeTab === 'document' && currentPage.content && (
              <WikiTableOfContents content={currentPage.content} />
            )}

            {/* 인포박스 */}
            <table className="wiki-infobox">
              <caption>{currentPage.title}</caption>
              <tbody>
                <tr>
                  <th className="text-left">네임스페이스</th>
                  <td>{currentPage.namespace}</td>
                </tr>
                <tr>
                  <th className="text-left">최종 수정</th>
                  <td>{formatDate.withTime(new Date(currentPage.lastEditDate))}</td>
                </tr>
                <tr>
                  <th className="text-left">편집자</th>
                  <td>{currentPage.lastEditor}</td>
                </tr>
                <tr>
                  <th className="text-left">편집 요약</th>
                  <td>{currentPage.lastEditSummary || '—'}</td>
                </tr>
                <tr>
                  <th className="text-left">총 편집 수</th>
                  <td>{currentPage.edits.toLocaleString()}회</td>
                </tr>
                <tr>
                  <th className="text-left">문서 크기</th>
                  <td>
                    <WikiMeter
                      label="SIZE"
                      valueLabel={`${currentPage.content.length.toLocaleString()} B`}
                      value={Math.min(currentPage.content.length, 50000)}
                      max={50000}
                      tone="cyan"
                      size="sm"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="text-left">고유 조회</th>
                  <td>{currentPage.uniqueViews.toLocaleString()}회</td>
                </tr>
                <tr>
                  <th className="text-left">감시자</th>
                  <td>
                    <WikiMeter
                      label="WATCHERS"
                      valueLabel={`${(currentPage.watchers?.length || 0).toLocaleString()}명`}
                      value={currentPage.watchers?.length || 0}
                      max={Math.max(20, (currentPage.watchers?.length || 0))}
                      tone="violet"
                      size="sm"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            {protectionLevel !== 'none' && (
              <section className="wiki-mbox wiki-mbox--danger">
                <Shield className="w-4 h-4 mt-0.5 text-[color:var(--wiki-danger)]" />
                <div>
                  <p className="font-semibold text-[color:var(--wiki-ink)]">보호된 문서</p>
                  <p className="text-xs text-[color:var(--wiki-ink-soft)] mt-0.5">
                    {currentPage.protection.reason || '편집 권한이 제한되어 있습니다.'}
                  </p>
                </div>
              </section>
            )}

            {/* 문서 함수 */}
            {currentPage.content && (
              <DocumentFunctionsPanel
                content={currentPage.content}
                title={currentPage.title}
                tableOfContents={currentPage.tableOfContents}
                withAnchor
              />
            )}

            {/* 감시 토글 버튼 */}
            {currentPage && (
              <section className="wiki-panel">
                <button
                  type="button"
                  onClick={handleWatchToggle}
                  disabled={isWatchActing}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                    isWatching
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25'
                      : 'bg-[color:var(--wiki-bg-2)] text-[color:var(--wiki-ink-soft)] border border-[color:var(--wiki-rule-strong)] hover:border-[color:var(--wiki-accent)] hover:text-[color:var(--wiki-ink)]'
                  }`}
                  title={
                    !isLoggedIn
                      ? '로그인 필요'
                      : isWatching
                        ? '감시 목록에서 제거'
                        : '감시 목록에 추가'
                  }
                >
                  {isWatching ? (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>감시 중</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-4 h-4" />
                      <span>감시</span>
                    </>
                  )}
                  {isWatchActing && <span className="text-xs opacity-70">(처리 중…)</span>}
                </button>
                <p className="text-[10px] text-[color:var(--wiki-ink-muted)] mt-1.5 text-center">
                  편집 알림은{' '}
                  <button
                    type="button"
                    className="text-[color:var(--wiki-link)] hover:underline"
                    onClick={() => router.push('/wiki/watchlist')}
                  >
                    내 감시 목록
                  </button>{' '}
                  에서 확인
                </p>
              </section>
            )}

            {/* 관련 문서 패널 — 양방향 링크 그래프 */}
            {currentPage && (
              (currentPage.incomingLinks?.length || 0) > 0 ||
              (currentPage.outgoingLinks?.length || 0) > 0
            ) && (
              <section className="wiki-panel">
                <h4 className="wiki-serif text-base font-semibold flex items-center gap-2 mb-2">
                  <Radar className="w-4 h-4 text-[color:var(--wiki-accent)]" />
                  관련 문서
                </h4>

                {(currentPage.incomingLinks?.length || 0) > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--wiki-ink-muted)] mb-1.5">
                      이 문서를 가리키는 문서 ({currentPage.incomingLinks.length})
                    </div>
                    <ul className="space-y-0.5">
                      {currentPage.incomingLinks.slice(0, 12).map((t: string) => (
                        <li key={`in-${t}`}>
                          <button
                            type="button"
                            onClick={() => router.push(`/wiki/${encodeURIComponent(t)}`)}
                            className="text-left text-xs text-[color:var(--wiki-link)] hover:underline truncate w-full"
                            title={t}
                          >
                            ← {t}
                          </button>
                        </li>
                      ))}
                      {currentPage.incomingLinks.length > 12 && (
                        <li className="text-[10px] text-[color:var(--wiki-ink-muted)] pt-0.5">
                          + {currentPage.incomingLinks.length - 12}개 더
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {(currentPage.outgoingLinks?.length || 0) > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--wiki-ink-muted)] mb-1.5">
                      이 문서가 가리키는 문서 ({currentPage.outgoingLinks.length})
                    </div>
                    <ul className="space-y-0.5">
                      {currentPage.outgoingLinks.slice(0, 12).map((t: string) => (
                        <li key={`out-${t}`}>
                          <button
                            type="button"
                            onClick={() => router.push(`/wiki/${encodeURIComponent(t)}`)}
                            className="text-left text-xs text-[color:var(--wiki-link)] hover:underline truncate w-full"
                            title={t}
                          >
                            → {t}
                          </button>
                        </li>
                      ))}
                      {currentPage.outgoingLinks.length > 12 && (
                        <li className="text-[10px] text-[color:var(--wiki-ink-muted)] pt-0.5">
                          + {currentPage.outgoingLinks.length - 12}개 더
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* 관리자 보호 패널 */}
            {canShowProtectUI && (
              <section className="wiki-panel">
                <h4 className="wiki-serif text-base font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[color:var(--wiki-warning)]" />
                  문서 보호
                </h4>
                <div className="mt-2 space-y-2">
                  <label className="block text-xs text-[color:var(--wiki-ink-muted)]">레벨</label>
                  <select
                    value={protectLevel}
                    onChange={(e) => setProtectLevel(e.target.value as any)}
                    className="w-full bg-[color:var(--wiki-bg-2)] border border-[color:var(--wiki-rule-strong)] rounded-sm px-2 py-1 text-sm text-[color:var(--wiki-ink)]"
                  >
                    <option value="none">보호 해제 (none)</option>
                    <option value="semi">반보호 (semi)</option>
                    <option value="full">준전면 (full)</option>
                    <option value="admin">전면 (admin)</option>
                  </select>
                  <input
                    value={protectReason}
                    onChange={(e) => setProtectReason(e.target.value)}
                    placeholder="사유 입력"
                    className="w-full bg-[color:var(--wiki-bg-2)] border border-[color:var(--wiki-rule-strong)] rounded-sm px-2 py-1 text-sm text-[color:var(--wiki-ink)]"
                  />
                  <button
                    type="button"
                    onClick={handleProtect}
                    disabled={isProtecting}
                    className="w-full rounded-sm bg-[color:var(--wiki-accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {isProtecting ? '적용 중…' : '보호 설정 적용'}
                  </button>
                </div>
              </section>
            )}
          </>
        ) : null
      }
    >
      {pageError && (
        <div className={`wiki-mbox ${currentPage ? 'wiki-mbox--danger' : 'wiki-mbox--info'} mb-4`}>
          <AlertTriangle
            className={`w-4 h-4 mt-0.5 ${currentPage ? 'text-[color:var(--wiki-danger)]' : 'text-[color:var(--wiki-cyan)]'}`}
          />
          <div className="flex-1">
            <p
              className="text-[10px] uppercase tracking-[0.2em] mb-1"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: currentPage ? 'var(--wiki-danger)' : 'var(--wiki-cyan)'
              }}
            >
              {currentPage ? '// ERROR' : '// NEW · DOC NOT FOUND'}
            </p>
            <p className="leading-relaxed">
              {currentPage
                ? pageError
                : <>아직 <strong className="text-[color:var(--wiki-ink)]">{slug}</strong> 문서가 없습니다. 아래 편집기에서 첫 내용을 작성하시면 새 문서가 만들어집니다.</>
              }
            </p>
            <div className="mt-2 flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2 py-1 hover:border-[color:var(--wiki-accent)]"
              >
                새로고침
              </button>
              {activeTab !== 'edit' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2 py-1 hover:border-[color:var(--wiki-accent)]"
                >
                  새 문서 작성
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push('/wiki/search')}
                className="rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2 py-1 hover:border-[color:var(--wiki-accent)]"
              >
                다른 문서 검색
              </button>
            </div>
            {!currentPage && suggestions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[color:var(--wiki-rule)]">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--wiki-ink-muted)] mb-2">
                  혹시 이 문서를 찾으시나요?
                </p>
                <ul className="space-y-1.5">
                  {suggestions.map((s) => (
                    <li key={s.slug} className="text-sm">
                      <button
                        type="button"
                        onClick={() => router.push(`/wiki/${encodeURIComponent(s.title)}`)}
                        className="text-[color:var(--wiki-link)] hover:underline font-medium"
                      >
                        {s.title}
                      </button>
                      {s.snippet && (
                        <span className="ml-2 text-xs text-[color:var(--wiki-ink-muted)] line-clamp-1 align-middle">
                          — {s.snippet.length > 80 ? s.snippet.slice(0, 80) + '…' : s.snippet}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {actionFeedback && (
        <div className="wiki-mbox wiki-mbox--success mb-4">
          <Sparkles className="w-4 h-4 mt-0.5 text-[color:var(--wiki-success)]" />
          <p>{actionFeedback}</p>
        </div>
      )}

      {/* ─────── 문서 탭 ─────── */}
      {activeTab === 'document' && currentPage && (
        <>
          {/* 넘겨주기로 도착 — "○○에서 넘어옴" 안내 */}
          {redirectedFrom && (
            <div className="wiki-mbox mb-4 border-l-2 border-sky-500/60">
              <CornerUpRight className="w-4 h-4 mt-0.5 text-sky-400" />
              <p className="flex-1 text-sm">
                <strong className="text-[color:var(--wiki-ink)]">&ldquo;{redirectedFrom}&rdquo;</strong>
                <span className="text-[color:var(--wiki-ink-soft)]"> 문서에서 넘어왔습니다. </span>
                <a
                  href={`/wiki/${encodeURIComponent(redirectedFrom)}?noredirect=1`}
                  className="text-[color:var(--wiki-link)] hover:underline"
                >
                  넘겨주기 원본 보기
                </a>
              </p>
            </div>
          )}

          {/* 이 문서가 넘겨주기 문서 (noredirect 보기) */}
          {pageRedirectTarget && (
            <div className="wiki-mbox mb-4 border-l-2 border-sky-500/60">
              <CornerUpRight className="w-4 h-4 mt-0.5 text-sky-400" />
              <p className="flex-1 text-sm">
                <span className="text-[color:var(--wiki-ink-soft)]">이 문서는 </span>
                <a
                  href={`/wiki/${encodeURIComponent(pageRedirectTarget)}`}
                  className="font-semibold text-[color:var(--wiki-link)] hover:underline"
                >
                  {pageRedirectTarget}
                </a>
                <span className="text-[color:var(--wiki-ink-soft)]"> 문서로 넘겨주기 합니다.</span>
              </p>
            </div>
          )}

          {protectionLevel !== 'none' && (
            <div className="wiki-mbox mb-4">
              <Shield className="w-4 h-4 mt-0.5 text-[color:var(--wiki-warning)]" />
              <p>
                이 문서는 <strong>{protectionLevel}</strong> 등급으로 보호되어 있습니다.
                {currentPage.protection.reason && <> 사유: {currentPage.protection.reason}</>}
              </p>
            </div>
          )}

          {/* Stub 표시 — 본문이 짧음 */}
          {currentPage.isStub && (
            <div className="wiki-mbox mb-4 border-l-2 border-amber-500/60">
              <Sparkles className="w-4 h-4 mt-0.5 text-amber-400" />
              <p className="flex-1">
                <strong className="text-[color:var(--wiki-ink)]">이 문서는 아직 짧습니다.</strong>{' '}
                <span className="text-[color:var(--wiki-ink-soft)]">
                  내용을 더 풍성하게 채워주세요. 누구나 함께 편집할 수 있습니다.
                </span>
                {isLoggedIn && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="ml-2 text-xs text-[color:var(--wiki-link)] hover:underline"
                  >
                    편집하기 →
                  </button>
                )}
              </p>
            </div>
          )}

          {/* 고립 문서 표시 — 들어오는 링크가 없으면.
              들어오는 링크도 나가는 링크도 모두 없으면 '완전 고립'으로 더 강조. */}
          {(currentPage.incomingLinks?.length || 0) === 0 && !currentPage.isRedirect && (
            (() => {
              const fullyIsolated = (currentPage.outgoingLinks?.length || 0) === 0
              return (
                <div
                  className={`wiki-mbox mb-4 border-l-2 ${
                    fullyIsolated ? 'border-amber-500/60' : 'border-indigo-500/60'
                  }`}
                >
                  <Radar className={`w-4 h-4 mt-0.5 ${fullyIsolated ? 'text-amber-400' : 'text-indigo-400'}`} />
                  <p className="flex-1 text-sm">
                    <strong className="text-[color:var(--wiki-ink)]">
                      {fullyIsolated
                        ? '완전 고립 문서입니다 (들어오고 나가는 링크가 모두 없음).'
                        : '이 문서를 가리키는 다른 문서가 없습니다 (고립 문서).'}
                    </strong>{' '}
                    <span className="text-[color:var(--wiki-ink-soft)]">
                      관련 있는 다른 문서에서{' '}
                      <code className="bg-[color:var(--wiki-bg-2)] px-1 rounded text-[11px]">
                        [[{currentPage.title}]]
                      </code>{' '}
                      를 추가하면 검색과 탐색이 더 쉬워집니다.
                      {fullyIsolated && ' 본문에도 관련 문서로의 [[링크]]를 넣어보세요.'}
                    </span>
                  </p>
                </div>
              )
            })()
          )}

          {currentPage.summary && (
            <p className="text-sm text-[color:var(--wiki-ink-soft)] mb-3 italic">{currentPage.summary}</p>
          )}

          <article
            ref={articleRef}
            className={`wiki-content ${scanlinesOn ? 'wiki-scanlines' : ''}`}
          >
            <NamuWikiRenderer
              content={currentPage.content}
              generateTableOfContents
              onLinkClick={(link) => {
                const normalized = (link || '').trim()
                if (!normalized) return
                if (/^(분류|category):/i.test(normalized)) {
                  const categoryName = normalized.split(':').slice(1).join(':').trim()
                  if (categoryName) {
                    router.push(`/wiki/category/${encodeURIComponent(categoryName)}`)
                    return
                  }
                }
                router.push(`/wiki/${encodeURIComponent(normalized)}`)
              }}
            />
          </article>

          {/* 카테고리 푸터 */}
          {currentPage.categories && currentPage.categories.length > 0 && (
            <footer className="mt-8 pt-3 border-t border-[color:var(--wiki-rule)]">
              <span className="text-xs text-[color:var(--wiki-ink-muted)] mr-2">분류:</span>
              {currentPage.categories.map((category, idx) => (
                <button
                  key={`${category}-${idx}`}
                  type="button"
                  onClick={() => router.push(`/wiki/category/${encodeURIComponent(category)}`)}
                  className="inline-block mr-1 mb-1 text-xs text-[color:var(--wiki-link)] hover:underline"
                >
                  [{category}]
                </button>
              ))}
            </footer>
          )}

          {/* 문서 기여 정보 — 처음 작성자 + 마지막 편집자 + 통계 */}
          <footer className="mt-6 pt-4 border-t border-[color:var(--wiki-rule)] grid sm:grid-cols-2 gap-3 text-[11px]">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--wiki-ink-muted)] mb-1">
                처음 작성
              </div>
              <div className="text-[color:var(--wiki-ink-soft)]">
                <button
                  type="button"
                  onClick={() => router.push(`/wiki/recent?author=${encodeURIComponent(currentPage.creator)}`)}
                  className="font-semibold text-[color:var(--wiki-ink)] hover:text-[color:var(--wiki-link)]"
                >
                  {currentPage.creator || '—'}
                </button>
                {currentPage.createdAt && (
                  <span className="ml-1.5 text-[color:var(--wiki-ink-muted)]">
                    {new Date(currentPage.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--wiki-ink-muted)] mb-1">
                마지막 편집
              </div>
              <div className="text-[color:var(--wiki-ink-soft)]">
                <button
                  type="button"
                  onClick={() => router.push(`/wiki/recent?author=${encodeURIComponent(currentPage.lastEditor)}`)}
                  className="font-semibold text-[color:var(--wiki-ink)] hover:text-[color:var(--wiki-link)]"
                >
                  {currentPage.lastEditor || '—'}
                </button>
                <span className="ml-1.5 text-[color:var(--wiki-ink-muted)]">
                  {currentPage.lastEditDate ? formatDate.relative(new Date(currentPage.lastEditDate)) : '—'}
                  {' · '}r{currentPage.currentRevision}
                </span>
              </div>
            </div>
          </footer>

          {/* 라이선스 */}
          <p className="mt-4 text-[11px] text-[color:var(--wiki-ink-muted)] leading-relaxed">
            이 문서는 <strong>이랑위키</strong>의 문서입니다. 내용은 사용자들에 의해 자유롭게
            편집될 수 있으며, 모든 기여는 공동체의 지식 향상을 위한 것입니다.{' '}
            <button
              type="button"
              onClick={() => router.push('/wiki/contributors')}
              className="text-[color:var(--wiki-link)] hover:underline"
            >
              전체 기여자 →
            </button>
          </p>

          {/* CAPTCHA placeholder (서버에서 활성화 시 노출) */}
          <div id="captcha-container" className="hidden mt-6 wiki-mbox wiki-mbox--info">
            <div className="flex-1">
              <p className="font-semibold text-[color:var(--wiki-ink)]">보안 확인</p>
              <p className="text-xs text-[color:var(--wiki-ink-soft)] mt-1">
                편집이 일시적으로 제한되었습니다. 아래 질문에 답해 주세요.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span id="captcha-question" className="text-sm" />
                <input
                  id="captcha-answer"
                  className="bg-[color:var(--wiki-bg-2)] border border-[color:var(--wiki-rule-strong)] rounded-sm px-2 py-1 w-24 text-sm"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const q = document.getElementById('captcha-question') as HTMLSpanElement | null
                    const a = document.getElementById('captcha-answer') as HTMLInputElement | null
                    const token = q?.dataset.token || ''
                    const answer = a?.value || ''
                    try {
                      const res = await fetch('/api/wiki/pages/captcha', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token, answer })
                      })
                      const d = await res.json()
                      if (d.success) window.location.reload()
                      else alert(d.error || 'CAPTCHA 검증 실패')
                    } catch {
                      alert('CAPTCHA 처리 중 오류')
                    }
                  }}
                  className="rounded-sm bg-[color:var(--wiki-accent)] px-2 py-1 text-xs text-white"
                >
                  제출
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─────── 편집 탭 ─────── */}
      {activeTab === 'edit' && (
        <div className="space-y-4">
          {/* 템플릿 헬퍼 */}
          <section className="wiki-panel">
            <h3 className="wiki-serif text-base font-semibold mb-2">템플릿 불러오기</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div>
                <label className="block text-xs text-[color:var(--wiki-ink-muted)] mb-1">분야</label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                  className="w-full bg-[color:var(--wiki-bg-2)] border border-[color:var(--wiki-rule-strong)] rounded-sm px-2 py-1.5 text-sm text-[color:var(--wiki-ink)]"
                >
                  <option value="">선택하세요</option>
                  {TEMPLATE_CATEGORIES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-[color:var(--wiki-ink-muted)] mb-1">명령어 (예: /템플릿 인물)</label>
                <div className="flex gap-2">
                  <input
                    value={templateCommand}
                    onChange={(e) => setTemplateCommand(e.target.value)}
                    placeholder="/템플릿 인물"
                    className="flex-1 bg-[color:var(--wiki-bg-2)] border border-[color:var(--wiki-rule-strong)] rounded-sm px-2 py-1.5 text-sm text-[color:var(--wiki-ink)]"
                  />
                  <button
                    type="button"
                    onClick={handleTemplateCommand}
                    className="rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-3 py-1.5 text-xs font-medium text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)]"
                  >
                    불러오기
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => loadTemplateByType(templateType)}
                disabled={!templateType}
                className="rounded-sm bg-[color:var(--wiki-accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                선택한 템플릿 적용
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[color:var(--wiki-ink-muted)]">
              자세한 사용법은{' '}
              <button
                type="button"
                onClick={() => router.push('/wiki/이랑위키:도움말_2026')}
                className="text-[color:var(--wiki-link)] hover:underline"
              >
                편집 도움말 (2026)
              </button>
              에서 확인할 수 있습니다.
            </p>
          </section>

          <WikiEditor
            content={editContent}
            onChange={setEditContent}
            onSave={handleSave}
            title={currentPage ? `${currentPage.title} 편집` : `${slug} 생성`}
            showPreview={false}
          />

          <section className="wiki-panel">
            <label className="block text-xs text-[color:var(--wiki-ink-muted)] mb-1">편집 요약</label>
            <Input
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              placeholder="변경 내용을 간단히 설명해 주세요."
              className="bg-[color:var(--wiki-bg-2)] border-[color:var(--wiki-rule-strong)] text-[color:var(--wiki-ink)]"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-sm bg-[color:var(--wiki-accent)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
              >
                {currentPage ? '변경 사항 저장' : '새 문서 생성'}
              </button>
              <button
                type="button"
                onClick={() => currentPage ? setActiveTab('document') : router.push('/wiki')}
                className="rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-4 py-1.5 text-sm text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)]"
              >
                취소
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ─────── 역사 탭 ─────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <section className="wiki-panel">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="wiki-serif text-base font-semibold">편집 역사</h3>
                <p className="text-xs text-[color:var(--wiki-ink-muted)]">
                  리비전 목록에서 비교/되돌리기를 수행할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={loadRevisions}
                className="rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-3 py-1.5 text-xs text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)]"
              >
                {isLoadingRevisions ? '불러오는 중…' : '리비전 새로고침'}
              </button>
            </div>
            {revisions.length === 0 ? (
              <p className="mt-4 text-sm text-[color:var(--wiki-ink-muted)] text-center py-6">
                리비전이 없습니다.
              </p>
            ) : (
              <ul className="mt-3 border border-[color:var(--wiki-rule)] rounded-sm overflow-hidden divide-y divide-[color:var(--wiki-rule)]">
                {revisions.map((r) => {
                  const sz = r.sizeChange ?? 0
                  const isPositive = sz > 0
                  const ts = r.timestampAt || r.timestamp || r.createdAt
                  const tsRel = ts ? (() => {
                    const t = new Date(ts).getTime()
                    if (Number.isNaN(t)) return ''
                    const diff = Date.now() - t
                    const sec = Math.floor(diff / 1000)
                    if (sec < 60) return `${sec}초 전`
                    const min = Math.floor(sec / 60)
                    if (min < 60) return `${min}분 전`
                    const hr = Math.floor(min / 60)
                    if (hr < 24) return `${hr}시간 전`
                    const day = Math.floor(hr / 24)
                    if (day < 7) return `${day}일 전`
                    if (day < 30) return `${Math.floor(day / 7)}주 전`
                    return new Date(ts).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
                  })() : ''
                  const tsAbs = ts ? new Date(ts).toLocaleString('ko-KR', { hour12: false }) : ''
                  const editTypeLabel: Record<string, string> = {
                    create: '생성', edit: '편집', revert: '되돌림', delete: '삭제', protect: '보호',
                  }
                  return (
                    <li
                      key={r.revisionNumber}
                      className="px-3 py-2 hover:bg-[color:var(--wiki-paper-2)] transition-colors"
                    >
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className="text-xs font-mono text-[color:var(--wiki-ink-muted)] tabular-nums w-12 flex-shrink-0 pt-0.5">
                          r{r.revisionNumber}
                        </span>
                        <span
                          className={`wiki-chip text-[10px] flex-shrink-0 ${
                            r.editType === 'create'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : r.editType === 'revert'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : ''
                          }`}
                        >
                          {editTypeLabel[r.editType] || r.editType}
                        </span>
                        {r.isMinorEdit && (
                          <span
                            className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded-sm px-1.5 py-0.5"
                            title="마이너 편집"
                          >
                            m
                          </span>
                        )}
                        {r.isAutomated && (
                          <span
                            className="text-[10px] font-bold text-blue-400 bg-blue-500/15 border border-blue-500/30 rounded-sm px-1.5 py-0.5"
                            title="자동 편집"
                          >
                            bot
                          </span>
                        )}
                        {sz !== 0 && (
                          <span
                            className={`text-[11px] tabular-nums font-mono ${
                              isPositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                            title={`총 ${(r.contentLength ?? '?').toLocaleString?.() ?? '?'} 자`}
                          >
                            ({isPositive ? '+' : ''}{sz.toLocaleString()})
                          </span>
                        )}
                        <span
                          className="text-xs text-[color:var(--wiki-ink-soft)]"
                          title={tsAbs}
                        >
                          {tsRel}
                        </span>
                        <span className="text-xs text-[color:var(--wiki-ink-muted)]">·</span>
                        <span className="text-xs text-[color:var(--wiki-ink-soft)]">
                          {r.author || '—'}
                        </span>

                        <span className="ml-auto" />

                        <button
                          type="button"
                          onClick={async () => {
                            const q = new URLSearchParams({ title: slug, rev: String(r.revisionNumber) })
                            const res = await fetch(`/api/wiki/pages/revisions?${q.toString()}`)
                            const d = await res.json()
                            if (d.success) setDiffView({ a: d.previous, b: d.revision })
                          }}
                          className="text-xs text-[color:var(--wiki-link)] hover:underline"
                          title="이전 리비전과 비교"
                        >
                          비교
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`r${r.revisionNumber}으로 되돌리시겠습니까?`)) return
                            const res = await fetch('/api/wiki/pages/revert', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ title: slug, revisionNumber: r.revisionNumber }),
                            })
                            const d = await res.json()
                            if (d.success) window.location.reload()
                            else alert(d.error || '되돌리기 실패')
                          }}
                          className="text-xs text-[color:var(--wiki-danger)] hover:underline"
                        >
                          되돌리기
                        </button>
                      </div>
                      {r.summary && (
                        <div className="text-[11px] text-[color:var(--wiki-ink-muted)] mt-0.5 ml-[60px] italic line-clamp-1">
                          “{r.summary}”
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {diffView?.b && (
            <section className="wiki-panel">
              <h4 className="wiki-serif text-base font-semibold mb-3">
                Diff 비교 (r{diffView.a?.revisionNumber || 0} → r{diffView.b.revisionNumber})
              </h4>
              <DiffViewer oldText={diffView.a?.content || ''} newText={diffView.b.content || ''} />
            </section>
          )}
        </div>
      )}

      {/* ─────── 토론 탭 ─────── */}
      {activeTab === 'discussion' && (
        <div className="space-y-4">
          <section className="wiki-panel">
            <h3 className="wiki-serif text-base font-semibold mb-2">토론 시작하기</h3>
            <Input
              value={newDiscussion.topic}
              onChange={(e) => setNewDiscussion(d => ({ ...d, topic: e.target.value }))}
              placeholder="주제"
              className="bg-[color:var(--wiki-bg-2)] border-[color:var(--wiki-rule-strong)] text-[color:var(--wiki-ink)] mb-2"
            />
            <textarea
              value={newDiscussion.content}
              onChange={(e) => setNewDiscussion(d => ({ ...d, content: e.target.value }))}
              placeholder="내용을 입력하세요."
              rows={4}
              className="w-full rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2 py-1.5 text-sm text-[color:var(--wiki-ink)]"
            />
            <div className="mt-2">
              <button
                type="button"
                onClick={handleAddDiscussion}
                className="rounded-sm bg-[color:var(--wiki-accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                토론 작성
              </button>
            </div>
          </section>

          <section className="wiki-panel">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="wiki-serif text-base font-semibold">토론 목록</h3>
              <span className="text-[11px] text-[color:var(--wiki-ink-muted)] tabular-nums">
                {discussions.length}건
              </span>
            </div>
            {discussions.length === 0 ? (
              <p className="text-sm text-[color:var(--wiki-ink-muted)] text-center py-6">
                아직 진행 중인 토론이 없습니다. 위에서 첫 토론을 시작해 보세요.
              </p>
            ) : (
              <ul className="space-y-3">
                {discussions.map((d, i) => {
                  const dId = d.id || d._id
                  const replies = Array.isArray(d.replies) ? d.replies : []
                  const isExpanded = expandedDiscussions[dId] !== false // 기본 펼침
                  const status = d.status || 'open'
                  const ts = d.createdAt
                  const tsAbs = ts ? new Date(ts).toLocaleString('ko-KR', { hour12: false }) : ''
                  const tsRel = ts ? (() => {
                    const diff = Date.now() - new Date(ts).getTime()
                    const min = Math.floor(diff / 60000)
                    if (min < 60) return `${min}분 전`
                    const hr = Math.floor(min / 60)
                    if (hr < 24) return `${hr}시간 전`
                    const day = Math.floor(hr / 24)
                    if (day < 30) return `${day}일 전`
                    return new Date(ts).toLocaleDateString('ko-KR')
                  })() : ''

                  const statusStyle: Record<string, { label: string; cls: string }> = {
                    open: { label: '진행 중', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
                    resolved: { label: '해결됨', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
                    closed: { label: '닫힘', cls: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
                    archived: { label: '보관', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
                  }
                  const sty = statusStyle[status] || statusStyle.open

                  return (
                    <li
                      key={dId || i}
                      className="border border-[color:var(--wiki-rule)] rounded-md overflow-hidden bg-[color:var(--wiki-bg-2)]/30"
                    >
                      {/* 헤더 */}
                      <div className="px-3 py-2 border-b border-[color:var(--wiki-rule)] bg-[color:var(--wiki-bg-2)]/60 flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDiscussions((s) => ({ ...s, [dId]: isExpanded ? false : true }))
                          }
                          className="text-xs text-[color:var(--wiki-ink-muted)] hover:text-[color:var(--wiki-ink)]"
                          title={isExpanded ? '접기' : '펼치기'}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                        <span className={`text-[10px] font-bold tracking-[0.05em] rounded-sm border px-1.5 py-0.5 ${sty.cls}`}>
                          {sty.label}
                        </span>
                        {d.category && d.category !== 'general' && (
                          <span className="wiki-chip text-[10px]">{d.category}</span>
                        )}
                        {d.isLocked && (
                          <span className="text-[10px] text-rose-400" title="잠김">🔒</span>
                        )}
                        <p className="text-sm font-semibold text-[color:var(--wiki-ink)] truncate">
                          {d.title || d.topic}
                        </p>
                        <span className="ml-auto" />
                        {replies.length > 0 && (
                          <span className="text-[11px] text-[color:var(--wiki-ink-muted)]">
                            답글 {replies.length}
                          </span>
                        )}
                        <span className="text-[11px] text-[color:var(--wiki-ink-soft)]">
                          {d.author}
                        </span>
                        <span className="text-[11px] text-[color:var(--wiki-ink-muted)]" title={tsAbs}>
                          · {tsRel}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="px-3 py-3 space-y-3">
                          {/* 본문 */}
                          {d.content && (
                            <p className="text-sm text-[color:var(--wiki-ink)] whitespace-pre-line leading-relaxed">
                              {d.content}
                            </p>
                          )}

                          {/* 답글 목록 */}
                          {replies.length > 0 && (
                            <ul className="space-y-2 border-l-2 border-[color:var(--wiki-rule)] pl-3 ml-1">
                              {replies.map((r: any, ri: number) => {
                                const rTs = r.timestamp ? new Date(r.timestamp).toLocaleString('ko-KR', { hour12: false }) : ''
                                return (
                                  <li key={r.id || ri} className="text-sm">
                                    <div className="flex items-baseline gap-2 text-[11px] text-[color:var(--wiki-ink-muted)]">
                                      <span className="font-semibold text-[color:var(--wiki-ink-soft)]">
                                        {r.author || '익명'}
                                      </span>
                                      <span>·</span>
                                      <span title={rTs}>{rTs}</span>
                                    </div>
                                    <p className="text-[color:var(--wiki-ink-soft)] whitespace-pre-line mt-0.5">
                                      {r.content}
                                    </p>
                                  </li>
                                )
                              })}
                            </ul>
                          )}

                          {/* 답글 작성 */}
                          {!d.isLocked && status === 'open' && (
                            <div className="pt-2 border-t border-[color:var(--wiki-rule)]">
                              <textarea
                                value={replyInputs[dId] || ''}
                                onChange={(e) =>
                                  setReplyInputs((s) => ({ ...s, [dId]: e.target.value }))
                                }
                                placeholder={isLoggedIn ? '답글 입력…' : '답글하려면 로그인하세요'}
                                disabled={!isLoggedIn}
                                rows={2}
                                className="w-full rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-2 py-1.5 text-sm text-[color:var(--wiki-ink)] disabled:opacity-50"
                              />
                              <div className="flex items-center justify-between mt-1.5">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await handleReplyToDiscussion(dId, replyInputs[dId] || '')
                                    setReplyInputs((s) => ({ ...s, [dId]: '' }))
                                  }}
                                  disabled={!isLoggedIn || !(replyInputs[dId] || '').trim()}
                                  className="rounded-sm bg-[color:var(--wiki-accent)] px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
                                >
                                  답글
                                </button>
                                {/* 작성자 본인이면 상태 변경 가능 */}
                                {isLoggedIn && (wikiUser as any)?.username === d.author && status === 'open' && (
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleChangeDiscussionStatus(dId, 'resolved')}
                                      className="text-[11px] text-blue-400 hover:underline"
                                    >
                                      해결됨으로 표시
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleChangeDiscussionStatus(dId, 'closed')}
                                      className="text-[11px] text-gray-400 hover:underline"
                                    >
                                      닫기
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* 문서 함수 모달 (모바일에서 우측 사이드바가 숨겨질 때 사용) */}
      {showFunctionsModal && currentPage?.content && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowFunctionsModal(false)}
              className="absolute -top-2 -right-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] text-[color:var(--wiki-ink-soft)] shadow"
              aria-label="문서 함수 닫기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <DocumentFunctionsPanel
              content={currentPage.content}
              title={currentPage.title}
              tableOfContents={currentPage.tableOfContents}
              withAnchor={false}
            />
          </div>
        </div>
      )}

      {/* 이미지 lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setLightbox(null)
            }}
            className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.src}
            alt={lightbox.alt || '확대 이미지'}
            className="max-w-full max-h-full object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {lightbox.alt && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 text-white text-sm rounded backdrop-blur-sm max-w-[90vw] truncate">
              {lightbox.alt}
            </div>
          )}
          <div className="absolute bottom-4 right-4 text-[11px] text-white/60">
            <kbd className="px-1.5 py-0.5 font-mono rounded bg-white/10 border border-white/20">Esc</kbd>{' '}
            로 닫기
          </div>
        </div>
      )}
    </WikiShell>
  )
}

// LCS 기반 줄 단위 diff — 줄 삽입/삭제가 발생해도 공통 줄을 정렬해
// 변경 줄만 빨강(삭제)/초록(추가)으로 표시한다 (인덱스 단순 비교의 오정렬 해결).
type DiffRow = {
  type: 'equal' | 'add' | 'del'
  left?: { n: number; text: string }
  right?: { n: number; text: string }
}

function computeLineDiff(oldText: string, newText: string): DiffRow[] {
  const a = (oldText || '').split('\n')
  const b = (newText || '').split('\n')
  const n = a.length
  const m = b.length

  // 매우 큰 문서는 LCS 메모리 폭주 방지 — 단순 인덱스 정렬로 폴백
  if (n * m > 4_000_000) {
    const rows: DiffRow[] = []
    const max = Math.max(n, m)
    for (let i = 0; i < max; i++) {
      const la = a[i]
      const lb = b[i]
      if (la === undefined) rows.push({ type: 'add', right: { n: i + 1, text: lb } })
      else if (lb === undefined) rows.push({ type: 'del', left: { n: i + 1, text: la } })
      else if (la === lb) rows.push({ type: 'equal', left: { n: i + 1, text: la }, right: { n: i + 1, text: lb } })
      else {
        rows.push({ type: 'del', left: { n: i + 1, text: la } })
        rows.push({ type: 'add', right: { n: i + 1, text: lb } })
      }
    }
    return rows
  }

  // LCS 길이 테이블 (역방향 DP)
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const rows: DiffRow[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ type: 'equal', left: { n: i + 1, text: a[i] }, right: { n: j + 1, text: b[j] } })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ type: 'del', left: { n: i + 1, text: a[i] } })
      i++
    } else {
      rows.push({ type: 'add', right: { n: j + 1, text: b[j] } })
      j++
    }
  }
  while (i < n) { rows.push({ type: 'del', left: { n: i + 1, text: a[i] } }); i++ }
  while (j < m) { rows.push({ type: 'add', right: { n: j + 1, text: b[j] } }); j++ }
  return rows
}

function DiffViewer({ oldText, newText }: { oldText: string; newText: string }) {
  const rows = React.useMemo(() => computeLineDiff(oldText, newText), [oldText, newText])
  const adds = rows.filter((r) => r.type === 'add').length
  const dels = rows.filter((r) => r.type === 'del').length

  return (
    <div className="text-xs">
      <div className="mb-2 flex items-center gap-3 font-mono text-[11px]">
        <span className="text-emerald-400">+{adds}</span>
        <span className="text-rose-400">−{dels}</span>
        <span className="text-[color:var(--wiki-ink-muted)]">{rows.length}행</span>
      </div>
      <div className="border border-[color:var(--wiki-rule)] rounded-sm overflow-hidden">
        <div className="grid grid-cols-2 bg-[color:var(--wiki-paper-2)] text-[color:var(--wiki-ink-muted)] px-2 py-1 font-medium">
          <div>이전</div>
          <div>현재</div>
        </div>
        <div className="max-h-[28rem] overflow-y-auto font-mono">
          {rows.map((r, idx) => {
            const leftBg = r.type === 'del' ? 'bg-rose-500/10' : r.type === 'add' ? 'bg-[color:var(--wiki-paper-2)]/40' : ''
            const rightBg = r.type === 'add' ? 'bg-emerald-500/10' : r.type === 'del' ? 'bg-[color:var(--wiki-paper-2)]/40' : ''
            return (
              <div
                key={idx}
                className="grid grid-cols-2 border-b border-[color:var(--wiki-rule)]/60 last:border-b-0"
              >
                <div className={`flex gap-1.5 px-2 py-0.5 ${leftBg}`}>
                  <span className="w-8 flex-shrink-0 select-none text-right text-[10px] text-[color:var(--wiki-ink-muted)] tabular-nums">
                    {r.left?.n ?? ''}
                  </span>
                  <span className="w-3 flex-shrink-0 select-none text-rose-400">{r.type === 'del' ? '−' : ''}</span>
                  <pre className="whitespace-pre-wrap break-words text-[color:var(--wiki-ink-soft)] min-w-0">{r.left?.text ?? ''}</pre>
                </div>
                <div className={`flex gap-1.5 px-2 py-0.5 ${rightBg}`}>
                  <span className="w-8 flex-shrink-0 select-none text-right text-[10px] text-[color:var(--wiki-ink-muted)] tabular-nums">
                    {r.right?.n ?? ''}
                  </span>
                  <span className="w-3 flex-shrink-0 select-none text-emerald-400">{r.type === 'add' ? '+' : ''}</span>
                  <pre className="whitespace-pre-wrap break-words text-[color:var(--wiki-ink-soft)] min-w-0">{r.right?.text ?? ''}</pre>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
