import './CardButton.css'

/*
 * Pill-shaped lavender button meant for the bottom area of a BaseCard.
 * Accepts any normal <button> props (onClick, disabled, type, aria-*, etc.).
 */
function CardButton({ children, className = '', type = 'button', ...props }) {
  return (
    <button type={type} className={`card-button ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}

export default CardButton
