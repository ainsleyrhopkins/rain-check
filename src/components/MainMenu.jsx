import BaseCard from './BaseCard'
import CardButton from './CardButton'
import CloudPanel from './CloudPanel'

/*
 * First screen of the site: a single centered cloud panel with the menu buttons.
 * `onSelect(screen)` is called with 'confirm', 'recommend' or 'settings'.
 */
function MainMenu({ onSelect }) {
  return (
    <BaseCard
      title="Rain Check"
      single
      leftPanel={
        <CloudPanel>
          <CardButton onClick={() => onSelect('confirm')}>Confirm Outage</CardButton>
          <CardButton onClick={() => onSelect('recommend')}>Recommend Outage</CardButton>
          <CardButton onClick={() => onSelect('settings')}>Settings</CardButton>
        </CloudPanel>
      }
    />
  )
}

export default MainMenu
