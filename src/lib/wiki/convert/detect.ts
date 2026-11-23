/**
 * 붙여 넣은 글이 나무위키 문법인지 가늠한다 — 이랑위키에는 없는 나무위키만의 표지를 센다.
 * 서로 다른 표지가 2가지 이상이면 변환을 권한다 (한 가지만으로는 우연일 수 있다).
 *
 * 이랑위키에서도 쓰는 문법(`||<가운데>`, `[*1] 내용`, `== 제목 ==`)은 세지 않는다.
 */

export interface NamuMarker {
  key: string
  label: string
  pattern: RegExp
}

export const NAMU_MARKERS: NamuMarker[] = [
  { key: 'include', label: '[include(틀:…)]', pattern: /\[include\(/i },
  { key: 'bang-block', label: '{{{#!folding / #!wiki / #!syntax …}}}', pattern: /\{\{\{#!(?:folding|wiki|syntax|html|if)\b/i },
  // 나무위키 표 지시자 — <(> <:> <)> <^|2> <v|2> <#색> <table …>
  { key: 'table', label: '나무위키 표 지시자(<:> <#색> <table …>)', pattern: /\|\|\s*<(?:[:()]|[\^v]\|\d|#[0-9a-fA-F]{3,6}[,>]|table\s)/ },
  { key: 'table-merge', label: '표 가로 합치기(||||)', pattern: /^\s*\|\|\|\|/m },
  // 이름 붙인 각주 [*A 내용] — 이랑위키 [* 내용] [*1] 은 빼고
  { key: 'named-footnote', label: '이름 붙인 각주([*A 내용])', pattern: /\[\*[^\s\]\d][^\s\]]* [^\]]+\]/ },
  { key: 'section-number', label: '문단 번호 링크([[문서#s-1]])', pattern: /\[\[[^\]\n]*#s-\d/ },
  { key: 'macro', label: '나무위키 매크로([age(…)] [youtube(…)] [목차] …)', pattern: /\[(?:age|dday|youtube|vimeo|nicovideo|navertv|kakaotv|ruby|pagecount)\(|(?<!\[)\[(?:목차|tableofcontents|각주|footnote|date|datetime)\](?!\])/i },
  { key: 'namu-list', label: '앞 공백이 있는 목록( * 항목)', pattern: /^ \*(?!\*)\s?\S/m },
  { key: 'blur', label: '가린 분류([[분류:…#blur]])', pattern: /\[\[분류:[^\]\n]*#blur\]\]/ },
]

export function detectNamuMarkup(text: string): { score: number; markers: NamuMarker[] } {
  const body = (text || '').replace(/```[\s\S]*?```/g, '')
  const markers = NAMU_MARKERS.filter((marker) => marker.pattern.test(body))
  return { score: markers.length, markers }
}

/** 변환을 권할 만큼 나무위키다운가 */
export function looksLikeNamu(text: string): boolean {
  return detectNamuMarkup(text).score >= 2
}
