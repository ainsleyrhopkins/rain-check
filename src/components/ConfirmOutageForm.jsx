import { useRef, useState } from 'react'
import './OutageForm.css'
import { DateField } from './DateField'
import { TimeField, UnitNumberInput, ValueSelect } from './OutageFields'
import { HOUR_OPTIONS, toTwentyFourHour } from './outageOptions'
import { useValidationBubble } from './ValidationBubble'
import { toFieldValue } from '../services/settingsStorage'

/*
 * Inputs for the "confirm an outage" function: is an outage with these details safe?
 *
 * The submit button lives in the BaseCard footer, outside this form, so link it with
 * the form's id:  <CardButton type="submit" form="confirm-outage-form">
 *
 * onSubmit receives: { date: 'YYYY-MM-DD', startTime: 'HH:MM' (24-hour),
 *                      duration, buffer (numbers, hours), threshold (number, inches of rain) }
 *
 * defaults: saved settings ({ duration, threshold, buffer }) to start the dropdowns on
 */
function ConfirmOutageForm({ id = 'confirm-outage-form', onSubmit, defaults = {} }) {
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [showErrors, setShowErrors] = useState(false)
  const formRef = useRef(null)
  const validationBubble = useValidationBubble(formRef)
  const [duration, setDuration] = useState(() => toFieldValue(defaults.duration))
  const [threshold, setThreshold] = useState(() => toFieldValue(defaults.threshold))
  const [buffer, setBuffer] = useState(() => toFieldValue(defaults.buffer))

  const handleSubmit = (event) => {
    event.preventDefault()
    // The time field isn't a native input, so the browser can't require it for us
    if (!startTime) {
      setShowErrors(true)
      document.getElementById(`${id}-start`)?.focus()
      return
    }
    onSubmit?.({
      date,
      startTime: toTwentyFourHour(startTime),
      duration: Number(duration),
      threshold: Number(threshold),
      buffer: Number(buffer),
    })
  }

  return (
    <form ref={formRef} id={id} className="outage-form" onSubmit={handleSubmit}>
      <div className="outage-row">
        <label className="outage-label" htmlFor={`${id}-date`}>
          Date
        </label>
        <DateField id={`${id}-date`} value={date} onChange={setDate} />
      </div>

      <div className="outage-row">
        <span className="outage-label" id={`${id}-time-label`}>
          Start Time
        </span>
        <TimeField
          id={`${id}-start`}
          label="Start Time"
          labelledBy={`${id}-time-label`}
          value={startTime}
          onChange={setStartTime}
          invalid={showErrors && !startTime}
        />
      </div>

      <div className="outage-row">
        <label className="outage-label" htmlFor={`${id}-duration`}>
          Duration
        </label>
        <ValueSelect id={`${id}-duration`} value={duration} onChange={(e) => setDuration(e.target.value)} options={HOUR_OPTIONS} />
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
      {validationBubble}
    </form>
  )
}

export default ConfirmOutageForm
