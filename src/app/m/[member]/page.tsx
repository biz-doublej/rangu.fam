import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MEMBER_SITES, type MemberSlug } from '@/config/memberSites'

interface Props {
  params: { member: string }
}

const VALID: MemberSlug[] = ['seungchan', 'minseok', 'hanul', 'jingyu', 'jaewon']

// 매 요청마다 새 SSR. SSG 시 build 시점 HTML 이 1년 캐시되어 콘텐츠 갱신이 안 되는
// 문제(s-maxage=31536000) 를 회피. 멤버 페이지는 트래픽이 적어 비용 영향 미미.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export function generateMetadata({ params }: Props): Metadata {
  const m = MEMBER_SITES[params.member as MemberSlug]
  if (!m) return { title: 'Member' }
  return {
    title: `${m.name} · ${m.topic}`,
    description: `${m.name}의 개인 페이지`,
  }
}

/**
 * 멤버 라우터 — slug로 분기해 멤버별 페이지 컴포넌트를 렌더한다.
 * 각 페이지는 src/app/m/_pages/{slug}.tsx에 자기 디자인 트리를 가진다.
 */
export default async function MemberPage({ params }: Props) {
  const slug = params.member as MemberSlug
  if (!VALID.includes(slug)) notFound()

  switch (slug) {
    case 'seungchan': {
      const Mod = await import('../_pages/seungchan')
      return <Mod.default />
    }
    case 'minseok': {
      const Mod = await import('../_pages/minseok')
      return <Mod.default />
    }
    case 'hanul': {
      const Mod = await import('../_pages/hanul')
      return <Mod.default />
    }
    case 'jingyu': {
      const Mod = await import('../_pages/jingyu')
      return <Mod.default />
    }
    case 'jaewon': {
      // 아직 디자인 미정 — placeholder
      return (
        <div className="min-h-screen flex items-center justify-center px-6 text-center">
          <div>
            <p className="caveat text-xl text-coral-500">coming soon</p>
            <h1 className="display-han mt-2 text-3xl text-ink-500">정재원 — 컨셉 미정</h1>
            <p className="mt-3 text-sm text-ink-300">곧 공개될 예정.</p>
          </div>
        </div>
      )
    }
    default:
      notFound()
  }
}
