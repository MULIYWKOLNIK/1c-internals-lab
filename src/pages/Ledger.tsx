import { useState } from 'react'
import { Braces, Play, RotateCcw, Undo2, Terminal } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { Flow, type FlowNode } from '@/components/viz/Flow'
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  CodeBlock,
  Collapse,
  Empty,
  Section,
  Stat,
  Table,
  Td,
  Th,
  Tabs,
} from '@/components/ui'
import {
  DEMO_DOCS,
  Ledger as MiniLedger,
  getExpenses,
  getStock,
  type ExpenseDocument,
  type LedgerEntry,
} from '@/engine/miniLedger'
import { dmy, money, num } from '@/engine/format'

const PERIOD = { from: '2026-09-01', to: '2026-09-30' }

const MODEL_FLOW: FlowNode[] = [
  {
    id: 'doc',
    title: 'ExpenseDocument',
    caption: 'подія у вигляді даних',
    tone: 'accent',
    simple: 'Об’єкт, який описує, що сталося. Змінюваний, поки не проведений.',
    technical:
      'Аналог документа 1С. Містить реквізити події й аналітику. Не має жодного знання про рахунки та регістри — це відповідальність проведення.',
    example: '{ id: "d1", date: "2026-09-01", net: 30000, costArticle: "Оренда" }',
    inside: `interface ExpenseDocument {
  id: string
  number: string
  date: string
  kind: 'SERVICE_RECEIPT' | 'PAYROLL' | 'GOODS_RECEIPT' | 'GOODS_SALE'
  net: number
  vat?: number
  costArticle?: string
  department?: string
  counterparty?: string
  itemId?: string
  quantity?: number
  adjustsDocumentId?: string   // аналог документа-підстави
}`,
    insideCaption: 'TypeScript',
  },
  {
    id: 'build',
    title: 'buildEntries()',
    caption: 'чиста функція',
    tone: 'violet',
    simple: 'Перетворює документ на масив записів. Нічого не зберігає.',
    technical:
      'Ключове рішення архітектури: логіка проведення винесена в ЧИСТУ функцію. Вона не має доступу до БД, тому її можна тестувати без бази і бути впевненим, що ті самі дані завжди дадуть ті самі записи.',
    example: 'doc → [{ kind: "EXPENSE", debit: "92", credit: "631", amount: 30000 }, …]',
    inside: `function buildEntries(doc, ctx): Omit<LedgerEntry, 'id'>[] {
  switch (doc.kind) {
    case 'SERVICE_RECEIPT':
      return [
        { kind: 'EXPENSE', debitAccount: expenseAccountOf(doc),
          creditAccount: '631', amount: doc.net, dimensions: {...} },
        ...(doc.vat ? [{ kind: 'TAX', debitAccount: '6442', ... }] : []),
      ]
    case 'GOODS_SALE': {
      const cost = ctx.unitCost(doc.itemId, doc.date)  // ← ЧИТАЄМО ledger
      return [ /* дохід */, /* собівартість */ ]
    }
  }
}`,
    insideCaption: 'TypeScript',
  },
  {
    id: 'post',
    title: 'postExpense()',
    caption: 'запис у транзакції',
    tone: 'violet',
    simple: 'Єдина функція, якій дозволено писати в ledger.',
    technical:
      'Робить три речі: прибирає власні попередні записи (ідемпотентність), викликає buildEntries(), вставляє результат. У реальній системі — все це в одній транзакції БД.',
    example: 'ledger.postExpense(doc) → 2 записи створено',
    inside: `postExpense(doc: ExpenseDocument): LedgerEntry[] {
  // 1. аналог Движения.Очистить()
  this.entries = this.entries.filter(e => e.sourceId !== doc.id)

  // 2. чиста логіка
  const drafts = buildEntries(doc, { unitCost: this.unitCost })

  // 3. запис
  const created = drafts.map(d => ({ ...d, id: newId() }))
  this.entries.push(...created)
  return created
}`,
    insideCaption: 'TypeScript',
  },
  {
    id: 'entry',
    title: 'LedgerEntry',
    caption: 'незмінний факт',
    tone: 'ok',
    simple: 'Один атомарний запис. Створюється один раз і більше не змінюється.',
    technical:
      'Усі поля readonly. sourceType + sourceId — прямий аналог реєстратора. occurredAt (а не createdAt!) — аналог періоду: саме за ним фільтрує звіт.',
    example: '{ id: "E0001", occurredAt: "2026-09-01", sourceId: "d1", amount: 30000 }',
    inside: `interface LedgerEntry {
  readonly id: string
  readonly occurredAt: string        // ← період (НЕ createdAt)
  readonly sourceType: string        // ← реєстратор, частина 1
  readonly sourceId: string          // ← реєстратор, частина 2
  readonly kind: EntryKind
  readonly debitAccount: string
  readonly creditAccount: string
  readonly amount: number
  readonly quantity?: number
  readonly dimensions: Readonly<Record<string, string>>   // ← субконто
  readonly reversesEntryId?: string  // ← слід сторнування
  readonly note: string
}`,
    insideCaption: 'TypeScript',
  },
  {
    id: 'report',
    title: 'getExpenses()',
    caption: 'звіт як функція',
    tone: 'warn',
    simple: 'Читає записи, фільтрує за періодом, групує, підсумовує.',
    technical:
      'Жодного власного стану. «Витрата» тут — не таблиця, а ПРАВИЛО: kind ∈ {EXPENSE, COGS}. Змініть правило — зміняться всі звіти, без жодної міграції бази.',
    example: 'getExpenses(ledger, {from:"2026-09-01", to:"2026-09-30"})',
    inside: `const EXPENSE_KINDS = ['EXPENSE', 'COGS']

function getExpenses(ledger, period, filters = {}) {
  const map = new Map()
  for (const e of ledger.all()) {
    if (!EXPENSE_KINDS.includes(e.kind)) continue        // ← визначення витрати
    if (e.occurredAt < period.from) continue             // ← період
    if (e.occurredAt > period.to) continue
    const key = e.dimensions.costArticle + '|' + e.dimensions.department
    // …акумуляція + збереження entryIds для розшифровки
  }
  return { rows: [...map.values()], total }
}`,
    insideCaption: 'TypeScript',
  },
]

export default function LedgerPage() {
  const [, force] = useState(0)
  const [ledger] = useState(() => new MiniLedger())
  const [log, setLog] = useState<string[]>([])
  const [tab, setTab] = useState<'entries' | 'report' | 'stock'>('entries')

  const rerender = () => force((n) => n + 1)

  const post = (doc: ExpenseDocument) => {
    const created = ledger.postExpense(doc)
    setLog((l) => [
      ...l,
      `> ledger.postExpense(${doc.number})`,
      ...created.map(
        (e) =>
          `  + ${e.id}  ${e.kind.padEnd(10)} Дт ${e.debitAccount} / Кт ${e.creditAccount}  ${num(e.amount)}`,
      ),
    ])
    rerender()
  }

  const reverse = (doc: ExpenseDocument) => {
    const created = ledger.reverse(doc.id, '2026-09-28', 'Сторно: документ визнано помилковим')
    setLog((l) => [
      ...l,
      `> ledger.reverse("${doc.id}")`,
      ...created.map((e) => `  + ${e.id}  СТОРНО  ${num(e.amount)}  (reverses ${e.reversesEntryId})`),
    ])
    rerender()
  }

  const reset = () => {
    ledger.reset()
    setLog([])
    rerender()
  }

  const entries = ledger.all()
  // Рахуємо щоразу заново — рівно так, як це робить справжній звіт.
  const report = getExpenses(ledger, PERIOD)
  const stock = getStock(ledger, 'monitor-27', PERIOD.to)

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="ledger"
        lead="Робоча модель на TypeScript, яка виконується прямо на цій сторінці. Вона не копіює 1С — вона переносить чотири принципи, які дають більшу частину користі: розділення документа і запису, незмінність записів, зв'язок із джерелом і звіт як функцію."
      />

      <Flow
        nodes={MODEL_FLOW}
        title="ExpenseDocument → postExpense() → LedgerEntry → getExpenses()"
        subtitle="Натисніть «Показати, що всередині» — це справжній код, який працює нижче"
        autoplayLabel="Програти модель"
      />

      <Card>
        <CardHeader
          icon={<Braces size={16} />}
          title="Жива пісочниця: ledger виконується у браузері"
          subtitle="Проводьте документи і дивіться, як наповнюються записи та змінюється звіт"
          right={
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="primary"
                onClick={() => DEMO_DOCS.forEach(post)}
                disabled={entries.length > 0}
              >
                <Play size={12} /> Провести всі
              </Button>
              <Button size="sm" onClick={reset} disabled={entries.length === 0}>
                <RotateCcw size={12} /> Скинути
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3">
          {DEMO_DOCS.map((d) => {
            const posted = ledger.isPosted(d.id)
            return (
              <div
                key={d.id}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5',
                  posted ? 'border-ok/45 bg-ok/[0.07]' : 'border-line bg-surface',
                )}
              >
                <div className="font-mono text-[10.5px] text-muted">{d.number}</div>
                <div className="text-[12px] font-medium">
                  {KIND_LABEL[d.kind]} · {num(d.net)}
                </div>
                <div className="mt-1 flex gap-1">
                  <button
                    onClick={() => post(d)}
                    className="rounded border border-line px-1.5 py-0.5 text-[10.5px] text-accent transition hover:bg-accent/10"
                  >
                    postExpense()
                  </button>
                  {posted && (
                    <button
                      onClick={() => reverse(d)}
                      className="rounded border border-danger/40 px-1.5 py-0.5 text-[10.5px] text-danger transition hover:bg-danger/10"
                    >
                      <Undo2 size={9} className="inline" /> reverse()
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-b border-line px-4 py-2.5">
          <Tabs
            size="sm"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'entries', label: `LedgerEntry (${entries.length})` },
              { id: 'report', label: `getExpenses() (${report.rows.length})` },
              { id: 'stock', label: 'getStock()' },
            ]}
          />
        </div>

        <div className="p-4">
          {tab === 'entries' && <EntriesTable entries={entries} />}

          {tab === 'report' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,300px)]">
              <div>
                {report.rows.length === 0 ? (
                  <Empty>Записів немає — звіт чесно показує порожньо.</Empty>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Стаття витрат</Th>
                        <Th>Підрозділ</Th>
                        <Th align="right">Сума</Th>
                        <Th>Записи (розшифровка)</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((r) => (
                        <tr key={`${r.costArticle}|${r.department}`}>
                          <Td className="font-medium">{r.costArticle}</Td>
                          <Td className="text-muted">{r.department}</Td>
                          <Td align="right" mono className="font-semibold">
                            {num(r.amount)}
                          </Td>
                          <Td mono className="text-[11px] text-faint">
                            {r.entryIds.join(', ')}
                          </Td>
                        </tr>
                      ))}
                      <tr className="bg-elevated">
                        <Td colSpan={2} className="font-semibold">
                          Разом
                        </Td>
                        <Td align="right" mono className="font-bold text-accent">
                          {num(report.total)}
                        </Td>
                        <Td />
                      </tr>
                    </tbody>
                  </Table>
                )}
              </div>
              <div className="grid gap-2 self-start">
                <Stat label="Витрати вересня" value={money(report.total)} tone="warn" />
                <Stat
                  label="Записів у ledger"
                  value={String(entries.length)}
                  hint={`з них витратних: ${entries.filter((e) => ['EXPENSE', 'COGS'].includes(e.kind)).length}`}
                />
                <CodeBlock
                  lang="ts"
                  caption="Виклик"
                  code={`getExpenses(ledger, {\n  from: "${PERIOD.from}",\n  to:   "${PERIOD.to}",\n})`}
                />
              </div>
            </div>
          )}

          {tab === 'stock' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid gap-2">
                <Stat label="Залишок monitor-27" value={`${stock.qty} шт`} tone="accent" />
                <Stat label="Вартість залишку" value={money(stock.amount)} />
                <Stat
                  label="Собівартість одиниці"
                  value={money(ledger.unitCost('monitor-27', PERIOD.to))}
                  hint="обчислюється з ledger, не зберігається"
                />
              </div>
              <CodeBlock
                lang="ts"
                caption="Залишок — це обчислення"
                code={`function getStock(ledger, itemId, onDate) {
  let qty = 0, amount = 0
  for (const e of ledger.all()) {
    if (e.dimensions.itemId !== itemId) continue
    if (e.occurredAt > onDate) continue
    if (e.kind === 'ASSET') { qty += e.quantity; amount += e.amount }
    if (e.kind === 'COGS')  { qty -= e.quantity; amount -= e.amount }
  }
  return { qty, amount }
}

// НЕМАЄ поля items.stock, яке хтось оновлює UPDATE-ом`}
              />
            </div>
          )}
        </div>

        {log.length > 0 && (
          <div className="border-t border-line px-4 py-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-faint">
              <Terminal size={12} /> лог викликів
            </div>
            <CodeBlock lang="log" caption="ledger console" code={log.join('\n')} />
          </div>
        )}
      </Card>

      <Callout kind="key" title="Зверніть увагу на дві речі в цій моделі">
        <strong>1.</strong> <code>reverse()</code> нічого не видаляє — він додає записи з
        від’ємними сумами і полем <code>reversesEntryId</code>. Подивіться таблицю після сторнування:
        рядків стало більше, а підсумок — нуль.{' '}
        <strong>2.</strong> Собівартість продажу не береться з документа: <code>buildEntries()</code>{' '}
        викликає <code>ctx.unitCost()</code>, який читає ledger. Це той самий принцип, що й у 1С:
        проведення залежить від уже накопичених даних.
      </Callout>

      <Section eyebrow="структура" title="Повна модель даних">
        <CodeBlock
          lang="ts"
          caption="LedgerEntry — ядро всієї системи"
          code={`interface LedgerEntry {
  readonly id: string                 // сурогатний ключ
  readonly occurredAt: string         // ПЕРІОД — коли подія сталася в обліку
                                      // (НЕ createdAt: звіт фільтрує саме за цим)
  readonly sourceType: string         // РЕЄСТРАТОР, частина 1: вид документа
  readonly sourceId: string           // РЕЄСТРАТОР, частина 2: id документа
  readonly kind: EntryKind            // EXPENSE | ASSET | COGS | INCOME | TAX | SETTLEMENT
  readonly debitAccount: string       // рахунок Дт
  readonly creditAccount: string      // рахунок Кт
  readonly amount: number             // РЕСУРС — єдине, що підсумовується
  readonly quantity?: number          // другий ресурс
  readonly dimensions: Readonly<{     // СУБКОНТО / ВИМІРЮВАННЯ
    costArticle?: string
    department?: string
    counterparty?: string
    itemId?: string
  }>
  readonly reversesEntryId?: string   // слід сторнування
  readonly note: string               // РЕКВІЗИТ — не групується, не підсумовується
}`}
        />
        <div className="mt-3">
          <CodeBlock
            lang="sql"
            caption="Те саме у вигляді SQL-схеми"
            code={`create table ledger_entries (
  id                uuid primary key default gen_random_uuid(),
  occurred_at       date        not null,
  source_type       text        not null,
  source_id         uuid        not null,
  kind              text        not null,
  debit_account     text        not null,
  credit_account    text        not null,
  amount            numeric(18,2) not null,
  quantity          numeric(18,3),
  cost_article_id   uuid references cost_articles(id),
  department_id     uuid references departments(id),
  counterparty_id   uuid references counterparties(id),
  item_id           uuid references items(id),
  reverses_entry_id uuid references ledger_entries(id),
  note              text,
  created_at        timestamptz not null default now()
);

create index on ledger_entries (occurred_at);
create index on ledger_entries (source_type, source_id);
create index on ledger_entries (cost_article_id, occurred_at);

-- історія недоторканна на рівні прав
revoke update, delete on ledger_entries from app_user;
grant  select, insert  on ledger_entries to   app_user;`}
          />
        </div>
      </Section>

      <Collapse title="Чого в цій моделі навмисно НЕМАЄ і чому" tone="accent">
        <Table>
          <thead>
            <tr>
              <Th>Механізм 1С</Th>
              <Th>Чому не перенесено</Th>
              <Th>Коли знадобиться</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>Метадані та конфігуратор</Td>
              <Td className="text-[12px] text-muted">
                Це інструмент розробки платформи. У вашому коді роль метаданих грають типи TypeScript
                і міграції.
              </Td>
              <Td className="text-[12px] text-muted">Ніколи — не будуйте платформу всередині продукту</Td>
            </tr>
            <tr>
              <Td>План видів характеристик</Td>
              <Td className="text-[12px] text-muted">
                Динамічна схема аналітики — потужно, але дорого. Фіксовані FK-поля простіші й швидші.
              </Td>
              <Td className="text-[12px] text-muted">
                Коли користувачі мають самі додавати нові розрізи без розробника
              </Td>
            </tr>
            <tr>
              <Td>Регістр розрахунку</Td>
              <Td className="text-[12px] text-muted">
                Витіснення за періодом дії — дуже специфічна задача розрахунку зарплати.
              </Td>
              <Td className="text-[12px] text-muted">Коли з’явиться повноцінний розрахунок ЗП</Td>
            </tr>
            <tr>
              <Td>Таблиці підсумків</Td>
              <Td className="text-[12px] text-muted">
                Передчасна оптимізація. До сотень тисяч записів звичайний GROUP BY з індексом працює
                добре.
              </Td>
              <Td className="text-[12px] text-muted">
                Коли звіт почне працювати довше 1–2 секунд — тоді materialized view
              </Td>
            </tr>
            <tr>
              <Td>Оперативне проведення / послідовності</Td>
              <Td className="text-[12px] text-muted">
                Механізм контролю хронології складний і потрібен там, де є FIFO та контроль залишків
                у реальному часі.
              </Td>
              <Td className="text-[12px] text-muted">
                Коли з’являться партійний облік і заборона від’ємних залишків
              </Td>
            </tr>
          </tbody>
        </Table>
      </Collapse>

      <Card>
        <CardHeader title="Тести, які варто написати першими" subtitle="вони ловлять 90% помилок обліку" />
        <div className="p-4">
          <CodeBlock
            lang="ts"
            caption="ledger.test.ts"
            code={`test('непроведений документ не впливає на звіт', () => {
  const l = new Ledger()
  expect(getExpenses(l, SEPTEMBER).total).toBe(0)
})

test('проведення ідемпотентне', () => {
  const l = new Ledger()
  l.postExpense(doc); l.postExpense(doc); l.postExpense(doc)
  expect(getExpenses(l, SEPTEMBER).total).toBe(30000)   // не 90000
})

test('придбання товару НЕ є витратою', () => {
  const l = new Ledger()
  l.postExpense(goodsReceipt)                            // 50 000
  expect(getExpenses(l, SEPTEMBER).total).toBe(0)
  expect(getStock(l, 'monitor-27', '2026-09-30').qty).toBe(10)
})

test('продаж перетворює актив на витрату', () => {
  const l = new Ledger()
  l.postExpense(goodsReceipt)                            // 10 шт по 5000
  l.postExpense(goodsSale)                               // 4 шт
  expect(getExpenses(l, SEPTEMBER).total).toBe(20000)    // 4 × 5000
  expect(getStock(l, 'monitor-27', '2026-09-30').qty).toBe(6)
})

test('сторно обнуляє результат, але зберігає історію', () => {
  const l = new Ledger()
  l.postExpense(doc)
  l.reverse(doc.id, '2026-09-28', 'помилка')
  expect(getExpenses(l, SEPTEMBER).total).toBe(0)
  expect(l.all().length).toBe(4)                         // 2 + 2, нічого не видалено
})

test('звіт відбирає за періодом події, а не за датою створення', () => {
  const l = new Ledger()
  l.postExpense({ ...doc, date: '2026-10-01' })
  expect(getExpenses(l, SEPTEMBER).total).toBe(0)
})`}
          />
          <p className="mt-3 text-[13.5px] leading-6 text-muted">
            Зверніть увагу: усі шість тестів перевіряють <strong>причинно-наслідкові зв’язки</strong>,
            а не формат даних. Саме вони ламаються, коли хтось «оптимізує» ledger, додавши поле
            з поточним балансом.
          </p>
        </div>
      </Card>
    </div>
  )
}

function EntriesTable({ entries }: { entries: readonly LedgerEntry[] }) {
  if (!entries.length)
    return <Empty>Ledger порожній. Натисніть «postExpense()» на будь-якому документі.</Empty>
  return (
    <Table>
      <thead>
        <tr>
          <Th>id</Th>
          <Th>occurredAt</Th>
          <Th>sourceId</Th>
          <Th>kind</Th>
          <Th align="center">Дт</Th>
          <Th align="center">Кт</Th>
          <Th align="right">amount</Th>
          <Th>dimensions</Th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id} className={cn(e.reversesEntryId && 'bg-danger/[0.06]')}>
            <Td mono className="text-faint">{e.id}</Td>
            <Td mono>{dmy(e.occurredAt)}</Td>
            <Td mono className="text-muted">{e.sourceId}</Td>
            <Td>
              <Badge
                tone={
                  e.kind === 'EXPENSE' || e.kind === 'COGS'
                    ? 'warn'
                    : e.kind === 'ASSET'
                      ? 'accent'
                      : e.kind === 'INCOME'
                        ? 'ok'
                        : 'neutral'
                }
              >
                {e.kind}
              </Badge>
            </Td>
            <Td align="center" mono>{e.debitAccount}</Td>
            <Td align="center" mono>{e.creditAccount}</Td>
            <Td align="right" mono className={cn('font-semibold', e.amount < 0 && 'text-danger')}>
              {num(e.amount)}
            </Td>
            <Td className="text-[11px] text-muted">
              {Object.entries(e.dimensions)
                .filter(([, v]) => v)
                .map(([k, v]) => `${k}=${v}`)
                .join(' · ') || '—'}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

const KIND_LABEL: Record<string, string> = {
  SERVICE_RECEIPT: 'Послуга',
  PAYROLL: 'Зарплата',
  GOODS_RECEIPT: 'Товар (прихід)',
  GOODS_SALE: 'Продаж',
}
