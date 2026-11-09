import { useEffect, useRef, useState } from 'react'

// Two Enter presses within this long count as a double Enter (fills in today)
const DOUBLE_ENTER_MS = 500

const pad = (n) => String(n).padStart(2, '0')

/** Today in this device's time zone, as 'YYYY-MM-DD' */
export function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** 'YYYY-MM-DD' -> 'MM/DD/YYYY' ('' stays '') */
function isoToText(iso) {
  const [y, m, d] = iso.split('-')
  return iso ? `${m}/${d}/${y}` : ''
}

/*
 * Typed text -> 'YYYY-MM-DD', or null if it isn't a real date. Accepts:
 *   11/8/2026, 11-08-2026, 11.8.26, 11 8 2026, 11082026, 2026-11-08
 */
export function parseDateText(text) {
  const t = text.trim()
  let y, m, d
  let match
  if ((match = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
    ;[, y, m, d] = match
  } else if ((match = t.match(/^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{2}|\d{4})$/))) {
    ;[, m, d, y] = match
  } else if ((match = t.match(/^(\d{2})(\d{2})(\d{4})$/))) {
    ;[, m, d, y] = match
  } else {
    return null
  }
  y = Number(y.length === 2 ? `20${y}` : y)
  m = Number(m)
  d = Number(d)
  // Reject impossible dates like 2/30 (Date would roll them over into March)
  const check = new Date(y, m - 1, d)
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/*
 * Date box you can type into (MM/DD/YYYY, plus the other formats parseDateText accepts),
 * with a calendar button that opens the browser's date picker.
 * Pressing Enter twice quickly fills in today's date. Enter in this box doesn't submit the form.
 *
 * value / onChange use 'YYYY-MM-DD' ('' while empty or not a real date yet).
 */
export function DateField({ id, value, onChange, required = true }) {
  const [text, setText] = useState(() => isoToText(value))
  const textRef = useRef(null)
  const pickerRef = useRef(null)
  const lastEnter = useRef(0)

  // Value changed from outside (picker, double Enter, a reset): show it in the box
  useEffect(() => {
    if (value !== (parseDateText(text) ?? '')) setText(isoToText(value))
    // only react to the value changing, not to every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Typed something that isn't a date: block submitting, with a helpful message
  useEffect(() => {
    textRef.current?.setCustomValidity(text.trim() && !parseDateText(text) ? 'Enter a date as MM/DD/YYYY.' : '')
  }, [text])

  const setFromIso = (iso) => {
    setText(isoToText(iso))
    onChange(iso)
  }

  const handleType = (event) => {
    const typed = event.target.value
    setText(typed)
    onChange(parseDateText(typed) ?? '')
  }

  // Tidy a valid typed date into MM/DD/YYYY when leaving the box
  const handleBlur = () => {
    const iso = parseDateText(text)
    if (iso) setText(isoToText(iso))
  }

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault() // don't submit the form from here
    const now = Date.now()
    if (now - lastEnter.current < DOUBLE_ENTER_MS) {
      setFromIso(todayIso())
      lastEnter.current = 0
    } else {
      handleBlur()
      lastEnter.current = now
    }
  }

  const openPicker = () => {
    const picker = pickerRef.current
    try {
      picker.showPicker()
    } catch {
      // Browser can't open the picker from here: let them type instead
      textRef.current?.focus()
    }
  }

  return (
    <div className="outage-control outage-date">
      <input
        ref={textRef}
        id={id}
        type="text"
        inputMode="text"
        autoComplete="off"
        placeholder="MM/DD/YYYY"
        value={text}
        onChange={handleType}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        required={required}
      />
      {/* Invisible native date input, only there to provide the picker */}
      <input
        ref={pickerRef}
        className="outage-date-picker"
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={(e) => setFromIso(e.target.value)}
      />
      <button type="button" className="outage-date-button" aria-label="Open date picker" onClick={openPicker}>
        <CalendarIcon />
      </button>
    </div>
  )
}
