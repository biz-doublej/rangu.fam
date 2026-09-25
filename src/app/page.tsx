import Image from 'next/image'
import { BRANDING } from '@/config/branding'
import { ARCHIVE_ANNIVERSARIES, ARCHIVE_MEMBERS, RANGU_ARCHIVE_MODE } from '@/config/archive'
import { AnniversaryCounter } from '@/components/archive/AnniversaryCounter'
import { LegacyHomePage } from '@/components/legacy/LegacyHomePage'

export default function HomePage() {
  if (!RANGU_ARCHIVE_MODE) return <LegacyHomePage />

  return (
    <main className="archive-page">
      <header className="archive-header">
        <Image src="/rang_web_logo.png" alt="" width={40} height={40} className="archive-logo" priority />
        <div>
          <h1 className="archive-title">Rangu.fam</h1>
          <p className="archive-subtitle">친구 다섯의 기록 · 보관 중인 사이트</p>
        </div>
      </header>

      <figure className="archive-hero">
        <Image
          src="/images/slide1.jpg"
          alt="랑구팸 다섯 멤버 단체 사진"
          width={2000}
          height={1125}
          sizes="(max-width: 720px) 100vw, 720px"
          priority
        />
      </figure>

      <AnniversaryCounter anniversaries={ARCHIVE_ANNIVERSARIES} />

      <section className="archive-section">
        <h2>소개</h2>
        <p>
          Rangu.fam은 2020년 다섯 친구가 시작한 작은 페이지에서 자라난 우리만의 공간입니다.
          카드, 피드, 선물상자 같은 기능은 운영을 마치고 지금은 기록으로만 남아 있습니다.
        </p>
        <p>
          계속 자라는 이야기는 <a href={BRANDING.wikiPublicUrl}>이랑위키</a>에서 이어집니다.
        </p>
      </section>

      <section className="archive-section">
        <h2>멤버</h2>
        <ul className="archive-members">
          {ARCHIVE_MEMBERS.map((m) => (
            <li key={m.name}>
              <span className="archive-members__name">{m.name}</span>
              <span className="archive-members__role">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="archive-section">
        <h2>바로가기</h2>
        <ul className="archive-links">
          <li><a href={BRANDING.wikiPublicUrl}>이랑위키</a></li>
        </ul>
      </section>

      <footer className="archive-footer">© 2020–2026 Rangu.fam · 이 사이트는 더 이상 업데이트되지 않습니다.</footer>
    </main>
  )
}
