import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Card, CardHeader, CodeBlock } from './ui'
import { HelpCircle } from 'lucide-react'

export interface Mechanism {
  what: string
  why: string
  structure: string
  who: string
  when: string
  written: string
  used: string
  ownSystem: string
  code?: string
  codeCaption?: string
}

const QUESTIONS: { key: keyof Mechanism; label: string }[] = [
  { key: 'what', label: 'Що це?' },
  { key: 'why', label: 'Навіщо потрібен?' },
  { key: 'structure', label: 'Яку структуру має?' },
  { key: 'who', label: 'Хто його змінює?' },
  { key: 'when', label: 'Коли змінює?' },
  { key: 'written', label: 'Що записується?' },
  { key: 'used', label: 'Як використовується далі?' },
  { key: 'ownSystem', label: 'Як зробити у себе?' },
]

/**
 * Єдина схема розбору будь-якого механізму.
 * Саме вона повторюється в проєкті замість сухих визначень.
 */
export function MechanismBreakdown({
  title,
  subtitle,
  mechanism,
}: {
  title: string
  subtitle?: string
  mechanism: Mechanism
}) {
  const [active, setActive] = useState<keyof Mechanism>('what')

  return (
    <Card>
      <CardHeader icon={<HelpCircle size={16} />} title={title} subtitle={subtitle} />
      <div className="p-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {QUESTIONS.map((q, i) => (
            <button
              key={q.key}
              onClick={() => setActive(q.key)}
              className={cn(
                'focus-ring rounded-lg border px-2.5 py-1 text-[12px] font-medium transition',
                active === q.key
                  ? 'border-accent/55 bg-accent/[0.1] text-accent'
                  : 'border-line bg-elevated text-muted hover:text-fg',
              )}
            >
              <span className="mr-1.5 font-mono text-[10px] text-faint">{i + 1}</span>
              {q.label}
            </button>
          ))}
        </div>

        <div
          key={active}
          className="animate-fade-up rounded-lg border border-line bg-elevated px-3.5 py-3"
        >
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
            {QUESTIONS.find((q) => q.key === active)?.label}
          </div>
          <p className="whitespace-pre-line text-[14px] leading-7 text-fg/90">
            {mechanism[active] as string}
          </p>
        </div>

        {mechanism.code && active === 'structure' && (
          <CodeBlock
            className="mt-3"
            code={mechanism.code}
            caption={mechanism.codeCaption ?? 'Структура'}
          />
        )}
      </div>
    </Card>
  )
}
