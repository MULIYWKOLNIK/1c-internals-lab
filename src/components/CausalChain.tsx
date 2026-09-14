import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Card, CardHeader } from './ui'
import { GitBranch } from 'lucide-react'

export interface CausalStage {
  title: string
  what: string
}

/**
 * Єдина причинно-наслідкова модель, за якою в цьому проєкті
 * розбирається БУДЬ-ЯКИЙ механізм. Показується на багатьох сторінках,
 * щоб читач упізнавав однакову структуру.
 */
export const CAUSAL_MODEL: CausalStage[] = [
  { title: 'Бізнес-подія', what: 'У реальному світі щось сталося: отримали послугу, продали товар.' },
  { title: 'Документ', what: 'Подію зафіксували у системі як дані. Облік ще не змінився.' },
  { title: 'Проведення', what: 'Користувач (або регламент) запускає обробку документа.' },
  { title: 'Алгоритм', what: 'Код конфігурації вирішує, які саме записи потрібно створити.' },
  { title: 'Рух', what: 'Кожен окремий запис, сформований у пам’яті.' },
  { title: 'Регістр', what: 'Сховище із заданою структурою, куди рух потрапляє.' },
  { title: 'Запис', what: 'Рухи збережено в транзакції. Тепер вони — факт обліку.' },
  { title: 'Запит', what: 'Звіт просить у системи потрібний зріз даних.' },
  { title: 'Агрегація', what: 'Записи групуються за вимірюваннями і підсумовуються.' },
  { title: 'Звіт', what: 'Результат, який бачить людина.' },
]

export function CausalChain({
  stages = CAUSAL_MODEL,
  highlight,
  title = 'Наскрізна модель: як розбирається будь-який механізм',
  subtitle = 'Ця сама послідовність повторюється у кожному розділі — змінюється лише наповнення',
  values,
}: {
  stages?: CausalStage[]
  highlight?: number[]
  title?: string
  subtitle?: string
  /** конкретні значення для цього розділу */
  values?: string[]
}) {
  const [active, setActive] = useState<number | null>(null)

  return (
    <Card>
      <CardHeader icon={<GitBranch size={16} />} title={title} subtitle={subtitle} />
      <div className="p-4">
        <div className="scroll-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2">
          {stages.map((s, i) => {
            const lit = !highlight || highlight.includes(i)
            return (
              <button
                key={s.title}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i === active ? null : i)}
                className={cn(
                  'focus-ring flex min-w-[104px] flex-1 flex-col rounded-lg border px-2 py-1.5 text-left transition',
                  active === i
                    ? 'border-accent/60 bg-accent/[0.1]'
                    : lit
                      ? 'border-line bg-elevated hover:border-accent/40'
                      : 'border-line bg-surface opacity-45',
                )}
              >
                <span className="font-mono text-[9.5px] text-faint">{String(i + 1).padStart(2, '0')}</span>
                <span className="truncate text-[12px] font-medium">{s.title}</span>
                {values?.[i] && (
                  <span className="mt-0.5 truncate font-mono text-[10.5px] text-accent">
                    {values[i]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-2 min-h-[42px] rounded-lg border border-line bg-elevated px-3 py-2 text-[13px] leading-6">
          {active == null ? (
            <span className="text-muted">
              Наведіть або натисніть на будь-який етап, щоб побачити його роль.
            </span>
          ) : (
            <span>
              <strong className="text-accent">{stages[active].title}. </strong>
              {stages[active].what}
              {values?.[active] && (
                <span className="ml-1 font-mono text-[12px] text-violet">→ {values[active]}</span>
              )}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
