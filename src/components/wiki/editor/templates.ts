import type { ElementType } from 'react'
import { BarChart3, Bookmark, Calendar, FileText, Layout, Table, User, Users } from 'lucide-react'

export type EditorTemplate = {
  name: string
  /** 템플릿 메뉴에 보이는 한 줄 설명 */
  description: string
  icon: ElementType
  template: string
}

const DESCRIPTIONS: Record<string, string> = {
  personInfobox: '인물 문서용 정보상자',
  groupInfobox: '그룹·팀 문서용 정보상자',
  simpleInfobox: '간단한 정보상자',
  cardGrid: '작품·프로젝트 목록',
  basicArticle: '개요·상세·참고로 나뉜 기본 문서',
  colorTable: '행 단위 색상이 들어간 표',
  timeline: '날짜별 세로 타임라인',
  poll: '실시간 투표',
}

// 편집기 "템플릿" 메뉴의 기본 틀. 커서 위치에 그대로 삽입된다.
const RAW_TEMPLATES = {
  personInfobox: {
    name: '인물정보상자 (완전판)',
    icon: User,
    template: `{{인물정보상자
|상단로고 = 
|상단제목 = 태릉고등학교 37기 학생회장
|상단부제목 = 재학 당시의 모습
|상단설명 = 촬영일 : 정재원
|이름 = 정재원
|영문명 = Jung Jae Won
|이미지 = /images/default-music-cover.jpg
|이미지설명 = Jung 'Jay' Jae-Won
|출생 = 2005년 7월 27일 (만 19세)
|출생지 = 🇰🇷 대한민국 서울특별시
|국적 = 🇰🇷 대한민국
|거주지 = 서울특별시 중구 목동
|소속 = 🔵 경북대학교 빅데이터학과<br/>🔴 태릉고등학교 부동창장<br/>🟢 2024.03.20 ~ (🔴 현 재)<br/>🟡 태릉고등학교 서기부장 ▼
|직업 = 대학생
|학력 = 태릉고등학교 부동창장<br/>2024.03.20 ~ (현 재)<br/>태릉고등학교 서기부장<br/>2022.04.08 ~ 2023.04.30<br/>한창초등학교 전학<br/>(2012 ~ 2014)<br/>원목초등학교 졸업<br/>(2014 ~ 2018)<br/>해룡중학교 졸업<br/>(2018 ~ 2021)<br/>태릉고등학교 졸업<br/>(2021 ~ 2024)<br/>경북대학교<sup>(빅데이터학과)</sup><br/>(2024 ~ )
|경력 = 전 태릉고등학교 중구 미디어팀<br/>전 FCA를 유스넘 축구부에서 선수단으로 활동한 적이 있다.<br/>전 태릉고등학교 3학년 학급 부회장<br/>전 태릉고등학교 3학년 학급 반장<br/>전 이랑가입원 운영진<br/>전 에스팀 이스쿨다운 6571<br/>현 태릉고등학교 3기 졸업회 부동창장
|본관 = 은평 정씨
|신체 = 186cm, INTJ-T
|별명 = 산업기능요원<sup>(예정)</sup><br/>(미정)
|종교 = 천주교
|서명 = (서명 이미지)
|링크 = 📸 인스타그램
}}

== 개요 ==
대한민국의 모델 겸 대학생이다.

[[태릉고등학교]]를 졸업했으며, 경북대학교 [[빅데이터학과]]에 재학하고 있다. 랑구 그룹의 창립자로, 랑구 그룹 멤버이다.

== 생애 ==
2005년 7월 27일 출생했다.

=== 친구관계 ===
친구들과의 관계에 대한 내용...

=== 취미 ===
여러 장르의 게임을 즐긴다...

== 학습 ==

=== 프로그래밍 ===
어느정도 하는 편이다. 주로 사용하는 프로그램은 [[비주얼 스튜디오]]로 보인다.
사용 가능한 언어는 [[PYTHON]], [[JAVASCRIPT]], [[HTML5]], [[CSS3]], [[PYCHARM]], [[SQLITE3]]

== 여담 ==

== 작품 목록 ==

[[카드그리드: items=[
{
  "title": "Rangu.fam 웹사이트", 
  "image": "/images/default-music-cover.jpg",
  "description": "Next.js로 구축한 개인 포트폴리오",
  "date": "2024년"
},
{
  "title": "이랑위키",
  "description": "나무위키 스타일 개인 위키",
  "date": "2024년"
}
]]]

[[분류:RANGU.FAM]]
[[분류:대학생]]`
  },
  groupInfobox: {
    name: '그룹정보상자',
    icon: Users,
    template: `{{그룹정보상자
|상단로고 = 
|상단제목 = Rangu.fam
|상단부제목 = 랑구닷팸
|그룹명 = Rangu.fam
|메인제목 = 랑구
|메인멤버 = R27 정재원, R7 정진규, R20 정민석, R17 강한울
|서브제목 = 랑구 객원
|서브멤버 = R1 이승찬, R10 윤의현
|설립일 = 2024년 3월
|본부 = 서울특별시
|설명 = 태릉고등학교 동창회 기반 그룹
}}

== 개요 ==
Rangu.fam은 태릉고등학교 동창들로 구성된 그룹이다.

== 멤버 ==

=== 메인 멤버 ===
* '''R27 정재원''' - 리더
* '''R7 정진규''' - 
* '''R20 정민석''' - 
* '''R17 강한울''' - 

=== 객원 멤버 ===
* '''R1 이승찬''' - 
* '''R10 윤의현''' - 

== 활동 ==

== 여담 ==

[[분류:RANGU.FAM]]
[[분류:그룹]]`
  },
  simpleInfobox: {
    name: '간단한 인포박스',
    icon: Bookmark,
    template: `[[인포박스: 제목=정재원 | 이미지=/images/default-music-cover.jpg | 본명=정재원 | 출생=2005년 7월 27일 | 국적=대한민국 | 신체=186cm | 학력=경북대학교 | 소속=빅데이터학과 | 직업=대학생 | 링크=인스타그램]]

== 개요 ==

== 활동 ==

== 여담 ==`
  },
  cardGrid: {
    name: '카드그리드',
    icon: Layout,
    template: `[[카드그리드: items=[
{
  "title": "프로젝트 제목",
  "image": "/images/default-music-cover.jpg",
  "description": "프로젝트 설명",
  "date": "2024년"
},
{
  "title": "두 번째 프로젝트",
  "description": "다른 프로젝트 설명",
  "date": "2024년"
}
]]]`
  },
  basicArticle: {
    name: '기본 문서 구조',
    icon: FileText,
    template: `= 문서 제목 =

== 개요 ==
문서의 개요를 작성하세요.

== 상세 내용 ==

=== 하위 제목 ===
상세한 내용을 작성하세요.

== 참고 ==
* [[관련 문서]]
* [외부 링크 https://example.com]

[[분류:분류명]]`
  },
  colorTable: {
    name: '색상 표 (행 단위)',
    icon: Table,
    template: `|| <rowbgcolor:#4472C4 rowcolor:#ffffff>헤더1 || 헤더2 || 헤더3 ||
|| <rowbgcolor:#D4E6F1>데이터1-1 || 데이터1-2 || 데이터1-3 ||
|| 데이터2-1 || <bgcolor:#F8D7DA>강조 셀 || 데이터2-3 ||

표 맨앞 셀에 <rowbgcolor:..> 를 한 번만 적으면 그 행 전체에 색이 적용됩니다.
개별 셀은 <bgcolor:..> 로 덮어쓸 수 있어요.
표 전체 가운데 정렬은 첫 셀에 <tablealign:center>, 표 전체 색은 <tablebgcolor:..> 입니다.`
  },
  timeline: {
    name: '타임라인',
    icon: Calendar,
    template: `:::timeline
2024-03-20 | 랑구 그룹 결성 | 태릉고 동창들이 처음 모였다
2024-05 | 첫 정기 모임
2025-01-01 | 새해 다짐
:::`
  },
  poll: {
    name: '투표',
    icon: BarChart3,
    template: `:::poll 다음 모임 메뉴는?
햄버거
커피
치킨
:::`
  }
}

export const EDITOR_TEMPLATES: Record<string, EditorTemplate> = Object.fromEntries(
  Object.entries(RAW_TEMPLATES).map(([key, t]) => [key, { ...t, description: DESCRIPTIONS[key] || '' }])
)
