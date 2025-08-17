# 이승찬 프로필 배포 가이드

## 🎯 개요
이승찬님의 개인 페이지 추가 및 로그인 정보 업데이트를 위한 가이드입니다.

## 📦 새로 추가된 기능
- ✨ 이승찬 개인 페이지 (`/members/seungchan`)
- 🪄 마술사 + 군복무 테마 디자인
- 🎖️ 군입대/전역 디데이 카운터
- 🏰 호그와트 마법학교 정보
- 🚀 사클 API 연동 (프로젝트 진행 상황)
- 🔐 업데이트된 로그인 정보

## 🛠️ 실행 전 준비사항

### 1. 필수 패키지 설치
```bash
npm install bcryptjs
```

### 2. 환경 설정 확인
- MongoDB 서버가 실행 중인지 확인
- `.env` 파일에 `MONGODB_URI` 설정 확인

## 🚀 배포 실행

### 방법 1: 통합 스크립트 실행 (권장)
```bash
node scripts/deploy-seungchan.js
```

### 방법 2: 개별 스크립트 실행
```bash
# 1. 사용자 로그인 정보 업데이트
node scripts/update-user-credentials.js

# 2. 이승찬 프로필 생성
node scripts/seed-seungchan-profile.js
```

## 🔐 업데이트된 로그인 정보

| 이름 | 아이디 | 비밀번호 |
|------|--------|----------|
| 강한울 | `kanghu05` | `rkdgksdnf05` |
| 이승찬 | `mushbit` | `-5MNa4skn*ntPQQ` |
| 정재원 | `jung051004` | `wodnjsjung050727!` |
| 정민석 | `qudtls` | `qudtlstoRl` |

## 🎨 이승찬 프로필 특징

### 군복무 + 마법 테마
- 보라색-인디고 그라디언트 디자인
- 마법 이모지 애니메이션 (✨🪄🎖️⭐)
- 군입대 디데이 카운터 (2026.03.15 입대 예정)
- 호그와트 마법학교 정보 표시

### 사클 API 연동 프로젝트
1. **디지털 마법 카드 게임** (게임 개발)
2. **호그와트 학습 관리 시스템** (교육 플랫폼)
3. **마법 트릭 라이브러리** (마법 연구)

### 스킬 및 경험
- 마술, 마법학, 카드 매직, 프로그래밍 스킬
- 호그와트 고급 마법반 재학 경험
- 매직 서클 엔터테인먼트 주니어 마술사 경력

## 📍 접속 및 확인 방법

1. **웹사이트 접속**
   ```
   http://localhost:3000 (개발 환경)
   https://rangu.fam (프로덕션)
   ```

2. **이승찬 프로필 확인**
   ```
   /members/seungchan
   ```

3. **로그인 테스트**
   - 새로운 아이디/비밀번호로 로그인 시도
   - 각 멤버별 편집 권한 확인

## 🔧 문제 해결

### MongoDB 연결 오류
```bash
# MongoDB 서비스 시작 (Windows)
net start MongoDB

# MongoDB 서비스 시작 (macOS/Linux)
brew services start mongodb-community
# 또는
sudo systemctl start mongod
```

### 패키지 설치 오류
```bash
# 캐시 클리어 후 재설치
npm cache clean --force
npm install bcryptjs
```

### 프로필 데이터 확인
```bash
# MongoDB 콘솔에서 데이터 확인
mongo
use rangu-fam
db.profiles.find({username: "mushbit"})
db.users.find({username: "mushbit"})
```

## 📁 생성된 파일

- `scripts/seed-seungchan-profile.js` - 이승찬 프로필 시드 스크립트
- `scripts/update-user-credentials.js` - 사용자 로그인 정보 업데이트
- `scripts/deploy-seungchan.js` - 통합 배포 스크립트
- `scripts/README-seungchan-setup.md` - 이 가이드 파일

## ✅ 배포 완료 확인사항

- [ ] 이승찬 프로필 페이지 접속 가능
- [ ] 군입대 디데이 카운터 정상 작동
- [ ] 마법 테마 애니메이션 정상 표시
- [ ] 사클 API 프로젝트 진행률 표시
- [ ] 새로운 로그인 정보로 로그인 가능
- [ ] 편집 권한 정상 작동

## 🆘 지원

문제가 발생하면 다음을 확인하세요:
1. MongoDB 서버 상태
2. 환경 변수 설정
3. 패키지 설치 상태
4. 콘솔 오류 메시지

---
*이승찬님의 마법같은 프로필 페이지를 즐겨보세요! ✨🪄*
