export const dynamic = 'force-dynamic'
// Next.js API route for fetching news from NewsAPI.org
import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = '81a92b61200540d9bb6a97ca4935e461'
  const url = `https://newsapi.org/v2/top-headlines?language=ko&pageSize=5&apiKey=${apiKey}`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json({ error: '뉴스를 불러오지 못했습니다.' }, { status: 500 })
    }
    const data = await res.json()
  // 기사 제목과 링크 추출
  const news = data.articles?.map((a: any) => ({ title: a.title, url: a.url })) || []
  return NextResponse.json({ news })
  } catch (err) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
