/*
 * Saves the user's settings in this browser (localStorage), so they come back on every
 * visit. Nothing leaves the device. They're lost if the user clears site data, and in
 * a private window they only last until it closes.
 *
 * Settings shape:
 *   { buffer, duration (numbers, hours, or null),
 *     threshold (number, inches of rain, 0 or more, or null),
 *     preferredDay ('Monday'…'Sunday', or null),
 *     businessHoursStart, businessHoursEnd ('HH:MM', 24-hour, or null),
 *     coordinates: [{ x, y }] (numbers) }
 */

import { fromTwentyFourHour } from '../components/outageOptions'

const STORAGE_KEY = 'raincheck-settings'

export const DEFAULT_SETTINGS = {
  buffer: null,
  threshold: null,
  duration: null,
  preferredDay: null,
  businessHoursStart: null,
  businessHoursEnd: null,
  coordinates: [],
}

const numberOrNull = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

const timeOrNull = (value) => (fromTwentyFourHour(value) ? value : null)

const thresholdOrNull = (value) => (numberOrNull(value) !== null && value >= 0 ? value : null)

/* Returns the saved settings, or the defaults if nothing's saved / storage is unavailable / data is broken */
export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!saved || typeof saved !== 'object') return DEFAULT_SETTINGS
    return {
      buffer: numberOrNull(saved.buffer),
      threshold: thresholdOrNull(saved.threshold),
      duration: numberOrNull(saved.duration),
      preferredDay: typeof saved.preferredDay === 'string' ? saved.preferredDay : null,
      businessHoursStart: timeOrNull(saved.businessHoursStart),
      businessHoursEnd: timeOrNull(saved.businessHoursEnd),
      coordinates: Array.isArray(saved.coordinates)
        ? saved.coordinates.filter((pair) => numberOrNull(pair?.x) !== null && numberOrNull(pair?.y) !== null)
        : [],
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

/* Returns true if saved, false if the browser refused (e.g. storage blocked or full) */
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}

/* For filling form fields: number -> '3', null -> '' */
export const toFieldValue = (value) => (value == null ? '' : String(value))
