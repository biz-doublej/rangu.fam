import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseStyledBoxOptions } from '../blocks'
import { parseImageOptions, parseIsoDate, parseRuby, parseVimeo, parseYoutube } from '../macros'
import { findTemplateCalls } from '../templates'
import { namuToIrang, type ConvertOptions, type ConvertWarning } from './namuToIrang'

// 고정 예시: __fixtures__/<이름>.namu → <이름>.irang
// (+ 있으면 <이름>.warnings.json 기대 경고, <이름>.options.json 변환 옵션 — 예: { "knownTemplates": ["인사"] })
const FIXTURES = fileURLToPath(new URL('./__fixtures__/', import.meta.url))
// 저장소가 CRLF 로 체크아웃돼도 같은 결과가 나오게 줄바꿈을 맞춘다
const readFixture = (file: string) => readFileSync(join(FIXTURES, file), 'utf8').replace(/\r\n/g, '\n')
const readJson = <T,>(file: string, fallback: T): T => (existsSync(join(FIXTURES, file)) ? JSON.parse(readFixture(file)) : fallback)
const fixtureNames = readdirSync(FIXTURES)
  .filter((file) => file.endsWith('.namu'))
  .map((file) => file.slice(0, -'.namu'.length))
  .sort()
const optionsOf = (name: string) => readJson<ConvertOptions>(`${name}.options.json`, {})

describe('namuToIrang fixtures', () => {
  it('has one .irang for every .namu and no stray files', () => {
    expect(fixtureNames.length).toBeGreaterThanOrEqual(40)
    for (const file of readdirSync(FIXTURES)) {
      const name = file.replace(/\.(namu|irang|warnings\.json|options\.json)$/, '')
      expect(fixtureNames, file).toContain(name)
    }
    for (const name of fixtureNames) expect(existsSync(join(FIXTURES, `${name}.irang`)), name).toBe(true)
  })

  it.each(fixtureNames)('%s', (name) => {
    const result = namuToIrang(readFixture(`${name}.namu`), optionsOf(name))
    expect(result.text).toBe(readFixture(`${name}.irang`))
    expect(result.warnings).toEqual(readJson<ConvertWarning[]>(`${name}.warnings.json`, []))
  })

  it.each(fixtureNames)('%s: converting twice equals converting once', (name) => {
    const once = namuToIrang(readFixture(`${name}.namu`), optionsOf(name)).text
    expect(namuToIrang(once, optionsOf(name)).text).toBe(once)
  })

  it.each(fixtureNames)('%s: the expected irang text is left alone', (name) => {
    const irang = readFixture(`${name}.irang`)
    expect(namuToIrang(irang, optionsOf(name)).text).toBe(irang)
  })
})

describe('[include(틀:…)] → {{틀}}', () => {
  it('writes calls that the template parser reads back with the same name and values', () => {
    const out = namuToIrang(
      '[include(틀:정보, 링크=[[문서|글]], 색={{{#red 빨강}}}, 이름=강한울\\, 정재원, 첫째)] 그리고 [include(틀:인사)]'
    ).text
    expect(out).toBe('{{정보|링크=[[문서|글]]|색={{{#red 빨강}}}|이름=강한울, 정재원|첫째}} 그리고 {{인사}}')
    expect(findTemplateCalls(out).map(({ name, params }) => ({ name, params }))).toEqual([
      { name: '정보', params: { 링크: '[[문서|글]]', 색: '{{{#red 빨강}}}', 이름: '강한울, 정재원', '1': '첫째' } },
      { name: '인사', params: {} },
    ])
  })

  it('checks the known template names only when they are given, from any iterable', () => {
    const namu = '[include(틀:인사)] [include(틀:없음)]'
    expect(namuToIrang(namu).warnings).toEqual([])
    expect(namuToIrang(namu, { knownTemplates: new Set(['인사']) }).warnings).toEqual([
      { line: 1, kind: 'lossy', message: '틀:없음 문서가 이랑위키에 없습니다. 먼저 만들어야 내용이 보입니다.' },
    ])
    expect(namuToIrang(namu, { knownTemplates: [] }).warnings).toHaveLength(2)
  })

  it('leaves an include it cannot convert byte for byte, links inside included', () => {
    const namu = '[include(틀:표, 내용=가 | 나, 링크=[[https://namu.wiki|나무]], 옛=--취소--)]'
    expect(namuToIrang(namu).text).toBe(namu)
  })
})

// 운영 문서에 쓰이는 이랑위키 문법을 모은 문서 — 변환기가 하나도 바꾸면 안 된다
const IRANG_DOCUMENT = [
  '{{인물정보상자<bgcolor:#E8F4FD>',
  '|이름 = 홍길동',
  '|포지션 = **투수** [*1] 원하는 보직은 마무리',
  '}}',
  '[clearfix]',
  '[[목차]]',
  '',
  '# 마크다운 제목',
  '## 마크다운 소제목',
  '== 나무위키식 제목 ==',
  '==# 접힌 제목 #==',
  '',
  '>붙여 쓴 인용',
  '> 띄운 인용',
  '>> 안쪽 인용',
  '> > 띄운 안쪽 인용',
  '',
  '>>> 펼쳐 보기',
  '접힌 내용',
  '<<<',
  '',
  '- 항목',
  '  - 하위 항목',
  '    - 더 하위',
  '* 별표 항목',
  '1. 번호',
  '   1. 세 칸 들여 쓴 번호',
  '   > "목록 안 인용"',
  '2. 다음 번호',
  '   - 잠금 상태 (isLocked)',
  '',
  '|| <bgcolor:##ff0000> 본 문서는 연구 중인 문서입니다. ||',
  '|| 주기 || 연애 성공 여부 || ',
  '|| 14세 || {{{#00ff80 성공}}} || ',
  '||<tablebgcolor:#111><가운데> 가운데 || 오른쪽||',
  '',
  '| 제목1 | 제목2 |',
  '|-------|-------|',
  '| 내용1 | 내용2 |',
  '',
  '----',
  '---',
  '',
  '{{{배지 제56대}}} {{{배지:#e4002b 제56대}}} {{{font:"Noto Sans KR" 글꼴}}} {{{+1 크게}}}',
  '[노래](https://example.com) !icon:{home} [이미지:/uploads/wiki/a.png]',
  '[[문서]] [[문서#개요]] [[파일:/api/images/serve/wiki_a.png|width=300]] [[:분류:가수]] [[../]] [[/하위]]',
  '[[파일:/uploads/wiki/b.png|300px 가운데 다크 둥글게]] [[파일:/images/cards/a.jpg|▲ 카드 설명]]',
  '[나이:2005-07-27] [디데이:2026-12-25] [오늘] [유튜브:jNQXAC9IVRw 시작=8 너비=640] [비메오:76979871] [루비:漢字(한자)]',
  '',
  ':::상자 배경=#fff8e1,#2b2416 글자=#5d4037 테두리=#ffb300 정렬=가운데 위치=가운데 너비=80% 둥글게',
  '상자 안 글',
  '>>> 상자 안 접기',
  '접힌 글',
  '<<<',
  ':::',
  '',
  '||<정렬버튼> 이름 || 나이 ||',
  '마술을 시작했다.[*] 김준표 마술사를 보고 시작했다.',
  '서울[* 대한민국의 수도. [[서울|서울특별시]] 참고]은 크다.',
  '본문[*2] 뒤 글',
  '',
  ':::info',
  '콜아웃 안 글 --> 화살표',
  ':::',
  '',
  '```text',
  ' * 코드 안 목록',
  '{{{코드 안 문법 무시}}} [목차] --취소--',
  '````',
  '언어 블록은 ```` ```javascript ```` 처럼 적는다. `{{{코드}}}` 도 그대로.',
  '',
  '분류: 랑구 | 사람',
  '',
  '[*2] 따로 적은 각주',
].join('\n')

describe('irang documents', () => {
  it('leaves an irang document untouched, with no warnings', () => {
    const result = namuToIrang(IRANG_DOCUMENT)
    expect(result.text).toBe(IRANG_DOCUMENT)
    expect(result.warnings).toEqual([])
  })

  it('does not add space alignment to tables in a document that already uses irang syntax', () => {
    const text = '[[목차]]\n|| 가 || 나 ||'
    expect(namuToIrang(text).text).toBe(text)
  })

  it('does not turn markdown ## headings into comments', () => {
    const text = '== 개요 ==\n### 소제목\n## 다른 소제목'
    expect(namuToIrang(text).text).toBe(text)
  })

  it('leaves an irang redirect to a section title alone', () => {
    const text = '#redirect 강한울#학생회 활동'
    expect(namuToIrang(text)).toEqual({ text, warnings: [] })
  })
})

describe('namu documents with converted blocks', () => {
  it('still reads the document as namu after it turned {{{ }}} and #!wiki into irang blocks', () => {
    const namu = '{{{\n코드\n}}}\n{{{#!wiki style="color: red"\n|| 가운데 ||\n}}}'
    expect(namuToIrang(namu).text).toBe('```\n코드\n```\n:::상자 글자=red\n||<가운데> 가운데 ||\n:::')
  })

  it('does not pair a namu >>> quote with the <<< of a converted fold', () => {
    const once = namuToIrang('>>>세 겹 인용\n{{{#!folding 펼치기\n내용\n}}}').text
    expect(once).toBe('> > > 세 겹 인용\n>>> 펼치기\n내용\n<<<')
    expect(namuToIrang(once).text).toBe(once)
  })

  it('converts a document full of stage-2 syntax and is stable on a second run', () => {
    const namu = [
      '#redirect 대한민국#s-2',
      '[age(2005-07-27)] [dday(2026-12-25)] [date]',
      '[youtube(jNQXAC9IVRw, start=8)] [vimeo(76979871)] [ruby(漢字, ruby=한자)]',
      '[[파일:https://example.com/a.png|width=300&align=center]]',
      '||<table sortable> 이름 || 나이 ||',
      '{{{#!folding 더 보기',
      '{{{#!wiki style="background-color: #eee; margin: 0 auto; width: 50%" dark-style="background-color: #222"',
      ' * 상자 안 목록',
      '{{{#!syntax js',
      'const a = 1 // [목차]',
      '}}}',
      '}}}',
      '}}}',
    ].join('\n')
    const once = namuToIrang(namu)
    expect(once.text).toBe(
      [
        '#redirect 대한민국',
        '[나이:2005-07-27] [디데이:2026-12-25] [오늘]',
        '[유튜브:jNQXAC9IVRw 시작=8] [비메오:76979871] [루비:漢字(한자)]',
        '[[파일:https://example.com/a.png|300px 가운데]]',
        '||<가운데><정렬버튼> 이름 ||<가운데> 나이 ||',
        '>>> 더 보기',
        ':::상자 배경=#eee,#222 위치=가운데 너비=50%',
        '- 상자 안 목록',
        '```js',
        'const a = 1 // [목차]',
        '```',
        ':::',
        '<<<',
      ].join('\n')
    )
    expect(once.warnings.map((w) => [w.line, w.kind])).toEqual([
      [1, 'lossy'],
      [2, 'lossy'],
    ])
    expect(namuToIrang(once.text).text).toBe(once.text)
  })
})

// 변환기가 쓴 이랑위키 문법을 렌더러가 쓰는 파서가 그대로 읽는지 — 고정 예시의 .irang 전부에서 확인한다
describe('what the converter writes is read by the renderer', () => {
  const outputs = fixtureNames.map((name) => ({ name, text: readFixture(`${name}.irang`) }))

  it.each(outputs)('$name', ({ text }) => {
    for (const line of text.split('\n')) {
      const box = line.match(/^:::상자(?:\s+(.*))?$/)
      if (box) expect(parseStyledBoxOptions(box[1] || '').ignored, line).toEqual([])
    }
    for (const m of text.matchAll(/\[유튜브:([^\]\n]+)\]/g)) expect(parseYoutube(m[1]), m[0]).not.toBeNull()
    for (const m of text.matchAll(/\[비메오:([^\]\n]+)\]/g)) expect(parseVimeo(m[1]), m[0]).not.toBeNull()
    for (const m of text.matchAll(/\[루비:([^\]\n]+)\]/g)) expect(parseRuby(m[1]), m[0]).not.toBeNull()
    for (const m of text.matchAll(/\[(?:나이|디데이):([^\]\n]+)\]/g)) expect(parseIsoDate(m[1]), m[0]).not.toBeNull()
    // 낱말 옵션으로 바꾼 그림은 낱말이 모두 옵션으로 읽혀야 한다 (하나라도 모르면 렌더러가 설명 글로 본다)
    for (const m of text.matchAll(/\[\[파일:[^|\]\n]+\|([^\]\n=]+)\]\]/g)) {
      if (/^(?:\d|왼쪽|가운데|오른쪽|다크|라이트|둥글게|픽셀|테두리)/.test(m[1])) {
        expect(parseImageOptions(m[1]).alt, m[0]).toBeUndefined()
      }
    }
  })
})

describe('namuToIrang', () => {
  it('normalizes \\r\\n line endings', () => {
    expect(namuToIrang('== 제목 ==\r\n * 항목\r\n').text).toBe('== 제목 ==\n- 항목\n')
  })

  it('returns an empty result for an empty document', () => {
    expect(namuToIrang('')).toEqual({ text: '', warnings: [] })
  })

  it('reports warnings on the source line even after multi-line blocks are removed', () => {
    const result = namuToIrang('{{{#!html\n<b>a</b>\n}}}\n{{{\n코드\n}}}\n[youtube(abc)]')
    expect(result.text).toBe('```\n코드\n```\n[youtube(abc)]')
    expect(result.warnings.map((w) => [w.line, w.kind])).toEqual([
      [1, 'unsupported'],
      [7, 'unsupported'],
    ])
  })

  it('numbers named footnotes after the largest number already used', () => {
    const result = namuToIrang('가[*3] 나[*7 일곱] 다[*참고 이름 각주]\n\n[*3] 셋')
    expect(result.text).toBe('가[*3] 나[*8] 다[*9]\n\n[*3] 셋\n\n[*8] 일곱\n[*9] 이름 각주')
  })

  it('leaves a reference to an unknown footnote name alone', () => {
    expect(namuToIrang('가[*없음]').text).toBe('가[*없음]')
  })

  it('keeps the first text when one footnote name is given two texts, and says so', () => {
    const result = namuToIrang('가[*A 처음]\n나[*A 다른 내용]')
    expect(result.text).toBe('가[*1]\n나[*1]\n\n[*1] 처음')
    expect(result.warnings).toEqual([expect.objectContaining({ line: 2, kind: 'lossy' })])
  })

  it('does not glue a kept {{{#!…}}} block onto the list item above it', () => {
    const namu = ' * 항목\n  {{{#!dark 제목\n내용\n}}}'
    expect(namuToIrang(namu).text).toBe('- 항목\n  {{{#!dark 제목\n내용\n}}}')
  })

  it('starts a fold on its own line after an indented list item', () => {
    expect(namuToIrang(' * 항목\n  {{{#!folding 제목\n내용\n}}}').text).toBe('- 항목\n>>> 제목\n내용\n<<<')
  })

  it('drops the space left at the end of a line by a removed block', () => {
    expect(namuToIrang('글 {{{#!html <b>x</b>}}}').text).toBe('글')
  })

  it('keeps a list item continuation out of tables', () => {
    expect(namuToIrang(' * 항목\n ||표||').text).toBe('- 항목\n ||표||')
  })

  // 이 두 규칙은 이랑위키 글도 바꾼다 — 운영 문서 70개에는 해당하는 글이 없다
  it('rewrites [[https://…]] even though irang also reads it as an outside link', () => {
    expect(namuToIrang('[[https://example.com]]').text).toBe('[https://example.com](https://example.com)')
  })

  it('reads --글-- as namu strike-through wherever it appears', () => {
    expect(namuToIrang(':::info\n--글--\n:::').text).toBe(':::info\n~~글~~\n:::')
  })

  it('converts a large namu document in one go and is stable on a second run', () => {
    const namu = [
      '[목차]',
      '== 개요 ==',
      '##편집 메모',
      "'''나무위키'''[*A 나무위키는 위키 사이트다.]는 --크다-- 크다.[*A]",
      ' * 하나',
      '  * 둘',
      ' 1.#2 둘째',
      '>>>세 겹 인용',
      '||<table align=center><#eee> 가 |||| 나 ||',
      '----',
      '{{{#!html <script>alert(1)</script>}}}',
      '[[https://namu.wiki|나무위키]] [[문서#s-1]]',
      '[각주]',
    ].join('\n')
    const once = namuToIrang(namu)
    expect(once.text).toBe(
      [
        '[[목차]]',
        '== 개요 ==',
        '// 편집 메모',
        "'''나무위키'''[*1]는 ~~크다~~ 크다.[*1]",
        '- 하나',
        '  - 둘',
        '2. 둘째',
        '> > > 세 겹 인용',
        '||<가운데><표위치:가운데><bgcolor=#eee> 가 ||<-2><가운데> 나 ||',
        '----',
        '[나무위키](https://namu.wiki) [[문서]]',
        '[[각주]]',
        '',
        '[*1] 나무위키는 위키 사이트다.',
      ].join('\n')
    )
    expect(once.warnings.map((w) => [w.line, w.kind])).toEqual([
      [11, 'unsupported'],
      [12, 'lossy'],
    ])
    expect(namuToIrang(once.text).text).toBe(once.text)
  })
})

describe('security', () => {
  it('removes {{{#!html}}} so <script> never reaches the output', () => {
    const result = namuToIrang('앞\n{{{#!html <script>alert(document.cookie)</script>}}}\n뒤')
    expect(result.text).toBe('앞\n뒤')
    expect(result.text).not.toMatch(/<script/i)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toMatchObject({ line: 2, kind: 'unsupported' })
  })

  it('removes the rest of the line after an unclosed {{{#!html', () => {
    const result = namuToIrang('글 {{{#!html <script>alert(1)</script>\n다음 줄')
    expect(result.text).toBe('글 \n다음 줄')
    expect(result.text).not.toMatch(/<script/i)
    expect(result.warnings).toEqual([expect.objectContaining({ line: 1, kind: 'unsupported' })])
  })

  it('removes {{{#!html}}} nested inside blocks that are otherwise kept', () => {
    const result = namuToIrang('{{{#!dark\n{{{#!html\n<script>alert(1)</script>\n}}}\n}}}')
    expect(result.text).not.toMatch(/<script/i)
    expect(result.warnings.map((w) => [w.line, w.kind])).toEqual([
      [1, 'unsupported'],
      [2, 'unsupported'],
    ])
  })

  it('removes {{{#!html}}} inside converted folds and boxes', () => {
    const result = namuToIrang('{{{#!folding 펼치기\n{{{#!wiki\n{{{#!html\n<script>alert(1)</script>\n}}}\n}}}\n}}}')
    expect(result.text).toBe('>>> 펼치기\n:::상자\n:::\n<<<')
    expect(result.warnings.map((w) => [w.line, w.kind])).toEqual([[3, 'unsupported']])
  })

  it('never writes raw CSS or a script address into a :::상자 line', () => {
    const result = namuToIrang(
      '{{{#!wiki style="background:url(javascript:alert(1));color:red;width:100%;}x{background:url(//evil)" dark-style="color: #fff; background-image: url(https://x.com/a.png)"\n글\n}}}'
    )
    const box = result.text.split('\n')[0]
    expect(box).toBe(':::상자 글자=red,#fff 너비=100%')
    expect(box).not.toMatch(/url|javascript|[;{}"']/i)
    expect(result.warnings).toHaveLength(1)
  })

  it('refuses a video id that is not a plain id', () => {
    const result = namuToIrang('[youtube(abc"onload=alert(1))]')
    expect(result.text).not.toContain('유튜브')
    expect(result.warnings).toEqual([expect.objectContaining({ kind: 'unsupported' })])
  })

  it('removes a table directive that carries style or javascript', () => {
    const result = namuToIrang('||<table style="background:url(javascript:alert(1))"> 글 ||\n|| 칸 <style=x> ||')
    expect(result.text).not.toMatch(/javascript:|style=/i)
    expect(result.warnings.map((w) => [w.line, w.kind])).toEqual([
      [1, 'unsupported'],
      [2, 'unsupported'],
    ])
  })

  it('breaks markdown-looking links to javascript: so they never become live links', () => {
    // 닫는 ] 를 이스케이프하면 `](` 가 이어지지 않아 링크가 되지 않고, 화면에는 글자 그대로 나온다
    const result = namuToIrang('[눌러](javascript:alert(1))')
    expect(result.text).toBe('[눌러\\](javascript:alert(1))')
    expect(result.text).not.toMatch(/(?<!\\)\]\(javascript:/i)
    expect(result.warnings).toHaveLength(1)
  })

  it('keeps html inside {{{문법 무시}}} as inline code', () => {
    expect(namuToIrang('{{{<script>alert(1)</script>}}}').text).toBe('`<script>alert(1)</script>`')
  })
})
