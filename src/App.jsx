import { useEffect, useRef, useState } from 'react'
import './App.css'
import BaseCard from './components/BaseCard'
import CardButton from './components/CardButton'
import ConfirmOutageForm from './components/ConfirmOutageForm'
import ConfirmOutageResults from './components/ConfirmOutageResults'
import MainMenu from './components/MainMenu'
import RecommendOutageForm from './components/RecommendOutageForm'
import RecommendOutageResults from './components/RecommendOutageResults'
import SettingsForm, { MAX_COORDINATES } from './components/SettingsForm'
import { loadSettings, saveSettings } from './services/settingsStorage'
import { confirmOutage, getBrowserLocation, recommendOutage } from './services/weatherService'
import { formatDayTime, formatTimeRange } from './components/outageOptions'

// { time, side } -> 'During window' (rain inside the window), 'Ends Tue, Nov 10, 3:00 PM'
// (rain before the window) or 'Starts …' (rain after it)
function formatClosestRain(rain) {
  if (!rain) return 'None in forecast'
  if (rain.side === 'during') return 'During window'
  return `${rain.side === 'before' ? 'Ends' : 'Starts'} ${formatDayTime(rain.time)}`
}

function App() {
  // Which screen is showing: 'menu' (start), 'confirm', 'recommend' or 'settings'.
  const [screen, setScreen] = useState('menu')

  // Outage screens: the results side only exists after a successful Confirm/Recommend.
  const [hasResults, setHasResults] = useState(false)
  // Narrow screens: whether the results card (rather than the form) is the one showing
  const [viewingResults, setViewingResults] = useState(false)
  // Bumped by Reset to start the form over (fresh entries, saved defaults filled back in)
  const [formRound, setFormRound] = useState(0)

  // Confirm results: { status, rainAmount, rainChance, message }, or null before any check
  const [confirmResult, setConfirmResult] = useState(null)
  // Numbers each check so a slow, outdated response (after Reset or a newer check) is ignored
  const confirmRequest = useRef(0)

  // Recommend results: { status, message, recommendations }, or null before any search
  const [recommendResult, setRecommendResult] = useState(null)
  const recommendRequest = useRef(0)

  const clearResults = () => {
    setHasResults(false)
    setViewingResults(false)
    setConfirmResult(null)
    setRecommendResult(null)
    confirmRequest.current++
    recommendRequest.current++
  }

  const goTo = (nextScreen) => {
    clearResults()
    setScreen(nextScreen)
  }
  const goHome = () => goTo('menu')

  // Called once a form's entries are valid: reveal the results side (narrow screens jump to it)
  const showResults = () => {
    setHasResults(true)
    setViewingResults(true)
  }

  const handleReset = () => {
    clearResults()
    setFormRound((round) => round + 1)
  }

  // The user's settings, kept in this browser (localStorage) between visits
  const [settings, setSettings] = useState(loadSettings)
  // Briefly changes the Save button's text after saving: null | 'saved' | 'failed'
  const [saveStatus, setSaveStatus] = useState(null)

  useEffect(() => {
    if (!saveStatus) return undefined
    const timer = setTimeout(() => setSaveStatus(null), 2000)
    return () => clearTimeout(timer)
  }, [saveStatus])

  const handleConfirmOutage = async (details) => {
    const request = ++confirmRequest.current
    setConfirmResult({ status: 'Checking…' })
    showResults()
    try {
      const location = await getLocation()
      const result = await confirmOutage({ ...location, ...details })
      if (request === confirmRequest.current) {
        setConfirmResult({ ...result, closestRain: formatClosestRain(result.closestRain) })
      }
    } catch (error) {
      console.error('Confirm outage failed:', error)
      if (request === confirmRequest.current) {
        setConfirmResult({ status: "Couldn't check", message: error.message })
      }
    }
  }

  // First saved coordinate (x = latitude, y = longitude), else ask the browser
  const getLocation = async () => {
    const [first] = settings.coordinates
    if (first) return { latitude: first.x, longitude: first.y }
    const location = await getBrowserLocation()
    // Remember it as the first coordinate, so Settings shows it and we don't ask again
    rememberLocation(location)
    return location
  }

  const handleRecommendOutage = async (details) => {
    const request = ++recommendRequest.current
    setRecommendResult({ status: 'Searching…' })
    showResults()
    try {
      const location = await getLocation()
      const { recommendations, forecastEnd, cutShort } = await recommendOutage({
        ...location,
        ...details,
        preferredDay: settings.preferredDay,
      })
      if (request !== recommendRequest.current) return

      const days = `${details.searchDays} ${details.searchDays === 1 ? 'day' : 'days'}`
      const notes = []
      if (recommendations.length && recommendations.length < 3) {
        notes.push(`Only ${recommendations.length} ${recommendations.length === 1 ? 'day has' : 'days have'} a window under the threshold.`)
      }
      if (cutShort) notes.push(`The forecast only reaches ${formatDayTime(forecastEnd)}, so later starts weren't checked.`)

      setRecommendResult({
        status: recommendations.length ? null : 'No windows found',
        message: recommendations.length
          ? notes.join(' ') || null
          : [
              `No outage in the next ${days} stays under ${details.threshold} in of rain` +
                (details.outsideBusinessHours ? ' outside business hours.' : '.'),
              ...notes,
            ].join(' '),
        recommendations: recommendations.map((rec) => ({
          id: rec.start.toISOString(),
          dateTime: formatTimeRange(rec.start, rec.end) + (rec.preferred ? ' ★' : ''),
          rainAmount: rec.rainAmount,
          rainChance: rec.rainChance,
          closestRain: formatClosestRain(rec.closestRain),
        })),
      })
    } catch (error) {
      console.error('Recommend outage failed:', error)
      if (request === recommendRequest.current) {
        setRecommendResult({ status: "Couldn't search", message: error.message })
      }
    }
  }

  // Puts a browser-provided location first in the saved coordinates (keeping within the limit)
  const rememberLocation = ({ latitude, longitude }) => {
    setSettings((current) => {
      const next = {
        ...current,
        coordinates: [{ x: latitude, y: longitude }, ...current.coordinates].slice(0, MAX_COORDINATES),
      }
      saveSettings(next)
      return next
    })
  }

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings)
    setSaveStatus(saveSettings(newSettings) ? 'saved' : 'failed')
  }

  let card
  if (screen === 'confirm' || screen === 'recommend') {
    const isConfirm = screen === 'confirm'
    const formId = isConfirm ? 'confirm-outage-form' : 'recommend-outage-form'
    card = (
      <BaseCard
        title="Check for Rain"
        rightTitle="Results"
        onBack={goHome}
        single={!hasResults}
        showRight={viewingResults}
        onShowRightChange={setViewingResults}
        button={
          <CardButton type="submit" form={formId}>
            {isConfirm ? 'Confirm Outage' : 'Recommend Outage'}
          </CardButton>
        }
        rightContent={isConfirm ? <ConfirmOutageResults {...confirmResult} /> : <RecommendOutageResults {...recommendResult} />}
        rightButton={<CardButton onClick={handleReset}>Reset</CardButton>}
      >
        {isConfirm ? (
          <ConfirmOutageForm key={formRound} id={formId} onSubmit={handleConfirmOutage} defaults={settings} />
        ) : (
          <RecommendOutageForm key={formRound} id={formId} onSubmit={handleRecommendOutage} defaults={settings} />
        )}
      </BaseCard>
    )
  } else if (screen === 'settings') {
    card = (
      <BaseCard
        title="Settings"
        single
        onBack={goHome}
        button={
          <CardButton type="submit" form="settings-form" aria-live="polite">
            {saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'failed' ? "Couldn't save" : 'Save'}
          </CardButton>
        }
      >
        <SettingsForm id="settings-form" onSave={handleSaveSettings} initial={settings} />
      </BaseCard>
    )
  } else {
    card = <MainMenu onSelect={goTo} />
  }

  // key={screen}: start each screen fresh (e.g. narrow screens open on the left card)
  return (
    <main className="site-background" key={screen}>
      {card}
    </main>
  )
}

export default App
