export const BRANDING = {
  // Site-level names
  brandSite: 'Rangu.fam',
  brandWiki: '이랑위키',
  brandShort: 'Rangu',

  // 이랑위키 공개 주소 — 랑구팸 쪽 진입 버튼/링크는 항상 이 절대 URL 사용
  // (irang.wiki 는 middleware 호스트 rewrite 로 같은 앱의 /wiki 를 서빙)
  wikiPublicUrl: 'https://irang.wiki/wiki',

  // Common Tailwind class tokens for accents
  accents: {
    text: 'text-green-400',
    textHover: 'hover:text-green-300',
    border: 'border-green-400',
    borderHover: 'hover:border-green-300',
  },
} as const

export type Branding = typeof BRANDING

