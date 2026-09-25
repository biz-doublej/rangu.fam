import React from 'react'

type Row = { desc: string; code: string; note?: string }

const SECTIONS: Array<{ title: string; rows: Row[] }> = [
  {
    title: '글자',
    rows: [
      { desc: '굵게', code: "'''굵게'''", note: 'Ctrl+B' },
      { desc: '기울임', code: "''기울임''", note: 'Ctrl+I' },
      { desc: '밑줄', code: '__밑줄__' },
      { desc: '취소선', code: '~~취소선~~' },
      { desc: '위첨자', code: '^^위첨자^^' },
      { desc: '아래첨자', code: ',,아래첨자,,' },
      { desc: '글자 색', code: '{{{#a33a2e 글자}}}' },
      { desc: '글자 크기', code: '{{{+1 글자}}}', note: '−5 ~ +5' },
    ],
  },
  {
    title: '문단',
    rows: [
      { desc: '문단 제목', code: '== 제목 ==', note: '= 개수가 단계' },
      { desc: '목록', code: '* 항목' },
      { desc: '번호 목록', code: '1. 항목' },
      { desc: '인용문', code: '> 인용' },
      { desc: '가로줄', code: '---' },
      { desc: '목차', code: '[[목차]]' },
    ],
  },
  {
    title: '링크 · 각주',
    rows: [
      { desc: '위키 링크', code: '[[문서]]' },
      { desc: '다른 글자로', code: '[[문서|보이는 글]]' },
      { desc: '외부 링크', code: '[글](https://…)' },
      { desc: '각주', code: '[*] 각주 내용', note: '번호 자동' },
      { desc: '분류', code: '[[분류:분류명]]' },
      { desc: '이미지', code: '[이미지:주소]', note: '한 줄에 단독으로' },
    ],
  },
  {
    title: '표',
    rows: [
      { desc: '표 한 행', code: '|| 셀1 || 셀2 ||' },
      { desc: '셀 배경색', code: '||<bgcolor:#eee> 셀 ||' },
      { desc: '행 전체 색', code: '||<rowbgcolor:#eee> 첫 셀 ||', note: '첫 셀에만' },
      { desc: '표 가운데', code: '<tablealign:center>', note: '첫 셀에만' },
      { desc: '가로 병합', code: '<-2>' },
      { desc: '세로 병합', code: '<|2>' },
    ],
  },
  {
    title: '블록',
    rows: [
      { desc: '정보 상자', code: ':::info … :::', note: 'warn · success · error · tip' },
      { desc: '접기', code: '>>> 제목 … <<<' },
      { desc: '타임라인', code: ':::timeline … :::', note: '줄마다 날짜 | 제목 | 설명' },
      { desc: '투표', code: ':::poll 질문 … :::', note: '줄마다 선택지' },
    ],
  },
]

/** 편집기 도움말 — 자주 쓰는 문법 요약표 (설명 | 문법 두 열로 정렬) */
export function SyntaxHelp({ onOpenFullHelp }: { onOpenFullHelp?: () => void }) {
  return (
    <div className="wiki-editor__help">
      <div className="wiki-editor__help-grid">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h4 className="wiki-editor__help-title">{section.title}</h4>
            <table className="wiki-editor__help-table">
              <tbody>
                {section.rows.map((row) => (
                  <tr key={row.desc}>
                    <th scope="row">{row.desc}</th>
                    <td>
                      <code className="wiki-editor__code">{row.code}</code>
                      {row.note && <span className="wiki-editor__help-note">{row.note}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      {onOpenFullHelp && (
        <p className="mt-4 text-xs text-[color:var(--wiki-ink-muted)]">
          더 많은 문법은{' '}
          <button type="button" onClick={onOpenFullHelp} className="text-[color:var(--wiki-link)] hover:underline">
            편집 도움말
          </button>
          에서 볼 수 있습니다.
        </p>
      )}
    </div>
  )
}
