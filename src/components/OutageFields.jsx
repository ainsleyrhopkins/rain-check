/*
 * Shared input pieces for the outage forms (ConfirmOutageForm, RecommendOutageForm).
 * Styles live in OutageForm.css; option lists/helpers in outageOptions.js.
 */

import { useRef, useState } from 'react'
import TimeWheelPicker from './TimeWheelPicker'
import { DEFAULT_TIME, formatTime } from './outageOptions'

/*
 * Dropdown with a grey placeholder until something is picked. Options: strings or { value, label }.
 * Required by default; with required={false} the placeholder can be picked again to clear it.
 */
export function ValueSelect({ options, placeholder = 'Value', className = '', required = true, ...props }) {
  const empty = props.value === ''
  return (
    <select
      className={`outage-control outage-select${empty ? ' is-empty' : ''} ${className}`.trim()}
      required={required}
      {...props}
    >
      <option value="" disabled={required}>
        {placeholder}
      </option>
      {options.map((option) => {
        const { value, label } = typeof option === 'string' ? { value: option, label: option } : option
        return (
          <option key={value} value={value}>
            {label}
          </option>
        )
      })}
    </select>
  )
}

/*
 * Number box with a unit shown inside it on the right (e.g. "0.25  in").
 * Any non-negative number, decimals allowed. Required by default.
 */
export function UnitNumberInput({ unit, placeholder = '0.00', required = true, className = '', ...props }) {
  return (
    <div className={`outage-control outage-unit-input ${className}`.trim()}>
      <input
        type="number"
        min="0"
        step="any"
        inputMode="decimal"
        placeholder={placeholder}
        required={required}
        {...props}
      />
      <span className="outage-unit" aria-hidden="true">
        {unit}
      </span>
    </div>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/*
 * Shows the chosen time (e.g. "9:00 AM"); tapping it opens the wheel picker.
 * value / onChange use { hour, minute, period } or null when nothing is picked.
 * `invalid` highlights the field (the form decides when a missing time is an error).
 */
export function TimeField({ id, label, labelledBy, value, onChange, invalid = false, placeholder = 'Select time' }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={`outage-control time-field${value ? '' : ' is-empty'}`}
        aria-labelledby={labelledBy ? `${labelledBy} ${id}` : undefined}
        aria-haspopup="dialog"
        aria-invalid={invalid || undefined}
        onClick={() => setOpen(true)}
      >
        <span>{value ? formatTime(value) : placeholder}</span>
        <ClockIcon />
      </button>
      {open && (
        <TimeWheelPicker
          title={label}
          initial={value ?? DEFAULT_TIME}
          onConfirm={(time) => {
            onChange(time)
            close()
          }}
          onClose={close}
        />
      )}
    </>
  )
}

/** On/off switch. Plum fill when on. */
export function Switch({ id, checked, onChange, ...props }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      className="outage-switch"
      onClick={() => onChange(!checked)}
      {...props}
    >
      <span className="outage-switch-thumb" />
    </button>
  )
}
