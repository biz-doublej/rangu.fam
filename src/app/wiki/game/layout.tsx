import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이랑게임센터',
  description: '게임을 하고 이랑 포인트를 모아 상점에서 교환하는 이랑위키 게임센터.',
}

export default function GamecenterLayout({ children }: { children: React.ReactNode }) {
  return children
}
