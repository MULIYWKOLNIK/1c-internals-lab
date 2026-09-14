import { ArrowRight, Blocks } from 'lucide-react'
import { Card, CardHeader, CodeBlock } from './ui'

export interface BridgeRow {
  onec: string
  lms: string
  note: string
}

/**
 * Блок «Як це реалізувати у власній системі?».
 * Ставиться в кінці кожного великого розділу.
 */
export function LmsBridge({
  rows,
  code,
  codeCaption,
  summary,
}: {
  rows: BridgeRow[]
  code?: string
  codeCaption?: string
  summary: string
}) {
  return (
    <Card className="border-violet/30">
      <CardHeader
        icon={<Blocks size={16} />}
        title="Як це реалізувати у власній системі / LMS?"
        subtitle="Сутності можуть називатися інакше. Важливий архітектурний принцип, а не назви."
      />
      <div className="px-4 py-3">
        <div className="mb-3 grid gap-2">
          {rows.map((r) => (
            <div
              key={r.onec}
              className="grid items-center gap-2 rounded-lg border border-line bg-elevated px-3 py-2 sm:grid-cols-[1fr_auto_1fr]"
            >
              <div className="font-mono text-[12.5px] text-fg">{r.onec}</div>
              <ArrowRight size={14} className="hidden text-violet sm:block" />
              <div className="font-mono text-[12.5px] text-violet">{r.lms}</div>
              <div className="text-[11.5px] leading-5 text-muted sm:col-span-3">{r.note}</div>
            </div>
          ))}
        </div>
        {code && <CodeBlock code={code} lang="ts" caption={codeCaption ?? 'Модель у власній системі'} />}
        <p className="mt-3 text-[13.5px] leading-6 text-fg/85">{summary}</p>
      </div>
    </Card>
  )
}
