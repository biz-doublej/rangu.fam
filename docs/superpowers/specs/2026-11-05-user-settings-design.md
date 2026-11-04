# 유저 설정 화면 리디자인 설계

작성일: 2026-11-05

## 의도

`/settings/account`는 지금 구글 계정센터로 보내는 링크 모음이다. 이 화면을 없애고, 회원이 사이트 안에서 자기 계정을 직접 관리하는 설정 화면으로 바꾼다.

## 목표

- 프로필 사진을 올리고, 영역을 맞추고, 삭제할 수 있다.
- 표시 이름을 바꿀 수 있다. 내부 `username`은 바뀌지 않는다.
- 구글, 네이버, Discord 계정을 연결하고 해제할 수 있다. 로그인 수단은 구글과 네이버이고, Discord는 연결 정보로만 쓴다.
- 연결된 네이버 계정으로 로그인할 수 있다.
- 최근 로그인 내역을 볼 수 있다.

## 하지 않는 것

- `username`, 프로필 주소, 이메일 변경
- 회원 탈퇴
- 사이트 자체 2단계 인증
- 다른 기기 세션 강제 종료. 인증이 JWT 쿠키 방식이라 세션 저장소가 없다.
- 실패한 로그인 시도 기록
- 네이버만으로 신규 가입

## 절대 일어나면 안 되는 일

- 마지막 로그인 수단을 해제해서 계정에 못 들어가는 상황
- 네이버 이메일이 같다는 이유로 다른 사람 계정에 연결되는 상황
- 표시 이름으로 다른 회원이나 운영자를 사칭하는 상황
- 새 유료 저장소 추가

## 접근 방식

| 방식 | 내용 | 결과 |
|---|---|---|
| 기존 구조 확장 | `wiki_users`에 칸 추가, 사진은 기존 `images` 표, 로그인 내역 표 1개 추가 | **선택** |
| 별도 저장소 | Cloud Storage 버킷과 연동 전용 표 신설 | 회원 14명 규모에 과하고 비용과 권한 작업이 늘어 제외 |

사용자가 기존 구조 확장을 골랐다. 표시 이름 변경 방식도 사용자가 골랐다.

## 데이터

`wiki_users`에 추가한다.

- `naver_id text unique`
- `naver_email text`: 설정 화면 표시용. 계정 매칭에는 쓰지 않는다.
- `display_name_changed_at timestamptz`
- `google_unlinked_at timestamptz`: 구글을 일부러 해제했는지 표시한다. 다시 연결하면 비운다.

새 표 `wiki_login_events`를 만든다.

- `id uuid pk`
- `user_id uuid not null`, `wiki_users.id` 참조, 계정 삭제 시 함께 삭제
- `provider text not null`: `google`, `naver`
- `ip text`
- `user_agent text`
- `created_at timestamptz not null default now()`
- 인덱스: `(user_id, created_at desc)`

기록은 사용자별 최근 50건만 남긴다. 새 기록을 넣을 때 오래된 기록을 지운다.

운영 DDL은 기존 방식대로 `/api/admin/maintenance/user-settings?confirm=1`로 실행한다. 관리자 전용이고, `confirm` 없이는 현재 상태만 보여준다. 표나 칸이 없어도 기존 로그인은 실패하면 안 된다. 로그인 기록 저장 실패는 로그만 남기고 넘어간다.

## 로그인과 계정 연결

### 구글 로그인 변경

`findOrCreateWikiUserFromOidcProfile`을 아래처럼 바꾼다.

1. `ssoSubject`로 먼저 찾는다.
2. 없으면 검증된 이메일로 찾되, 회원의 `ssoSubject`가 `google:`로 시작하지 않고 `google_unlinked_at`이 비어 있을 때만 연결한다. 예전 DoubleJ 회원의 첫 구글 로그인을 위해 이 경로는 유지한다.
3. 회원이 다른 구글 계정에 연결돼 있으면 덮어쓰지 않고 `google_account_mismatch` 오류를 낸다.
4. 구글을 일부러 해제한 회원이면 자동 재연결하지 않고 `google_not_linked` 오류를 낸다.
5. 기존 회원 로그인 때 `displayName`, `avatar`, `email`을 덮어쓰지 않는다. 시각과 예전 회원의 `ssoSubject`만 갱신한다.
6. 신규 가입은 구글 이름이 표시 이름 규칙을 통과할 때만 그대로 쓰고, 아니면 `username`을 쓴다.

### 네이버 로그인

`/auth/naver/start`는 이미 있다. `/auth/naver/callback`을 새로 만든다.

1. state 쿠키를 검증한다.
2. 코드를 네이버 토큰으로 바꾸고 프로필을 조회한다.
3. `naver_id`가 일치하는 회원을 찾는다.
4. 찾으면 기존 구글 콜백과 같은 비활성, 차단 검사를 거쳐 로그인 쿠키를 설정한다.
5. 찾지 못하면 이메일로 찾지 않고 `naver_not_linked` 오류로 로그인 화면에 보낸다.

돌아올 주소는 요청의 공개 origin으로 만든다. `resolvePublicOrigin`을 쓴다. 운영에 호스트가 여러 개라서 `NAVER_REDIRECT_URI`는 로컬 고정이 필요할 때만 쓴다.

### 연결

Discord 연결의 서명된 state 방식을 따른다.

- 네이버: `GET /auth/naver/link/start` 후 같은 `/auth/naver/callback`에서 state의 `type: 'link'`로 분기한다.
- 구글: `GET /auth/link/google/start` 후 기존 `/auth/callback`에서 서명된 state의 `linkUserId`로 분기한다. 구글 콘솔에 새 주소를 등록하지 않기 위해서다.
- Discord: 기존 연결 경로를 그대로 쓴다.

연결은 로그인한 사용자만 시작할 수 있다. 로그인 쿠키가 `sameSite: strict`라 외부 로그인에서 돌아올 때 전송되지 않으므로 세션으로 확인하지 않는다. 시작할 때 사용자 ID가 들어간 10분짜리 서명 쿠키 `account-link`를 `sameSite: lax`로 설정하고, 콜백에서 이 쿠키와 서명된 state의 사용자가 같은지 확인한 뒤 지운다. 로그인 쿠키의 `strict` 설정은 바꾸지 않는다. 다른 회원에게 이미 연결된 외부 계정이면 `provider_already_linked` 오류로 설정 화면에 돌아온다.

구글 연결 시 `ssoSubject`는 `google:` 접두어로 저장한다. 구글 이메일로 회원 이메일을 바꾸지 않는다.

### 해제

`POST /api/account/identities/[provider]/unlink`로 구글, 네이버를 해제한다.

구글과 네이버 중 연결된 로그인 수단이 하나뿐이면 400 오류로 거절한다. 구글은 `ssoSubject`가 `google:`로 시작할 때만 연결로 센다. Discord는 로그인 화면에 입구가 없으므로 로그인 수단으로 세지 않는다. 구글 해제는 `ssoSubject`를 비우고 `google_unlinked_at`을 기록한다.

Discord는 기존 해제 경로를 쓰되, 해제하면 멤버나 관리자 자격이 사라지는 회원은 거절한다. `isWhitelistedWikiAdmin`과 `resolveMemberIdForUser`로 해제 전후 결과를 비교한다.

## 표시 이름

`PATCH /api/account/profile`에 `{ displayName }`을 보낸다.

- 앞뒤 공백 제거 후 2~20자
- 한글, 영문, 숫자, 공백, `_`, `-`만 허용
- 다른 회원의 `displayName` 또는 `username`과 대소문자 무시로 같으면 거절
- `운영자`, `관리자`, `admin`, `moderator`, `이랑위키`, `랑구팸` 포함 시 거절. 관리자 권한 회원은 예외
- 7일에 한 번만 변경 가능. 관리자는 예외
- 성공하면 `display_name_changed_at`을 갱신한다.

과거 기록의 `author` 값은 수정하지 않는다. 아래 응답은 `authorId`로 회원을 찾아 `authorDisplayName`을 추가하고, 화면은 그 값을 먼저 쓴다.

- `/api/wiki/recent`
- `/api/wiki/pages/revisions`
- 문서 응답의 최근 편집자와 대시보드의 `lastEditor`
- 토론 글 작성자

`authorId`가 없는 옛 기록은 저장된 `author`를 그대로 보여준다. 내부 필터 링크는 계속 `author` 값을 쓴다.

## 프로필 사진

`POST /api/account/avatar`는 `multipart/form-data`로 이미지를 받는다.

- JPEG, PNG, WebP, 5MB 이하
- 서버는 `sharp`로 회전 정보를 적용하고 256×256 WebP 품질 80으로 변환하며 메타데이터를 지운다.
- `images` 표에 `category='profile'`로 저장한다. 파일명은 `avatar-<userId>-<timestamp>.webp`다.
- `wiki_users.avatar`를 `/api/images/serve/<filename>`로 바꾸고 이전 사이트 업로드 사진을 지운다. 외부 URL은 지우지 않는다.

`DELETE /api/account/avatar`는 사이트 업로드 사진을 지우고 `avatar`를 비운다. 사진이 없으면 표시 이름 첫 글자를 보여준다.

브라우저에서 원형 미리보기로 드래그와 확대를 지원하고, 맞춘 영역을 canvas로 잘라 보낸다. 새 패키지는 넣지 않는다.

## 로그인 내역

구글, 네이버 로그인 성공 시 `recordLoginEvent`를 호출한다. 계정 연결 콜백은 로그인으로 기록하지 않는다. 데스크톱 핸드오프 코드 교환은 범위에서 뺀다.

`GET /api/account/logins`는 내 최근 10건을 돌려준다. 다른 사용자의 내역을 조회하는 파라미터는 없다.

화면에는 시각, 로그인 수단, 브라우저와 OS 요약, 앞 두 자리만 남긴 IP를 보여준다. 예: `49.164.*.*`. IPv6는 앞 2개 구간만 보여준다. 전체 IP와 User-Agent는 응답에 넣지 않는다.

IP는 `cf-connecting-ip`, 없으면 `x-forwarded-for`의 마지막 값을 쓴다. 표시용 정보이며 보안 판단에 쓰지 않는다.

## 화면

`/settings/account` 하나로 유지한다. `rangu-fam.com`과 `irang.wiki` 양쪽에서 열리게 미들웨어의 메인 도메인 전용 목록에서 위키 호스트만 예외로 둔다. 로그인 쿠키가 호스트별이라 위키 회원이 재로그인하지 않게 하기 위해서다. 멤버 서브도메인은 지금처럼 메인으로 보낸다. 비로그인 판단은 브라우저에서 하고 메인은 `/login`, 위키는 `/wiki/login`으로 보낸다. 구글 계정센터 링크와 연동 안내 카드는 전부 지운다.

```text
내 계정
├ 프로필     사진, 표시 이름, 이메일(읽기 전용), 아이디(읽기 전용)
├ 연결 계정   구글 · 네이버 · Discord, 각 항목의 연결/해제
└ 보안       최근 로그인 내역, 로그아웃
```

PC는 왼쪽 메뉴와 오른쪽 내용, 모바일은 위쪽 탭으로 보여준다. 프로필, 연결 계정, 보안은 같은 주소의 `?tab=` 값으로 구분한다.

디자인은 기존 랑구팸의 종이 톤을 쓰되 테이프와 손글씨 장식은 줄인다. 설정은 자주 보는 도구 화면이라 읽기 쉬움을 우선한다.

연결 결과와 오류는 주소의 쿼리를 읽어 토스트로 보여주고, 읽은 뒤 쿼리를 지운다.

## 운영 반영

`wikiUsers` 스키마에 칸을 먼저 추가하면 DDL 전 인증 조회가 깨지므로 두 번에 나눈다.

1. Secret Manager에 구글, 네이버 값을 추가하고 배포 스크립트에 연결한다.
2. 1차 배포: 유지보수 경로만 포함하고 스키마 변경은 넣지 않는다.
3. `/api/admin/maintenance/user-settings?confirm=1`을 1회 실행한다.
4. 네이버 개발자 센터에 `rangu-fam.com`, `irang.wiki` 콜백 주소를 등록한다.
5. 2차 배포: 스키마 변경과 설정 화면을 포함한다.

## 구현자에게 맡기는 것

- 컴포넌트 파일 분리
- 브라우저와 OS 요약 방식
- 토스트 문구
- 기존 유틸리티와 맞는 유효성 검사 구현

## 검증

- 표시 이름 규칙, 해제 보호, 구글 로그인 매칭, IP 가림, 네이버 분기는 단위 테스트로 확인한다.
- 로컬에서 구글 로그인, 사진 업로드, 표시 이름 변경, 최근 변경 화면 반영, 로그인 내역을 화면으로 확인한다.
- 네이버 실제 로그인은 네이버 콘솔에 로컬 콜백이 등록된 경우에만 확인한다.
