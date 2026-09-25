import React from 'react'

type Row = { code: string; desc: string }

const SECTIONS: Array<{ title: string; rows: Row[] }> = [
  {
    title: '글자',
    rows: [
      { code: "'''굵게'''", desc: '굵게 (Ctrl+B)' },
      { code: "''기울임''", desc: '기울임 (Ctrl+I)' },
      { code: '__밑줄__ · ~~취소선~~', desc: '밑줄 · 취소선' },
      { code: '^^위첨자^^ · ,,아래첨자,,', desc: '위·아래 첨자' },
      { code: '{{{#a33a2e 빨간 글씨}}}', desc: '글자 색' },
      { code: '{{{+1 큰 글씨}}}', desc: '글자 크기 (−5 ~ +5)' },
    ],
  },
  {
    title: '문단',
    rows: [
      { code: '== 제목 ==', desc: '문단 제목 (= 개수가 단계)' },
      { code: '* 항목 · 1. 항목', desc: '목록 · 번호 목록' },
      { code: '> 인용', desc: '인용문' },
      { code: '---', desc: '가로줄' },
      { code: '[[목차]]', desc: '목차 삽입' },
    ],
  },
  {
    title: '링크 · 각주',
    rows: [
      { code: '[[문서]] · [[문서|보이는 글]]', desc: '위키 내부 링크' },
      { code: '[링크 글](https://…)', desc: '외부 링크' },
      { code: '[*] 각주 내용', desc: '각주 (자동 번호)' },
      { code: '[[분류:분류명]]', desc: '분류 지정' },
      { code: '[이미지:URL]', desc: '이미지 (한 줄에 단독으로)' },
    ],
  },
  {
    title: '표',
    rows: [
      { code: '|| 셀1 || 셀2 ||', desc: '표 한 행' },
      { code: '||<bgcolor:#eee> 셀 ||', desc: '셀 배경색' },
      { code: '||<rowbgcolor:#eee> 첫 셀 || … ||', desc: '행 전체 색' },
      { code: '<tablealign:center>', desc: '표 가운데 정렬 (첫 셀)' },
      { code: '<-2> · <|2>', desc: '가로 · 세로 병합' },
    ],
  },
  {
    title: '블록',
    rows: [
      { code: ':::info … :::', desc: '정보 상자 (warn · success · error · tip)' },
      { code: '>>> 제목 … <<<', desc: '접기' },
      { code: ':::timeline … :::', desc: '타임라인 (날짜 | 제목 | 설명)' },
      { code: ':::poll 질문 … :::', desc: '투표 (줄마다 선택지)' },
    ],
  },
]

/** 편집기 도움말 패널 — 자주 쓰는 문법만 모은 요약표 */
export function SyntaxHelp({ onOpenFullHelp }: { onOpenFullHelp?: () => void }) {
  return (
    <div className="wiki-editor__help">
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h4 className="mb-1.5 text-xs font-semibold text-[color:var(--wiki-ink-muted)]">{section.title}</h4>
            <dl className="space-y-1">
              {section.rows.map((row) => (
                <div key={row.code} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <dt>
                    <code className="wiki-editor__code">{row.code}</code>
                  </dt>
                  <dd className="shrink-0 text-right text-xs text-[color:var(--wiki-ink-muted)]">{row.desc}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      {onOpenFullHelp && (
        <p className="mt-4 text-xs text-[color:var(--wiki-ink-muted)]">
          전체 문법은{' '}
          <button type="button" onClick={onOpenFullHelp} className="text-[color:var(--wiki-link)] hover:underline">
            편집 도움말
          </button>
          에서 볼 수 있습니다.
        </p>
      )}
    </div>
  )
}
