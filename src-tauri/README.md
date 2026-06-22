# 랑구 택틱스 — 데스크톱 클라이언트 (Tauri v2)

`TacticsClient.exe` — 랑구 택틱스를 감싸는 가볍고 빠른 네이티브 데스크톱 셸.

## 아키텍처 (thin native client)

이 셸은 **게임 프론트엔드를 정적으로 번들하지 않는다.** 메인 앱(`next.config.js` → `output: 'standalone'`)은
SSR이라 정적 export가 불가능하기 때문이다. 대신 네이티브 WebView2 창이 **실행 중인 게임 서버를 로드**한다.

| 모드 | 로드 대상 | 설정 위치 |
|------|-----------|-----------|
| `tauri dev` | `http://localhost:3000` 직접 | `tauri.conf.json` → `build.devUrl` |
| `tauri build`(.exe) | `frontend/index.html` → `GAME_URL`로 리다이렉트 | `src-tauri/frontend/index.html` |

즉 게임 자체(Next + C# WS 서버)는 **별도로 떠 있어야** 한다(셸은 클라이언트일 뿐).
완전 자립형 패키지가 필요하면 택틱스 UI(`/play`·`/deck`)를 별도 정적 SPA로 추출해야 하며, 이는 후속 과제.

## 선결조건

`npx tauri info`로 점검한 결과(2026-06), **이 PC엔 Rust만 빠져 있다:**

| 항목 | 상태 |
|------|------|
| MSVC 빌드툴 | ✔ Visual Studio Community 2026 (설치됨) |
| WebView2 | ✔ 149.x (설치됨) |
| `@tauri-apps/cli` v2 | ✔ 2.11.3 (설치됨) |
| **Rust (`rustc`/`cargo`)** | ✘ **미설치 → 설치 필요** |

→ <https://rustup.rs> 에서 `rustup` 설치 한 번이면 끝. 설치 후 **새 터미널**에서
`cargo --version`이 버전을 출력하면 준비 완료(첫 빌드만 의존성 컴파일로 수 분).

## 개발 실행

```powershell
# 터미널 1 — Next 게임 프론트(:3000)
npm run dev
# 터미널 2 — C# 게임 서버(:5080)
dotnet run --project game/rangu-tactics-server
# 터미널 3 — 네이티브 창 (localhost:3000 을 로드)
npm run tauri:dev
```

첫 `tauri:dev`는 Rust 의존성 컴파일로 수 분 걸린다(이후 캐시되어 빠름).

## 프로덕션 빌드 (.exe)

```powershell
npm run tauri:build
```

산출물:
- 실행파일 — `src-tauri/target/release/RanguTactics.exe`
- 인스톨러 — `src-tauri/target/release/bundle/` (msi / nsis)

배포 사이트로 패키징하려면 빌드 전 **`src-tauri/frontend/index.html`의 `GAME_URL`**을 운영 도메인
(예: `https://rangu.fam`)으로 변경. 기본값은 로컬 데모용 `http://localhost:3000`.

## 알아둘 점

- **인증/티켓** — 로그인은 창 안 웹 UI(rangu.fam)에서 진행(쿠키는 WebView에 유지). `/play`는 현재
  `?ticket=`을 요구하므로, 기존 티켓 발급 흐름을 그대로 사용.
- **Rust↔JS 커맨드 없음** — 지금은 순수 WebView 셸(`tauri::Builder::default()` + 로그 플러그인).
  네이티브 기능(트레이/딥링크/자동업데이트)은 `src/lib.rs`에 점진 추가 가능.
- `identifier` = `fam.rangu.tactics`, 창 라벨 = `main`(capabilities/default.json과 일치).
