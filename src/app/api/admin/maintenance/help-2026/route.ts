import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne, or } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages, wikiRevisions } from '@/db/schema/wiki'
import { checkAdminAuth } from '@/lib/adminAuth'
import { GUIDE_DOC, GUIDE_DOC_TITLE, SYNTAX_DOC, SYNTAX_DOC_TITLE } from '@/lib/helpDocs'

export const dynamic = 'force-dynamic'

const HELP_TITLE = '이랑위키:도움말_2026'

const HELP_CONTENT = `= 이랑위키 편집 도움말 (2026-11) =

:::info
2026년 11월 업데이트로 '''배너상자, 표 안 이미지·배경 그림, 문단 접기, 각주 미리보기, 나무위키식 첫 화면'''이 추가되었습니다. 아래 예시는 실제로 보이는 모습이니, 편집 버튼을 눌러 원문과 비교해 보세요. 기본 문법은 [[이랑위키:문법]]에 있습니다.
:::

[[목차]]

== 2026-11 새 기능 한눈에 ==

|| <rowbgcolor:#c4002e rowcolor:#ffffff>기능 || 쓰는 법 || 설명 ||
|| 배너상자 || \`{{배너상자 … }}\` || 배경 그림 배너 + 펼치기·접기 상자 ||
|| 칸 배경 그림 || 칸 맨 앞에 bgimage:주소 (아래 '표 안에 이미지 넣기') || 그림을 칸 배경으로 깔고 글자를 위에 ||
|| 칸 안 그림 || \`[이미지:주소]\` 또는 \`[[파일:주소|width=28]]\` || 글자 옆에 그림 넣기 ||
|| 줄바꿈 || \`[br]\` || 표 칸 안에서 줄 바꾸기 ||
|| 표 너비 || 첫 칸 맨 앞에 tablewidth:100% (아래 '표 새 문법') || 표를 문단 폭에 꽉 채우기 ||
|| 배지 || \`{{{배지 글자}}}\` || 작은 색 딱지 ||
|| 접힌 문단 || \`==# 제목 #==\` || 처음부터 접혀 있는 문단 ||
|| 아래로 내리기 || \`[clearfix]\` || 목차·글을 오른쪽 상자 아래로 ||
|| 배너 무늬 || \`|무늬=사선\` || 그림 없이 사선 줄무늬 배너 ||
|| 유니폼 옆띠 || \`|옆띠=예\` || 배너·펼치기 띠 양끝 검은 띠·흰 선 ||
|| 라이트/다크 두 색 || \`#밝은색,#어두운색\` || 다크 모드에서는 쉼표 뒤 색 ||

== 문서 첫 화면 (목차 + 정보 상자) ==

정보 상자 바로 다음에 \`[[목차]]\`를 쓰면 '''왼쪽 목차, 오른쪽 정보 상자'''가 나란히 나오고, 첫 문단 제목부터는 그 아래에서 전체 폭으로 이어집니다.

\`\`\`
{{인물정보상자
|이름 = 이승찬
|이미지 = /api/images/serve/사진.webp
}}

[[목차]]
\`\`\`

* 정보 상자: \`{{인물정보상자}}\`, \`{{그룹정보상자}}\`, \`|위치=오른쪽\`을 준 \`{{배너상자}}\`
* '''목차를 상자 아래로 내리고 싶으면''' 상자와 \`[[목차]]\` 사이에 \`[clearfix]\` 한 줄을 넣습니다.
* 오른쪽 상자를 두 개 쓰면 두 번째 상자는 첫 상자 아래로 갑니다.
* 휴대폰처럼 화면이 좁으면 상자 → 목차 순서로 위아래로 쌓입니다.
* \`[[목차]]\`는 문서에 '''한 번만''' 씁니다. 두 번 쓰면 목차도 두 개 나옵니다.

== 배너상자 ==

배경 그림이 깔린 배너, 사진, \`[ 펼치기 · 접기 ]\` 띠, 위키 문법으로 쓰는 본문, 이전·다음 링크로 이뤄진 상자입니다. 역대 감독 목록, 대표팀 정보표 같은 틀을 만들 때 씁니다.

=== 기본 모양 ===

\`\`\`
{{배너상자
|배경색=#c4002e
|윗글=작업공작소 대표팀
|제목=역대 주장
|덧글=(3기)
|본문=
||<tablewidth:100%><tablealign:center> {{{배지 제3대}}}[br][[정재원]] || {{{배지 제2대}}}[br][[윤희열]] ||
|아래왼쪽=[[이전 문서|◀ 이전]]
|아래오른쪽=[[다음 문서|다음 ▶]]
}}
\`\`\`

{{배너상자
|배경색=#c4002e
|윗글=작업공작소 대표팀
|제목=역대 주장
|덧글=(3기)
|본문=
||<tablewidth:100%><tablealign:center> {{{배지 제3대}}}[br][[정재원]] || {{{배지 제2대}}}[br][[윤희열]] ||
|아래왼쪽=[[이랑위키:문법|◀ 이전]]
|아래오른쪽=[[이랑위키:대문|다음 ▶]]
}}

* \`|본문=\` 다음 줄부터 닫는 \`}}\` 전까지는 '''평소 위키 문법'''을 그대로 씁니다. (\`|본문=\`을 빼고 바로 표를 써도 됩니다.)
* \`|아래왼쪽=\` \`|아래=\` \`|아래오른쪽=\`은 본문 뒤에 적어도 됩니다.

=== 칸 목록 ===

|| <rowbgcolor:#c4002e rowcolor:#ffffff>칸 || 하는 일 || 예시 ||
|| 배경 || 배너 뒤에 깔리는 그림 주소 || 아래 '이미지 크기' 참고 ||
|| 배경색 || 그림이 없을 때 배너 색 || #c4002e ||
|| 글자색 || 배너 글자색 || #ffffff ||
|| 윗글 / 제목 / 덧글 || 배너 글자 (작게 / 크게 / 제목 옆 작게) || 대표팀 / 주장 / (3기) ||
|| 로고 || 제목 왼쪽 엠블럼 그림 || 그림 주소 ||
|| 왼쪽이미지 / 오른쪽이미지 || 배너 양끝 그림 || 그림 주소 ||
|| 사진 / 사진설명 || 배너 밑 큰 사진과 그 아래 설명 띠 || 여러 줄 가능 ||
|| 접힘 || 처음부터 접어 두기 || 예 ||
|| 접기 || 펼치기·접기 띠 없애기 || 아니오 ||
|| 접기글 || 띠 문구 바꾸기 || [ 명단 보기 ] ||
|| 띠색 / 띠글자색 || 펼치기 띠·사진설명 색 || #000000 / #ffffff ||
|| 본문색 / 본문글자색 || 본문 바탕·글자색 || #1c1d1f / #e8e8e8 ||
|| 테두리색 || 상자 테두리 || #c4002e ||
|| 높이 || 배너 높이 (px) || 120 ||
|| 너비 || 상자 너비 (px 또는 %) || 470 ||
|| 위치 || 오른쪽 정보 상자로 쓰기 || 오른쪽 ||
|| 맨위 || 문서 탭 바로 아래(안내문보다 위)로 옮기기 || 예 ||
|| 무늬 / 무늬색 || 그림 없이 사선 줄무늬 / 어두운 줄 색 || 사선 / #770007 ||
|| 옆띠 || 배너·펼치기 띠 양끝 유니폼 장식 || 예 ||
|| 옆띠색 / 옆띠선색 || 장식의 띠 색 / 선 색 || #000000 / #ffffff ||
|| 옆이미지위치 || 왼쪽·오른쪽 이미지를 위쪽 모서리에 || 위 ||
|| 배지색 || 상자 안 배지 기본색 || #f20138 ||
|| 링크색 || 상자 안 링크색 (쉼표 뒤는 다크) || #0275d8,#ff9800 ||

* 본문색·본문글자색·링크색은 \`#밝은색,#어두운색\`처럼 두 색을 쓰면 다크 모드에서 쉼표 뒤 색이 나옵니다.

=== 오른쪽 정보 상자로 쓰기 (제목 밑 사진) ===

\`\`\`
{{배너상자
|배경=배너 그림 주소
|윗글=작업공작소 리그 오브 레전드 3기 대표팀
|제목=정재원호
|사진=사진 주소
|사진설명=주장
정재원
|접기=아니오
|너비=470
|위치=오른쪽
|본문=
||<tablewidth:100%><width:30%><bgcolor:#c4002e><color:#ffffff><align:center> 주장 || [[정재원]] ||
}}

[[목차]]
\`\`\`

=== 놓는 자리 ===

* '''문서 탭 바로 아래''' (안내문보다 위): \`|맨위=예\`
* '''안내문 아래, 본문 맨 앞''': 문서 첫 줄에 상자를 씁니다
* '''정보 상자 위''': 정보 상자보다 먼저 씁니다
* '''문단 안''': 그 문단 제목 아래에 씁니다

== 나무위키 틀처럼 만들기 ==

나무위키의 국가대표팀 감독 틀처럼 줄무늬 배너 + 펼치기 상자 + 명단 표를 만드는 법입니다. 나무위키 문법을 그대로 쓸 필요 없이 아래 칸만 채우면 됩니다.

=== 나무위키 문법과 바꿔 쓰기 ===

* 배너 줄무늬 (긴 wiki style 그라디언트) → \`|무늬=사선\` (\`|배경색=\`이 밝은 줄, \`|무늬색=\`이 어두운 줄)
* 배너·띠 양끝 흰 선·검은 띠 → \`|옆띠=예\`
* \`{{{#!folding [ 펼치기 · 접기 ]\` → 배너상자에 기본으로 있음 (\`|접힘=예\`면 처음에 접힘)
* \`{{{#!wiki class="form" 제56대}}}\` → \`{{{배지 제56대}}}\` (상자 전체 색은 \`|배지색=\`)
* \`{{{#!wiki class="flag" [[파일:국기]]}}}\` → \`[[파일:국기 주소|width=30&border=1]]\`
* \`#fff,#1c1d1f\` 처럼 쉼표로 쓴 라이트/다크 두 색 → 그대로 됩니다 (표 지시자, \`{{{#색,#색 글자}}}\`, 본문색, 링크색)
* \`tablewidth=100%\`처럼 \`=\`로 쓴 표 지시자 → 그대로 됩니다 (\`:\`도 됨). \`tablebordercolor\`, \`bordercolor\`, \`nopad\`도 됩니다
* \`|| 칸 || || || ||\` 처럼 비어 있는 칸 → 빈 칸으로 그대로 나옵니다
* 나무위키의 다크 모드 주황 링크 → \`|링크색=#0275d8,#ff9800\`

=== 예시 1: 역대 감독 명단 (전임제 틀) ===

\`\`\`
{{배너상자
|배경색=#e10030
|무늬=사선
|무늬색=#770007
|옆띠=예
|로고=엠블럼 그림 주소
|윗글=대한민국 축구 국가대표팀
|제목=감독
|덧글=(전임제)
|테두리색=#0b090c
|배지색=#f20138
|링크색=#0275d8,#ff9800
|접힘=예
|본문=
||<-5><tablewidth=100%><tablealign=center><tablebgcolor=#fff,#1c1d1f><tablecolor=#212529,#e0e0e0><bgcolor=#e6002d><color=#fff> '''1992년 이후''' ||
||<width=20%> {{{배지 제56대}}}[br][[김호]][br]{{{-1 ([[김호호]])}}}[br][[파일:국기 주소|width=30&border=1]] ||<width=20%> {{{배지 제57대}}}[br]{{{-2 아나톨리}}}[br][[아나톨리 비쇼베츠|비쇼베츠]][br]{{{-1 ([[비쇼베츠호]])}}}[br][[파일:국기 주소|width=30&border=1]] || … || … || … ||
||<bgcolor=#e0ffdb,#202210> {{{배지 임시}}}[br][[로베르트 모레노|모레노]][br]{{{-1 ([[모레노호]])}}} || || || || ||
||<-5><bgcolor=#e6002d><color=#fff> [[비전임제 감독|◀ 대한민국 축구 국가대표팀 감독(비전임제)]] ||
||<-5> {{{-1 [[역대 감독|{{{#423f3f,#c0bdbd 전 세계 축구 국가대표팀 역대 감독}}}]]}}} ||
}}
\`\`\`

* 지금 칸만 \`<bgcolor=#e0ffdb,#202210>\`처럼 다른 색을 주면 강조됩니다.
* 빨간 띠 칸처럼 칸에 직접 \`<color=#fff>\`를 준 곳은 링크도 흰색이 됩니다.

=== 예시 2: 대표팀 이동 틀 (모레노호 틀) ===

\`\`\`
{{배너상자
|배경색=#ff0a3d
|무늬=사선
|무늬색=#770007
|옆띠=예
|왼쪽이미지=왼쪽 위 로고 주소
|오른쪽이미지=오른쪽 위 로고 주소
|옆이미지위치=위
|윗글=대한민국 축구 국가대표팀
|제목=모레노호
|테두리색=#0b090c
|링크색=#0275d8,#ff9800
|본문=
||<|2><tablewidth=100%><tablebgcolor=#fff,#1c1d1f><tablecolor=#000,#e5e5e5><bgcolor=#e6002d><color=#fff><width=25%><align=center> [[모레노호|'''성인''']][br]{{{배지:#0b090c 2026}}} ||<width=75%><align=center> [[모레노호|2026]] ||
||<align=center> [[모레노호/선임 과정|선임 과정]] ||
|아래왼쪽={{{#e6002d [[홍명보호|◀ 홍명보호 2기]]}}}
|아래오른쪽={{{#e6002d 미정 ▶}}}
}}
\`\`\`

아래는 예시 2를 그대로 넣었을 때의 모습입니다.

{{배너상자
|배경색=#ff0a3d
|무늬=사선
|무늬색=#770007
|옆띠=예
|왼쪽이미지=/assets/irang_emblem_96.png
|오른쪽이미지=/assets/irang_emblem_96.png
|옆이미지위치=위
|윗글=대한민국 축구 국가대표팀
|제목=모레노호
|테두리색=#0b090c
|링크색=#0275d8,#ff9800
|본문=
||<|2><tablewidth=100%><tablebgcolor=#fff,#1c1d1f><tablecolor=#000,#e5e5e5><bgcolor=#e6002d><color=#fff><width=25%><align=center> [[이랑위키:대문|'''성인''']][br]{{{배지:#0b090c 2026}}} ||<width=75%><align=center> [[이랑위키:대문|2026]] ||
||<align=center> [[이랑위키:문법|선임 과정]] ||
|아래왼쪽={{{#e6002d [[이랑위키:대문|◀ 이전 대표팀]]}}}
|아래오른쪽={{{#e6002d 미정 ▶}}}
}}

== 표 안에 이미지 넣기 ==

=== 1단계: 이미지 올리기 ===

1. 문서 '''편집''' 화면을 엽니다.
2. 그림이 들어갈 자리에 커서를 둡니다. (표 칸 안, 또는 \`|배경=\` 같은 줄 끝)
3. 툴바의 '''이미지 버튼'''을 누르고 파일을 고릅니다.
4. 그 자리에 그림이 자동으로 들어갑니다. 표 칸 안이면 \`[이미지:/api/images/serve/파일이름]\`, \`|배경=\` \`|사진=\` \`|로고=\` 같은 칸이면 주소만 들어갑니다.

:::info
올릴 수 있는 형식: '''jpg, png, webp, gif, svg''' / 최대 '''1MB'''. 사진은 webp나 jpg로 줄여서 올리면 빨리 열립니다.
:::

=== 2단계-가: 글자 옆에 그림 넣기 ===

\`\`\`
|| 감독 || [이미지:/assets/irang_emblem_96.png] 정재원 ||
|| 국기 || [[파일:/assets/irang_emblem_96.png|width=28]] 대한민국 ||
\`\`\`

|| 감독 || [이미지:/assets/irang_emblem_96.png] 정재원 ||
|| 국기 || [[파일:/assets/irang_emblem_96.png|width=28]] 대한민국 ||

* \`[이미지:주소]\` — 원래 크기 (칸보다 크면 칸에 맞게 줄어듦)
* \`[[파일:주소|width=28]]\` — 너비를 정해서 (숫자는 px, \`width=100%\`도 가능)

=== 2단계-나: 칸 배경으로 그림 깔기 ===

그림을 '''칸 뒤에 배경으로''' 깔고, 글자를 그 위에 올립니다. 배너처럼 보이는 칸을 만들 때 씁니다.

\`\`\`
||<tablewidth:100%><bgimage:/og/irang-wiki.png><color:#ffffff><align:center> '''이랑위키'''[br][br][br]배경 그림 위의 글자 ||
|| 아래 칸 ||
\`\`\`

||<tablewidth:100%><bgimage:/og/irang-wiki.png><color:#ffffff><align:center> '''이랑위키'''[br][br][br]배경 그림 위의 글자 ||
|| 아래 칸 ||

* \`<bgimage:주소>\`를 칸 맨 앞에 씁니다. 그림은 칸을 '''꽉 채우도록 가운데 기준으로 잘립니다'''.
* 글자에는 자동으로 그림자가 들어가 그림 위에서도 읽힙니다. 글자색은 \`<color:#ffffff>\`처럼 정하세요.
* 칸이 너무 낮으면 그림이 띠처럼 잘립니다. \`[br]\`로 줄을 더해 칸을 높이세요.
* '''표 전체'''에 깔려면 첫 칸에 \`<tablebgimage:주소>\`를 씁니다.
* 주소는 \`/\`로 시작하는 사이트 안 주소나 \`https://\` 주소만 됩니다.

=== 2단계-다: 정보 상자 윗부분 배경 ===

\`{{인물정보상자}}\` \`{{그룹정보상자}}\`에 \`|배경=그림 주소\`를 넣으면 맨 위 제목 칸에 배경 그림이 깔립니다.

== 이미지 크기 (배율) 안내 ==

그림은 넣는 자리에 따라 '''잘리거나(꽉 채우기)''' '''그대로 줄어듭니다(비율 유지)'''. 잘리는 자리에는 중요한 부분을 '''가운데'''에 두세요.

|| <rowbgcolor:#c4002e rowcolor:#ffffff>넣는 곳 || 권장 크기 || 비율 || 보이는 방식 ||
|| 배너상자 |배경= (전체 폭) || 2000 × 200 || 10 : 1 || 꽉 채우기 (가운데 기준으로 잘림) ||
|| 배너상자 |배경= (|너비=470) || 940 × 200 || 약 5 : 1 || 꽉 채우기 ||
|| 배너상자 |높이=120 일 때 || 2000 × 260 || 약 8 : 1 || 꽉 채우기 ||
|| 배너상자 |사진= || 940 × 640 || 약 3 : 2 || 비율 유지 (상자 폭에 맞춤) ||
|| 배너상자 |로고= / 왼쪽·오른쪽이미지 || 200 × 200 || 1 : 1 (투명 png) || 비율 유지, 높이 약 52px ||
|| 정보상자 |배경= || 680 × 160 || 약 4 : 1 || 꽉 채우기 ||
|| 정보상자 |이미지= || 680 × 900 || 약 3 : 4 || 비율 유지 ||
|| 표 칸 배경 (bgimage) || 칸 크기의 2배 || 칸 모양에 맞춰 || 꽉 채우기 ||
|| 국기·아이콘 || 56 × 40 이상 || 원본 비율 || width=28 정도로 ||

* 화면이 좁은 휴대폰에서는 배너 양옆이 더 많이 잘립니다. 줄무늬 같은 '''반복 무늬'''가 가장 안전합니다.
* 배너 글자는 그림에 넣지 말고 \`|윗글=\` \`|제목=\`으로 쓰세요. (그림 속 글자는 잘리거나 흐려집니다)
* 모든 그림은 '''1MB 이하'''여야 올라갑니다.

== 표 새 문법 ==

* \`<tablewidth:100%>\` — 표를 문단 폭에 꽉 채움 (첫 칸에). 숫자만 쓰면 px
* \`<width:30%>\` — 그 칸(열)의 너비
* \`[br]\` — 칸 안에서 줄바꿈 (표는 한 줄이 한 행이라 Enter 대신 씀)
* 칸이나 행에 직접 글자색을 정하면 그 안의 굵은 글씨·링크도 그 색을 따릅니다 (표 전체 글자색일 때 링크는 링크색 유지)
* 지시자는 \`:\` 대신 나무위키처럼 \`=\`로 써도 됩니다. 예: \`tablewidth=100%\`
* \`#fff,#1c1d1f\`처럼 쉼표로 두 색을 쓰면 다크 모드에서 쉼표 뒤 색이 나옵니다 (bgcolor, color, tablebgcolor, tablecolor)
* \`nopad\` — 칸 안쪽 여백 없애기 / \`tablebordercolor\` \`bordercolor\` — 테두리 색
* \`|| 칸 || || ||\`처럼 빈 칸을 쓰면 빈 칸이 그대로 생깁니다

\`\`\`
||<tablewidth:100%><width:30%><bgcolor:#c4002e><color:#ffffff><align:center> 출시일 || iOS 2026년 5월[br]안드로이드 2026년 8월 ||
\`\`\`

||<tablewidth:100%><width:30%><bgcolor:#c4002e><color:#ffffff><align:center> 출시일 || iOS 2026년 5월[br]안드로이드 2026년 8월 ||

== 배지 ==

\`\`\`
{{{배지 제56대}}} {{{배지:#000000 2026}}} {{{배지:#2e6b4f 임시}}}
\`\`\`

{{{배지 제56대}}} {{{배지:#000000 2026}}} {{{배지:#2e6b4f 임시}}}

== 문단 접기와 각주 미리보기 ==

* 문단 제목이나 그 옆 화살표를 누르면 그 문단이 접힙니다. 다시 누르면 펼쳐집니다.
* 처음부터 접어 두려면 제목 안쪽에 \`#\`을 붙여 \`==# 스포일러 #==\`처럼 씁니다.
* 목차나 주소의 \`#앵커\`로 접힌 문단 안을 가리키면 자동으로 펼쳐집니다.
* 각주 번호에 마우스를 올리면 내용이 바로 뜹니다. 휴대폰은 한 번 누르면 보이고 한 번 더 누르면 각주로 이동합니다.
* 인쇄하면 접힌 문단도 모두 펼쳐서 찍힙니다.

== 2026-06 문법 (계속 쓸 수 있음) ==

=== 행 단위 색상 ===
'''행의 첫 칸'''에 한 번만 적으면 그 행 전체에 적용됩니다.

\`\`\`
|| <rowbgcolor:#4472C4 rowcolor:#ffffff>헤더1 || 헤더2 || 헤더3 ||
|| 데이터1 || <bgcolor:#F8D7DA>이 칸만 강조 || 데이터3 ||
\`\`\`

|| <rowbgcolor:#4472C4 rowcolor:#ffffff>헤더1 || 헤더2 || 헤더3 ||
|| 데이터1 || <bgcolor:#F8D7DA>이 칸만 강조 || 데이터3 ||

* \`<rowbgcolor:#색>\` 행 배경 / \`<rowcolor:#색>\` 행 글자색
* \`<bgcolor:#색>\` \`<color:#색>\` 그 칸 하나만
* 표 전체는 첫 칸에 \`<tablebgcolor:#색>\` \`<tablecolor:#색>\`
* 우선순위: '''셀 > 행 > 표'''

=== 정렬, 폰트, 병합 ===
* \`<align:center>\` 칸 정렬 / \`<rowalign:center>\` 행 정렬 / \`<tablealign:center>\` 표 정렬
* \`<font:궁서체>\` 폰트 (공백 있으면 \`<font:"Noto Sans KR">\`)
* \`<-숫자>\` 가로 병합 / \`<|숫자>\` 세로 병합 — 가려지는 칸은 쓰지 않고 생략

=== 본문 꾸미기 ===
* \`{{{#ff0000 빨간 글씨}}}\` 색상 (안의 링크도 같은 색)
* \`{{{+1 큰 글씨}}}\` / \`{{{-1 작은 글씨}}}\` 크기
* \`{{{font:"맑은 고딕" 폰트}}}\` 폰트

=== 넘겨주기와 하위 문서 ===
* 문서 첫 줄에 \`#redirect 대상\` 또는 \`#넘겨주기 대상\`
* 넘겨주기 문서 자체를 보려면 주소 뒤에 \`?noredirect=1\`
* 하위 문서는 제목에 \`/\` — 예: \`강한울/야구\`

=== 타임라인과 투표 ===

\`\`\`
:::timeline
2024-03-20 | 랑구 결성 | 태릉고 동창들이 모였다
2025-01-01 | 새해 다짐
:::

:::poll 다음 모임 메뉴는?
햄버거
치킨
:::
\`\`\`

* 투표는 로그인한 사용자만, 1인 1표 (다시 누르면 변경)

== 편집기 팁 ==

* 이미지 버튼은 커서 자리에 맞춰 알맞은 형식으로 넣어 줍니다 (표 칸 / 상자 칸 / 본문)
* \`Ctrl+Enter\` 미리보기 / \`Ctrl+S\` 저장
* 저장 전에 미리보기로 배너상자·표가 깨지지 않았는지 꼭 확인하세요

[[분류:도움말]]`

interface HelpPageSpec {
  title: string
  content: string
  summary: string
  pageSummary: string
}

/** 이 라우트가 최신 내용으로 맞춰 두는 안내 문서들 */
const HELP_PAGES: HelpPageSpec[] = [
  {
    title: HELP_TITLE,
    content: HELP_CONTENT,
    summary: '2026-11 업데이트(배너상자·표 안 이미지·배경 그림·이미지 크기)로 도움말 갱신',
    pageSummary: '편집기 사용법 — 배너상자, 표 안 이미지·배경 그림, 이미지 크기, 표 색상/병합 등 2026 문법 안내',
  },
  {
    title: SYNTAX_DOC_TITLE,
    content: SYNTAX_DOC,
    summary: '2026-11 기준 문법 레퍼런스로 전면 갱신 (표 지시자, 이미지, 각주, 틀과 상자)',
    pageSummary: '이랑위키 문법 레퍼런스 — 글자 꾸미기, 링크, 이미지, 표, 각주, 틀과 상자',
  },
  {
    title: GUIDE_DOC_TITLE,
    content: GUIDE_DOC,
    summary: '2026-11 기준 첫 안내로 갱신 (구글·네이버 로그인, 계정 설정, 문서 화면, 신고)',
    pageSummary: '처음 오신 분을 위한 이랑위키 사용 안내',
  },
]

type Db = ReturnType<typeof getDb>
type Admin = NonNullable<Awaited<ReturnType<typeof checkAdminAuth>>>

async function findPage(db: Db, title: string) {
  const [page] = await db
    .select()
    .from(wikiPages)
    .where(and(ne(wikiPages.isDeleted, true), or(eq(wikiPages.title, title), eq(wikiPages.slug, title))))
    .limit(1)
  return page
}

/** 문서가 있으면 새 리비전을 쌓아 갱신하고, 없으면 help 네임스페이스로 만든다. 내용이 같으면 건너뛴다. */
async function upsertHelpPage(db: Db, admin: Admin, spec: HelpPageSpec) {
  const page = await findPage(db, spec.title)
  const now = new Date()

  if (page) {
    if (page.content === spec.content) {
      return { title: spec.title, action: 'unchanged' as const, revision: page.currentRevision }
    }
    const newRev = page.currentRevision + 1
    await db.insert(wikiRevisions).values({
      pageId: page.id,
      revisionNumber: newRev,
      content: spec.content,
      summary: spec.summary,
      author: admin.username,
      authorId: admin.userId,
      editType: 'edit',
      isMinorEdit: false,
      isAutomated: true,
      contentLength: spec.content.length,
      sizeChange: spec.content.length - (page.content?.length || 0),
      isVerified: true,
      timestampAt: now,
    })
    await db
      .update(wikiPages)
      .set({
        content: spec.content,
        lastEditor: admin.username,
        lastEditorId: admin.userId,
        lastEditDate: now,
        lastEditSummary: spec.summary,
        currentRevision: newRev,
        edits: page.edits + 1,
        isStub: false,
        updatedAt: now,
      })
      .where(eq(wikiPages.id, page.id))
    return { title: spec.title, action: 'updated' as const, revision: newRev }
  }

  const [created] = await db
    .insert(wikiPages)
    .values({
      title: spec.title,
      slug: spec.title,
      namespace: 'help',
      content: spec.content,
      summary: spec.pageSummary,
      categories: ['도움말'],
      creator: admin.username,
      creatorId: admin.userId,
      lastEditor: admin.username,
      lastEditorId: admin.userId,
      lastEditDate: now,
      lastEditSummary: spec.summary,
      currentRevision: 1,
      edits: 1,
      watchers: [admin.userId],
    })
    .returning({ id: wikiPages.id })

  await db.insert(wikiRevisions).values({
    pageId: created.id,
    revisionNumber: 1,
    content: spec.content,
    summary: spec.summary,
    author: admin.username,
    authorId: admin.userId,
    editType: 'create',
    isMinorEdit: false,
    isAutomated: true,
    contentLength: spec.content.length,
    sizeChange: spec.content.length,
    isVerified: true,
    timestampAt: now,
  })
  return { title: spec.title, action: 'created' as const, revision: 1 }
}

/**
 * 안내 문서(편집 도움말 2026 · 문법 · 도움말)를 최신(2026-11) 내용으로 맞추는 라우트.
 * 내용이 이미 같으면 건너뛰므로 여러 번 실행해도 안전하다.
 *
 *   GET /api/admin/maintenance/help-2026            → dry-run (문서별 상태)
 *   GET /api/admin/maintenance/help-2026?confirm=1  → 반영
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const { searchParams } = new URL(request.url)
    if (searchParams.get('confirm') !== '1') {
      const status = await Promise.all(
        HELP_PAGES.map(async (spec) => {
          const page = await findPage(db, spec.title)
          return {
            title: spec.title,
            exists: Boolean(page),
            upToDate: page?.content === spec.content,
            currentRevision: page?.currentRevision ?? null,
          }
        })
      )
      return NextResponse.json({
        success: true,
        applied: false,
        message: 'dry-run — ?confirm=1 로 호출하면 안내 문서를 최신 내용으로 갱신합니다.',
        pages: status,
      })
    }

    const results = []
    for (const spec of HELP_PAGES) {
      results.push(await upsertHelpPage(db, admin, spec))
    }
    const changed = results.filter((result) => result.action !== 'unchanged').length

    return NextResponse.json({
      success: true,
      applied: true,
      message: changed === 0 ? '안내 문서가 모두 최신입니다.' : `안내 문서 ${changed}개를 갱신했습니다.`,
      pages: results,
      appliedBy: admin.username,
    })
  } catch (error) {
    console.error('help-2026 갱신 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: '도움말 갱신 중 오류가 발생했습니다.',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
