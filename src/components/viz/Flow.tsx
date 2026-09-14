import { useState, type ReactNode } from 'react'
import { ChevronRight, Play, Pause, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Badge, Button, CodeBlock } from '../ui'
import { useEffect, useRef } from 'react'

export interface FlowNode {
  id: string
  title: string
  caption?: string
  /** коротке пояснення «людською» */
  simple: string
  /** технічне пояснення */
  technical: string
  /** конкретний приклад із нашого наскрізного сценарію */
  example: string
  /** «показати, що всередині» — структура/псевдокод */
  inside?: string
  insideCaption?: string
  tone?: 'accent' | 'violet' | 'cyan' | 'ok' | 'warn' | 'danger'
}

const TONE: Record<string, { ring: string; text: string; dot: string }> = {
  accent: { ring: 'border-accent/55 bg-accent/[0.09]', text: 'text-accent', dot: 'bg-accent' },
  violet: { ring: 'border-violet/55 bg-violet/[0.09]', text: 'text-violet', dot: 'bg-violet' },
  cyan: { ring: 'border-cyan/55 bg-cyan/[0.09]', text: 'text-cyan', dot: 'bg-cyan' },
  ok: { ring: 'border-ok/55 bg-ok/[0.09]', text: 'text-ok', dot: 'bg-ok' },
  warn: { ring: 'border-warn/55 bg-warn/[0.09]', text: 'text-warn', dot: 'bg-warn' },
  danger: { ring: 'border-danger/55 bg-danger/[0.09]', text: 'text-danger', dot: 'bg-danger' },
}

/**
 * Клікабельний ланцюг «подія → … → звіт».
 * Кожен вузол розкриває 4 рівні пояснення + «що всередині».
 */
export function Flow({
  nodes,
  title,
  subtitle,
  autoplayLabel = 'Програти шлях',
}: {
  nodes: FlowNode[]
  title?: string
  subtitle?: ReactNode
  autoplayLabel?: string
}) {
  const [active, setActive] = useState<string>(nodes[0].id)
  const [showInside, setShowInside] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [litIndex, setLitIndex] = useState(-1)
  const timer = useRef<number | null>(null)

  // Таймер рухає лише лічильник кроків.
  useEffect(() => {
    if (!playing) return
    timer.current = window.setInterval(() => {
      setLitIndex((i) => {
        if (i + 1 >= nodes.length) {
          setPlaying(false)
          return nodes.length - 1
        }
        return i + 1
      })
    }, 900)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [playing, nodes.length])

  // Активний вузол синхронізується окремим ефектом: оновлювати стан
  // усередині updater'а іншого стану ненадійно.
  useEffect(() => {
    if (playing && litIndex >= 0 && litIndex < nodes.length) setActive(nodes[litIndex].id)
  }, [playing, litIndex, nodes])

  const node = nodes.find((n) => n.id === active) ?? nodes[0]
  const activeIndex = nodes.findIndex((n) => n.id === active)

  return (
    <div className="rounded-xl border border-line bg-surface shadow-panel">
      {(title || subtitle) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            {title && <div className="text-[13px] font-semibold">{title}</div>}
            {subtitle && <div className="mt-0.5 text-xs text-muted">{subtitle}</div>}
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={playing ? 'danger' : 'primary'}
              onClick={() => {
                if (playing) {
                  setPlaying(false)
                } else {
                  setLitIndex(0)
                  setActive(nodes[0].id)
                  setShowInside(false)
                  setPlaying(true)
                }
              }}
            >
              {playing ? <Pause size={13} /> : <Play size={13} />}
              {playing ? 'Пауза' : autoplayLabel}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setPlaying(false)
                setLitIndex(-1)
                setActive(nodes[0].id)
              }}
              title="Скинути"
            >
              <RotateCcw size={13} />
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(200px,260px)_1fr]">
        {/* ланцюг */}
        <ol className="relative">
          {nodes.map((n, i) => {
            const tone = TONE[n.tone ?? 'accent']
            const isActive = n.id === active
            const isLit = i <= litIndex
            return (
              <li key={n.id} className="relative pb-1">
                <button
                  onClick={() => {
                    setActive(n.id)
                    setShowInside(false)
                    setPlaying(false)
                  }}
                  className={cn(
                    'focus-ring group relative z-10 flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition',
                    isActive
                      ? cn(tone.ring, 'shadow-sm')
                      : isLit
                        ? 'border-line bg-elevated'
                        : 'border-line bg-surface hover:bg-elevated',
                    playing && isLit && i === litIndex && 'animate-pulse-ring',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold',
                      isActive || isLit ? cn(tone.dot, 'text-white') : 'bg-line text-muted',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{n.title}</span>
                    {n.caption && (
                      <span className="block truncate text-[11px] text-muted">{n.caption}</span>
                    )}
                  </span>
                  <ChevronRight
                    size={13}
                    className={cn(
                      'shrink-0 transition',
                      isActive ? tone.text : 'text-faint group-hover:text-muted',
                    )}
                  />
                </button>
                {i < nodes.length - 1 && (
                  <div className="ml-[22px] flex h-4 items-center">
                    <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden>
                      <line
                        x1="5"
                        y1="0"
                        x2="5"
                        y2="16"
                        className={cn(
                          'flow-edge',
                          playing && i === litIndex && 'is-live',
                        )}
                        stroke={i < litIndex || i < activeIndex ? 'rgb(var(--c-accent))' : 'rgb(var(--c-line))'}
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                )}
              </li>
            )
          })}
        </ol>

        {/* пояснення */}
        <div className="min-w-0 animate-fade-up" key={node.id}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight">{node.title}</h3>
            <Badge tone={(node.tone as 'accent') ?? 'accent'} mono>
              крок {activeIndex + 1}/{nodes.length}
            </Badge>
          </div>

          <div className="grid gap-2.5">
            <Block label="Простими словами" body={node.simple} />
            <Block label="Технічно" body={node.technical} tone="cyan" />
            <Block label="Приклад" body={node.example} tone="violet" />
          </div>

          {node.inside && (
            <div className="mt-3">
              <Button size="sm" onClick={() => setShowInside((s) => !s)}>
                {showInside ? 'Сховати' : 'Показати, що всередині'}
              </Button>
              {showInside && (
                <div className="mt-2 animate-fade-up">
                  <CodeBlock
                    code={node.inside}
                    caption={node.insideCaption ?? 'Структура / псевдокод'}
                    lang={node.insideCaption?.includes('TypeScript') ? 'ts' : '1c'}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Block({
  label,
  body,
  tone = 'accent',
}: {
  label: string
  body: string
  tone?: 'accent' | 'cyan' | 'violet'
}) {
  const t = TONE[tone]
  return (
    <div className="rounded-lg border border-line bg-elevated px-3 py-2">
      <div className={cn('mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]', t.text)}>
        {label}
      </div>
      <div className="whitespace-pre-line text-[13.5px] leading-6 text-fg/90">{body}</div>
    </div>
  )
}
