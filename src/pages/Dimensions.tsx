import { useMemo, useState } from 'react'
import { Sigma, KeyRound, FileText, Ban } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { LmsBridge } from '@/components/LmsBridge'
import {
  Badge,
  Callout,
  Card,
  CardHeader,
  CodeBlock,
  Collapse,
  Section,
  Table,
  Td,
  Th,
} from '@/components/ui'
import { num } from '@/engine/format'

interface Rec {
  id: number
  org: string
  article: string
  dept: string
  comment: string
  amount: number
  qty: number
}

const DATA: Rec[] = [
  { id: 1, org: 'ТОВ «Приклад»', article: 'Оренда', dept: 'Адміністрація', comment: 'вересень', amount: 30000, qty: 1 },
  { id: 2, org: 'ТОВ «Приклад»', article: 'Оренда', dept: 'Відділ продажів', comment: 'шоурум', amount: 12000, qty: 1 },
  { id: 3, org: 'ТОВ «Приклад»', article: 'Реклама', dept: 'Відділ продажів', comment: 'Facebook', amount: 15000, qty: 1 },
  { id: 4, org: 'ТОВ «Приклад»', article: 'Оплата праці', dept: 'Адміністрація', comment: 'оклади', amount: 40000, qty: 3 },
  { id: 5, org: 'ФОП Іваненко', article: 'Оренда', dept: 'Адміністрація', comment: 'склад', amount: 8000, qty: 1 },
  { id: 6, org: 'ФОП Іваненко', article: 'Реклама', dept: 'Відділ продажів', comment: 'Google', amount: 6000, qty: 1 },
]

const DIMS = [
  { key: 'org' as const, label: 'Організація', role: 'dimension' },
  { key: 'article' as const, label: 'Стаття витрат', role: 'dimension' },
  { key: 'dept' as const, label: 'Підрозділ', role: 'dimension' },
  { key: 'comment' as const, label: 'Коментар', role: 'attribute' },
]

export default function Dimensions() {
  const [selected, setSelected] = useState<string[]>(['article'])
  const [withQty, setWithQty] = useState(false)

  const grouped = useMemo(() => {
    const keys = selected.filter((s) => DIMS.find((d) => d.key === s)?.role === 'dimension')
    const map = new Map<string, { parts: string[]; amount: number; qty: number; n: number }>()
    for (const r of DATA) {
      const parts = keys.map((k) => String(r[k as keyof Rec]))
      const key = parts.join(' | ') || 'ВСЬОГО'
      const cur = map.get(key) ?? { parts: parts.length ? parts : ['ВСЬОГО'], amount: 0, qty: 0, n: 0 }
      cur.amount += r.amount
      cur.qty += r.qty
      cur.n += 1
      map.set(key, cur)
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount)
  }, [selected])

  const usedDims = selected.filter((s) => DIMS.find((d) => d.key === s)?.role === 'dimension')
  const attrSelected = selected.includes('comment')

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="dimensions"
        lead="Вимірювання, ресурс і реквізит — три ролі полів у записі. Плутанина між ними коштує дорого: неправильно обрана роль означає, що потрібного розрізу у звітах не буде ніколи, навіть якщо дані фізично збережені."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <RoleCard
          icon={<KeyRound size={16} />}
          tone="accent"
          title="Вимірювання"
          sub="ключ агрегації"
          body="Поле, за яким система групує. Відповідає на питання «у якому розрізі?». Формує ключ запису, індексується, потрапляє в GROUP BY віртуальних таблиць."
          examples="Організація, Стаття витрат, Підрозділ, Номенклатура, Склад"
        />
        <RoleCard
          icon={<Sigma size={16} />}
          tone="ok"
          title="Ресурс"
          sub="що підсумовуємо"
          body="Числове поле, яке агрегується функцією SUM. Ресурсів може бути кілька, і вони працюють паралельно в одному записі."
          examples="Сума, Кількість, СумаПДВ, СумаВзаєморозрахунків"
        />
        <RoleCard
          icon={<FileText size={16} />}
          tone="warn"
          title="Реквізит"
          sub="довідкова інформація"
          body="Поле «для людини». Зберігається разом із записом і видно у запиті, але НЕ бере участі ні в ключі, ні в підсумках віртуальних таблиць."
          examples="Коментар, Зміст проводки, Підстава"
        />
      </div>

      <Card>
        <CardHeader
          icon={<Sigma size={16} />}
          title="Пісочниця: як вимірювання визначають вигляд звіту"
          subtitle="Одні й ті самі 6 записів. Змінюється лише набір полів групування."
        />
        <div className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[12px] text-muted">Групувати за:</span>
            {DIMS.map((d) => {
              const on = selected.includes(d.key)
              const isAttr = d.role === 'attribute'
              return (
                <button
                  key={d.key}
                  onClick={() =>
                    setSelected((s) => (s.includes(d.key) ? s.filter((x) => x !== d.key) : [...s, d.key]))
                  }
                  className={cn(
                    'focus-ring rounded-lg border px-2.5 py-1 text-[12px] font-medium transition',
                    on && !isAttr && 'border-accent/55 bg-accent/[0.1] text-accent',
                    on && isAttr && 'border-danger/55 bg-danger/[0.1] text-danger',
                    !on && 'border-line bg-elevated text-muted hover:text-fg',
                  )}
                >
                  {d.label}
                  {isAttr && <span className="ml-1 text-[10px]">(реквізит)</span>}
                </button>
              )
            })}
            <span className="mx-2 h-4 w-px bg-line" />
            <button
              onClick={() => setWithQty((v) => !v)}
              className={cn(
                'focus-ring rounded-lg border px-2.5 py-1 text-[12px] font-medium transition',
                withQty ? 'border-ok/55 bg-ok/[0.1] text-ok' : 'border-line bg-elevated text-muted',
              )}
            >
              + ресурс «Кількість»
            </button>
          </div>

          {attrSelected && (
            <div className="mb-3">
              <Callout kind="danger" title="Так зробити не можна">
                «Коментар» — це <strong>реквізит</strong>, а не вимірювання. Віртуальна таблиця
                просто не запропонує його як поле групування: у ключі агрегації його немає. Тому в
                результаті нижче він ігнорується — рівно так, як це зробила б платформа.
              </Callout>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-wide text-faint">
                <Ban size={12} /> сирі записи регістра ({DATA.length})
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th>Організація</Th>
                    <Th>Стаття</Th>
                    <Th>Підрозділ</Th>
                    <Th>Коментар</Th>
                    <Th align="right">Сума</Th>
                  </tr>
                </thead>
                <tbody>
                  {DATA.map((r) => (
                    <tr key={r.id}>
                      <Td className="text-[11.5px]">{r.org}</Td>
                      <Td className={cn(usedDims.includes('article') && 'font-medium text-accent')}>
                        {r.article}
                      </Td>
                      <Td className={cn(usedDims.includes('dept') && 'font-medium text-accent')}>
                        {r.dept}
                      </Td>
                      <Td className="text-[11.5px] text-faint">{r.comment}</Td>
                      <Td align="right" mono>
                        {num(r.amount)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-wide text-faint">
                <Sigma size={12} /> результат віртуальної таблиці ({grouped.length} рядк.)
              </div>
              <Table>
                <thead>
                  <tr>
                    {usedDims.length === 0 ? (
                      <Th>Підсумок</Th>
                    ) : (
                      usedDims.map((k) => <Th key={k}>{DIMS.find((d) => d.key === k)?.label}</Th>)
                    )}
                    <Th align="right">Сума</Th>
                    {withQty && <Th align="right">Кількість</Th>}
                    <Th align="right">Записів</Th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((g) => (
                    <tr key={g.parts.join('|')}>
                      {g.parts.map((p, i) => (
                        <Td key={i} className="font-medium">
                          {p}
                        </Td>
                      ))}
                      <Td align="right" mono className="font-semibold">
                        {num(g.amount)}
                      </Td>
                      {withQty && (
                        <Td align="right" mono>
                          {g.qty}
                        </Td>
                      )}
                      <Td align="right" mono className="text-faint">
                        {g.n}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <CodeBlock
                className="mt-2"
                caption="Що фактично виконалось"
                code={`SELECT ${usedDims.length ? usedDims.map((k) => DIMS.find((d) => d.key === k)!.label).join(', ') + ',' : ''}
       SUM(Сума)${withQty ? ',\n       SUM(Кількість)' : ''}
FROM   Регістр.Обороти(&Початок, &Кінець)
${usedDims.length ? 'GROUP BY ' + usedDims.map((k) => DIMS.find((d) => d.key === k)!.label).join(', ') : '-- без групування: один підсумковий рядок'}`}
              />
            </div>
          </div>
        </div>
      </Card>

      <Callout kind="key" title="Головний висновок пісочниці">
        Записи не змінились — змінився лише <strong>набір полів групування</strong>. Звіт не «знає»
        нічого особливого: він просто підсумовує ресурс за обраними вимірюваннями. Тому питання «чому
        у звіті така цифра» завжди зводиться до двох: <em>які записи потрапили у вибірку</em> і{' '}
        <em>за чим вони згорнуті</em>.
      </Callout>

      <Section eyebrow="проєктування" title="Як обрати роль поля">
        <Table>
          <thead>
            <tr>
              <Th>Питання до себе</Th>
              <Th>Якщо «так»</Th>
              <Th>Наслідок помилки</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>Чи захочу я колись побачити звіт у розрізі цього поля?</Td>
              <Td className="text-accent">Вимірювання</Td>
              <Td className="text-muted">
                Зробили реквізитом — розрізу не буде. Змінити потім = переробляти регістр і
                перепроводити документи
              </Td>
            </tr>
            <tr>
              <Td>Це число, яке має сенс додавати?</Td>
              <Td className="text-ok">Ресурс</Td>
              <Td className="text-muted">
                Зробили вимірюванням — кожна сума стане окремим рядком, агрегація зламається
              </Td>
            </tr>
            <tr>
              <Td>Це текст «для людини», який ніколи не групують?</Td>
              <Td className="text-warn">Реквізит</Td>
              <Td className="text-muted">
                Зробили вимірюванням — ключ роздувається, записи перестають згортатись, регістр
                розпухає
              </Td>
            </tr>
            <tr>
              <Td>Чи може значення бути порожнім?</Td>
              <Td className="text-danger">Обережно з вимірюванням</Td>
              <Td className="text-muted">
                Порожнє вимірювання — окрема група «(не вказано)». Саме звідси беруться «зниклі»
                суми у звітах із відбором
              </Td>
            </tr>
          </tbody>
        </Table>
      </Section>

      <Collapse title="Чому додати вимірювання пізніше — дорого" tone="accent">
        <p className="mb-2">
          Нове вимірювання з’являється порожнім у <strong>всіх історичних записах</strong>. Щоб
          заповнити його заднім числом, потрібно перепровести всі документи за минулі періоди — а це
          може бути заборонено (закриті періоди, здана звітність) або технічно неможливо (правила
          заповнення змінились).
        </p>
        <p>
          Практичний висновок для власної системи: краще закласти розріз одразу, навіть якщо він поки
          не використовується у звітах. Порожня колонка коштує дешево; відсутня історія — дорого.
        </p>
      </Collapse>

      <LmsBridge
        summary="У власній системі роль поля — це не «тип даних», а контракт про те, що з цим полем дозволено робити. Зафіксуйте його явно: список полів для GROUP BY, список агрегованих полів і решту як метадані. Тоді репозиторій зможе валідувати запит, а не мовчки повертати дивну цифру."
        rows={[
          { onec: 'Вимірювання', lms: 'GROUP BY-колонка + індекс', note: 'Нормалізована FK, не вільний текст.' },
          { onec: 'Ресурс', lms: 'numeric-колонка в SUM()', note: 'Ніколи не зберігайте вже згорнутий підсумок.' },
          { onec: 'Реквізит', lms: 'metadata / note', note: 'Явно виключіть із дозволених полів групування.' },
          { onec: 'Віртуальна таблиця', lms: 'repository.turnovers({from,to,groupBy})', note: 'groupBy приймає лише білий список вимірювань.' },
        ]}
        code={`const DIMENSIONS = ['organizationId', 'costArticleId', 'departmentId'] as const
const RESOURCES  = ['amount', 'quantity'] as const

type Dimension = typeof DIMENSIONS[number]

function turnovers(opts: { from: Date; to: Date; groupBy: Dimension[] }) {
  // groupBy типізовано: 'comment' сюди не передати — компілятор не дасть
  const cols = opts.groupBy.join(', ')
  return db.query(\`
    SELECT \${cols}, SUM(amount) AS amount
    FROM ledger_entries
    WHERE occurred_at BETWEEN $1 AND $2
    GROUP BY \${cols}
  \`, [opts.from, opts.to])
}`}
      />
    </div>
  )
}

function RoleCard({
  icon,
  tone,
  title,
  sub,
  body,
  examples,
}: {
  icon: React.ReactNode
  tone: 'accent' | 'ok' | 'warn'
  title: string
  sub: string
  body: string
  examples: string
}) {
  const border = { accent: 'border-accent/35', ok: 'border-ok/35', warn: 'border-warn/35' }[tone]
  const color = { accent: 'text-accent', ok: 'text-ok', warn: 'text-warn' }[tone]
  return (
    <Card className={border}>
      <CardHeader
        icon={<span className={color}>{icon}</span>}
        title={title}
        subtitle={sub}
        right={<Badge tone={tone}>роль поля</Badge>}
      />
      <div className="px-4 py-3">
        <p className="text-[13px] leading-6 text-fg/85">{body}</p>
        <p className="mt-2 text-[12px] leading-5 text-faint">
          <span className="text-muted">Приклади: </span>
          {examples}
        </p>
      </div>
    </Card>
  )
}
