import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne, or } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { wikiPages, wikiRevisions } from '@/db/schema/wiki'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

const HELP_TITLE = '이랑위키:도움말_2026'

const HELP_CONTENT = `= 이랑위키 편집 도움말 (2026 개편) =

:::info
이 문서는 2026년 6월 업데이트로 추가된 새 문법을 정리한 도움말입니다. 기본 문법은 [[이랑위키:문법]]을 참고하세요. 아래 예시들은 실제로 렌더링되어 보이므로, 편집 버튼을 눌러 원문과 비교하며 익히는 것을 추천합니다.
:::

== 표 꾸미기 ==

=== 행 단위 색상 — 한 번만 적으면 끝 ===
이제 칸마다 색을 반복해서 적을 필요가 없습니다. '''행의 첫 칸'''에 한 번만 적으면 그 행 전체에 적용됩니다.

\`\`\`
|| <rowbgcolor:#4472C4 rowcolor:#ffffff>헤더1 || 헤더2 || 헤더3 ||
|| 데이터1 || <bgcolor:#F8D7DA>이 칸만 강조 || 데이터3 ||
\`\`\`

|| <rowbgcolor:#4472C4 rowcolor:#ffffff>헤더1 || 헤더2 || 헤더3 ||
|| 데이터1 || <bgcolor:#F8D7DA>이 칸만 강조 || 데이터3 ||

* \`<rowbgcolor:#색>\` — 행 전체 배경 / \`<rowcolor:#색>\` — 행 전체 글자색
* \`<bgcolor:#색>\` \`<color:#색>\` — 그 칸 하나만 (행 설정을 덮어씀)
* 표 전체는 '''첫 칸'''에 \`<tablebgcolor:#색>\` \`<tablecolor:#색>\`
* 우선순위: '''셀 > 행 > 표'''

=== 정렬과 폰트 ===
* \`<align:center>\` — 그 칸 가운데 정렬 (left / center / right)
* \`<rowalign:center>\` — 행 전체 정렬
* \`<tablealign:center>\` — 표 전체 정렬 (첫 칸에)
* \`<font:궁서체>\` — 폰트 지정. 공백 있는 폰트는 \`<font:"Noto Sans KR">\` 처럼 따옴표

=== 칸 병합 (열/행 합치기) ===
* \`<-숫자>\` — 가로(열) 병합 / \`<|숫자>\` — 세로(행) 병합
* 병합으로 가려지는 칸은 '''쓰지 않고 생략'''합니다.

\`\`\`
|| <-5><bgcolor:#c4002e><color:#ffffff>'''김영우의 연도별 시즌 일람''' ||
|| 2025년 || → || '''2026년''' || → || 2027년 ||
\`\`\`

|| <-5><bgcolor:#c4002e><color:#ffffff>'''김영우의 연도별 시즌 일람''' ||
|| 2025년 || → || '''2026년''' || → || 2027년 ||

== 본문 꾸미기 ==

* \`{{{#ff0000 빨간 글씨}}}\` — 색상
* \`{{{+1 큰 글씨}}}\` / \`{{{-1 작은 글씨}}}\` — 크기
* \`{{{font:"맑은 고딕" 폰트 바꾸기}}}\` — '''(신규)''' 본문 폰트

== 넘겨주기(redirect)와 하위 문서 ==

문서의 '''첫 줄'''에 아래처럼 쓰면 그 문서로 들어왔을 때 자동으로 대상 문서로 이동합니다.

\`\`\`
#redirect 강한울
\`\`\`

* \`#redirect 대상\` / \`#넘겨주기 대상\` 모두 인식
* 넘겨주기 문서 자체를 보려면 주소 뒤에 \`?noredirect=1\`
* 하위 문서는 제목에 \`/\`를 넣어 만듭니다 — 예: \`강한울/야구\`, \`정재원/여담\`. 본문에서는 \`[[강한울/야구]]\`로 링크

== 타임라인 ==

사건·여행 일지를 세로 연표로 보여줍니다. 각 줄은 \`날짜 | 제목 | 설명(선택)\` 형식.

\`\`\`
:::timeline
2024-03-20 | 랑구 결성 | 태릉고 동창들이 모였다
2025-01-01 | 새해 다짐
:::
\`\`\`

:::timeline
2024-03-20 | 랑구 결성 | 태릉고 동창들이 모였다
2025-01-01 | 새해 다짐
:::

== 투표 ==

문서 안에 실시간 투표를 넣을 수 있습니다. 첫 줄에 질문, 다음 줄부터 선택지(2개 이상).

\`\`\`
:::poll 다음 모임 메뉴는?
햄버거
커피
치킨
:::
\`\`\`

:::poll 다음 모임 메뉴는?
햄버거
커피
치킨
:::

* 로그인한 사용자만 투표 가능, 1인 1표(다시 누르면 변경)
* 질문이나 선택지를 수정하면 '''새 투표'''로 취급됩니다

== 둘러보기 기능 ==

* '''지식 그래프''' — 왼쪽 탐색 메뉴의 "지식 그래프"에서 문서들의 연결망을 별자리처럼 봅니다. 점 클릭 = 문서 이동, 드래그 = 이동, 휠 = 확대/축소
* '''기여 잔디·칭호''' — 왼쪽 메뉴 "기여자" 페이지에서 새싹 아이콘을 누르면 1년 편집 잔디와 획득 칭호가 보입니다
* '''고립 문서''' — 어떤 문서와도 연결되지 않은 문서는 상단에 안내가 뜹니다. 다른 문서에서 \`[[문서명]]\`으로 이어주세요

== 편집기 팁 ==

* 툴바에 폰트·타임라인·투표 버튼과 '''색상 표(행 단위)''' 템플릿이 추가되었습니다
* 표 색상 선택기에서 #코드를 입력하면 '''실시간 미리보기'''가 보입니다
* \`Ctrl+Enter\` — 미리보기 토글 / \`Ctrl+S\` — 저장

[[분류:도움말]]`

/**
 * 이랑위키:도움말_2026 문서를 2026-06 패치 내용으로 갱신하는 1회성 라우트.
 * 문서가 있으면 새 리비전을 쌓으며 업데이트, 없으면 help 네임스페이스로 생성.
 *
 *   GET /api/admin/maintenance/help-2026            → dry-run (대상 문서 상태)
 *   GET /api/admin/maintenance/help-2026?confirm=1  → 반영
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getDb()
    const [page] = await db
      .select()
      .from(wikiPages)
      .where(
        and(
          ne(wikiPages.isDeleted, true),
          or(eq(wikiPages.title, HELP_TITLE), eq(wikiPages.slug, HELP_TITLE))
        )
      )
      .limit(1)

    const { searchParams } = new URL(request.url)
    if (searchParams.get('confirm') !== '1') {
      return NextResponse.json({
        success: true,
        applied: false,
        message: 'dry-run — ?confirm=1 로 호출하면 도움말을 갱신합니다.',
        target: HELP_TITLE,
        exists: Boolean(page),
        currentRevision: page?.currentRevision ?? null,
        newContentLength: HELP_CONTENT.length,
      })
    }

    const now = new Date()

    if (page) {
      const newRev = page.currentRevision + 1
      await db.insert(wikiRevisions).values({
        pageId: page.id,
        revisionNumber: newRev,
        content: HELP_CONTENT,
        summary: '2026-06 패치 문법으로 도움말 전면 갱신',
        author: admin.username,
        authorId: admin.userId,
        editType: 'edit',
        isMinorEdit: false,
        isAutomated: true,
        contentLength: HELP_CONTENT.length,
        sizeChange: HELP_CONTENT.length - (page.content?.length || 0),
        isVerified: true,
        timestampAt: now,
      })
      await db
        .update(wikiPages)
        .set({
          content: HELP_CONTENT,
          lastEditor: admin.username,
          lastEditorId: admin.userId,
          lastEditDate: now,
          lastEditSummary: '2026-06 패치 문법으로 도움말 전면 갱신',
          currentRevision: newRev,
          edits: page.edits + 1,
          isStub: false,
          updatedAt: now,
        })
        .where(eq(wikiPages.id, page.id))

      return NextResponse.json({
        success: true,
        applied: true,
        message: `"${HELP_TITLE}" 갱신 완료 (r${newRev}).`,
        appliedBy: admin.username,
      })
    }

    // 없으면 생성
    const [created] = await db
      .insert(wikiPages)
      .values({
        title: HELP_TITLE,
        slug: HELP_TITLE,
        namespace: 'help',
        content: HELP_CONTENT,
        summary: '편집기 사용법 — 표 색상/병합, 타임라인, 투표 등 2026 신규 문법 안내',
        categories: ['도움말'],
        creator: admin.username,
        creatorId: admin.userId,
        lastEditor: admin.username,
        lastEditorId: admin.userId,
        lastEditDate: now,
        lastEditSummary: '2026 도움말 생성',
        currentRevision: 1,
        edits: 1,
        watchers: [admin.userId],
      })
      .returning({ id: wikiPages.id })

    await db.insert(wikiRevisions).values({
      pageId: created.id,
      revisionNumber: 1,
      content: HELP_CONTENT,
      summary: '2026 도움말 생성',
      author: admin.username,
      authorId: admin.userId,
      editType: 'create',
      isMinorEdit: false,
      isAutomated: true,
      contentLength: HELP_CONTENT.length,
      sizeChange: HELP_CONTENT.length,
      isVerified: true,
      timestampAt: now,
    })

    return NextResponse.json({
      success: true,
      applied: true,
      message: `"${HELP_TITLE}" 생성 완료.`,
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
