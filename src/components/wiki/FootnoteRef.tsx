'use client'

import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface Position {
  left: number
  top: number
  width: number
  above: boolean
}

const GAP = 8
const MAX_WIDTH = 340

/**
 * 본문의 각주 번호. 마우스를 올리거나(휴대폰은 한 번 누르거나) 키보드로 초점을 주면
 * 각주 내용을 바로 띄우고, 누르면 아래 각주 목록으로 이동한다.
 * 내용은 각주 목록에 이미 그려진 것을 복제해서 링크·서식이 그대로 보인다.
 */
export function FootnoteRef({
  number,
  anchorId,
  onJump,
}: {
  number: number
  anchorId?: string
  onJump: () => void
}) {
  const triggerRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const popoverId = useId()

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const close = useCallback(() => {
    cancelClose()
    setPosition(null)
  }, [])

  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setPosition(null), 120)
  }

  const open = () => {
    cancelClose()
    const trigger = triggerRef.current
    if (!trigger || !document.querySelector(`#footnote-${number} [data-footnote-body]`)) return
    const rect = trigger.getBoundingClientRect()
    const width = Math.min(MAX_WIDTH, window.innerWidth - 24)
    const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12))
    const above = rect.top > window.innerHeight * 0.45
    setPosition({ left, width, above, top: above ? rect.top - GAP : rect.bottom + GAP })
  }

  // 각주 목록의 내용을 복제해 넣는다 (React 이벤트는 없지만 링크와 서식은 그대로)
  useEffect(() => {
    if (!position || !bodyRef.current) return
    const source = document.querySelector(`#footnote-${number} [data-footnote-body]`)
    if (!source) return
    bodyRef.current.replaceChildren(...Array.from(source.childNodes).map((node) => node.cloneNode(true)))
  }, [position, number])

  // 열려 있는 동안 스크롤하거나 바깥을 누르면 닫는다
  useEffect(() => {
    if (!position) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || popRef.current?.contains(target)) return
      close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    // 페이지 스크롤만 본다 (광고 슬라이드처럼 안쪽 요소가 스크롤될 때는 닫지 않는다)
    window.addEventListener('scroll', close, { passive: true })
    window.addEventListener('resize', close)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close)
      window.removeEventListener('resize', close)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [position, close])

  useEffect(() => cancelClose, [])

  const jump = () => {
    close()
    onJump()
  }

  const handleClick = () => {
    // 마우스를 올릴 수 없는 기기에서는 첫 번째 누름에 내용을 보여 준다
    if (!position && window.matchMedia('(hover: none)').matches) {
      open()
      return
    }
    jump()
  }

  return (
    <>
      <sup
        ref={triggerRef}
        id={anchorId}
        role="button"
        tabIndex={0}
        aria-label={`각주 ${number}`}
        aria-describedby={position ? popoverId : undefined}
        className="wiki-fn-ref text-blue-400 hover:text-blue-300 cursor-pointer text-xs underline scroll-mt-20"
        onClick={handleClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            jump()
          }
        }}
        onMouseEnter={open}
        onMouseLeave={scheduleClose}
        onFocus={open}
        onBlur={(event) => {
          if (popRef.current?.contains(event.relatedTarget as Node | null)) return
          scheduleClose()
        }}
      >
        [{number}]
      </sup>
      {position &&
        createPortal(
          <div
            ref={popRef}
            id={popoverId}
            role="tooltip"
            className={`wiki-fn-pop${position.above ? ' wiki-fn-pop--above' : ''}`}
            style={{ left: position.left, top: position.top, width: position.width }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className="wiki-fn-pop__head">
              <span>각주 {number}</span>
              <button type="button" className="wiki-fn-pop__jump" onClick={jump}>
                각주 목록에서 보기
              </button>
            </div>
            <div ref={bodyRef} className="wiki-fn-pop__body" />
          </div>,
          document.body
        )}
    </>
  )
}
