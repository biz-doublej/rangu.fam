import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

interface SpellCheckResult {
  word: string
  suggestions: string[]
  position: number
}

// 간단한 한국어 맞춤법 검사 규칙들
const spellCheckRules = [
  { wrong: '되', correct: ['돼'] },
  { wrong: '돼다', correct: ['되다'] },
  { wrong: '안됨', correct: ['안 됨'] },
  { wrong: '안되', correct: ['안 돼'] },
  { wrong: '할수있다', correct: ['할 수 있다'] },
  { wrong: '할수없다', correct: ['할 수 없다'] },
  { wrong: '못함', correct: ['못 함'] },
  { wrong: '잘못됨', correct: ['잘못됨'] },
  { wrong: '어떻케', correct: ['어떻게'] },
  { wrong: '그래서', correct: ['그래서'] },
  { wrong: '때문에', correct: ['때문에'] },
  { wrong: '으로써', correct: ['으로써'] },
  { wrong: '으로서', correct: ['으로서'] },
  { wrong: '다르다', correct: ['다르다'] },
  { wrong: '틀리다', correct: ['틀리다', '다르다'] },
  { wrong: '맞다', correct: ['맞다'] },
  { wrong: '왠지', correct: ['웬지'] },
  { wrong: '웬만하면', correct: ['왠만하면'] },
  { wrong: '금새', correct: ['금세'] },
  { wrong: '갈께', correct: ['갈게'] },
  { wrong: '할께', correct: ['할게'] },
  { wrong: '밎다', correct: ['맞다'] },
  { wrong: '어떻해', correct: ['어떻게 해'] },
  { wrong: '몰르겠다', correct: ['모르겠다'] },
  { wrong: '알겠씁니다', correct: ['알겠습니다'] },
  { wrong: '갔었다', correct: ['갔다'] },
  { wrong: '왔었다', correct: ['왔다'] },
  { wrong: '먹었었다', correct: ['먹었다'] },
  { wrong: '봤었다', correct: ['봤다'] },
  { wrong: '들었었다', correct: ['들었다'] },
  { wrong: '했었다', correct: ['했다'] },
]

// 띄어쓰기 규칙들
const spacingRules = [
  { wrong: /할수있/g, correct: '할 수 있' },
  { wrong: /할수없/g, correct: '할 수 없' },
  { wrong: /그럼에도불구하고/g, correct: '그럼에도 불구하고' },
  { wrong: /아무래도/g, correct: '아무래도' },
  { wrong: /그런데/g, correct: '그런데' },
  { wrong: /그러나/g, correct: '그러나' },
  { wrong: /하지만/g, correct: '하지만' },
  { wrong: /때문에/g, correct: '때문에' },
  { wrong: /만약에/g, correct: '만약에' },
]

function performSpellCheck(text: string): SpellCheckResult[] {
  const results: SpellCheckResult[] = []
  
  // 단어별 맞춤법 검사
  spellCheckRules.forEach(rule => {
    const regex = new RegExp(rule.wrong, 'gi')
    let match
    
    while ((match = regex.exec(text)) !== null) {
      results.push({
        word: match[0],
        suggestions: rule.correct,
        position: match.index
      })
    }
  })
  
  // 띄어쓰기 검사
  spacingRules.forEach(rule => {
    let match
    
    while ((match = rule.wrong.exec(text)) !== null) {
      results.push({
        word: match[0],
        suggestions: [rule.correct],
        position: match.index
      })
    }
  })
  
  // 중복 제거 및 위치 순으로 정렬
  const uniqueResults = results.filter((result, index, arr) => 
    arr.findIndex(r => r.word === result.word && r.position === result.position) === index
  )
  
  return uniqueResults.sort((a, b) => a.position - b.position)
}

// 원본 텍스트에서 단어를 직접 찾아 위치를 반환하는 함수
function findWordInOriginalText(originalText: string, word: string, cleanTextPosition: number): number {
  // 단어가 원본 텍스트에서 나타나는 모든 위치를 찾기
  const wordPositions: number[] = []
  let index = 0
  
  while ((index = originalText.indexOf(word, index)) !== -1) {
    wordPositions.push(index)
    index += word.length
  }
  
  // 가장 가까운 위치 반환 (클린 텍스트 위치와 비교)
  if (wordPositions.length === 0) {
    return cleanTextPosition // 찾을 수 없으면 원래 위치 반환
  }
  
  if (wordPositions.length === 1) {
    return wordPositions[0]
  }
  
  // 여러 개가 있으면 cleanTextPosition에 가장 가까운 것 선택
  let closestPosition = wordPositions[0]
  let minDistance = Math.abs(cleanTextPosition - closestPosition)
  
  for (const pos of wordPositions) {
    const distance = Math.abs(cleanTextPosition - pos)
    if (distance < minDistance) {
      minDistance = distance
      closestPosition = pos
    }
  }
  
  return closestPosition
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: '검사할 텍스트가 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 위키 문법 제거 (간단한 처리)
    const cleanText = text
      .replace(/\[\[.*?\]\]/g, '') // 내부 링크 제거
      .replace(/\[.*?\]\(.*?\)/g, '') // 외부 링크 제거
      .replace(/'''.*?'''/g, '') // 굵은 글씨 제거
      .replace(/''.*?''/g, '') // 기울임 제거
      .replace(/\{\{\{.*?\}\}\}/g, '') // 나무위키 문법 제거
      .replace(/\|\|.*?\|\|/g, '') // 표 제거
      .replace(/\[파일:.*?\]/g, '') // 파일 링크 제거
      .replace(/\[\*\d+\]/g, '') // 각주 제거
    
    // 바른 REST(Connect) API를 서버에서 호출한다. API 키가 없는 개발 환경이나
    // 일시적인 장애에서는 기존의 간단한 로컬 규칙 검사로 편집을 계속한다.
    const spellApiUrl = process.env.BAREUN_CORRECT_URL || 'https://api.bareun.ai/bareun.RevisionService/CorrectError'
    const bareunApiKey = process.env.BAREUN_API_KEY
    let cleanResults: SpellCheckResult[] | null = null
    try {
      if (!bareunApiKey) throw new Error('BAREUN_API_KEY is not configured')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8_000)
      const upstream = await fetch(spellApiUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', 'api-key': bareunApiKey },
        body: JSON.stringify({
          document: { content: cleanText.slice(0, 50_000), language: 'ko_KR' },
          // UTF-16 offsets align with JavaScript string indices.
          encoding_type: 'UTF16',
          config: { enable_cleanup_whitespace: true },
        }),
        signal: controller.signal,
        cache: 'no-store',
      })
      clearTimeout(timeout)
      if (upstream.ok) {
        const payload = await upstream.json() as { revised_blocks?: Array<any> }
        const blocks: Array<any> = []
        const collect = (items: Array<any> | undefined) => items?.forEach(item => { blocks.push(item); collect(item.nested) })
        collect(payload.revised_blocks)
        cleanResults = blocks
          .map(item => {
            const word = item.origin?.content as string | undefined
            const position = item.origin?.begin_offset as number | undefined
            const candidates = (item.revisions || []).map((revision: any) => revision.revised).filter(Boolean)
            if (item.revised && !candidates.includes(item.revised)) candidates.unshift(item.revised)
            return { word, suggestions: candidates, position }
          })
          .filter(item => item.word && item.suggestions.length > 0 && Number.isFinite(item.position)) as SpellCheckResult[]
      }
    } catch {
      // 공개 API가 일시적으로 unavailable이면 로컬 검사를 사용한다.
    }
    if (!cleanResults) cleanResults = performSpellCheck(cleanText)
    
    // 원본 텍스트에서 실제 위치 찾기
    const results = cleanResults.map(result => ({
      ...result,
      position: findWordInOriginalText(text, result.word, result.position)
    }))
    
    return NextResponse.json({
      success: true,
      results: results,
      message: results.length === 0 ? '맞춤법 오류가 발견되지 않았습니다.' : `${results.length}개의 맞춤법 오류가 발견되었습니다.`
    })
    
  } catch (error) {
    console.error('맞춤법 검사 오류:', error)
    return NextResponse.json(
      { error: '맞춤법 검사 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
