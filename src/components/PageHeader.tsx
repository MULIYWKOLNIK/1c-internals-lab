import type { ReactNode } from 'react'
import { Star } from 'lucide-react'
import { NAV_BY_SLUG } from '@/data/nav'
import { Badge } from './ui'

export function PageHeader({
  slug,
  lead,
  children,
}: {
  slug: string
  lead: ReactNode
  children?: ReactNode
}) {
  const n = NAV_BY_SLUG[slug]
  return (
    <header className="mb-6">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="accent" mono>
          {n?.no ?? '—'}
        </Badge>
        <span className="text-[11px] uppercase tracking-[0.14em] text-faint">{n?.group}</span>
        {n?.star && (
          <Badge tone="warn">
            <Star size={10} className="fill-warn" /> ключова тема
          </Badge>
        )}
      </div>
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-[30px]">
        {n?.title ?? slug}
      </h1>
      <p className="mt-2 max-w-[76ch] text-[15px] leading-7 text-muted">{lead}</p>
      {children}
    </header>
  )
}
