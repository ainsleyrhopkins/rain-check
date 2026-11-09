import './CloudPanel.css'
import cloudFrame from '../assets/cloudFrame.png'

/*
 * Cloud-shaped panel that takes the glass panel's place in a BaseCard page.
 * The cloud image stretches to fill the panel area; its content is centered on it.
 */
function CloudPanel({ children, className = '' }) {
  return (
    <div
      className={`cloud-panel ${className}`.trim()}
      style={{ backgroundImage: `url(${cloudFrame})` }}
    >
      {children}
    </div>
  )
}

export default CloudPanel
