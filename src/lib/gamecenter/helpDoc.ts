import { CLAW_ODDS } from '@/games/claw/draw'
import { QUIZ_MIN_ANSWERS } from '@/games/quiz/prompts'
import { COMMON_REWARDS, DAILY_GAME_CAP, GAME_REWARDS } from './rewards'

/**
 * 도움말 문서 ‘이랑위키:게임센터’ 본문.
 * 관리자 화면의 ‘도움말 문서 갱신’(/api/admin/maintenance/help-2026)이 이 내용으로 문서를 만든다.
 * 숫자는 rewards.ts 에서 읽어 오므로, 보상을 조정한 뒤 도움말을 다시 갱신하면 문서도 맞춰진다.
 * 렌더러 문법 주의: 표 칸 안에 `||` 나 꺾쇠 지시자를 쓰지 말 것.
 */

export const GAMECENTER_DOC_TITLE = '이랑위키:게임센터'

const R = GAME_REWARDS
const C = COMMON_REWARDS
const percent = (value: number) => `${Math.round(value * 100)}%`

export const GAMECENTER_DOC = `:::info
[[https://irang.wiki/game|이랑게임센터]]는 이랑위키 계정으로 바로 쓰는 게임 사이트입니다. 게임을 하면 '''이랑 포인트(P)'''가 쌓이고, 상점에서 아이템으로 바꿀 수 있습니다. 포인트는 현금으로 사거나 바꿀 수 없고, 다른 사람에게 줄 수도 없습니다.
:::

[[목차]]

## 시작하기

* 주소: [[https://irang.wiki/game|irang.wiki/game]]. 이랑위키에 로그인돼 있으면 따로 가입할 필요가 없습니다.
* 로비에서 '''출석'''을 누르면 하루 한 번 +${C.dailyCheckIn}P, ${C.streakLength}일 연속이면 +${C.streak7}P 를 더 받습니다. 날짜는 한국 시간 기준입니다.
* 게임으로 받는 포인트는 '''하루 ${DAILY_GAME_CAP}P''' 까지입니다. 출석과 주간 랭킹 보상은 여기에 들어가지 않습니다.
* 포인트 내역과 보유품은 게임센터의 ‘내 정보’에서 봅니다.

## 혼자 하는 게임

|| <rowbgcolor:#2F5D8C rowcolor:#ffffff>게임 || 하는 법 || 포인트 ||
|| 인형뽑기 || 한 판 ${R.claw.playCost}P 또는 무료권 1장. 집게를 옮겨 뽑기 || 도감에 처음 등록되는 인형 +${R.claw.newPlush}P, 황금 랑구 +${R.claw.goldenRangu}P ||
|| 테트리스 || 혼자 하는 랭킹전 || 1분 이상 한 판 +${R.tetris.clear}P (하루 ${R.tetris.clearPerDay}판), 1만 점마다 +${R.tetris.per10kScore}P, 4줄 제거 +${R.tetris.tetris}P, 최고 기록 경신 +${R.tetris.personalBest}P ||
|| 랑구 등반 || 힘을 모아 뛰어 정상까지. 체크포인트 없음 || 새 구역 +${R.climb.newZone}P, 정상 첫 도달 +${R.climb.summit}P, 완주 기록 단축 +${R.climb.fasterClear}P, 5분 이상 플레이 +${R.climb.play}P (하루 ${R.climb.playPerDay}회) ||
|| 사다리 타기 || 계산·벌칙 정하기. 로그인 없이도 됨 || 없음 ||

* 인형뽑기는 잡히는지와 어떤 인형인지를 시작할 때 서버가 추첨합니다. 성공 확률은 ${percent(CLAW_ODDS.baseWin)}에서 시작해 연속으로 놓칠 때마다 ${percent(CLAW_ODDS.pityStep)}씩 올라가고(최대 ${percent(CLAW_ODDS.maxWin)}), 황금 랑구가 걸릴 확률은 판마다 ${percent(CLAW_ODDS.gold)}입니다.
* 테트리스와 랑구 등반의 기록은 서버가 입력 기록을 다시 실행해 확인합니다. 확인되지 않은 기록은 랭킹과 포인트에 들어가지 않습니다.
* 랑구 등반은 ‘그만하고 기록 저장’을 눌러야 그 판이 기록됩니다. 그냥 창을 닫으면 그 판은 사라집니다.

## 친구와 하는 게임

로비의 ‘친구와 함께’에서 방을 만들면 여섯 자리 방 코드가 나옵니다. 코드나 초대 링크를 보내면 친구가 들어옵니다. 방장이 시작을 누르고, 끝난 뒤 ‘한 판 더’로 이어서 할 수 있습니다.

|| <rowbgcolor:#2F5D8C rowcolor:#ffffff>게임 || 인원 || 포인트 ||
|| 오목 || 2명 || 승 +${R.omok.win}P, 패 +${R.omok.lose}P. 같은 상대와는 하루 ${R.omok.rewardedGamesPerOpponentPerDay}판까지 ||
|| 윷놀이 || 2~4명 (4명은 2팀 가능) || 참가 +${R.yut.participate}P, 승리 +${R.yut.win}P ||
|| 라이어 게임 || 3~8명 || 참가 +${R.liar.participate}P, 라이어로 승리 +${R.liar.winAsLiar}P, 시민으로 승리 +${R.liar.winAsCitizen}P ||
|| 캐치마인드 || 3~8명 || 참가 +${R.catchmind.participate}P, 정답 +${R.catchmind.correct}P (가장 먼저 맞히면 +${R.catchmind.earlyBonus}P 더), 내 그림을 맞힌 사람 1명당 +${R.catchmind.drawingGuessedPerPlayer}P ||
|| 퀴즈 배틀 || 3~8명 || 참가 +${R.quiz.participate}P, 정답 +${R.quiz.correct}P, 1·2·3위 +${R.quiz.rank.join('/')}P, 주인공 예측 적중 +${R.quiz.predictionHit}P ||

* '''오목''': 15×15, 흑이 먼저. 정확히 다섯 알을 이어야 이깁니다(여섯 알은 승리가 아닙니다). 한 수에 30초이고 넘기면 집니다.
* '''윷놀이''': 윷은 서버가 던집니다. 윷·모가 나오거나 상대 말을 잡으면 한 번 더 던집니다. 자기 말이 있는 자리에 서면 업습니다.
* '''라이어 게임''': 한 명만 제시어를 모릅니다. 돌아가며 한 줄씩 설명한 뒤 투표하고, 지목된 라이어는 제시어를 맞힐 기회가 한 번 있습니다.
* '''캐치마인드''': 한 사람이 그리고 나머지가 맞힙니다. 정답은 띄어쓰기와 대소문자를 가리지 않습니다.
* '''퀴즈 배틀''': 친구가 미리 적어 둔 답을 맞히는 퀴즈입니다. 각자 ‘내 답 채우기’에서 ${QUIZ_MIN_ANSWERS}개 이상 답해 둬야 시작할 수 있고, 적은 답은 같은 방 사람들에게 문제로 공개됩니다. 꼴찌는 벌칙 룰렛을 돌리며, 상점의 벌칙 면제권으로 건너뛸 수 있습니다.
* 연결이 끊겨도 자리는 2분간 유지됩니다. 그 안에 다시 들어오면 하던 판으로 돌아옵니다.
* 도중에 나간 사람과, 사람이 모자라 승부 없이 끝난 판에는 포인트가 없습니다.

## 랭킹

* 테트리스와 랑구 등반은 주간·역대 랭킹이 있습니다. 사람마다 가장 좋은 판 하나로 순위를 매깁니다.
* 주간 랭킹은 월요일 0시(한국 시간)에 새로 시작하고, 지난주 1·2·3위에게 +${C.weeklyRank.join('/')}P 를 줍니다.
* 랑구 등반에서 그 주에 가장 크게 떨어진 사람은 위로금 +${C.weeklyBiggestFall}P 를 받습니다.

## 상점

* 포인트로 인형뽑기 무료권, 스킨, 칭호, 퀴즈 벌칙 면제권 등을 교환합니다.
* 교환한 아이템은 바로 ‘내 정보’의 보유품에 들어옵니다. 교환은 되돌릴 수 없습니다.
* 기프티콘·상품권·현금 같은 현금성 상품은 없습니다.

## 자주 묻는 것

* '''포인트가 안 들어왔어요.''' 하루 ${DAILY_GAME_CAP}P 상한에 닿았는지 로비의 ‘오늘 게임 보상’을 확인하세요. 상한에 닿으면 내역에 0P 로 남습니다.
* '''기록이 인정되지 않았어요.''' 서버가 다시 실행한 결과와 달랐다는 뜻입니다. 브라우저 탭을 여러 개 띄우거나 확장 프로그램이 입력을 바꾸면 생길 수 있습니다.
* '''방에 못 들어가요.''' 진행 중인 판에는 들어갈 수 없습니다. 그 판이 끝난 뒤 다시 들어가 보세요.
* 그 밖의 문제는 관리자에게 알려 주세요. 위키 사용법은 [[이랑위키:도움말]]에 있습니다.

[[분류:이랑위키]]
`
