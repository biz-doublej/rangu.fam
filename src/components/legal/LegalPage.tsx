import Link from 'next/link'

type LegalKind = 'terms' | 'privacy'

export function LegalPage({ kind }: { kind: LegalKind }) {
  const isPrivacy = kind === 'privacy'

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-ink-300 hover:text-coral-500">← 랑구팸 홈</Link>
        <nav className="flex gap-3 text-sm">
          <Link href="/terms" className="text-ink-300 hover:text-coral-500">이용약관</Link>
          <Link href="/privacy" className="text-ink-300 hover:text-coral-500">개인정보처리방침</Link>
        </nav>
      </div>

      <article className="rounded-2xl border border-ink-500/15 bg-paper-50 p-6 text-ink-500 shadow-sm sm:p-10">
        <p className="caveat text-lg text-coral-500">DoubleJ · Rangu.fam · Irangwiki</p>
        <h1 className="display-han mt-2 text-3xl sm:text-4xl">
          {isPrivacy ? '개인정보처리방침' : '서비스 이용약관'}
        </h1>
        <p className="mt-3 text-sm text-ink-300">시행일: 2026년 10월 17일</p>

        {isPrivacy ? <PrivacyContent /> : <TermsContent />}
      </article>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-8"><h2 className="text-lg font-bold">{title}</h2><div className="mt-2 space-y-2 text-sm leading-7 text-ink-300">{children}</div></section>
}

function PrivacyContent() {
  return <>
    <Section title="1. 총칙"><p>DoubleJ(이하 ‘운영자’)는 랑구팸과 이랑위키(이하 ‘서비스’) 이용자의 개인정보를 보호하고 관련 법령을 준수합니다. 이 방침은 서비스 내 로그인 및 일반 페이지에서 처리되는 정보를 설명합니다.</p></Section>
    <Section title="2. 수집하는 정보"><p>Google 로그인 시 Google이 제공하는 식별자, 이메일 주소(이메일 인증 여부 포함), 이름·프로필 이미지와 로그인·세션 기록을 수집할 수 있습니다.</p><p>서비스 이용 중에는 위키 문서·편집·토론·댓글·카드 활동 등 이용자가 직접 작성하거나 생성한 콘텐츠와 접속 기록, 오류·보안 로그가 처리될 수 있습니다.</p><p>비로그인 이용 시에도 쿠키와 브라우저 저장소가 테마·화면 설정을 저장할 수 있습니다.</p></Section>
    <Section title="3. 이용 목적"><p>회원 식별과 로그인 유지, 위키 편집 권한 제공, 콘텐츠·활동 표시, 부정 이용 방지, 서비스 운영·장애 대응 및 개선을 위해 사용합니다.</p></Section>
    <Section title="4. 보관 및 파기"><p>계정과 이용 기록은 서비스 이용 기간 동안 보관하며, 탈퇴·처리 목적 달성·보관 기간 만료 후 지체 없이 파기합니다. 법령에 따라 보존해야 하는 정보는 해당 기간 동안 별도로 보관합니다.</p></Section>
    <Section title="5. 제3자 제공 및 처리위탁"><p>Google OAuth 로그인 과정에서 Google의 개인정보처리방침이 적용됩니다. 운영자는 로그인과 서비스 제공에 필요한 범위에서만 정보를 처리하며, 법령상 의무가 있거나 이용자의 동의가 있는 경우를 제외하고 제3자에게 판매·제공하지 않습니다.</p></Section>
    <Section title="6. 이용자의 권리"><p>이용자는 자신의 개인정보 열람·정정·삭제·처리정지를 요청할 수 있습니다. 계정 관련 요청은 로그인 후 계정 설정 또는 서비스 문의를 이용해 주세요. 요청 처리 과정에서 본인 확인을 할 수 있습니다.</p></Section>
    <Section title="7. 문의"><p>개인정보 관련 문의 및 권리행사는 <a className="text-coral-500 underline" href="https://doublej.app/#contact" target="_blank" rel="noreferrer">DoubleJ 문의 페이지</a>로 접수해 주세요.</p></Section>
  </>
}

function TermsContent() {
  return <>
    <Section title="1. 목적"><p>이 약관은 운영자가 제공하는 랑구팸 및 이랑위키 서비스의 이용 조건과 운영 원칙을 정합니다.</p></Section>
    <Section title="2. 계정과 로그인"><p>서비스는 Google OAuth 로그인으로 이용자를 인증합니다. 최초 로그인 시 계정이 생성될 수 있으며, 이용자는 본인의 계정을 안전하게 관리해야 합니다. Google 계정의 약관과 정책도 함께 적용됩니다.</p></Section>
    <Section title="3. 이용자 콘텐츠"><p>이용자가 작성한 문서·토론·댓글 등의 저작권은 원칙적으로 작성자에게 있습니다. 이용자는 타인의 권리를 침해하거나 법령·공서양속에 반하는 콘텐츠를 게시해서는 안 됩니다. 운영자는 서비스 운영과 표시를 위해 필요한 범위에서 콘텐츠를 저장·전송할 수 있습니다.</p></Section>
    <Section title="4. 금지행위 및 조치"><p>무단 접근, 자동화 공격, 스팸, 개인정보 침해, 허위 정보·불법 콘텐츠 게시, 서비스 운영 방해를 금지합니다. 운영자는 위반 콘텐츠를 숨기거나 삭제하고 계정 이용을 제한할 수 있습니다.</p></Section>
    <Section title="5. 서비스 변경 및 중단"><p>운영자는 보안·기술·운영상 필요에 따라 기능을 변경하거나 일시 중단할 수 있으며, 중요한 변경은 가능한 방법으로 안내합니다. 천재지변·통신 장애 등 합리적으로 통제할 수 없는 사유에 대해서는 책임을 지지 않습니다.</p></Section>
    <Section title="6. 책임 제한"><p>서비스는 현재 상태로 제공됩니다. 운영자는 이용자 간 거래·분쟁, 외부 서비스(Google 등)의 장애, 이용자의 귀책사유로 발생한 손해에 대해 법령이 허용하는 범위에서 책임을 제한합니다.</p></Section>
    <Section title="7. 문의 및 약관 변경"><p>서비스 문의는 <a className="text-coral-500 underline" href="https://doublej.app/#contact" target="_blank" rel="noreferrer">DoubleJ 문의 페이지</a>로 접수할 수 있습니다. 약관이 변경되면 시행일과 변경 내용을 이 페이지에 게시합니다.</p></Section>
  </>
}
