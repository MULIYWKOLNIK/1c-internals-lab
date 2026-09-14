import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, BookOpen, Link2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { GLOSSARY, GLOSSARY_BY_ID, type GlossaryTerm } from '@/data/glossary'
import { Badge, Card, CardHeader, Empty, Callout } from '@/components/ui'

const GROUPS = ['Усі', 'Об’єкти', 'Структура даних', 'Бухгалтерія', 'Механіка', 'Результат'] as const

export default function Glossary() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('Усі')
  const [active, setActive] = useState<string>(params.get('term') ?? GLOSSARY[0].id)

  useEffect(() => {
    const t = params.get('term')
    if (t && GLOSSARY_BY_ID[t]) setActive(t)
  }, [params])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return GLOSSARY.filter((g) => {
      if (group !== 'Усі' && g.group !== group) return false
      if (!query) return true
      const hay = `${g.term} ${(g.aliases ?? []).join(' ')} ${g.simple} ${g.technical} ${g.example} ${g.lms}`.toLowerCase()
      return hay.includes(query)
    })
  }, [q, group])

  const term = GLOSSARY_BY_ID[active] ?? filtered[0] ?? GLOSSARY[0]

  const select = (id: string) => {
    setActive(id)
    setParams({ term: id }, { replace: true })
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="glossary"
        lead="26 термінів, кожен на чотирьох рівнях: простими словами → технічно → приклад із симулятора → аналог у власній системі. Саме цей формат дозволяє говорити і з бухгалтером, і з розробником про одне й те саме."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="lg:sticky lg:top-[72px] lg:self-start">
          <Card>
            <div className="border-b border-line p-3">
              <div className="flex items-center gap-2 rounded-lg border border-line bg-elevated px-2.5 py-1.5">
                <Search size={14} className="shrink-0 text-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Пошук терміна…"
                  className="w-full bg-transparent text-[13px] outline-none placeholder:text-faint"
                />
                {q && (
                  <button onClick={() => setQ('')} className="text-[11px] text-faint hover:text-fg">
                    ✕
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {GROUPS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroup(g)}
                    className={cn(
                      'focus-ring rounded border px-1.5 py-0.5 text-[11px] transition',
                      group === g
                        ? 'border-accent/55 bg-accent/[0.1] text-accent'
                        : 'border-line bg-elevated text-muted hover:text-fg',
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="scroll-thin max-h-[62vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <Empty>Нічого не знайдено</Empty>
              ) : (
                filtered.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => select(g.id)}
                    className={cn(
                      'focus-ring mb-0.5 block w-full rounded-lg px-2.5 py-1.5 text-left transition',
                      active === g.id
                        ? 'bg-accent/[0.12] ring-1 ring-accent/30'
                        : 'hover:bg-elevated',
                    )}
                  >
                    <span className="block text-[13px] font-medium">{g.term}</span>
                    <span className="block truncate text-[11.5px] text-muted">{g.simple}</span>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-line px-3 py-2 text-[11px] text-faint">
              показано {filtered.length} з {GLOSSARY.length}
            </div>
          </Card>
        </div>

        <div className="min-w-0">
          <TermCard term={term} onSelect={select} />
        </div>
      </div>

      <Callout kind="key" title="Навіщо чотири рівні пояснення">
        Більшість непорозумінь між бухгалтером і розробником виникає тому, що обидва вживають те саме
        слово в різних значеннях. «Витрата» для одного — рядок звіту, для другого — напрям руху
        регістра. Чотирирівневе визначення дає спільну систему координат: кожен бачить свій рівень і
        розуміє, як він пов’язаний із сусіднім.
      </Callout>
    </div>
  )
}

function TermCard({ term, onSelect }: { term: GlossaryTerm; onSelect: (id: string) => void }) {
  return (
    <Card className="animate-fade-up" key={term.id}>
      <CardHeader
        icon={<BookOpen size={16} />}
        title={term.term}
        subtitle={term.aliases?.join(' · ')}
        right={<Badge tone="cyan">{term.group}</Badge>}
      />
      <div className="grid gap-3 p-4">
        <Level
          n="01"
          label="Простими словами"
          tone="ok"
          body={term.simple}
        />
        <Level n="02" label="Технічно" tone="accent" body={term.technical} />
        <Level n="03" label="Приклад" tone="violet" body={term.example} mono />
        <Level n="04" label="Аналог у власній системі" tone="warn" body={term.lms} mono />

        {term.related && term.related.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              <Link2 size={11} /> пов’язані терміни
            </div>
            <div className="flex flex-wrap gap-1.5">
              {term.related.map((r) => {
                const t = GLOSSARY_BY_ID[r]
                if (!t) return null
                return (
                  <button
                    key={r}
                    onClick={() => onSelect(r)}
                    className="focus-ring rounded-md border border-line bg-elevated px-2 py-0.5 text-[12px] text-muted transition hover:border-accent/50 hover:text-accent"
                  >
                    {t.term}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

function Level({
  n,
  label,
  body,
  tone,
  mono,
}: {
  n: string
  label: string
  body: string
  tone: 'ok' | 'accent' | 'violet' | 'warn'
  mono?: boolean
}) {
  const cls = {
    ok: 'border-ok/35 bg-ok/[0.05] text-ok',
    accent: 'border-accent/35 bg-accent/[0.05] text-accent',
    violet: 'border-violet/35 bg-violet/[0.05] text-violet',
    warn: 'border-warn/35 bg-warn/[0.05] text-warn',
  }[tone]
  return (
    <div className={cn('rounded-lg border px-3.5 py-2.5', cls)}>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="font-mono text-[10px] opacity-70">{n}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p
        className={cn(
          'whitespace-pre-line leading-7 text-fg/90',
          mono ? 'font-mono text-[12.5px]' : 'text-[14px]',
        )}
      >
        {body}
      </p>
    </div>
  )
}
