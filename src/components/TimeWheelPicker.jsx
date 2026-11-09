import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './TimeWheelPicker.css'
import CardButton from './CardButton'
import { HOURS, MINUTES, PERIODS } from './outageOptions'

const ITEM_HEIGHT = 40 // px — keep in sync with --wheel-item in TimeWheelPicker.css
const LOOP_COPIES = 7 // looping wheels repeat their list so you can keep scrolling

/*
 * One scrolling column of the wheel. The row in the middle band is the selected value.
 * Scroll / swipe, click a row, or use the arrow keys to change it.
 */
function WheelColumn({ options, value, onChange, label, loop = false, format = (v) => v }) {
  const ref = useRef(null)
  const settleTimer = useRef(null)
  const count = options.length
  const copies = loop ? LOOP_COPIES : 1
  const middleStart = loop ? Math.floor(copies / 2) * count : 0

  const items = useMemo(
    () => Array.from({ length: count * copies }, (_, i) => options[i % count]),
    [options, count, copies],
  )

  // Scroll the starting value into the middle band. Waits a frame so the dialog is
  // visible first (scroll position can't be set on a hidden element).
  useLayoutEffect(() => {
    const start = Math.max(0, options.indexOf(value))
    const frame = requestAnimationFrame(() => {
      if (ref.current) ref.current.scrollTop = (middleStart + start) * ITEM_HEIGHT
    })
    return () => cancelAnimationFrame(frame)
    // Only on open: after that, scrolling drives the value, not the other way round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => clearTimeout(settleTimer.current), [])

  // Once scrolling stops, read which row landed in the band
  const settle = () => {
    const el = ref.current
    if (!el) return
    const index = Math.round(el.scrollTop / ITEM_HEIGHT)
    const valueIndex = ((index % count) + count) % count
    // Looping: if we've drifted into the first/last copy, jump back to the middle copy
    if (loop && (index < count || index >= count * (copies - 1))) {
      el.scrollTop = (middleStart + valueIndex) * ITEM_HEIGHT
    }
    onChange(options[valueIndex])
  }

  const handleScroll = () => {
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(settle, 100)
  }

  const scrollToIndex = (index) => {
    const max = items.length - 1
    ref.current?.scrollTo({ top: Math.min(max, Math.max(0, index)) * ITEM_HEIGHT, behavior: 'smooth' })
  }

  const handleKeyDown = (event) => {
    const current = Math.round(ref.current.scrollTop / ITEM_HEIGHT)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      scrollToIndex(current + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      scrollToIndex(current - 1)
    }
  }

  return (
    <div
      ref={ref}
      className="wheel-column"
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="spinbutton"
      aria-label={label}
      aria-valuetext={format(value)}
    >
      {items.map((option, i) => (
        <div key={i} className="wheel-item" onClick={() => scrollToIndex(i)} aria-hidden="true">
          {format(option)}
        </div>
      ))}
    </div>
  )
}

/*
 * Pop-up time picker with hour / minute / am-pm wheels.
 * Mount it only while open; it opens itself as a modal and calls onClose on
 * Cancel, Esc, or a click outside. Done calls onConfirm({ hour, minute, period }).
 */
function TimeWheelPicker({ title, initial, onConfirm, onClose }) {
  const dialogRef = useRef(null)
  const [draft, setDraft] = useState(initial)

  // Open as a modal on mount. No close() on cleanup: unmounting removes the dialog
  // anyway, and calling close() there fires a delayed "close" event. In React
  // StrictMode (dev), which mounts → unmounts → remounts, that event arrives after the
  // remount and immediately shuts the picker again.
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog.open) dialog.showModal()
  }, [])

  const set = (field) => (val) => setDraft((prev) => ({ ...prev, [field]: val }))

  return (
    <dialog
      ref={dialogRef}
      className="time-dialog"
      aria-label={title ? `Choose ${title}` : 'Choose a time'}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose() // clicked the backdrop
      }}
    >
      <div className="time-dialog-body">
        {title && <h3 className="time-dialog-title">{title}</h3>}

        <div className="wheel">
          <div className="wheel-band" aria-hidden="true" />
          <WheelColumn label="Hour" options={HOURS} value={draft.hour} onChange={set('hour')} loop />
          <div className="wheel-colon" aria-hidden="true">
            :
          </div>
          <WheelColumn label="Minute" options={MINUTES} value={draft.minute} onChange={set('minute')} loop />
          <WheelColumn
            label="AM or PM"
            options={PERIODS}
            value={draft.period}
            onChange={set('period')}
            format={(v) => v.toLowerCase()}
          />
        </div>

        <div className="time-dialog-actions">
          <button type="button" className="time-dialog-cancel" onClick={onClose}>
            Cancel
          </button>
          <CardButton onClick={() => onConfirm(draft)}>Done</CardButton>
        </div>
      </div>
    </dialog>
  )
}

export default TimeWheelPicker
