import Link from 'next/link'

export default function MemberNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center">
      <div>
        <p className="caveat text-xl text-coral-500">coming soon</p>
        <h1 className="display-han mt-2 text-3xl text-ink-500">아직 준비 중인 페이지입니다.</h1>
        <p className="mt-3 text-sm text-ink-300">이 멤버의 개인 페이지는 곧 공개돼요.</p>
        <Link href="/" className="ink-button mt-6 inline-flex">
          메인으로
        </Link>
      </div>
    </div>
  )
}
