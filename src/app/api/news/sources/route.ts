import { NextResponse } from 'next/server'


export const dynamic = 'force-dynamic'
export async function GET() {
  const apiKey = '81a92b61200540d9bb6a97ca4935e461'
  const url = `https://newsapi.org/v2/sources?country=kr&apiKey=${apiKey}`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json({ error: '뉴스 소스를 불러오지 못했습니다.' }, { status: 500 })
    }
    const data = await res.json()
    // 소스 id, name, description 추출
    const sources = data.sources?.map((s: any) => ({ id: s.id, name: s.name, description: s.description })) || []
    return NextResponse.json({ sources })
  } catch (err) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
