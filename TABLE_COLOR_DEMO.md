# 표 색상 기능 테스트 데모

이 파일은 새로 구현된 표 색상 기능을 테스트하고 시연하기 위한 예시들을 포함합니다.

## 1. 기본 색상 표

### 헤더 색상 적용
|| <bgcolor:#4472C4 color:#FFFFFF>프로젝트명 || <bgcolor:#4472C4 color:#FFFFFF>상태 || <bgcolor:#4472C4 color:#FFFFFF>담당자 ||
|| Rangu.fam || 진행중 || 정재원 ||
|| 이랑위키 || 완료 || 정재원 ||

### 셀별 다른 색상
|| 항목 || <bgcolor:#70AD47 color:#FFFFFF>성공 || <bgcolor:#FF6B6B color:#FFFFFF>실패 ||
|| 테스트 1 || <bgcolor:#D4F7DC>통과 || 해당 없음 ||
|| 테스트 2 || 해당 없음 || <bgcolor:#F8D7DA>실패 ||

## 2. RGB 색상 코드 테스트

### Hex 색상 (#RRGGBB)
|| <bgcolor:#FF0000 color:#FFFFFF>빨강 || <bgcolor:#00FF00 color:#000000>초록 || <bgcolor:#0000FF color:#FFFFFF>파랑 ||
|| <bgcolor:#FFFF00 color:#000000>노랑 || <bgcolor:#FF00FF color:#FFFFFF>마젠타 || <bgcolor:#00FFFF color:#000000>시안 ||

### 3자리 Hex 색상 (#RGB)
|| <bgcolor:#F00 color:#FFF>빨강 || <bgcolor:#0F0 color:#000>초록 || <bgcolor:#00F color:#FFF>파랑 ||

## 3. 프리셋 색상 테스트

### 테이블 색상 프리셋
|| <bgcolor:blue-header>파란 헤더 || <bgcolor:red-header>빨간 헤더 || <bgcolor:green-header>초록 헤더 ||
|| <bgcolor:light-blue>연한 파랑 || <bgcolor:light-red>연한 빨강 || <bgcolor:light-green>연한 초록 ||
|| <bgcolor:dark-blue color:#FFFFFF>어두운 파랑 || <bgcolor:dark-red color:#FFFFFF>어두운 빨강 || <bgcolor:dark-green color:#FFFFFF>어두운 초록 ||

## 4. 템플릿에서 색상 사용

{{인물정보상자
|이름 = 정재원
|출생 = <bgcolor:#E8F4FD>2005년 7월 27일
|국적 = <bgcolor:#FFE5CC>대한민국
|직업 = <bgcolor:#D4F7DC>대학생
|소속 = <bgcolor:#F8D7DA>경북대학교
}}

## 5. 복합 색상 속성

### 배경색과 글자색 조합
|| <bgcolor:#2C3E50 color:#ECF0F1>어두운 배경 + 밝은 글자 ||
|| <bgcolor:#F39C12 color:#2C3E50>밝은 배경 + 어두운 글자 ||
|| <bgcolor:#E74C3C color:#FFFFFF>빨간 배경 + 흰 글자 ||

### 투명 배경
|| <bgcolor:transparent>투명 배경 || 일반 셀 ||

## 6. 그라데이션 효과 시뮬레이션

|| <bgcolor:#FF0000 color:#FFFFFF>100% ||
|| <bgcolor:#FF3333 color:#FFFFFF>80% ||
|| <bgcolor:#FF6666 color:#FFFFFF>60% ||
|| <bgcolor:#FF9999 color:#000000>40% ||
|| <bgcolor:#FFCCCC color:#000000>20% ||

## 7. 실제 사용 사례

### 프로젝트 진행 상황
|| <bgcolor:#34495E color:#FFFFFF>단계 || <bgcolor:#34495E color:#FFFFFF>진행률 || <bgcolor:#34495E color:#FFFFFF>상태 ||
|| 기획 || <bgcolor:#2ECC71 color:#FFFFFF>100% || <bgcolor:#2ECC71 color:#FFFFFF>완료 ||
|| 개발 || <bgcolor:#F39C12 color:#FFFFFF>75% || <bgcolor:#F39C12 color:#FFFFFF>진행중 ||
|| 테스트 || <bgcolor:#E74C3C color:#FFFFFF>25% || <bgcolor:#E74C3C color:#FFFFFF>대기 ||

### 등급별 분류
|| <bgcolor:#FFD700 color:#000000>S급 || <bgcolor:#C0C0C0 color:#000000>A급 || <bgcolor:#CD7F32 color:#FFFFFF>B급 ||
|| 최우수 || 우수 || 보통 ||

## 사용법 요약

1. **기본 문법**: `||<bgcolor:#색상코드> 내용 ||`
2. **글자색 추가**: `||<bgcolor:#배경색 color:#글자색> 내용 ||`
3. **RGB 형식**: 
   - 6자리: `#FF0000`
   - 3자리: `#F00`
   - 프리셋: `blue-header`, `light-blue` 등
4. **위키 에디터에서**: 표 도구 → 색상 선택 → 색상 표 생성

## 지원하는 색상 형식

- **Hex 6자리**: `#FF0000`, `#00FF00`, `#0000FF`
- **Hex 3자리**: `#F00`, `#0F0`, `#00F`
- **프리셋 색상**: `blue-header`, `red-header`, `light-blue` 등
- **투명**: `transparent`
- **CSS 색상명**: `red`, `blue`, `green` 등

이 기능을 통해 위키 문서의 표와 템플릿을 더욱 시각적으로 매력적으로 만들 수 있습니다!