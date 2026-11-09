import './GlassPanel.css'

/*
 * A frosted-glass panel set into a BaseCard page. It fills whatever space the card page
 * leaves it (the card controls the top/bottom/side spacing) and scrolls its own content
 * if that content is taller than the panel.
 */
function GlassPanel({ children, className = '' }) {
  return <div className={`glass-panel ${className}`.trim()}>{children}</div>
}

export default GlassPanel
