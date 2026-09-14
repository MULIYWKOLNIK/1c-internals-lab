import { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button, Card, CardHeader } from '../ui'

export interface JourneyStage {
  id: string
  label: string
  sub: string
  /** що відбувається із сумою на цьому етапі */
  state: string
  detail: string
}

const W = 220
const H = 62
const GAP = 26

/**
 * Анімація: конкретна сума фізично проходить шлях
 * Документ → Проведення → Рух → Регістр → Запит → Звіт.
 */
export function AmountJourney({
  stages,
  amountLabel,
  title = 'Шлях суми крізь систему',
  subtitle = 'Натисніть «Програти» — пакет даних пройде весь ланцюг',
}: {
  stages: JourneyStage[]
  amountLabel: string
  title?: string
  subtitle?: string
}) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!playing) return
    timer.current = window.setInterval(() => {
      setStep((s) => {
        if (s >= stages.length - 1) {
          setPlaying(false)
          return s
        }
        return s + 1
      })
    }, 1100)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [playing, stages.length])

  const totalH = stages.length * H + (stages.length - 1) * GAP
  const cur = stages[step]

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        right={
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={playing ? 'danger' : 'primary'}
              onClick={() => {
                if (playing) setPlaying(false)
                else {
                  if (step >= stages.length - 1) setStep(0)
                  setPlaying(true)
                }
              }}
            >
              {playing ? <Pause size={12} /> : <Play size={12} />}
              {playing ? 'Пауза' : 'Програти'}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setPlaying(false)
                setStep(0)
              }}
            >
              <RotateCcw size={12} />
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,270px)_1fr]">
        <div className="relative mx-auto w-full max-w-[260px]">
          <svg
            viewBox={`0 0 ${W + 60} ${totalH + 8}`}
            className="w-full"
            role="img"
            aria-label="Схема шляху суми"
          >
            {stages.map((s, i) => {
              const y = i * (H + GAP) + 4
              const active = i === step
              const passed = i < step
              return (
                <g key={s.id}>
                  {i < stages.length - 1 && (
                    <line
                      x1={W / 2 + 30}
                      y1={y + H}
                      x2={W / 2 + 30}
                      y2={y + H + GAP}
                      stroke={passed ? 'rgb(var(--c-ok))' : 'rgb(var(--c-line))'}
                      strokeWidth="2"
                      className={cn('flow-edge', playing && i === step && 'is-live')}
                    />
                  )}
                  <rect
                    x={30}
                    y={y}
                    width={W}
                    height={H}
                    rx="10"
                    fill={
                      active
                        ? 'rgb(var(--c-accent) / 0.12)'
                        : passed
                          ? 'rgb(var(--c-ok) / 0.08)'
                          : 'rgb(var(--c-elevated))'
                    }
                    stroke={
                      active
                        ? 'rgb(var(--c-accent))'
                        : passed
                          ? 'rgb(var(--c-ok) / 0.5)'
                          : 'rgb(var(--c-line))'
                    }
                    strokeWidth={active ? 2 : 1}
                    className="cursor-pointer transition-all"
                    onClick={() => {
                      setPlaying(false)
                      setStep(i)
                    }}
                  />
                  <text
                    x={44}
                    y={y + 25}
                    className="select-none fill-[rgb(var(--c-fg))] text-[13px] font-semibold"
                    style={{ fontSize: 13 }}
                  >
                    {s.label}
                  </text>
                  <text
                    x={44}
                    y={y + 44}
                    className="select-none fill-[rgb(var(--c-muted))]"
                    style={{ fontSize: 10.5 }}
                  >
                    {s.sub}
                  </text>
                  {active && (
                    <g>
                      <rect
                        x={W + 10}
                        y={y + H / 2 - 12}
                        width={40}
                        height={24}
                        rx="6"
                        fill="rgb(var(--c-accent))"
                        className="animate-pulse-ring"
                      />
                      <text
                        x={W + 30}
                        y={y + H / 2 + 4}
                        textAnchor="middle"
                        fill="white"
                        style={{ fontSize: 10, fontWeight: 700 }}
                      >
                        {amountLabel}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-[11px] text-faint">
              етап {step + 1}/{stages.length}
            </span>
            <h3 className="text-[15px] font-semibold tracking-tight">{cur.label}</h3>
          </div>

          <div className="animate-fade-up" key={cur.id}>
            <div className="rounded-lg border border-accent/40 bg-accent/[0.07] px-3 py-2.5">
              <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
                у якому вигляді існує сума
              </div>
              <pre className="whitespace-pre-wrap font-mono text-[12px] leading-6 text-fg/90">
                {cur.state}
              </pre>
            </div>
            <p className="mt-2.5 text-[13.5px] leading-7 text-fg/85">{cur.detail}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {stages.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  setPlaying(false)
                  setStep(i)
                }}
                className={cn(
                  'focus-ring rounded-md border px-2 py-0.5 text-[11px] transition',
                  i === step
                    ? 'border-accent/55 bg-accent/[0.1] text-accent'
                    : i < step
                      ? 'border-ok/40 bg-ok/[0.07] text-ok'
                      : 'border-line bg-elevated text-muted',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
