'use client'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import Icon from './Icon'
export function Button({ children, secondary = false, className = '', ...props }) {
  return (
    <button className={`${secondary ? 'button-secondary' : 'button'} ${className}`} {...props}>
      {children}
    </button>
  )
}
export function Message({ children, success = false }) {
  return children ? (
    <div
      className={`message ${success ? 'message-success' : ''}`}
      role={success ? 'status' : 'alert'}
    >
      {children}
    </div>
  ) : null
}
export function Empty({ title = 'Nothing here yet', text, href, action }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name="predictions" size={26} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {href && (
        <Link href={href} className="button-secondary">
          {action || 'Explore markets'} <Icon name="arrow" size={16} />
        </Link>
      )}
    </div>
  )
}
export function Loading({ label = 'Loading your workspace…' }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  )
}
export function ResourceError({ error, retry }) {
  return (
    <div className="error-state">
      <Message>{error?.message || 'Something went wrong'}</Message>
      <Button secondary onClick={retry}>
        Try again
      </Button>
    </div>
  )
}
export function PageHeading({ eyebrow, title, text, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  )
}
export function Stat({ label, value, detail, tone = '' }) {
  return (
    <div className="stat">
      <p>{label}</p>
      <strong className={tone}>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  )
}
export function Pagination({ page, limit = 20, total = 0, onPage }) {
  if (total <= limit) return null
  return (
    <div className="pagination">
      <span>
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </span>
      <div>
        <Button secondary disabled={page === 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button secondary disabled={page * limit >= total} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}
export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null),
    closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement,
      oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    const key = (event) => {
      if (event.key === 'Escape') closeRef.current()
      if (event.key === 'Tab') {
        const nodes = [
          ...ref.current.querySelectorAll(
            'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]',
          ),
        ].filter((n) => n.offsetParent !== null)
        const first = nodes[0],
          last = nodes[nodes.length - 1]
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', key)
    return () => {
      document.body.style.overflow = oldOverflow
      document.removeEventListener('keydown', key)
      previous?.focus?.()
    }
  }, [])
  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
