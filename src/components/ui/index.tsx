import { useState, type ReactNode } from 'react'
import { ChevronDown, Info, AlertTriangle, CheckCircle2, Lightbulb, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

/* ------------------------------- Card ------------------------------- */

export function Card({
  children,
  className,
  tone = 'default',
}: {
  children: ReactNode
  className?: string
  tone?: 'default' | 'raised' | 'ghost'
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line',
        tone === 'default' && 'bg-surface shadow-panel',
        tone === 'raised' && 'bg-elevated',
        tone === 'ghost' && 'bg-transparent',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  icon,
  right,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <div className="mt-0.5 shrink-0 text-accent">{icon}</div>}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold tracking-tight">{title}</div>
          {subtitle && <div className="mt-0.5 text-xs leading-5 text-muted">{subtitle}</div>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

/* ------------------------------ Section ----------------------------- */

export function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string
  eyebrow?: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3">
        {eyebrow && (
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
            {eyebrow}
          </div>
        )}
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  )
}

/* ------------------------------ Callout ----------------------------- */

const CALLOUT_STYLE = {
  info: { icon: Info, cls: 'border-accent/35 bg-accent/[0.07]', text: 'text-accent' },
  key: { icon: Lightbulb, cls: 'border-violet/40 bg-violet/[0.08]', text: 'text-violet' },
  warn: { icon: AlertTriangle, cls: 'border-warn/40 bg-warn/[0.08]', text: 'text-warn' },
  ok: { icon: CheckCircle2, cls: 'border-ok/40 bg-ok/[0.08]', text: 'text-ok' },
  danger: { icon: XCircle, cls: 'border-danger/40 bg-danger/[0.08]', text: 'text-danger' },
} as const

export function Callout({
  kind = 'info',
  title,
  children,
}: {
  kind?: keyof typeof CALLOUT_STYLE
  title?: string
  children: ReactNode
}) {
  const s = CALLOUT_STYLE[kind]
  const Icon = s.icon
  return (
    <div className={cn('rounded-lg border px-4 py-3', s.cls)}>
      <div className="flex gap-2.5">
        <Icon size={16} className={cn('mt-0.5 shrink-0', s.text)} />
        <div className="min-w-0 text-[14px] leading-6 text-fg/90">
          {title && <div className={cn('mb-0.5 font-semibold', s.text)}>{title}</div>}
          {children}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- CodeBlock ---------------------------- */

export function CodeBlock({
  code,
  lang = '1c',
  caption,
  className,
}: {
  code: string
  lang?: string
  caption?: string
  className?: string
}) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-elevated', className)}>
      {(caption || lang) && (
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
          <span className="text-[11px] text-muted">{caption}</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-faint">{lang}</span>
        </div>
      )}
      <pre className="scroll-thin overflow-x-auto px-3 py-2.5">
        <code className="whitespace-pre font-mono text-[12px] leading-[1.7] text-fg/90">{code}</code>
      </pre>
    </div>
  )
}

/* ------------------------------- Badge ------------------------------ */

const BADGE_TONE = {
  neutral: 'border-line bg-elevated text-muted',
  accent: 'border-accent/40 bg-accent/10 text-accent',
  ok: 'border-ok/40 bg-ok/10 text-ok',
  warn: 'border-warn/40 bg-warn/10 text-warn',
  danger: 'border-danger/40 bg-danger/10 text-danger',
  violet: 'border-violet/40 bg-violet/10 text-violet',
  cyan: 'border-cyan/40 bg-cyan/10 text-cyan',
} as const

export function Badge({
  children,
  tone = 'neutral',
  mono,
  className,
}: {
  children: ReactNode
  tone?: keyof typeof BADGE_TONE
  mono?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4',
        BADGE_TONE[tone],
        mono && 'font-mono',
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ------------------------------ Button ------------------------------ */

export function Button({
  children,
  onClick,
  variant = 'default',
  size = 'md',
  disabled,
  className,
  title,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'primary' | 'ghost' | 'danger' | 'ok'
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
  title?: string
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'focus-ring inline-flex select-none items-center justify-center gap-1.5 rounded-lg border font-medium transition active:translate-y-px disabled:pointer-events-none disabled:opacity-45',
        size === 'sm' ? 'px-2.5 py-1 text-[12px]' : 'px-3.5 py-1.5 text-[13px]',
        variant === 'default' && 'border-line bg-surface hover:bg-elevated',
        variant === 'primary' && 'border-accent bg-accent text-white hover:brightness-110',
        variant === 'ghost' && 'border-transparent hover:bg-elevated',
        variant === 'danger' && 'border-danger/50 bg-danger/10 text-danger hover:bg-danger/20',
        variant === 'ok' && 'border-ok/50 bg-ok/10 text-ok hover:bg-ok/20',
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ------------------------------ Collapse ---------------------------- */

export function Collapse({
  title,
  subtitle,
  children,
  defaultOpen = false,
  tone = 'default',
}: {
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  tone?: 'default' | 'accent'
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border',
        tone === 'accent' ? 'border-accent/35 bg-accent/[0.05]' : 'border-line bg-surface',
      )}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="focus-ring flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-elevated/60"
      >
        <span className="min-w-0">
          <span className="block text-[13px] font-medium">{title}</span>
          {subtitle && <span className="mt-0.5 block text-xs text-muted">{subtitle}</span>}
        </span>
        <ChevronDown
          size={15}
          className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="animate-fade-up border-t border-line px-3.5 py-3 text-[13.5px] leading-6 text-fg/90">
          {children}
        </div>
      )}
    </div>
  )
}

/* -------------------------------- Tabs ------------------------------ */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  size = 'md',
}: {
  tabs: { id: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-elevated p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'focus-ring rounded-md font-medium transition',
            size === 'sm' ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]',
            value === t.id
              ? 'bg-surface text-fg shadow-sm ring-1 ring-line'
              : 'text-muted hover:text-fg',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------- Table ------------------------------ */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('scroll-thin overflow-x-auto rounded-lg border border-line', className)}>
      <table className="w-full border-collapse text-[12.5px]">{children}</table>
    </div>
  )
}

export function Th({
  children,
  align = 'left',
  className,
  colSpan,
}: {
  children?: ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  colSpan?: number
}) {
  return (
    <th
      colSpan={colSpan}
      className={cn(
        'whitespace-nowrap border-b border-line bg-elevated px-3 py-2 font-medium text-muted',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  align = 'left',
  mono,
  className,
  colSpan,
}: {
  children?: ReactNode
  align?: 'left' | 'right' | 'center'
  mono?: boolean
  className?: string
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'border-b border-line2 px-3 py-1.5 align-top',
        align === 'right' && 'text-right tabular-nums',
        align === 'center' && 'text-center',
        mono && 'font-mono text-[12px]',
        className,
      )}
    >
      {children}
    </td>
  )
}

/* -------------------------------- KV -------------------------------- */

export function KV({ k, v, note }: { k: ReactNode; v: ReactNode; note?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(110px,auto)_1fr] gap-x-3 gap-y-0.5 border-b border-line2 py-1.5 last:border-0">
      <div className="text-[12px] text-muted">{k}</div>
      <div className="text-[13px] font-medium">{v}</div>
      {note && <div className="col-span-2 text-[11.5px] leading-5 text-faint">{note}</div>}
    </div>
  )
}

/* ------------------------------- Stat ------------------------------- */

export function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'accent'
}) {
  const toneCls = {
    neutral: 'text-fg',
    ok: 'text-ok',
    warn: 'text-warn',
    danger: 'text-danger',
    accent: 'text-accent',
  }[tone]
  return (
    <div className="rounded-lg border border-line bg-surface px-3.5 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-faint">{label}</div>
      <div className={cn('mt-1 font-mono text-[17px] font-semibold tabular-nums', toneCls)}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] leading-4 text-muted">{hint}</div>}
    </div>
  )
}

/* ----------------------------- Empty state -------------------------- */

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-[13px] text-muted">
      {children}
    </div>
  )
}
