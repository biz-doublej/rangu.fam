# Rangu.fam 🏠

네 친구의 특별한 온라인 공간, Rangu.fam에 오신 것을 환영합니다.

## 📖 프로젝트 소개

Rangu.fam은 우정과 추억을 담은 네 친구만의 특별한 웹 애플리케이션입니다. iOS Liquid Glass 스타일을 적용하여 자연스럽고 따뜻한 디자인으로 구성되었습니다.

## ✨ 주요 기능

### 🏠 메인 화면
- 중앙 자동 슬라이드 사진 갤러리
- 상단 시간 표시 (서울, 밴쿠버, 스위스)
- 반응형 네비게이션 메뉴

### 👥 개인 페이지
- **정재원**: 소프트웨어 엔지니어, 패션 모델
- **정민석**: 스위스 거주
- **정진규**: 군 입대 중
- **강한울**: 무직(편돌이)

각 멤버별 개인 소개 및 일상 기록, 커리어 상태 표시

### 🎵 음악 스테이션
- 멤버가 만든 음악 및 개인 활동 음악 재생
- 앨범, 작곡가, 가수 기준 탐색
- 웹 버전 중앙 스피커 음파 파동 효과

### 📚 위키 페이지
- 나무위키 스타일 위키 시스템
- '이랑위키' 산하 운영
- 멤버 로그인 시 내용 수정 가능

### 📅 달력
- 일정 및 갤러리 등록/수정/삭제
- 개인별 일정 공유
- 위젯 설정 기능

### 🔐 로그인 시스템
- 멤버/비멤버 로그인 구분
- 멤버 권한: 위키 수정, 개인 페이지 관리, 달력 일정 관리
- 위젯에 외부 링크 등록 가능

### 🔗 개인 바로가기 위젯
- **개인 맞춤형**: 각 멤버(정재원/정민석/정진규/강한울/이승찬)만 본인의 바로가기 관리 가능
- **외부 링크 연결**: 자주 사용하는 웹사이트를 버튼 형태로 빠르게 접근
- **편집 기능**: 바로가기 추가/수정/삭제 및 순서 조정
- **개인정보 보호**: 다른 사용자의 바로가기는 볼 수 없음
- **사이드바 통합**: 왼쪽 메뉴에서 로그인 시 자동 표시

## 🎨 디자인 컨셉

### iOS Liquid Glass 스타일
- 미래지향적이지 않고 AI 느낌을 배제한 자연스럽고 따뜻한 디자인
- 파란색 계열 색상을 기본으로 한 색상 팔레트
- 글래스모피즘 효과와 부드러운 애니메이션

## 🚀 시작하기

### 필수 요구사항
- Node.js 18.0 이상
- npm 또는 yarn
- MongoDB (로컬 설치 또는 MongoDB Atlas)

### 설치 및 실행

1. **프로젝트 클론**
```bash
git clone <repository-url>
cd rangu-fam
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정** (선택사항)
   
   `.env.local` 파일을 프로젝트 루트에 생성하고 MongoDB URI를 설정:
   ```bash
   MONGODB_URI=mongodb://localhost:27017/rangu-fam
   # 또는 MongoDB Atlas URI
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rangu-fam
   ```
   
   **주의**: 환경 변수가 설정되지 않으면 기본값(`mongodb://localhost:27017/rangu-fam`)을 사용합니다.

4. **개발 서버 실행**
```bash
npm run dev
```

5. **브라우저에서 확인**
```
http://localhost:3000
```

### 샘플 데이터 추가 (선택사항)

```bash
# 북마크 샘플 데이터 추가
npm run seed-bookmarks

# 기타 시드 스크립트
npm run seed            # 기본 데이터베이스 시드
npm run seed-extended   # 확장 데이터베이스 시드  
npm run seed-wiki       # 위키 콘텐츠 시드
```

### 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 시작
npm start
```

## 🛠 기술 스택

### 프론트엔드
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **UI Components**: Custom Glass UI Components

### 디자인 시스템
- **Color Palette**: Primary (Blue), Warm (Orange)
- **Typography**: Apple System Font Stack
- **Effects**: Backdrop Blur, Glass Morphism
- **Animations**: Smooth Transitions, Micro-interactions

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 메인 홈페이지
│   └── globals.css        # 글로벌 스타일
├── components/            # 리액트 컴포넌트
│   └── ui/               # 재사용 가능한 UI 컴포넌트
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       └── index.ts
├── lib/                   # 유틸리티 함수
│   └── utils.ts
├── types/                 # TypeScript 타입 정의
│   └── index.ts
└── public/               # 정적 파일
    └── images/
```

## 🌟 핵심 컴포넌트

### Glass UI Components
- **Button**: 다양한 variant와 애니메이션
- **Card**: 글래스모피즘 효과가 적용된 카드
- **Input**: 글래스 스타일 입력 필드

### 기능별 컴포넌트
- **WorldClock**: 세계 시간 표시
- **ImageSlider**: 자동 슬라이드 이미지 갤러리
- **MemberCard**: 멤버 소개 카드
- **Navigation**: 반응형 네비게이션

## 🎯 향후 개발 계획

1. **로그인 시스템 구현**
   - 멤버/비멤버 인증
   - 세션 관리
   - 권한 기반 접근 제어

2. **음악 스테이션 개발**
   - 오디오 플레이어
   - 플레이리스트 관리
   - 음파 파동 효과

3. **위키 시스템 구축**
   - 마크다운 에디터
   - 버전 관리
   - 검색 기능

4. **달력 기능 완성**
   - 이벤트 CRUD
   - 갤러리 연동
   - 알림 시스템

5. **Vercel 배포 최적화**
   - CI/CD 구축
   - SEO 최적화
   - 성능 모니터링

## 🤝 기여하기

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 개인 프로젝트로 제작되었습니다.

## 👥 개발팀

**Rangu.fam Team**
- 네 친구의 우정으로 만들어진 특별한 프로젝트

---

*"우정과 추억이 가득한 온라인 공간에 오신 것을 환영합니다."* 
