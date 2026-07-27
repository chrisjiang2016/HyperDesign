import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Fragment } from 'react'

export interface BreadcrumbItem {
  title: ReactNode
  href?: string
}

export function PageBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="hd-breadcrumb page-breadcrumb" aria-label="breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <Fragment key={`${String(item.title)}-${index}`}>
            {index > 0 ? <span>/</span> : null}
            {item.href && !isLast ? (
              <Link to={item.href}>{item.title}</Link>
            ) : (
              <span className={isLast ? 'is-current' : undefined}>{item.title}</span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
