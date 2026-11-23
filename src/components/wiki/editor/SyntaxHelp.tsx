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
      { desc: '목록', code: '- 항목' },
      { desc: '한 단계 안쪽', code: '  - 항목', note: '앞에 공백 두 칸' },
      { desc: '번호 목록', code: '1. 항목', note: 'a. i. 도 됨' },
      { desc: '인용문', code: '> 인용', note: '안쪽은 > >' },
      { desc: '가로줄', code: '---' },
      { desc: '목차', code: '[[목차]]', note: '접힌 목차는 [[목차:접기]]' },
      { desc: '주석', code: '// 메모', note: '화면에 안 나옴' },
    ],
  },
  {
    title: '링크 · 각주',
    rows: [
      { desc: '위키 링크', code: '[[문서]]' },
      { desc: '다른 글자로', code: '[[문서|보이는 글]]' },
      { desc: '문단으로', code: '[[문서#문단 제목]]', note: '이 문서는 [[#제목]]' },
      { desc: '외부 링크', code: '[글](https://…)' },
      { desc: '각주', code: '[* 각주 내용]', note: '번호 자동' },
      { desc: '각주 모으기', code: '[[각주]]', note: '여기까지 나온 각주' },
      { desc: '글자 그대로', code: '\\[[문서]]', note: '기호 앞에 \\' },
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
      { desc: '칸 글자 가운데', code: '||<가운데> 셀 ||', note: '<왼쪽> <오른쪽> <위> <아래>' },
      { desc: '표 오른쪽에', code: '<표위치:오른쪽>', note: '첫 셀에만' },
      { desc: '가로 병합', code: '<가로:2>', note: '<-2> 와 같음' },
      { desc: '세로 병합', code: '<세로:2>', note: '<|2> 와 같음' },
      { desc: '열 전체 색', code: '<열배경:#eee>', note: '그 칸부터 아래로' },
      { desc: '정렬 단추', code: '<정렬버튼>', note: '첫 셀에만' },
    ],
  },
  {
    title: '블록',
    rows: [
      { desc: '정보 상자', code: ':::info … :::', note: 'warn · success · error · tip' },
      { desc: '접기', code: '>>> 제목 … <<<' },
      { desc: '꾸민 상자', code: ':::상자 배경=#eee … :::', note: '테두리= 글자= 너비= 둥글게' },
      { desc: '나이 · 디데이', code: '[나이:2005-07-27]', note: '[디데이:날짜] [오늘]' },
      { desc: '동영상', code: '[유튜브:영상id]', note: '시작=초 너비=640' },
      { desc: '루비', code: '[루비:漢字(한자)]' },
      { desc: '틀 부르기', code: '{{틀이름|칸=값}}', note: '틀:틀이름 문서의 @칸@ 에 들어감' },
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
