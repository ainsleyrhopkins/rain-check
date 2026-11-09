import { useRef, useState } from 'react'
import './OutageForm.css'
import { Switch, TimeField, UnitNumberInput, ValueSelect } from './OutageFields'
import { DAY_OPTIONS, HOUR_OPTIONS, fromTwentyFourHour, toTwentyFourHour } from './outageOptions'
import { useValidationBubble } from './ValidationBubble'
import { toFieldValue } from '../services/settingsStorage'

/*
 * Inputs for the "recommend an outage window" function.
 *
 * The submit button lives in the BaseCard footer, outside this form, so link it with
 * the form's id:  <CardButton type="submit" form="recommend-outage-form">
 *
 * onSubmit receives: { duration, buffer (hours), threshold (inches of rain), searchDays (days),
 *                      outsideBusinessHours (boolean),
 *                      businessHoursStart, businessHoursEnd ('HH:MM', 24-hour,
 *                      or null when Outside Business Hours is off) }
 *
 * defaults: saved settings ({ duration, threshold, buffer, businessHoursStart,
 *           businessHoursEnd }) to start the fields on
 *
 * The business hours fields only show while Outside Business Hours is switched on.
 */
function RecommendOutageForm({ id = 'recommend-outage-form', onSubmit, defaults = {} }) {
  const [duration, setDuration] = useState(() => toFieldValue(defaults.duration))
  const [searchDays, setSearchDays] = useState('')
  const [threshold, setThreshold] = useState(() => toFieldValue(defaults.threshold))
  const [buffer, setBuffer] = useState(() => toFieldValue(defaults.buffer))
  const [outsideBusinessHours, setOutsideBusinessHours] = useState(false)
  const [businessStart, setBusinessStart] = useState(() => fromTwentyFourHour(defaults.businessHoursStart))
  const [businessEnd, setBusinessEnd] = useState(() => fromTwentyFourHour(defaults.businessHoursEnd))
  const [showErrors, setShowErrors] = useState(false)
  const formRef = useRef(null)
  const validationBubble = useValidationBubble(formRef)

  // Business hours only matter (and are only required) when the switch is on
  const startMissing = outsideBusinessHours && !businessStart
  const endMissing = outsideBusinessHours && !businessEnd

  const handleSubmit = (event) => {
    event.preventDefault()
    // The time fields aren't native inputs, so the browser can't require them for us
    if (startMissing || endMissing) {
      setShowErrors(true)
      document.getElementById(startMissing ? `${id}-start` : `${id}-end`)?.focus()
      return
    }
    onSubmit?.({
      duration: Number(duration),
      searchDays: Number(searchDays),
      threshold: Number(threshold),
      buffer: Number(buffer),
      outsideBusinessHours,
      businessHoursStart: outsideBusinessHours ? toTwentyFourHour(businessStart) : null,
      businessHoursEnd: outsideBusinessHours ? toTwentyFourHour(businessEnd) : null,
    })
  }

  return (
    <form ref={formRef} id={id} className="outage-form outage-form--compact" onSubmit={handleSubmit}>
      <div className="outage-row">
        <label className="outage-label" htmlFor={`${id}-duration`}>
          Duration
        </label>
        <ValueSelect id={`${id}-duration`} value={duration} onChange={(e) => setDuration(e.target.value)} options={HOUR_OPTIONS} />
      </div>

      <div className="outage-row">
        <label className="outage-label" htmlFor={`${id}-search`}>
          Search Next
        </label>
        <ValueSelect id={`${id}-search`} value={searchDays} onChange={(e) => setSearchDays(e.target.value)} options={DAY_OPTIONS} />
      </div>

      <div className="outage-row">
        <label className="outage-label" htmlFor={`${id}-threshold`}>
          Threshold
        </label>
        <UnitNumberInput id={`${id}-threshold`} unit="in" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
      </div>

      <div className="outage-row">
        <label className="outage-label" htmlFor={`${id}-buffer`}>
          Buffer
        </label>
        <ValueSelect id={`${id}-buffer`} value={buffer} onChange={(e) => setBuffer(e.target.value)} options={HOUR_OPTIONS} />
      </div>

      <div className="outage-row">
        <label className="outage-label" htmlFor={`${id}-outside`}>
          Outside Business Hours
        </label>
        <Switch id={`${id}-outside`} checked={outsideBusinessHours} onChange={setOutsideBusinessHours} />
      </div>

      {/* Only shown (and only required) while Outside Business Hours is on */}
      {outsideBusinessHours && (
        <>
          <div className="outage-row">
            <span className="outage-label" id={`${id}-start-label`}>
              Business Hours
            </span>
            <TimeField
              id={`${id}-start`}
              label="Business Hours Start"
              labelledBy={`${id}-start-label`}
              value={businessStart}
              onChange={setBusinessStart}
              invalid={showErrors && startMissing}
            />
          </div>

          <div className="outage-row">
            <span className="outage-label" id={`${id}-end-label`}>
              To
            </span>
            <TimeField
              id={`${id}-end`}
              label="Business Hours End"
              labelledBy={`${id}-end-label`}
              value={businessEnd}
              onChange={setBusinessEnd}
              invalid={showErrors && endMissing}
            />
          </div>
        </>
      )}
      {validationBubble}
    </form>
  )
}

export default RecommendOutageForm
