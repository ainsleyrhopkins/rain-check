/* Shared option lists and helpers for the outage forms */

export const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
export const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
export const PERIODS = ['AM', 'PM']

/** Where the time wheel starts when a field has no time yet */
export const DEFAULT_TIME = { hour: '9', minute: '00', period: 'AM' }

/** Options 1–count labelled with a unit, e.g. "1 hr", "2 hrs" / "1 day", "2 days" */
export function oneTo(count, singular, plural) {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1
    return { value: String(n), label: `${n} ${n === 1 ? singular : plural}` }
  })
}

export const HOUR_OPTIONS = oneTo(10, 'hr', 'hrs')
// The weather service only forecasts about 7 days ahead
export const DAY_OPTIONS = oneTo(7, 'day', 'days')

const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

const sameDay = (a, b) => a.toDateString() === b.toDateString()

/** Date -> 'Tue, Nov 10, 7:00 PM' */
export const formatDayTime = (date) => `${dayFormat.format(date)}, ${timeFormat.format(date)}`

/** Outage start + end -> 'Tue, Nov 10, 7:00 PM – 11:00 PM' (adds the end's weekday if it's another day) */
export function formatTimeRange(start, end) {
  const endText = sameDay(start, end) ? timeFormat.format(end) : `${weekdayFormat.format(end)} ${timeFormat.format(end)}`
  return `${formatDayTime(start)} – ${endText}`
}

/** Inches to 2 places; a trace of rain shows as '< 0.01 in' rather than rounding to 0 */
export function formatRainAmount(inches) {
  if (inches == null) return '—'
  if (inches > 0 && inches < 0.01) return '< 0.01 in'
  return `${inches.toFixed(2)} in`
}

/** { hour: '9', minute: '05', period: 'AM' } -> '9:05 AM' */
export function formatTime(time) {
  return time ? `${time.hour}:${time.minute} ${time.period}` : ''
}

/** '14:30' -> { hour: '2', minute: '30', period: 'PM' }  (null if missing or not a valid time) */
export function fromTwentyFourHour(text) {
  const match = typeof text === 'string' ? text.match(/^(\d{1,2}):(\d{2})$/) : null
  if (!match) return null
  const h = Number(match[1])
  const minute = match[2]
  if (h > 23 || Number(minute) > 59) return null
  return { hour: String(h % 12 || 12), minute, period: h < 12 ? 'AM' : 'PM' }
}

/** { hour: '2', minute: '30', period: 'PM' } -> '14:30'  (null if no time picked) */
export function toTwentyFourHour(time) {
  if (!time) return null
  let h = Number(time.hour) % 12
  if (time.period === 'PM') h += 12
  return `${String(h).padStart(2, '0')}:${time.minute}`
}
