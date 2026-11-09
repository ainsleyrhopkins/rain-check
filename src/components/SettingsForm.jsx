import { useRef, useState } from 'react'
import './OutageForm.css'
import './SettingsForm.css'
import { TimeField, UnitNumberInput, ValueSelect } from './OutageFields'
import { HOUR_OPTIONS, fromTwentyFourHour, toTwentyFourHour } from './outageOptions'
import { useValidationBubble } from './ValidationBubble'
import { DEFAULT_SETTINGS, toFieldValue } from '../services/settingsStorage'
import { getBrowserLocation } from '../services/weatherService'

const LOCATION_ERRORS = {
  unsupported: 'This browser can’t share its location.',
  denied: 'Location access was denied. Allow it in your browser to use this.',
  unavailable: 'Couldn’t get your location. Try again.',
}

function LocateIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="6.5" />
        <path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22" />
      </g>
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  )
}

export const MAX_COORDINATES = 10

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

let nextPairId = 1
const newPair = (x = '', y = '') => ({ id: nextPairId++, x, y })

// Saved coordinates -> editable pairs (always at least one row to type into)
const toPairs = (coordinates) =>
  coordinates.length ? coordinates.map(({ x, y }) => newPair(String(x), String(y))) : [newPair()]

function RemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

/*
 * Default values for the outage forms, plus up to 10 X/Y coordinate pairs.
 *
 * The Save button lives in the BaseCard footer, outside this form, so link it with
 * the form's id:  <CardButton type="submit" form="settings-form">
 *
 * Nothing is required. `initial` is the saved settings to start from.
 *
 * onSave receives: { buffer, duration (numbers, hours, or null if not set),
 *                    threshold (number, inches of rain, or null if not set),
 *                    preferredDay ('Monday'…'Sunday', or null if not set),
 *                    businessHoursStart, businessHoursEnd ('HH:MM', 24-hour, or null if not set),
 *                    coordinates: [{ x, y }] (numbers; pairs missing X or Y are left out) }
 */
function SettingsForm({ id = 'settings-form', onSave, initial = DEFAULT_SETTINGS }) {
  const [buffer, setBuffer] = useState(() => toFieldValue(initial.buffer))
  const [threshold, setThreshold] = useState(() => toFieldValue(initial.threshold))
  const [duration, setDuration] = useState(() => toFieldValue(initial.duration))
  const [preferredDay, setPreferredDay] = useState(() => initial.preferredDay ?? '')
  const [businessStart, setBusinessStart] = useState(() => fromTwentyFourHour(initial.businessHoursStart))
  const [businessEnd, setBusinessEnd] = useState(() => fromTwentyFourHour(initial.businessHoursEnd))
  const [pairs, setPairs] = useState(() => toPairs(initial.coordinates))
  const formRef = useRef(null)
  const validationBubble = useValidationBubble(formRef)

  const updatePair = (pairId, field, value) =>
    setPairs((current) => current.map((pair) => (pair.id === pairId ? { ...pair, [field]: value } : pair)))

  const addPair = () => setPairs((current) => (current.length < MAX_COORDINATES ? [...current, newPair()] : current))

  const removePair = (pairId) => setPairs((current) => current.filter((pair) => pair.id !== pairId))

  // Which pair is waiting on the browser's location (null if none), and the last failure message
  const [locatingId, setLocatingId] = useState(null)
  const [locationError, setLocationError] = useState('')

  // Fills a pair with the browser's current location (X = latitude, Y = longitude)
  const fillCurrentLocation = async (pairId) => {
    setLocatingId(pairId)
    setLocationError('')
    try {
      const { latitude, longitude } = await getBrowserLocation()
      setPairs((current) =>
        current.map((pair) => (pair.id === pairId ? { ...pair, x: String(latitude), y: String(longitude) } : pair)),
      )
    } catch (error) {
      setLocationError(LOCATION_ERRORS[error.reason] ?? LOCATION_ERRORS.unavailable)
    } finally {
      setLocatingId(null)
    }
  }

  const numberOrNull = (value) => (value === '' ? null : Number(value))

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave?.({
      buffer: numberOrNull(buffer),
      threshold: numberOrNull(threshold),
      duration: numberOrNull(duration),
      preferredDay: preferredDay || null,
      businessHoursStart: toTwentyFourHour(businessStart),
      businessHoursEnd: toTwentyFourHour(businessEnd),
      coordinates: pairs
        .filter((pair) => pair.x !== '' && pair.y !== '')
        .map((pair) => ({ x: Number(pair.x), y: Number(pair.y) })),
    })
  }

  return (
    <form ref={formRef} id={id} className="outage-form outage-form--compact settings-form" onSubmit={handleSubmit}>
      <div className="outage-row">
        <label className="outage-label" htmlFor={`${id}-buffer`}>
          Default Buffer
        </label>
        <ValueSelect id={`${id}-buffer`} value={buffer} onChange={(e) => setBuffer(e.target.value)} options={HOUR_OPTIONS} required={false} />
      </div>

      <div className="outage-row">
        <label className="outage-label" htmlFor={`${id}-threshold`}>
          Default Threshold
        </label>
        <UnitNumberInput id={`${id}-threshold`} unit="in" value={threshold} onChange={(e) => setThreshold(e.target.value)} required={false} />
      </div>

      <div className="outage-row">
        <label className="outage-label" htmlFor={`${id}-duration`}>
          Default Duration
        </label>
        <ValueSelect id={`${id}-duration`} value={duration} onChange={(e) => setDuration(e.target.value)} options={HOUR_OPTIONS} required={false} />
      </div>

      <div className="outage-row">
        <label className="outage-label" htmlFor={`${id}-day`}>
          Preferred Day
        </label>
        <ValueSelect
          id={`${id}-day`}
          value={preferredDay}
          onChange={(e) => setPreferredDay(e.target.value)}
          options={WEEKDAYS}
          placeholder="Day"
          required={false}
        />
      </div>

      <div className="outage-row">
        <span className="outage-label" id={`${id}-start-label`}>
          Business Hours Start
        </span>
        <TimeField
          id={`${id}-start`}
          label="Business Hours Start"
          labelledBy={`${id}-start-label`}
          value={businessStart}
          onChange={setBusinessStart}
          placeholder="Not set"
        />
      </div>

      <div className="outage-row">
        <span className="outage-label" id={`${id}-end-label`}>
          Business Hours End
        </span>
        <TimeField
          id={`${id}-end`}
          label="Business Hours End"
          labelledBy={`${id}-end-label`}
          value={businessEnd}
          onChange={setBusinessEnd}
          placeholder="Not set"
        />
      </div>

      <fieldset className="settings-coords">
        <legend className="outage-label">
          Coordinates{' '}
          <span className="settings-count">
            ({pairs.length}/{MAX_COORDINATES})
          </span>
        </legend>

        {pairs.map((pair, index) => (
          <div className="settings-pair" key={pair.id}>
            <span className="settings-pair-number" aria-hidden="true">
              {index + 1}.
            </span>
            <label className="settings-coord-label settings-lat-label" htmlFor={`${id}-lat-${pair.id}`}>
              Latitude
            </label>
            <input
              id={`${id}-lat-${pair.id}`}
              className="outage-control settings-coord settings-lat"
              type="number"
              step="any"
              min="-90"
              max="90"
              inputMode="decimal"
              placeholder=""
              aria-label={`Pair ${index + 1} latitude`}
              value={pair.x}
              onChange={(e) => updatePair(pair.id, 'x', e.target.value)}
            />
            <label className="settings-coord-label settings-lon-label" htmlFor={`${id}-lon-${pair.id}`}>
              Longitude
            </label>
            <input
              id={`${id}-lon-${pair.id}`}
              className="outage-control settings-coord settings-lon"
              type="number"
              step="any"
              min="-180"
              max="180"
              inputMode="decimal"
              placeholder=""
              aria-label={`Pair ${index + 1} longitude`}
              value={pair.y}
              onChange={(e) => updatePair(pair.id, 'y', e.target.value)}
            />
            <button
              type="button"
              className="settings-icon-button settings-locate"
              aria-label={`Use current location for pair ${index + 1}`}
              title="Use current location"
              onClick={() => fillCurrentLocation(pair.id)}
              disabled={locatingId !== null}
              aria-busy={locatingId === pair.id}
            >
              <LocateIcon />
            </button>
            <button
              type="button"
              className="settings-icon-button settings-remove"
              aria-label={`Remove pair ${index + 1}`}
              onClick={() => removePair(pair.id)}
            >
              <RemoveIcon />
            </button>
          </div>
        ))}

        {locationError && (
          <p className="settings-location-error" role="alert">
            {locationError}
          </p>
        )}

        <button type="button" className="settings-add" onClick={addPair} disabled={pairs.length >= MAX_COORDINATES}>
          {pairs.length >= MAX_COORDINATES ? `Maximum of ${MAX_COORDINATES} pairs` : '+ Add coordinate pair'}
        </button>
      </fieldset>
      {validationBubble}
    </form>
  )
}

export default SettingsForm
