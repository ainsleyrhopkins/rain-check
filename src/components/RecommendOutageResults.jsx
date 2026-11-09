import { useState } from 'react'
import './OutageResults.css'
import { formatRainAmount as formatAmount } from './outageOptions'

const EMPTY = '—'

const formatChance = (percent) => (percent != null ? `${percent}%` : EMPTY)

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

/* Room for a weather icon; shows a faint empty circle until there's an icon to put in it. */
function IconSlot({ icon, large = false }) {
  return (
    <span className={`rec-icon${large ? ' rec-icon--large' : ''}`} aria-hidden="true">
      {icon}
    </span>
  )
}

/*
 * Results of the "recommend an outage" check, shown in the right-hand glass panel:
 * three recommendation cards. Tapping a card expands it to fill the panel and adds the
 * closest rain event; the close button goes back to all three.
 *
 * recommendations: array of { id, icon, dateTime, rainAmount, rainChance, closestRain }
 *   icon:        element to show in the icon slot (e.g. an <img> or <svg>)
 *   dateTime:    recommended outage date + time, already formatted as text
 *   rainAmount:  inches of rain (number)
 *   rainChance:  chance of rain, 0–100 (number)
 *   closestRain: closest rain event, already formatted as date + time text
 * Anything missing shows a dash.
 *
 * status:  big text shown instead of cards when there are none (e.g. 'Searching…', 'No windows found')
 * message: extra line; under the status when there are no cards, or as a note under the cards
 */
function RecommendOutageResults({ recommendations = [], status, message }) {
  const [expandedId, setExpandedId] = useState(null)
  const expanded = recommendations.find((rec) => rec.id === expandedId)

  if (!recommendations.length) {
    return (
      <div className="outage-results" aria-live="polite">
        <p className="results-status">{status ?? EMPTY}</p>
        {message && <p className="results-message">{message}</p>}
      </div>
    )
  }

  if (expanded) {
    return (
      <div className="outage-results outage-results--cards">
        <div className="rec-card rec-card--expanded">
          <button
            type="button"
            className="rec-close"
            aria-label="Close and show all recommendations"
            onClick={() => setExpandedId(null)}
          >
            <CloseIcon />
          </button>

          <IconSlot icon={expanded.icon} large />
          <p className="rec-date rec-date--large">{expanded.dateTime ?? EMPTY}</p>

          <dl className="results-list">
            <div className="results-row">
              <dt>Amount of Rain</dt>
              <dd>{formatAmount(expanded.rainAmount)}</dd>
            </div>
            <div className="results-row">
              <dt>Chance of Rain</dt>
              <dd>{formatChance(expanded.rainChance)}</dd>
            </div>
            <div className="results-row">
              <dt>Closest Rain Event</dt>
              <dd>{expanded.closestRain ?? EMPTY}</dd>
            </div>
          </dl>
        </div>
      </div>
    )
  }

  return (
    <div className="outage-results outage-results--cards">
      {recommendations.map((rec, index) => (
        <button
          key={rec.id}
          type="button"
          className="rec-card"
          aria-label={`Recommendation ${index + 1}: show details`}
          onClick={() => setExpandedId(rec.id)}
        >
          <IconSlot icon={rec.icon} />
          <span className="rec-date">{rec.dateTime ?? EMPTY}</span>
          <span className="rec-amount">{formatAmount(rec.rainAmount)}</span>
          <span className="rec-chance">{formatChance(rec.rainChance)}</span>
        </button>
      ))}
      {message && <p className="results-message rec-note">{message}</p>}
    </div>
  )
}

export default RecommendOutageResults
