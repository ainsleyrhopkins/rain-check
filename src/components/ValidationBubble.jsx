import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './ValidationBubble.css'

/*
 * Replaces the browser's own "Please fill out this field." bubble (whose orange icon
 * can't be styled) with our own, under the first invalid field of a form.
 *
 * Usage:
 *   const formRef = useRef(null)
 *   const bubble = useValidationBubble(formRef)
 *   return <form ref={formRef}>…{bubble}</form>
 */
export function useValidationBubble(formRef) {
  const [target, setTarget] = useState(null) // { el, message }
  const [rect, setRect] = useState(null)
  const shownThisSubmit = useRef(false)

  // Catch every field's 'invalid' event (it doesn't bubble, so listen in the capture phase)
  useEffect(() => {
    const form = formRef.current
    if (!form) return undefined

    const onInvalid = (event) => {
      event.preventDefault() // no native bubble
      // One submit fires 'invalid' for every bad field; only point at the first
      if (shownThisSubmit.current) return
      shownThisSubmit.current = true
      setTimeout(() => {
        shownThisSubmit.current = false
      }, 0)

      const el = event.target
      el.focus({ preventScroll: true })
      el.scrollIntoView({ block: 'nearest' })
      setTarget({ el, message: el.validationMessage })
      setRect(el.getBoundingClientRect())
    }

    form.addEventListener('invalid', onInvalid, true)
    return () => form.removeEventListener('invalid', onInvalid, true)
  }, [formRef])

  // While shown: follow the field as things scroll; hide on edit, after a few seconds, or on tap elsewhere
  useEffect(() => {
    if (!target) return undefined
    const { el } = target
    const hide = () => setTarget(null)
    const follow = () => (el.isConnected ? setRect(el.getBoundingClientRect()) : hide())
    const hideOnOutsideTap = (event) => {
      if (!el.contains(event.target)) hide()
    }

    const timer = setTimeout(hide, 5000)
    el.addEventListener('input', hide)
    el.addEventListener('change', hide)
    document.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    document.addEventListener('pointerdown', hideOnOutsideTap, true)

    return () => {
      clearTimeout(timer)
      el.removeEventListener('input', hide)
      el.removeEventListener('change', hide)
      document.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
      document.removeEventListener('pointerdown', hideOnOutsideTap, true)
    }
  }, [target])

  if (!target || !rect) return null

  return createPortal(
    <div
      className="validation-bubble"
      role="alert"
      style={{ top: rect.bottom + 10, left: Math.max(8, rect.left) }}
    >
      <span className="validation-bubble-icon" aria-hidden="true">
        !
      </span>
      {target.message}
    </div>,
    document.body,
  )
}
