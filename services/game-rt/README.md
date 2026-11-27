# rangu-game-rt

이랑게임센터 실시간 서버. 파티·보드 게임의 방을 관리한다 (오목, 라이어 게임, 퀴즈 배틀, 캐치마인드, 윷놀이).

- Node 20 + TypeScript + Socket.IO. 방 상태는 메모리에만 있다 (Cloud Run 최대 인스턴스 1).
- **DB 에 붙지 않는다.** 판이 끝나면 결과를 `rangu-fam` 의 `/api/gamecenter/internal/match-result` 로
  보내고 (`X-GC-Signature` = HMAC-SHA256(본문, `GC_INTERNAL_SECRET`)), 포인트는 본 서버만 움직인다.
- 퀴즈처럼 시작 전에 자료가 필요한 게임은 `/api/gamecenter/internal/game-data` 에서 받아 온다 (같은 서명).
  정답은 이 서버의 메모리에만 있고, 공개 단계 전에는 브라우저로 보내지 않는다.
- 게임 규칙은 저장소 루트의 `src/games/*` 를 그대로 쓴다 (화면과 같은 코드).

## 환경 변수

| 이름 | 설명 |
| --- | --- |
| `RT_JWT_SECRET` | 접속 토큰 검증. `rangu-fam` 의 같은 이름과 같은 값 |
| `GC_INTERNAL_SECRET` | 결과 서명. `rangu-fam` 의 같은 이름과 같은 값 |
| `RANGU_FAM_URL` | 결과를 보낼 본 서버 주소 (예: `https://irang.wiki`) |
| `ALLOWED_ORIGINS` | 접속을 허용할 웹 주소, 쉼표로 구분 (기본: irang.wiki) |
| `PORT` | 기본 8080 |

## 로컬에서 돌리기

```bash
cd services/game-rt
npm install
RT_JWT_SECRET=dev-rt GC_INTERNAL_SECRET=dev-internal RANGU_FAM_URL=http://localhost:3000 \
  ALLOWED_ORIGINS=http://localhost:3000 PORT=3112 npm run dev
```

본 서버(`next dev`)에는 `RT_JWT_SECRET`, `GC_INTERNAL_SECRET` 를 같은 값으로, `GAME_RT_URL=http://localhost:3112` 를 준다.

## 테스트·빌드·배포

```bash
npm test        # 실제 소켓으로 오목 한 판 + 결과 보고 + 재접속 + 중복 탭
npm run build   # dist/server.js
```

배포는 저장소 루트에서 `pwsh ./deploy/05-game-rt.ps1 -Project <PROJECT_ID>`.

## 프로토콜

접속: `io(url, { auth: { token } })` — 토큰은 `POST /api/gamecenter/rt-token` 에서 받는다 (5분).

| 클라이언트 → 서버 | 내용 |
| --- | --- |
| `room:create { game }` | 방 만들기 → `{ ok, code }` |
| `room:join { code }` | 코드로 입장 (끊겼다 돌아올 때도 같다) |
| `room:start { options? }` | 방장이 판 시작 (끝난 뒤 다시 누르면 한 판 더). 윷놀이 4명: `{ options: { team: true } }` 로 팀전 |
| `room:stream <자료>` | 그림 획처럼 자주 오가는 자료. 캐치마인드: `{ t: 'stroke', id, c, w, p: [x0, y0, …] }`, `{ t: 'clear' }` |
| `room:action <동작>` | 게임별 동작. 오목: `place`·`resign` / 라이어: `describe`·`vote`·`guess` / 퀴즈: `answer`·`predict`·`usePass`·`acceptPenalty` / 캐치마인드: `guess` / 윷놀이: `throw`·`move` |
| `room:chat { text }` | 한 줄 채팅 (100자) |
| `room:leave` | 나가기 (진행 중이면 기권) |

| 서버 → 클라이언트 | 내용 |
| --- | --- |
| `room:state <스냅샷 \| null>` | 방 상태가 바뀔 때마다 전체 상태 |
| `room:stream <자료>` | 다른 참가자가 보낸 흐름 자료. 입장·재접속 직후에는 지금까지의 전체(`{ t: 'full', … }`) |
| `session:replaced` | 같은 계정이 다른 탭에서 접속해 이 연결이 끊긴다 |

끊기면 자리는 2분간 유지된다. 그 안에 다시 접속하면 방 코드를 보내지 않아도 같은 판으로 돌아온다.
