import { useRef, useState } from 'react'
import './BaseCard.css'
import GlassPanel from './GlassPanel'
import { useCardTransitions } from './useCardTransitions'

function ArrowIcon({ direction }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d={direction === 'next' ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/*
 * Wide screens: both cards side by side with a divider; the arrows are hidden.
 * Narrow screens: one card at a time; the arrow in the title row switches cards.
 *
 * `children` / `rightContent`: what goes inside the left / right glass panel.
 * `button` / `rightButton`: what goes under the left / right glass panel.
 * `leftPanel` / `rightPanel`: replace the glass panel itself (e.g. the main menu's cloud panel).
 * `showArrows`: set false to never show the narrow-screen arrows (narrow screens then
 *   only ever show the left card).
 * `className`: extra class on the card, for per-screen layout tweaks.
 * `onBack`: if given, a back arrow left of the left title calls it (on every screen size).
 * `single`: only the left panel, centered in the card on wide screens; no right side or arrows.
 * `showRight` / `onShowRightChange`: optionally control which card narrow screens show
 *   (leave both out and the card handles it itself).
 */
function BaseCard({
  title = 'Outage',
  rightTitle = title,
  children,
  rightContent,
  button,
  rightButton,
  leftPanel,
  rightPanel,
  showArrows = true,
  className = '',
  onBack,
  single = false,
  showRight: showRightProp,
  onShowRightChange,
}) {
  const [showRightState, setShowRightState] = useState(false)
  const controlled = showRightProp !== undefined
  const setShowRight = (value) => (controlled ? onShowRightChange?.(value) : setShowRightState(value))
  const showRight = !single && (controlled ? showRightProp : showRightState)

  // Animates the right side in/out; lags behind `single` while the right side animates out
  const sectionRef = useRef(null)
  const shownSingle = useCardTransitions(sectionRef, single, showRight)
  // A single-panel card never has a right side to switch to
  if (shownSingle) showArrows = false

  return (
    <section
      ref={sectionRef}
      className={`base-card${showRight ? ' base-card--show-right' : ''}${shownSingle ? ' base-card--single' : ''} ${className}`.trim()}
      aria-label={title}
    >
      <div className="card-header card-header--left">
        {onBack && (
          <button
            type="button"
            className="card-arrow card-arrow--back"
            aria-label="Back to main menu"
            onClick={onBack}
          >
            <ArrowIcon direction="prev" />
          </button>
        )}
        <h2 className="card-title">{title}</h2>
        {showArrows && (
          <button
            type="button"
            className="card-arrow card-arrow--next"
            aria-label={`Show ${rightTitle} card`}
            onClick={() => setShowRight(true)}
          >
            <ArrowIcon direction="next" />
          </button>
        )}
      </div>
      <div className="card-page card-page--left">
        {leftPanel ?? <GlassPanel>{children}</GlassPanel>}
      </div>
      <div className="card-footer card-footer--left">{button}</div>

      <div className="card-divider" aria-hidden="true" />

      <div className="card-header card-header--right">
        {showArrows && (
          <button
            type="button"
            className="card-arrow card-arrow--prev"
            aria-label={`Show ${title} card`}
            onClick={() => setShowRight(false)}
          >
            <ArrowIcon direction="prev" />
          </button>
        )}
        <h2 className="card-title">{rightTitle}</h2>
      </div>
      <div className="card-page card-page--right">
        {rightPanel ?? <GlassPanel>{rightContent}</GlassPanel>}
      </div>
      <div className="card-footer card-footer--right">{rightButton}</div>
    </section>
  )
}

export default BaseCard
