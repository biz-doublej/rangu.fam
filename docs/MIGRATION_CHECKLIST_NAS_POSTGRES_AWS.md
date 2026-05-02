# Rangu.fam + 이랑위키 마이그레이션 체크리스트

대상:

- 데이터베이스: `기존 DB -> NAS PostgreSQL (Synology DS225+, HDD 4TB)`
- 호스팅: `Netlify -> AWS` (현재 AWS 미구축)

작성일:

- 2026-02-18
- 업데이트: 2026-03-01

---

## 현재 결정(2026-02-19)

- [x] AWS 인프라 세팅은 별도 트랙으로 진행(본 문서에서는 DB/앱 전환 중심)
- [x] 로그인/회원가입은 DoubleJ SSO 연동 전까지 보류
- [x] 1차 전환 방식: `PostgreSQL + FerretDB(호환 브리지)`로 즉시 전환
- [ ] 2차 전환 방식: Mongoose 제거 후 네이티브 SQL(Prisma/Drizzle)로 완전 전환
- [x] 중요 키/시크릿(JWT, Discord, PostgreSQL, AWS)은 코드 하드코딩 금지, `.env`에서만 관리

---

## 현재 결정(2026-03-01, 저사양 NAS 반영)

기준 장비:
- Synology DS225+, HDD 4TB, RAM 2GB

운영 원칙:
- [x] 1차 운영 목표는 고가용성보다 `비용 절감 + 단순 운영`
- [x] AWS 런타임은 `Lightsail 1대`로 시작(초기 ECS/Fargate 보류)
- [x] NAS는 `PostgreSQL + 백업` 중심으로 사용(실시간 미디어 서빙 역할 축소)
- [x] NAS 메모리 보호를 위해 FerretDB는 AWS 앱 호스트(동일 VM)에서 실행 권장
- [x] 파일/이미지는 `S3 + CloudFront`로 단일화(기존 `/uploads/wiki/*`는 점진 이관)
- [x] 네트워크는 `NAT Gateway 기본 미사용`을 원칙으로 설계
- [x] AWS <-> NAS 연결은 WireGuard/Tailscale 터널 전제로 구성(5432 공인 노출 금지)

---

## 0) 범위/성공 기준

- [ ] 전환 범위 확정: `Rangu.fam 전체 + 이랑위키 전체 API`
- [ ] 다운타임 목표 정의: 예) `30분 이내`
- [ ] 데이터 손실 허용치 정의(RPO): 예) `0~5분`
- [ ] 장애 복구 목표(RTO) 정의: 예) `60분 이내`
- [ ] 롤백 기준 문서화: 어떤 조건에서 즉시 기존 DB/Netlify로 복귀할지

성공 기준(Go-Live 통과 조건):

- [ ] 핵심 기능(위키/카드/이미지/프로필/북마크) E2E 통과
- [ ] 인증(로그인/회원가입)은 SSO 연동 전까지 검증 범위에서 제외
- [ ] 데이터 정합성 샘플 검증 100% 통과
- [ ] 배포 후 24시간 치명 오류 0건
- [ ] 백업/복구 리허설 1회 이상 성공

---

## 1) 현재 상태 스냅샷(프로젝트 기준)

- [ ] DB 결합 API 라우트 약 50개 확인
- [ ] PostgreSQL 브리지/Mongoose 결합 파일 약 56개 확인
- [ ] 모델 15개+ (위키 단일 모델 파일 대형)
- [ ] 핵심 기존 ODM 의존 패턴 확인:
- [ ] `ObjectId` 다수 사용
- [ ] `populate`, `aggregate`, `findOneAndUpdate(upsert)` 사용
- [ ] 이미지 저장 경로가 이원화됨(`Image(base64)` + `MediaAsset/GridFS`)

핵심 영향 파일(우선순위 높음):

- [ ] `src/lib/database.ts`
- [ ] `src/models/*.ts` (특히 `src/models/Wiki.ts`)
- [ ] `src/services/cardService.ts`
- [ ] `src/app/api/wiki/**`
- [ ] `src/app/api/cards/**`
- [ ] `src/app/api/images/**`
- [ ] `src/lib/gridfs.ts`, `src/lib/serveMediaByPath.ts`

---

## 2) 사전 의사결정(먼저 확정)

### 2-1. DB/ORM 전략

- [x] 1차(즉시 운영) 전략: `Mongoose 유지 + FerretDB + PostgreSQL`
- [ ] 2차(완전 전환) 전략: `Prisma` 또는 `Drizzle` 또는 `Kysely + sql`
- [ ] ORM 선택: `Prisma` 또는 `Drizzle` 또는 `Kysely + sql`
- [ ] ID 전략: `UUID`(권장) vs `BIGINT`
- [ ] 배열/중첩 구조 저장 정책: 정규화 테이블 vs `JSONB`
- [ ] 트랜잭션 정책 정의(카드 드랍/조합, 위키 리비전 작성)
- [ ] 소프트 삭제 정책(`isDeleted`) 유지 여부

### 2-2. 이미지/파일 전략

- [ ] 업로드 저장소 단일화 결정:
- [ ] 옵션 A: PostgreSQL `bytea`(비권장, DB 비대화)
- [ ] 옵션 B: NAS 파일시스템 + 메타데이터만 PostgreSQL
- [x] 옵션 C: AWS S3 + 메타데이터 PostgreSQL(권장)
- [x] 위키 본문 이미지 URL 규칙 1개로 통일(`https://<cdn-domain>/wiki/...`)

### 2-3. AWS 런타임 전략

- [x] Compute 선택(1차): `Lightsail`(권장) / `EC2 + PM2` / `ECS Fargate(2차)`
- [ ] Container 사용 여부 확정(Dockerfile 기준 배포 여부)
- [x] CDN/정적 전략: `CloudFront` + Next.js 캐시 정책 확정
- [ ] 시크릿 저장: `AWS Secrets Manager` 또는 `SSM Parameter Store`
- [x] 비용 규칙: 초기에는 NAT Gateway, 다중 AZ, 이중화부터 시작하지 않음

---

## 3) 기존 DB -> NAS PostgreSQL 체크리스트

### 3-1. NAS(PostgreSQL) 인프라 준비

- [ ] DS225+ DSM 최신 업데이트 적용
- [ ] PostgreSQL 설치 방식 확정:
- [ ] Synology 패키지
- [ ] Docker(`postgres` 공식 이미지) 권장
- [x] Docker 브리지 컴포즈 작성: `infra/postgres-bridge/docker-compose.yml`
- [x] 환경변수 템플릿 작성: `infra/postgres-bridge/.env.example`
- [x] 저사양 NAS 원칙: NAS는 PostgreSQL 우선, FerretDB/미디어 처리/앱 런타임은 AWS로 분리
- [ ] PostgreSQL 버전 고정(예: 16.x)
- [ ] 볼륨/스토리지 경로 고정(`/volumeX/...`)
- [ ] DB 전용 계정/비밀번호 생성
- [ ] DB 인코딩/로케일 설정(`UTF8`)
- [ ] Timezone 설정(`Asia/Seoul` 또는 서비스 표준 UTC)
- [ ] PostgreSQL 메모리 시작값 설정(`shared_buffers=128MB`, `work_mem=4MB`, `max_connections=30`)
- [ ] 자동 재시작 정책 설정
- [ ] 방화벽/포트 정책 설정(기본 외부 공개 금지)
- [ ] NAS 스냅샷/백업 스케줄 생성(일 백업 + 보존 정책)
- [ ] WAL 아카이브 또는 PITR 필요 여부 결정

### 3-2. 네트워크/보안(특히 AWS와 NAS 간 연결)

- [ ] NAS 고정 공인IP 또는 DDNS 준비
- [ ] AWS -> NAS 연결을 공인 DB 포트 직노출로 하지 않기
- [ ] 전용 터널 구성:
- [ ] WireGuard / Tailscale / Site-to-Site VPN 중 1개 선택
- [ ] DB 접속 IP allowlist 최소화
- [ ] TLS 접속(require SSL) 설정
- [ ] 실패/차단 로그 모니터링 활성화

### 3-3. 스키마 설계/마이그레이션

- [ ] 기존 모델별 PostgreSQL 테이블 매핑서 작성
- [ ] 인덱스 매핑서 작성(복합 인덱스 포함)
- [ ] Unique 제약 재정의
- [ ] Foreign Key 정책 정의(ON DELETE/UPDATE)
- [ ] enum 매핑 정의(카드 타입/희귀도/권한 등)
- [ ] 위키 대형 중첩 구조 분해:
- [ ] `WikiPage`, `WikiRevision`, `WikiDiscussion`, `WikiDiscussionReply` 등 분리
- [ ] `watchers`, `participants`, `likedBy` 조인 테이블화
- [ ] 카드 도메인 정합성 제약:
- [ ] `user_cards(user_id, card_id)` unique
- [ ] 카드 통계 계산/갱신 전략(실시간 vs 배치) 확정

### 3-4. 애플리케이션 코드 전환

- [x] `src/lib/database.ts` 브리지 환경 변수(`POSTGRES_BRIDGE_URI`) 대응
- [x] `AUTH_MODE=sso` 시 로컬 로그인/회원가입 API 비활성화
- [ ] `src/lib/database.ts` 완전 대체 DB 클라이언트(네이티브 SQL) 구현
- [ ] Mongoose 모델 제거 또는 단계적 우회 레이어 추가
- [ ] `ObjectId` 기반 로직 제거/변환
- [ ] `aggregate` 파이프라인 SQL로 치환
- [ ] `populate` 패턴 JOIN으로 치환
- [ ] `findOneAndUpdate + upsert`를 `INSERT ... ON CONFLICT ...`로 치환
- [ ] 트랜잭션 적용 지점 구현:
- [ ] 카드 드랍/조합/수량 차감
- [ ] 위키 수정 + 리비전 생성 + 감사로그
- [ ] 이미지 업로드 API 저장소 단일화 반영
- [ ] 시드/유틸 스크립트 재작성(`scripts/*.ts`)

### 3-5. 데이터 이관 리허설(최소 2회)

- [ ] 이관 스크립트 작성(Extract -> Transform -> Load)
- [ ] Dry-run(샘플 1~5%) 수행
- [ ] 전체 이관 1차 수행
- [ ] 정합성 체크:
- [ ] 레코드 수 비교
- [ ] 랜덤 샘플 내용 비교
- [ ] 참조 무결성(FK) 검증
- [ ] 성능 검증(핵심 API p95 응답시간)
- [ ] 전체 이관 2차 리허설(문제 수정 후 재실행)

### 3-6. 운영 전환(Cutover)

- [ ] 읽기/쓰기 동결 시간 공지
- [ ] 최종 증분 이관 수행
- [ ] 앱 환경변수 PostgreSQL로 교체
- [ ] 앱 배포 및 헬스체크
- [ ] 주요 시나리오 실시간 스모크 테스트
- [ ] 모니터링/알람 확인
- [ ] 전환 완료 공지

### 3-7. 롤백 계획

- [ ] 롤백 트리거 정의(오류율, 로그인 실패율 등)
- [ ] 기존 연결값 즉시 복귀 절차 문서화
- [ ] DNS/배포 롤백 절차 문서화
- [ ] 롤백 리허설 1회 수행

---

## 4) Netlify -> AWS 체크리스트

### 4-1. AWS 계정/기초 세팅

- [ ] AWS 계정 생성 및 루트 보안 강화(MFA)
- [ ] IAM 관리자/개발자 분리(권장 그룹명: `rangu-fam-admins`, `rangu-fam-developers`)
- [ ] Billing Alarm 설정(월 비용 임계치, 권장 알람명: `rangu-fam-prod-billing-50k`, `rangu-fam-prod-billing-100k`, `rangu-fam-prod-billing-200k`)
- [ ] CloudTrail 활성화(권장 Trail 이름: `rangu-fam-prod-trail`)
- [ ] 리전 확정(예: `ap-northeast-2`)
- [ ] Route53 Hosted Zone 준비(도메인 이전 시, 권장 Zone: `rangu.fam`)

### 4-2. 배포 아키텍처 준비

- [ ] VPC/Subnet/Security Group 설계(권장 VPC 이름: `rangu-fam-prod-vpc`)
- [ ] NAT Gateway 기본 미사용(정말 필요할 때만 도입)
- [ ] 애플리케이션 런타임 선택(Lightsail/EC2/ECS)
- [ ] 컨테이너 레지스트리(ECR) 생성
- [ ] Next.js 빌드/실행 전략 확정:
- [ ] SSR/ISR 동작 방식 확인
- [ ] `next build` + `next start` 배포 파이프라인 정의
- [ ] 환경변수/시크릿 주입 구조 구현

저비용 기본안(권장):
- [ ] Lightsail(Next.js + FerretDB) 1대
- [ ] NAS PostgreSQL은 터널(WireGuard/Tailscale)로만 접근
- [ ] S3(파일 저장) + CloudFront(캐시/전송) 구성
- [ ] 장애 복구용으로만 ECS/Fargate 설계 문서 유지

### 4-3. 네트워크 및 도메인

- [ ] ALB 또는 엔드포인트 구성(권장 ALB 이름: `rangu-fam-prod-alb`)
- [ ] HTTPS 인증서(ACM) 발급(권장 태그 Name: `rangu-fam-prod-acm-cert`)
- [ ] CloudFront 연결(필요 시)
- [ ] DNS 레코드(Blue/Green 대비) 준비(권장 레코드명: `@`, `www`)
- [ ] Health check endpoint 준비

### 4-4. 운영/보안

- [ ] CloudWatch 로그 수집(권장 로그 그룹: `/ecs/rangu-fam-prod`)
- [ ] 4xx/5xx 경보 설정(권장 알람명: `rangu-fam-prod-alb-4xx`, `rangu-fam-prod-alb-5xx`)
- [ ] CPU/Memory/Latency 알람 설정(권장 알람명: `rangu-fam-prod-ecs-cpu-high`, `rangu-fam-prod-ecs-mem-high`, `rangu-fam-prod-alb-latency-high`)
- [ ] WAF 적용 여부 결정(적용 시 권장 Web ACL 이름: `rangu-fam-prod-web-acl`)
- [ ] 배포 롤백 자동화(이전 태스크/AMI 복귀)

### 4-5. CI/CD

- [ ] GitHub Actions(또는 기존 CI)에서 AWS 배포 파이프라인 구축
- [ ] 브랜치별 배포 전략 정의(`main`, `staging`)
- [ ] 배포 후 스모크 테스트 자동화
- [ ] 실패 시 자동 중단/알림

### 4-6. 컷오버

- [ ] 스테이징에서 전 기능 검증 완료
- [ ] 프로덕션 배포(Blue/Green 권장)
- [ ] DNS 전환(TTL 사전 단축)
- [ ] 실시간 모니터링 1~2시간 집중 관제
- [ ] Netlify 비활성화는 안정화 후 진행

---

## 5) 기능 검증 체크리스트(프로젝트 맞춤)

### 5-1. 인증/권한

- [ ] DoubleJ 로그인 -> 위키 세션 발급 정상
- [ ] 관리자/에디터 권한 분기 정상
- [ ] 로그아웃/재로그인 정상

### 5-2. 이랑위키

- [ ] 문서 조회/검색/최근변경/인기문서 정상
- [ ] 문서 생성/수정/이동/되돌리기 정상
- [ ] 리비전 기록 정상
- [ ] 문서 잠금/보호 기능 정상
- [ ] 토론/댓글/감시목록 기능 정상
- [ ] 위키 이미지 업로드 + 문서 렌더 정상

### 5-3. 랑구팸(메인 서비스)

- [ ] 카드 드랍/인벤토리/통계 정상
- [ ] 카드 조합/강화(트랜잭션) 정상
- [ ] 프로필/팔로우/팔로워 정상
- [ ] 북마크 CRUD/정렬 정상
- [ ] 스포트라이트/미디어 조회 정상

### 5-4. 비기능

- [ ] 주요 API p95 응답시간 기준 만족
- [ ] 에러율 기준 만족
- [ ] 배포 후 로그 폭증 없음
- [ ] 백업 복원 테스트 성공

---

## 6) 실행 순서 제안(체크포인트)

### Phase 1: 설계/준비

- [ ] 의사결정 확정(ORM, 스토리지, AWS 런타임)
- [ ] 스키마 설계서 + 이관 설계서 완료
- [ ] NAS/AWS 기초 인프라 완료

### Phase 2: 구현

- [ ] DB 액세스 레이어 구현
- [ ] 도메인별 API 전환(위키 -> 카드 -> 기타)
- [ ] 테스트/스크립트 갱신

### Phase 3: 리허설

- [ ] 데이터 이관 1차/2차 리허설 완료
- [ ] 스테이징 E2E 완료
- [ ] 롤백 리허설 완료

### Phase 4: 본 전환

- [ ] 동결 공지
- [ ] 최종 증분 이관
- [ ] AWS 배포 + DNS 전환
- [ ] 안정화 모니터링

---

## 7) 리스크 체크

- [ ] AWS에서 NAS DB 원격접속 지연/끊김 리스크 대응책 준비
- [ ] DS225+ 2GB 메모리 한계로 인한 DB 응답 지연(피크 시간) 대응책 준비
- [ ] 이미지 저장소 이원화로 인한 경로 불일치 제거
- [ ] 위키 대형 중첩 문서 정규화 중 기능회귀 방지
- [ ] 카드 시스템의 동시성 문제(중복 지급/음수 수량) 방지

---

## 8) 최종 산출물(완료 정의)

- [ ] PostgreSQL 스키마/마이그레이션 파일
- [ ] 데이터 이관 스크립트 + 실행 로그
- [ ] AWS 인프라 IaC(가능하면 Terraform/CDK) 또는 운영 문서
- [ ] CI/CD 배포 파이프라인
- [ ] 운영 런북(장애 대응/롤백/백업복구)
- [ ] 전환 완료 보고서(성능/에러/비용 비교)

---

## 부록 A) 실행 전 빠른 점검 명령어

```bash
# 기존 ODM 의존 범위 재확인
rg -n "mongoose|ObjectId|@/lib/database" src scripts

# API 라우트 수 확인
rg --files src/app/api | wc -l

# 모델 확인
rg --files src/models
```

## 부록 B) 권장 운영 원칙

- [ ] DB 접속정보는 코드/레포에 저장하지 않기
- [ ] 운영 배포는 수동 SSH가 아닌 파이프라인 기반으로 일원화
- [ ] 컷오버 당일에는 스키마 변경 금지
- [ ] 전환 1주일 전부터 기능 추가 개발 동결

---

## 부록 C) AWS 셋업 상세 순서(저비용 기본안: Lightsail + S3 + CloudFront)

아래 순서대로 하면 DS225+ 2GB NAS를 무리시키지 않고 저비용으로 운영할 수 있다.

### C-0. 기준값

- [x] AWS 리전: `ap-northeast-2`
- [ ] 서비스명: `rangu-fam-prod`
- [ ] 도메인: `rangu.fam`, `www.rangu.fam`
- [ ] 런타임 포트: `3000`
- [ ] 배포 방식: `Lightsail + (선택) Docker`

### C-1. 컴퓨트

- [ ] Lightsail 인스턴스 1대 생성(최소 스펙부터 시작)
- [ ] Next.js 앱 배포(`next build && next start`)
- [ ] FerretDB는 Lightsail에서 실행(앱과 동일 호스트 권장)
- [ ] 헬스체크 엔드포인트(`/api/health`) 추가

### C-2. 데이터 경로

- [ ] NAS에는 PostgreSQL만 상시 실행
- [ ] Lightsail -> NAS는 Tailscale/WireGuard로만 연결
- [ ] `POSTGRES_BRIDGE_URI`는 Lightsail 내부 FerretDB endpoint로 설정
- [ ] NAS 5432 포트 공인망 직접 오픈 금지
- [ ] `WIKI_UPLOADS_DIR`를 NAS 마운트 경로로 지정(예: `/mnt/nas/wiki-uploads`)

### C-3. 파일/이미지 경로

- [ ] 신규 업로드를 S3 버킷으로 저장
- [ ] CloudFront 배포를 S3 오리진으로 연결
- [ ] 위키 이미지 URL을 CDN 도메인 기준으로 통일
- [ ] 기존 `/uploads/wiki/*`는 백그라운드 배치로 순차 이관

### C-4. 비용 가드레일

- [ ] NAT Gateway 미도입 유지
- [ ] CloudWatch 로그 보존기간 14~30일 설정
- [ ] Billing Alarm(월 5만/10만/20만원 구간) 설정
- [ ] 월 1회 비용 리포트 점검 후 인스턴스 스펙 재조정

---

## 부록 D) AWS 셋업 상세 순서(대안: ECS Fargate)

아래 순서대로 진행하면 Netlify 대체 운영 구성이 가능하다.

### D-0. 기준값 먼저 고정

- [x] AWS 리전: `ap-northeast-2`(서울) 고정
- [ ] 서비스명(프로젝트 접두어): `rangu-fam-prod`
- [ ] 도메인: 예) `rangu.fam`, `www.rangu.fam`
- [ ] 런타임 포트: `3000` (`next start`)
- [ ] 배포 방식: `Docker + ECR + ECS Fargate + ALB`
- [ ] 이름 규칙 고정: `<app>-<env>-<resource>` (예: `rangu-fam-prod-alb`)

### D-1. AWS 계정 보안/기본 설정

- [x] 루트 계정 MFA 활성화
- [ ] Billing Alarm 생성(예: 월 5만/10만/20만원 구간, 알람명: `rangu-fam-prod-billing-50k`, `rangu-fam-prod-billing-100k`, `rangu-fam-prod-billing-200k`)
- [x] CloudTrail 모든 리전에 활성화(Trail 이름: `rangu-fam-prod-trail`, S3 로그 버킷: `rangu-fam-prod-cloudtrail-logs`)
- [ ] IAM 관리자 계정 분리(루트 계정 일상 사용 금지, 권장 그룹/유저명: `rangu-fam-admins`, `rangu-admin`)

### D-2. IAM/배포 권한 설정(GitHub Actions OIDC)

- [x] IAM Identity Provider에 GitHub OIDC 추가(Provider URL: `token.actions.githubusercontent.com`)
- [x] IAM Role 생성: `GitHubActionsDeployRole`
- [x] 신뢰 정책에 대상 repo/branch 제한
- [x] 권한 정책에 최소 권한 부여:
- [x] ECR push/pull(정책명 예: `rangu-fam-prod-ecr-deploy-policy`)
- [x] ECS task definition 등록/서비스 업데이트(정책명 예: `rangu-fam-prod-ecs-deploy-policy`)
- [x] CloudWatch Logs 조회(선택, 정책명 예: `rangu-fam-prod-logs-read-policy`)

### D-3. 네트워크(VPC) 생성

- [x] VPC 생성: `10.20.0.0/16` (Name: `rangu-fam-prod-vpc`)
- [x] Public Subnet 2개(서로 다른 AZ, Name: `rangu-fam-prod-public-2a`, `rangu-fam-prod-public-2c`)
- [x] Private Subnet 2개(서로 다른 AZ, Name: `rangu-fam-prod-private-2a`, `rangu-fam-prod-private-2c`)
- [x] Internet Gateway 연결(Name: `rangu-fam-prod-igw`)
- [x] NAT Gateway 1~2개 생성(비용/가용성 선택, Name: `rangu-fam-prod-nat-2a`, `rangu-fam-prod-nat-2c`)
- [x] Route Table 설정:
- [x] Public -> IGW (Name: `rangu-fam-prod-public-rt`)
- [x] Private -> NAT (Name: `rangu-fam-prod-private-rt`)

### D-4. 보안그룹 설계

- [x] `sg-alb-prod` (Security Group Name: `rangu-fam-prod-alb-sg`)
- [x] Inbound: `443` from `0.0.0.0/0`, `::/0`
- [x] Outbound: `3000` to `sg-ecs-prod`
- [x] `sg-ecs-prod` (Security Group Name: `rangu-fam-prod-ecs-sg`)
- [x] Inbound: `3000` from `sg-alb-prod` only
- [ ] Outbound: `443` 인터넷(패키지/API), `5432` NAS 경로(터널/사설망)

### D-5. 도메인/인증서

- [ ] Route53 Hosted Zone 준비(또는 외부 DNS 유지 시 CNAME 전략, Hosted Zone: `rangu.fam`)
- [ ] ACM 인증서 발급(`rangu.fam`, `www.rangu.fam`, 태그 Name: `rangu-fam-prod-acm-cert`)
- [ ] DNS 검증 완료

### D-6. ECR 리포지토리 생성

- [x] ECR 리포 생성: `rangu-fam-web` (권장 추가 태그: `Environment=prod`, `Project=rangu-fam`)
- [x] 이미지 보존 정책(Lifecycle) 설정(예: 최근 30개 유지)
- [x] 이미지 스캔 활성화

### D-7. ECS 클러스터/서비스 생성

- [x] ECS Cluster 생성: `rangu-fam-prod-cluster`
- [x] Task Definition 생성(Family: `rangu-fam-prod-task`)
- [x] Launch type: Fargate
- [x] CPU/Memory 시작값: `1 vCPU / 2GB` (트래픽 후 조정)
- [x] Container port: `3000`
- [x] Command: 기본(`npm run start` 또는 Docker CMD, Container name: `rangu-fam-web`)
- [x] Log driver: awslogs(`/ecs/rangu-fam-prod`)
- [ ] Service 생성(Name: `rangu-fam-prod-service`)
- [ ] Desired count: `2` (무중단 시작)
- [ ] Subnet: Private 2개
- [ ] Security group: `sg-ecs-prod`

### D-8. ALB/타깃그룹 구성

- [x] ALB 생성(인터넷 facing, Public Subnet 2개, Name: `rangu-fam-prod-alb`)
- [x] Target Group 생성(`ip` 타입, port `3000`, Name: `rangu-fam-prod-tg`)
- [x] Health Check 설정:
- [x] Path: `/` (권장: 별도 `/api/health` 추가 후 교체)
- [x] Interval: `30s`
- [x] Timeout: `5s`
- [x] Healthy threshold: `2`
- [x] Unhealthy threshold: `3`
- [x] HTTPS Listener(443) + ACM 인증서 연결(규칙명/설명: `rangu-fam-prod-https-listener`)
- [x] HTTP(80) -> HTTPS(443) 리다이렉트(규칙명/설명: `rangu-fam-prod-http-redirect`)

### D-9. 환경변수/시크릿 주입

- [ ] Secrets Manager 또는 SSM Parameter Store 사용(권장 이름 규칙: `/rangu-fam/prod/<key>`)
- [ ] 필수 값 등록(예시):
- [ ] `NODE_ENV=production` (파라미터명: `/rangu-fam/prod/NODE_ENV`)
- [ ] `JWT_SECRET` (파라미터명: `/rangu-fam/prod/JWT_SECRET`)
- [ ] `NEXTAUTH_SECRET`(사용 시, 파라미터명: `/rangu-fam/prod/NEXTAUTH_SECRET`)
- [ ] `DATABASE_URL`(PostgreSQL, SSL 포함, 파라미터명: `/rangu-fam/prod/DATABASE_URL`)
- [ ] 기타 Discord/Auth 관련 키
- [ ] ECS Task에서 secret 참조로 주입

### D-10. NAS PostgreSQL 연동(AWS <-> NAS)

- [ ] NAS DB 포트 공인망 직접 오픈 금지
- [ ] WireGuard/Tailscale/S2S VPN 중 1개 구성
- [ ] ECS Task에서 NAS DB로 라우팅 가능 확인
- [ ] PostgreSQL `sslmode=require` 확인
- [ ] DB 접근 허용 IP/대역 최소화

### D-11. CI/CD 파이프라인

- [ ] GitHub Secrets 설정:
- [ ] `AWS_ROLE_ARN`
- [ ] `AWS_REGION`
- [ ] `ECR_REPOSITORY`
- [ ] `ECS_CLUSTER`
- [ ] `ECS_SERVICE`
- [ ] 값 예시:
- [ ] `AWS_ROLE_ARN=arn:aws:iam::<ACCOUNT_ID>:role/GitHubActionsDeployRole`
- [ ] `AWS_REGION=ap-northeast-2`
- [ ] `ECR_REPOSITORY=rangu-fam-web`
- [ ] `ECS_CLUSTER=rangu-fam-prod-cluster`
- [ ] `ECS_SERVICE=rangu-fam-prod-service`
- [ ] Workflow 순서:
- [ ] 테스트/빌드
- [ ] Docker build
- [ ] ECR push
- [ ] Task Definition image tag 치환
- [ ] ECS 서비스 업데이트
- [ ] 배포 완료 후 헬스체크

### D-12. 모니터링/알람

- [ ] CloudWatch 로그 그룹 보존기간 설정(예: 30일, Log Group: `/ecs/rangu-fam-prod`)
- [ ] 알람 생성:
- [ ] ALB 5xx (알람명: `rangu-fam-prod-alb-5xx`)
- [ ] ECS CPU/Memory (알람명: `rangu-fam-prod-ecs-cpu-high`, `rangu-fam-prod-ecs-mem-high`)
- [ ] Target Unhealthy Host Count (알람명: `rangu-fam-prod-tg-unhealthy-hosts`)
- [ ] 알림 채널(SNS -> 이메일/Slack) 연결(토픽명: `rangu-fam-prod-alerts`)

### D-13. DNS 컷오버 순서

- [ ] 전환 24시간 전 DNS TTL 축소(예: 300초)
- [ ] ALB DNS 대상으로 `A/AAAA(Alias)` 또는 `CNAME` 설정(권장 레코드: `rangu.fam -> ALB`, `www.rangu.fam -> rangu.fam`)
- [ ] 트래픽 전환 후 즉시 스모크 테스트:
- [ ] 로그인
- [ ] 위키 조회/수정
- [ ] 카드 드랍/인벤토리
- [ ] 이미지 업로드/조회
- [ ] 이상 시 즉시 롤백(DNS 원복 + ECS 이전 태스크)

### D-14. 초기 튜닝 기준(오픈 후 1주)

- [ ] ECS Desired count, CPU/Memory 재조정
- [ ] ALB idle timeout 조정(기본 60초 검토)
- [ ] CloudFront 도입 여부 재평가(정적/이미지 캐싱)
- [ ] 비용 리포트 확인 후 NAT/로그 보존 정책 최적화

### D-15. 빠른 검증 명령 예시(AWS CLI)

```bash
# 현재 caller 확인
aws sts get-caller-identity

# ECS 서비스 상태 확인
aws ecs describe-services \
  --cluster rangu-fam-prod-cluster \
  --services rangu-fam-prod-service

# 최근 태스크 확인
aws ecs list-tasks \
  --cluster rangu-fam-prod-cluster \
  --service-name rangu-fam-prod-service

# 타깃그룹 헬스 상태 확인
aws elbv2 describe-target-health \
  --target-group-arn <TARGET_GROUP_ARN>
```
