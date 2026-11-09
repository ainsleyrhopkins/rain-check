import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/*
 * Slide animations for BaseCard, so the results side doesn't just pop in and out.
 * Everything moves at the same time with the same timing; nothing fades. While anything
 * is moving, the card clips its contents so pieces slide in/out from behind its edge.
 *
 * Wide screens, results appearing (single -> two panels): the form glides from the center
 *   to the left half while the results slide in from the card's right edge.
 * Wide screens, Reset (two panels -> single): the form glides back to the center while the
 *   results slide out past the right edge. The layout only switches once that's done, which
 *   is why this hook returns `shownSingle` (BaseCard lays itself out from it).
 * Narrow screens: switching cards slides the incoming card in from the side it comes from.
 *
 * Everything is skipped for people who've asked their device for reduced motion.
 */

const DURATION = 380
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)' // quick start, soft landing

const LEFT = '.card-header--left, .card-page--left, .card-footer--left'
const RIGHT = '.card-header--right, .card-page--right, .card-footer--right, .card-divider'
const NARROW = '(max-width: 599.98px)' // matches BaseCard.css's 600px breakpoint
const REDUCED = '(prefers-reduced-motion: reduce)'

const matches = (query) => window.matchMedia?.(query).matches ?? false

const slide = (el, from, to, options = {}) =>
  el.animate([{ transform: from }, { transform: to }], { duration: DURATION, easing: EASE, ...options })

// Clip the card while its pieces are sliding past its edges. Overlapping users are
// counted; the clip comes off when the last one lets go. Returns a release function.
const clipCounts = new WeakMap()
function holdClip(root) {
  clipCounts.set(root, (clipCounts.get(root) ?? 0) + 1)
  root.style.overflow = 'clip'
  let released = false
  return () => {
    if (released) return
    released = true
    const remaining = clipCounts.get(root) - 1
    clipCounts.set(root, remaining)
    if (remaining === 0) root.style.overflow = ''
  }
}

// Clip until these animations end
function clipWhile(root, anims) {
  if (!anims.length) return
  const release = holdClip(root)
  Promise.allSettled(anims.map((anim) => anim.finished)).then(release)
}

// Distance that puts an element just past the card's right edge
const pastRightEdge = (root, el) => root.getBoundingClientRect().right - el.getBoundingClientRect().left

// Where each left-side piece is right now (to slide from after the layout changes)
const measureLeft = (root) => new Map([...root.querySelectorAll(LEFT)].map((el) => [el, el.getBoundingClientRect()]))

export function useCardTransitions(ref, single, showRight) {
  const [shownSingle, setShownSingle] = useState(single)
  const firstRects = useRef(null)
  // The Reset slide, parked at its end spot until the layout switch takes over:
  // { anims, releaseClip }. Cleared by whichever of the two handlers below gets it first.
  const exit = useRef(null)
  const endExit = () => {
    if (!exit.current) return
    exit.current.anims.forEach((anim) => anim.cancel())
    exit.current.releaseClip()
    exit.current = null
  }

  // Results appearing: switch layout right away, remembering where the form was
  if (!single && shownSingle) {
    if (ref.current) firstRects.current = measureLeft(ref.current)
    setShownSingle(false)
  }

  // Results hiding: slide everything to its end spot, then switch layout
  useEffect(() => {
    if (!single || shownSingle) return undefined
    const root = ref.current
    const finish = () => {
      if (root) firstRects.current = measureLeft(root)
      setShownSingle(true)
    }
    if (!root || matches(REDUCED) || matches(NARROW)) {
      finish()
      return undefined
    }

    // The single-panel layout centers the form in the card
    const cardRect = root.getBoundingClientRect()
    const cardCenter = cardRect.left + cardRect.width / 2
    const anims = [
      ...[...root.querySelectorAll(LEFT)].map((el) => {
        const rect = el.getBoundingClientRect()
        const dx = cardCenter - (rect.left + rect.width / 2)
        return slide(el, 'none', `translateX(${dx}px)`, { fill: 'forwards' })
      }),
      ...[...root.querySelectorAll(RIGHT)].map((el) =>
        slide(el, 'none', `translateX(${pastRightEdge(root, el)}px)`, { fill: 'forwards' }),
      ),
    ]
    // Keep clipping (and the pieces parked) until the layout switch is on screen;
    // the layout effect below lets go of both in the same frame as the switch.
    exit.current = { anims, releaseClip: holdClip(root) }

    let active = true
    Promise.all(anims.map((anim) => anim.finished))
      .then(() => active && finish())
      .catch(() => {}) // cancelled
    return () => {
      active = false
      // Only still set if results came back mid-slide: undo the slide
      endExit()
    }
    // endExit only touches refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, single, shownSingle])

  // After a layout switch: glide the form from its old spot; slide the results in
  const prevShownSingle = useRef(shownSingle)
  useLayoutEffect(() => {
    if (prevShownSingle.current === shownSingle) return
    prevShownSingle.current = shownSingle
    const first = firstRects.current
    firstRects.current = null
    const root = ref.current
    // Hold the clip through this frame even if the Reset slide's own hold is let go below
    const releaseClip = root ? holdClip(root) : () => {}
    // Reset just finished: drop the parked end positions now, before the new layout is
    // painted (a passive effect would run after paint and show a shifted frame)
    endExit()
    if (!first || !root || matches(REDUCED) || matches(NARROW)) {
      releaseClip()
      return
    }

    const anims = []
    for (const [el, was] of first) {
      const now = el.getBoundingClientRect()
      if (!was.width || !now.width) continue
      const dx = was.left + was.width / 2 - (now.left + now.width / 2)
      const dy = was.top - now.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
      // After Reset this is just a tiny settle (the slide already happened)
      anims.push(slide(el, `translate(${dx}px, ${dy}px)`, 'none', shownSingle ? { duration: 120 } : {}))
    }

    if (!shownSingle) {
      root.querySelectorAll(RIGHT).forEach((el) => {
        anims.push(slide(el, `translateX(${pastRightEdge(root, el)}px)`, 'none'))
      })
    }
    clipWhile(root, anims)
    releaseClip()
    // endExit only touches refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, shownSingle])

  // Narrow screens: slide in whichever card just became visible
  const prevShowRight = useRef(showRight)
  useLayoutEffect(() => {
    if (prevShowRight.current === showRight) return
    prevShowRight.current = showRight
    const root = ref.current
    if (!root || matches(REDUCED) || !matches(NARROW)) return
    const distance = root.getBoundingClientRect().width * (showRight ? 1 : -1)
    const anims = [...root.querySelectorAll(showRight ? RIGHT : LEFT)].map((el) =>
      slide(el, `translateX(${distance}px)`, 'none', { duration: 320 }),
    )
    clipWhile(root, anims)
  }, [ref, showRight])

  return shownSingle
}
