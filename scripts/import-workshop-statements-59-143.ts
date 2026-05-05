/**
 * 워크숍 발언 59~143호 일괄 등록 (1-58호는 손대지 않음).
 *
 * 동작:
 *   1) wiki_workshop_statements 에서 issueNumber >= 59 인 행 모두 삭제
 *      (현재 60호 = "안녕하세요 테스트입니다" 테스트 행 포함)
 *   2) 아래 ENTRIES 배열을 순서대로 INSERT, payload 는 기존 1-58호와 동일한
 *      필드 구성 (listAuthor='system-import' 등) 으로 맞춤
 *
 * 사용법:
 *   # 변경 미리보기 (DB 안 건드림)
 *   DATABASE_URL=postgresql://... npx tsx scripts/import-workshop-statements-59-143.ts
 *
 *   # 실제 적용
 *   DATABASE_URL=postgresql://... npx tsx scripts/import-workshop-statements-59-143.ts --apply
 */

import 'dotenv/config'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import * as schema from '../src/db/schema'
import { wikiWorkshopStatements } from '../src/db/schema/wiki'

type Entry = {
  issueNumber: number
  /** ISO datetime (KST는 +09:00 으로 표기) */
  createdAt: string
  speaker: string
  message: string
}

// ── 59~143호 발언 (KST 기준 시각) ──────────────────────────
const ENTRIES: Entry[] = [
  { issueNumber: 59,  createdAt: '2026-02-14T19:48:00+09:00', speaker: '이승찬(송찬의)',                          message: '나 여자야' },
  { issueNumber: 60,  createdAt: '2026-02-14T19:48:00+09:00', speaker: '정진규(청명) & 이승찬(송찬의)',           message: '이승찬, 너 여자야? / 아직 확인하지 않았으니까 모르지 뭐' },
  { issueNumber: 61,  createdAt: '2026-02-14T19:48:00+09:00', speaker: '이승찬(송찬의)',                          message: '본 적 있어? 본 적 있냐구, 본 적 없으니까 모르는거지' },
  { issueNumber: 62,  createdAt: '2026-02-14T19:48:00+09:00', speaker: '박태현(하라)',                            message: '지금도 신고할 수 있어 신고할 수 있다고!!' },
  { issueNumber: 63,  createdAt: '2026-02-14T19:48:00+09:00', speaker: '이승찬(송찬의)',                          message: '다른 정은 모르겠고, 내가 아는 정은.... 정진규...?' },
  { issueNumber: 64,  createdAt: '2026-02-14T19:48:00+09:00', speaker: '이승찬(송찬의)',                          message: '오늘 한거 봐서는 진규야...너...합격이야' },
  { issueNumber: 65,  createdAt: '2026-02-14T19:48:00+09:00', speaker: '강한울(설진)',                            message: '택배열면 진규가 묶인채로 우~ 상관없어 라고 하고 있을 수 있어' },
  { issueNumber: 66,  createdAt: '2026-02-14T20:00:00+09:00', speaker: '정진규(청명)',                            message: '내가 T가 된 이유가 너였구나 시바러마' },
  { issueNumber: 67,  createdAt: '2026-02-14T20:00:00+09:00', speaker: '정진규(청명)',                            message: '이승찬한테 달려있는 것만 아니면 난 상관없어' },
  { issueNumber: 68,  createdAt: '2026-02-14T20:07:00+09:00', speaker: '이솔비(므애)',                            message: '너 닭이야? 암탉이야?' },
  { issueNumber: 69,  createdAt: '2026-02-15T22:53:00+09:00', speaker: '정재원(갭)',                              message: '좋아하나봐...이것은 사랑...?' },
  { issueNumber: 70,  createdAt: '2026-02-21T01:04:00+09:00', speaker: '정재원(갭)',                              message: '아 확인해보던가 언제든 환영^^' },
  { issueNumber: 71,  createdAt: '2026-02-21T01:04:00+09:00', speaker: '이아린(먼지)',                            message: '확인 안됐잖아 확인 안됐잖아!!' },
  { issueNumber: 72,  createdAt: '2026-02-21T01:04:00+09:00', speaker: '이아린(먼지)',                            message: '아냐 연진이보다 작은 나무 있을거야' },
  { issueNumber: 73,  createdAt: '2026-02-21T01:04:00+09:00', speaker: '박태현(하라)',                            message: '아냐 그 나무도 연진이보다 클거야' },
  { issueNumber: 74,  createdAt: '2026-02-21T01:11:00+09:00', speaker: '강한울(설진)',                            message: '모두까기 나무다 모두까기 나무' },
  { issueNumber: 75,  createdAt: '2026-02-21T01:11:00+09:00', speaker: '박태현(하라)',                            message: '먼지가 말한거 다 쓰면 먼지 시집 못가' },
  { issueNumber: 76,  createdAt: '2026-02-21T01:11:00+09:00', speaker: '이아린(먼지)',                            message: '아니 내가 시집을 안갈건데 왜 너가 그러는거야' },
  { issueNumber: 77,  createdAt: '2026-02-21T01:11:00+09:00', speaker: '이아린(먼지)',                            message: '내가 그냥 너한테 시집간다고 했어야했나' },
  { issueNumber: 78,  createdAt: '2026-02-21T01:11:00+09:00', speaker: '남연진(나무)',                            message: '아니 내가 통화방에 있을 때 까란말이야!' },
  { issueNumber: 79,  createdAt: '2026-02-21T01:11:00+09:00', speaker: '남연진(나무)',                            message: '가스라이팅 하지마 이 자식들아! 난 솔비가 아니야!!!!' },
  { issueNumber: 80,  createdAt: '2026-02-21T01:11:00+09:00', speaker: '박태현(하라)',                            message: '하지만 연진아 나무를 보면...' },
  { issueNumber: 81,  createdAt: '2026-02-21T01:11:00+09:00', speaker: '이아린(먼지)',                            message: '그러면 그냥 뒷담 말고 앞담을 해야겠다.' },
  { issueNumber: 82,  createdAt: '2026-02-21T01:11:00+09:00', speaker: '정재원(갭)',                              message: '아니 차피 태현아 사랑하면 닮아' },
  { issueNumber: 83,  createdAt: '2026-02-21T01:18:00+09:00', speaker: '정재원(갭)',                              message: '아냐아냐 어차피 까발려지니까 괜찮아 앞담이잖아' },
  { issueNumber: 84,  createdAt: '2026-02-21T01:18:00+09:00', speaker: '강한울(설진)',                            message: '여기까지만 해 너희 오늘 폭탄발언 더 할거 아니잖아 그치?' },
  { issueNumber: 85,  createdAt: '2026-02-21T01:18:00+09:00', speaker: '정재원(갭) & 이아린(먼지)',               message: '혹시 모르지' },
  { issueNumber: 86,  createdAt: '2026-02-21T01:18:00+09:00', speaker: '이아린(먼지)',                            message: '축하해 한울아 인간 합격이야!' },
  { issueNumber: 87,  createdAt: '2026-02-21T01:18:00+09:00', speaker: '이아린(먼지)',                            message: '시집 안간다니까 너가 데려갈거잖아 ~' },
  { issueNumber: 88,  createdAt: '2026-02-21T01:18:00+09:00', speaker: '이아린(먼지)',                            message: '이러다가 헤어지면 어쩔려고 이러는거야' },
  { issueNumber: 89,  createdAt: '2026-02-21T01:35:00+09:00', speaker: '박태현(하라)',                            message: '내 여자친구 NASA 입학했어' },
  { issueNumber: 90,  createdAt: '2026-02-21T20:44:00+09:00', speaker: '이솔비(므애), 정재원(갭), 강한울(설진)',  message: '내일 입을 거 봤는데 너무 짧아 / 한울아 단속 들어가야겠는데? / 괜찮아, (목소리 깔며) 어차피 내꺼야' },
  { issueNumber: 91,  createdAt: '2026-03-07T23:55:00+09:00', speaker: '강한울(설진)',                            message: '아니 지금 한국이 일본을 드디어 잡을 기회가 온거잖아요 지금' },
  { issueNumber: 92,  createdAt: '2026-03-07T23:55:00+09:00', speaker: '이승찬(송찬의)',                          message: '지금 감독이 총력전을 위한 시동은 걸었지만, 아직 중립에 있어요 D는 언제갈지 모릅니다.' },
  { issueNumber: 93,  createdAt: '2026-03-07T23:55:00+09:00', speaker: '강한울(설진)',                            message: '개인적인 견해일 뿐이지만, 류현진이었으면 어땠을까하는 아쉬움이 좀 있다.' },
  { issueNumber: 94,  createdAt: '2026-03-07T23:55:00+09:00', speaker: '이승찬(송찬의)',                          message: '아니 100호를 내가 하고 싶기는 하지, 그렇지만 어떤 말로 장식해야할지 아직 잘 모르겠어' },
  { issueNumber: 95,  createdAt: '2026-03-07T23:55:00+09:00', speaker: '강한울(설진)',                            message: '태현아 딱 한번만 말할게, 롤켜.' },
  { issueNumber: 96,  createdAt: '2026-03-07T23:55:00+09:00', speaker: '박태현(하라)',                            message: '잠깐만 X 27' },
  { issueNumber: 97,  createdAt: '2026-03-08T00:00:00+09:00', speaker: '강한울(설진)',                            message: '어케 태현아, 내가 잠깐만 이거 사운드 보드에 넣어줄까?' },
  { issueNumber: 98,  createdAt: '2026-03-08T00:00:00+09:00', speaker: '이솔비(므애) & 박태현(하라)',             message: '저기 잠깐만씨 어디갔어요? / 잠깐만' },
  { issueNumber: 99,  createdAt: '2026-03-08T20:35:00+09:00', speaker: '이아린(먼지)',                            message: '애쨩이 다는거야?' },
  { issueNumber: 100, createdAt: '2026-03-08T20:35:00+09:00', speaker: '이승찬(송찬의)',                          message: '지금 이거 안타 못치면 바로 애국자 메이커로 대가리 치는 겁니다.' },
  { issueNumber: 101, createdAt: '2026-03-08T20:35:00+09:00', speaker: '이아린(먼지)',                            message: '애쨩 아직 여자인데....' },
  { issueNumber: 102, createdAt: '2026-03-08T20:45:00+09:00', speaker: '강한울(설진)',                            message: '승찬아 인사해 네 남자친구 진규야' },
  { issueNumber: 103, createdAt: '2026-03-08T20:45:00+09:00', speaker: '이승찬(송찬의)',                          message: '진규도 있고....' },
  { issueNumber: 104, createdAt: '2026-03-08T20:45:00+09:00', speaker: '정진규(청명)',                            message: '그냥 사실로 만들어줄게' },
  { issueNumber: 105, createdAt: '2026-03-08T20:45:00+09:00', speaker: '이승찬(송찬의) & 정진규(청명)',           message: '진규가 왜 나한테 그러냐고? 나니까 / 맞아 너니까' },
  { issueNumber: 106, createdAt: '2026-03-09T22:30:00+09:00', speaker: '박태현(하라)',                            message: '나야 교수야' },
  { issueNumber: 107, createdAt: '2026-03-10T21:07:00+09:00', speaker: '추선호(박쥐)',                            message: '내가 너 좀 가지고 놀면 안돼냐' },
  { issueNumber: 108, createdAt: '2026-03-11T20:03:00+09:00', speaker: '이솔비(므애)',                            message: '내가 좋다고? 알아' },
  { issueNumber: 109, createdAt: '2026-03-11T20:03:00+09:00', speaker: '정진규(청명)',                            message: '드디어 기일보다 전역이 빨리 온다.' },
  { issueNumber: 110, createdAt: '2026-03-11T20:03:00+09:00', speaker: '이솔비(므애)',                            message: '세상에서 제일 어려운 문제는 너야~' },
  { issueNumber: 111, createdAt: '2026-03-11T20:03:00+09:00', speaker: '이아린(먼지)',                            message: '나라는 문제에 대한 답은 너야' },
  { issueNumber: 112, createdAt: '2026-03-11T20:03:00+09:00', speaker: '박태현(하라)',                            message: '너가 제일 문제야 지금.' },
  { issueNumber: 113, createdAt: '2026-03-11T20:03:00+09:00', speaker: '이아린(먼지)',                            message: '월요일에도 군인 하나 뚜까 팼는데, 오늘도 이러니까 너무 재밌다' },
  { issueNumber: 114, createdAt: '2026-03-11T20:03:00+09:00', speaker: '이솔비(므애)',                            message: '어후..저는 저렇게 되지 않을 거예요, 엄마' },
  { issueNumber: 115, createdAt: '2026-03-11T20:45:00+09:00', speaker: '이아린(먼지)',                            message: '담배 안폈으면,,, 더 건강하게 군대에 가지 않았을까...?' },
  { issueNumber: 116, createdAt: '2026-03-11T20:45:00+09:00', speaker: '정진규(청명)',                            message: '아파요' },
  { issueNumber: 117, createdAt: '2026-03-12T01:02:00+09:00', speaker: '이솔비(므애)',                            message: '우리야! 군대야! 선택해!' },
  { issueNumber: 118, createdAt: '2026-03-13T01:27:00+09:00', speaker: '이승찬(송찬의)',                          message: '개총? 아~ 개같이 총맞는 날이요? 발로란트에요? 배그에요?' },
  { issueNumber: 119, createdAt: '2026-03-13T01:27:00+09:00', speaker: '이승찬(송찬의)',                          message: '아 제가 요즘 변성기가 와서요' },
  { issueNumber: 120, createdAt: '2026-03-13T01:27:00+09:00', speaker: '이승찬(송찬의)',                          message: '아 제 나이요? 저 일곱살이요. 제가 성 조숙증이 있어서요' },
  { issueNumber: 121, createdAt: '2026-03-13T01:27:00+09:00', speaker: '이승찬(송찬의)',                          message: '가끔 내 이런 주옥같은 말들을 영화로 만들면 어떨까 생각해' },
  { issueNumber: 122, createdAt: '2026-03-13T23:12:00+09:00', speaker: '박태현(하라)',                            message: '여친이 두명이 되는 마술을 봤어' },
  { issueNumber: 123, createdAt: '2026-03-15T14:18:00+09:00', speaker: '강한울(설진)',                            message: '승찬아 우리 친구였나?' },
  { issueNumber: 124, createdAt: '2026-03-22T14:08:00+09:00', speaker: '강한울(설진)',                            message: '쉿, 조용히해 내 아기 고양이' },
  { issueNumber: 125, createdAt: '2026-03-22T14:08:00+09:00', speaker: '이승찬(송찬의)',                          message: '진짜 너무 충격적이라 아무말도 안나온다.' },
  { issueNumber: 126, createdAt: '2026-03-23T21:29:00+09:00', speaker: '이아린(먼지)',                            message: '실패하면 바람, 성공하면 환승 아닙니까?' },
  { issueNumber: 127, createdAt: '2026-03-23T21:29:00+09:00', speaker: '이아린(먼지) & 박태현(하라)',             message: '나 이제 시집 못가 어카냐 / 여기로 와 나한테 오는거야' },
  { issueNumber: 128, createdAt: '2026-03-24T13:37:00+09:00', speaker: '이솔비(므애)',                            message: '널 찾아내서 중성화 시킬거다' },
  { issueNumber: 129, createdAt: '2026-03-31T01:19:00+09:00', speaker: '이솔비(므애)',                            message: '오늘의 미스터리, 김나린은 누구인가' },
  { issueNumber: 130, createdAt: '2026-04-05T22:26:00+09:00', speaker: '이솔비(므애)',                            message: '자, 우클릭, 연결 끊기..!' },
  { issueNumber: 131, createdAt: '2026-04-12T11:36:00+09:00', speaker: '이승찬(송찬의)',                          message: '오늘의 날씨를 알려드리겠습니다, 강원내륙으로 한파주의보가 내려졌고, 올 여름들어 가장 추울 것으로 예상됩니다.' },
  { issueNumber: 132, createdAt: '2026-04-17T11:13:00+09:00', speaker: '강한울(설진)',                            message: '내가 지금 영어를 배우는거여 수학을 배우는거여' },
  { issueNumber: 133, createdAt: '2026-04-18T00:33:00+09:00', speaker: '박태현(하라)',                            message: '남편을 굶겨 죽인다ㅏ' },
  { issueNumber: 134, createdAt: '2026-04-18T01:28:00+09:00', speaker: '이솔비(므애)',                            message: '억울하지 않도록 착하게 살았어야죠' },
  { issueNumber: 135, createdAt: '2026-04-26T14:03:00+09:00', speaker: '강한울(설진)',                            message: '승찬이에게 이기는거요...? 불명예스러운 승리군요' },
  { issueNumber: 136, createdAt: '2026-05-01T17:43:00+09:00', speaker: '강한울(설진)',                            message: '저 녀석 미래를 볼 줄 아는걸?' },
  { issueNumber: 137, createdAt: '2026-05-01T17:43:00+09:00', speaker: '이아린(먼지)',                            message: '저 녀석 신기가 있어 눈치가 빨라' },
  { issueNumber: 138, createdAt: '2026-05-01T17:52:00+09:00', speaker: '이아린(먼지)',                            message: '아니 쟤가 나를 괴롭힐 수도 있는거 아냐?' },
  { issueNumber: 139, createdAt: '2026-05-01T17:52:00+09:00', speaker: '강한울(설진) & 박태현(하라)',             message: '아냐아냐 그럴리 없어' },
  { issueNumber: 140, createdAt: '2026-05-01T17:52:00+09:00', speaker: '강한울(설진)',                            message: '애초에 내가 널 괴롭힌다는게 성립할 수 없어' },
  { issueNumber: 141, createdAt: '2026-05-01T18:00:00+09:00', speaker: '박태현(하라)',                            message: '네가? 나를? 밟을 수 있을거라 생각해?' },
  { issueNumber: 142, createdAt: '2026-05-01T18:00:00+09:00', speaker: '강한울(설진)',                            message: '이거 살짝 조미료 넣어도 괜찮죠?' },
  { issueNumber: 143, createdAt: '2026-05-04T19:47:00+09:00', speaker: '이승찬(송찬의) & 정재원(갭)',             message: '왜 승찬승찬은 로그인이 안 되지? / 회원가입을 안 하셨던데요? / 아...맞네...' },
]

const LIST_AUTHOR = 'system-import'
const LIST_AUTHOR_DISPLAY = 'system-import'
const LIST_AUTHOR_DISCORD_ID = 'system-import'

async function main() {
  const apply = process.argv.includes('--apply')

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL 환경변수 필요')
    process.exit(1)
  }

  // 정합성 체크: issueNumber 가 59~143 까지 빠짐없이 한 번씩 들어있는지
  const expected = Array.from({ length: 143 - 59 + 1 }, (_, i) => 59 + i)
  const actual = ENTRIES.map((e) => e.issueNumber).sort((a, b) => a - b)
  if (actual.length !== expected.length || actual.some((n, i) => n !== expected[i])) {
    console.error('issueNumber 누락/중복:', { expected, actual })
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle(pool, { schema })

  // 변경 전 상태 확인
  const beforeRes = await db.execute<any>(
    sql`SELECT (payload->>'issueNumber')::int AS issue_number, payload->>'speaker' AS speaker, payload->>'message' AS message
        FROM wiki_workshop_statements
        WHERE (payload->>'issueNumber')::int >= 59
        ORDER BY (payload->>'issueNumber')::int`
  )
  const beforeRows = ((beforeRes as any).rows ?? beforeRes) as any[]

  console.log(`\n[변경 전] issueNumber >= 59 인 행 (${beforeRows.length}개):`)
  for (const r of beforeRows) {
    console.log(`  ${r.issue_number}호 / ${r.speaker} / ${r.message}`)
  }

  console.log(`\n[적용할 작업]`)
  console.log(`  - DELETE: issueNumber >= 59 (${beforeRows.length}개 행 제거)`)
  console.log(`  - INSERT: ${ENTRIES.length}개 행 (59~143호)`)

  if (!apply) {
    console.log(`\n실제 적용은 --apply 플래그가 필요합니다. (지금은 dry-run)`)
    await pool.end()
    return
  }

  console.log(`\n[적용 시작]`)
  await db.transaction(async (tx) => {
    const delResult = await tx.execute<any>(
      sql`DELETE FROM wiki_workshop_statements WHERE (payload->>'issueNumber')::int >= 59`
    )
    console.log(`  DELETE 완료 (rowCount=${(delResult as any).rowCount ?? '?'})`)

    for (const entry of ENTRIES) {
      const ts = new Date(entry.createdAt)
      const payload = {
        issueNumber: entry.issueNumber,
        speaker: entry.speaker,
        message: entry.message,
        listAuthor: LIST_AUTHOR,
        listAuthorDisplayName: LIST_AUTHOR_DISPLAY,
        listAuthorDiscordId: LIST_AUTHOR_DISCORD_ID,
      }
      await tx.insert(wikiWorkshopStatements).values({
        payload: payload as any,
        createdAt: ts,
        updatedAt: ts,
      })
    }
    console.log(`  INSERT 완료 (${ENTRIES.length}건)`)
  })

  // 사후 확인
  const afterRes = await db.execute<any>(
    sql`SELECT COUNT(*)::int AS n,
               MIN((payload->>'issueNumber')::int) AS min_n,
               MAX((payload->>'issueNumber')::int) AS max_n
        FROM wiki_workshop_statements`
  )
  const afterRow = (((afterRes as any).rows ?? afterRes) as any[])[0]
  console.log(`\n[변경 후] 전체 발언: ${afterRow.n}건 (range: ${afterRow.min_n} ~ ${afterRow.max_n}호)`)

  await pool.end()
}

main().catch(async (err) => {
  console.error(err)
  process.exit(1)
})
