import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 조건부 클래스(clsx) + Tailwind 충돌 해소(twMerge) — 호출측 className 오버라이드 가능. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
