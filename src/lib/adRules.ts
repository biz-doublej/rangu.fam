export interface AdInput {
  title: string
  linkUrl: string
  desktopImage: string
  mobileImage: string
  isActive: boolean
}

export type AdCheck = { ok: true; value: AdInput } | { ok: false; error: string }

function isLocalImagePath(value: string) {
  return value.startsWith('/') && !value.startsWith('//')
}

/** 어드민 입력 검증. 링크는 https, 이미지는 사이트 내부 경로만 허용한다. */
export function validateAdInput(input: unknown): AdCheck {
  const raw = (input || {}) as Record<string, unknown>
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  const linkUrl = typeof raw.linkUrl === 'string' ? raw.linkUrl.trim() : ''
  const desktopImage = typeof raw.desktopImage === 'string' ? raw.desktopImage.trim() : ''
  const mobileImage = typeof raw.mobileImage === 'string' ? raw.mobileImage.trim() : ''

  if (!title || title.length > 80) return { ok: false, error: '광고 이름을 1~80자로 입력해 주세요.' }
  try {
    if (new URL(linkUrl).protocol !== 'https:') throw new Error('protocol')
  } catch {
    return { ok: false, error: '이동 주소는 https:// 로 시작해야 합니다.' }
  }
  if (!isLocalImagePath(desktopImage) || !isLocalImagePath(mobileImage)) {
    return { ok: false, error: 'PC 이미지와 모바일 이미지를 모두 올려 주세요.' }
  }
  return { ok: true, value: { title, linkUrl, desktopImage, mobileImage, isActive: raw.isActive !== false } }
}
