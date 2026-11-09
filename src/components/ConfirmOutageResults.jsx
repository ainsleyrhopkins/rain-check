import './OutageResults.css'

const EMPTY = '—'

// Status text -> color class (see OutageResults.css)
const STATUS_TONES = { Danger: 'danger', Caution: 'caution', Safe: 'safe' }

// Inches to 2 places; a trace of rain shows as "< 0.01" rather than rounding to 0
function formatAmount(inches) {
  if (inches == null) return EMPTY
  if (inches > 0 && inches < 0.01) return '< 0.01 in'
  return `${inches.toFixed(2)} in`
}

/*
 * Results of the "confirm an outage" check, shown in the right-hand glass panel.
 * Every prop is optional; anything missing shows a dash.
 *
 * status:       'Danger' | 'Caution' | 'Safe' (colored), or other text such as 'Checking…'
 * rainAmount:   inches of rain (number)
 * rainChance:   chance of rain, 0–100 (number)
 * closestRain:  closest rain event, already formatted as date + time text
 * message:      extra line under the status, e.g. why the check failed
 */
function ConfirmOutageResults({ status, rainAmount, rainChance, closestRain, message }) {
  const tone = STATUS_TONES[status]
  return (
    <div className="outage-results">
      <div aria-live="polite">
        <p className={`results-status${tone ? ` results-status--${tone}` : ''}`}>{status ?? EMPTY}</p>
        {message && <p className="results-message">{message}</p>}
      </div>

      <dl className="results-list">
        <div className="results-row">
          <dt>Amount of Rain</dt>
          <dd>{formatAmount(rainAmount)}</dd>
        </div>
        <div className="results-row">
          <dt>Chance of Rain</dt>
          <dd>{rainChance != null ? `${rainChance}%` : EMPTY}</dd>
        </div>
        <div className="results-row">
          <dt>Closest Rain Event</dt>
          <dd>{closestRain ?? EMPTY}</dd>
        </div>
      </dl>
    </div>
  )
}

export default ConfirmOutageResults
