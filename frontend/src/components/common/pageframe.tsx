import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  meta?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions, meta }: PageHeaderProps) {
  return (
    <header className="hd-page-header">
      <div className="hd-page-header__content">
        {eyebrow ? <div className="hd-page-header__eyebrow">{eyebrow}</div> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {meta ? <div className="hd-page-header__meta">{meta}</div> : null}
      </div>
      {actions ? <div className="hd-page-header__actions">{actions}</div> : null}
    </header>
  )
}

interface PageSectionProps {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function PageSection({ title, description, actions, children, className }: PageSectionProps) {
  return (
    <section className={`hd-section${className ? ` ${className}` : ''}`}>
      {title || description || actions ? (
        <div className="hd-section__header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="hd-section__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="hd-section__content">{children}</div>
    </section>
  )
}
