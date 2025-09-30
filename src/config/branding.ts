export const BRANDING = {
  // Site-level names
  brandSite: 'Rangu.fam',
  brandWiki: '랑구팸 위키',
  brandShort: 'Rangu',

  // Common Tailwind class tokens for accents
  accents: {
    text: 'text-green-400',
    textHover: 'hover:text-green-300',
    border: 'border-green-400',
    borderHover: 'hover:border-green-300',
  },
} as const

export type Branding = typeof BRANDING

