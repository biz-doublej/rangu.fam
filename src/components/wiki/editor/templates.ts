import type { ElementType } from 'react'
import { Bookmark, FileText, LayoutGrid, User, Users } from 'lucide-react'

/**
 * 편집기 "템플릿" 메뉴의 기본 틀.
 *
 * 채워야 할 자리는 `{○○을 채워주세요}` 빈칸으로 넣는다. 편집기는 이 빈칸을 세어 안내하고,
 * Tab 으로 다음 빈칸을 선택해 바로 덮어쓸 수 있게 한다 (BLANK_PATTERN).
 */

/** 템플릿 빈칸 — `{이름을 채워주세요}` 형태. 나무위키 `{{{…}}}` 문법과 겹치지 않는다. */
export const BLANK_PATTERN = /\{[^{}\n]{1,40}채워주세요\}/g

/** 받침에 따라 을/를을 붙인 빈칸 문구 */
export function blank(label: string): string {
  const last = label.charCodeAt(label.length - 1)
  const isHangul = last >= 0xac00 && last <= 0xd7a3
  const hasFinalConsonant = isHangul ? (last - 0xac00) % 28 !== 0 : false
  return `{${label}${hasFinalConsonant ? '을' : '를'} 채워주세요}`
}

export type EditorTemplate = {
  key: string
  name: string
  /** 메뉴에 보이는 한 줄 설명 */
  description: string
  icon: ElementType
  template: string
}

export type EditorTemplateGroup = {
  label: string
  items: EditorTemplate[]
}

const personArticle = `{{인물정보상자
|상단제목 = ${blank('소속이나 직함')}
|이름 = ${blank('이름')}
|영문명 = ${blank('영문 이름')}
|이미지 = ${blank('사진 주소')}
|이미지설명 = ${blank('사진 설명')}
|출생 = ${blank('생년월일')}
|출생지 = ${blank('출생지')}
|국적 = ${blank('국적')}
|소속 = ${blank('소속')}
|직업 = ${blank('직업')}
|학력 = ${blank('학력')}
|경력 = ${blank('경력')}
|별명 = ${blank('별명')}
}}

== 개요 ==
${blank('이 인물을 한두 문장으로 소개하는 내용')}

== 생애 ==
${blank('살아온 이야기')}

== 활동 ==
${blank('주요 활동')}

== 여담 ==

[[분류:${blank('분류')}]]`

const groupArticle = `{{그룹정보상자
|상단제목 = ${blank('그룹 한 줄 소개')}
|그룹명 = ${blank('그룹 이름')}
|메인제목 = 멤버
|메인멤버 = ${blank('멤버 목록')}
|설립일 = ${blank('설립일')}
|본부 = ${blank('활동 지역')}
|설명 = ${blank('그룹 설명')}
}}

== 개요 ==
${blank('이 그룹을 소개하는 내용')}

== 멤버 ==
* '''${blank('멤버 이름')}''' - ${blank('역할')}

== 활동 ==
${blank('주요 활동')}

== 여담 ==

[[분류:${blank('분류')}]]`

const simpleInfobox = `[[인포박스: 제목=${blank('제목')} | 이미지=${blank('사진 주소')} | 본명=${blank('본명')} | 출생=${blank('생년월일')} | 소속=${blank('소속')} | 직업=${blank('직업')}]]

== 개요 ==
${blank('개요')}`

const basicArticle = `== 개요 ==
${blank('문서의 개요')}

== 상세 ==
=== ${blank('소제목')} ===
${blank('상세 내용')}

== 같이 보기 ==
* [[${blank('관련 문서')}]]

[[분류:${blank('분류')}]]`

const cardGrid = `[[카드그리드: items=[
{
  "title": "${blank('작품 제목')}",
  "image": "${blank('이미지 주소')}",
  "description": "${blank('작품 설명')}",
  "date": "${blank('날짜')}"
}
]]]`

export const EDITOR_TEMPLATE_GROUPS: EditorTemplateGroup[] = [
  {
    label: '정보상자',
    items: [
      { key: 'personArticle', name: '인물 문서', description: '인물정보상자 + 개요·생애·활동', icon: User, template: personArticle },
      { key: 'groupArticle', name: '그룹 문서', description: '그룹정보상자 + 멤버·활동', icon: Users, template: groupArticle },
      { key: 'simpleInfobox', name: '간단 정보상자', description: '한 줄짜리 정보상자', icon: Bookmark, template: simpleInfobox },
    ],
  },
  {
    label: '문서 틀',
    items: [
      { key: 'basicArticle', name: '기본 문서', description: '개요·상세·같이 보기', icon: FileText, template: basicArticle },
      { key: 'cardGrid', name: '작품 목록', description: '카드 형태의 작품·프로젝트 목록', icon: LayoutGrid, template: cardGrid },
    ],
  },
]
