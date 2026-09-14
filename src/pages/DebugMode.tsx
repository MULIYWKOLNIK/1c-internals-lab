import { useMemo, useState } from 'react'
import { User, Wrench, Eye, Layers } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { LmsBridge } from '@/components/LmsBridge'
import { useStore } from '@/state/store'
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  CodeBlock,
  Collapse,
  Section,
  Table,
  Td,
  Th,
  Tabs,
} from '@/components/ui'
import { DOCUMENTS, DOCUMENT_BY_ID, POSTING_PROCEDURE } from '@/engine/documents'
import { postDocument, stockFromMovements } from '@/engine/posting'
import { money, num } from '@/engine/format'
import { REGISTER_BY_ID } from '@/engine/registers'
import { accounting } from '@/engine/reports'

const LEVELS = [
  {
    id: 'user',
    icon: <User size={15} />,
    title: 'User mode',
    who: 'Бухгалтер, менеджер, власник',
    sees: 'Результат дії людською мовою',
    question: 'Що змінилось для мене?',
    example: '«Проведено документ. Витрати збільшились на 30 000 грн.»',
    good: 'Швидко, зрозуміло, не перевантажує',
    bad: 'Неможливо зрозуміти ПОЧОМУ саме так і де шукати помилку',
  },
  {
    id: 'debug',
    icon: <Wrench size={15} />,
    title: 'Debug mode',
    who: 'Розробник, впроваджувач, аналітик',
    sees: 'Структуру створених записів',
    question: 'Що саме система записала і куди?',
    example: 'Register: Accounting, Debit: 92, Credit: 631, Amount: 30000',
    good: 'Видно точну причину будь-якої цифри у звіті',
    bad: 'Вимагає розуміння моделі даних',
  },
]

export default function DebugMode() {
  const store = useStore()
  const [docId, setDocId] = useState('doc-rent')
  const [view, setView] = useState<'split' | 'user' | 'debug'>('split')

  const result = useMemo(() => {
    const base =
      docId === 'doc-goods-out' ? postDocument(DOCUMENT_BY_ID['doc-goods-in']).movements : []
    return postDocument(DOCUMENT_BY_ID[docId], stockFromMovements(base))
  }, [docId])

  const doc = DOCUMENT_BY_ID[docId]
  const expense = accounting(result.movements)
    .filter((m) => ['92', '93', '902', '23'].includes(m.debitAccount))
    .reduce((s, m) => s + m.amount, 0)

  const debugText = [
    `Document ID:        ${doc.id}`,
    `Document number:    ${doc.number}`,
    `Document date:      ${doc.date}`,
    `Document kind:      ${doc.kind}`,
    ``,
    `Posting procedure:`,
    `  ${POSTING_PROCEDURE[doc.kind]}`,
    ``,
    `Movements: ${result.movements.length}`,
    ...result.movements.flatMap((m, i) => {
      const head = `  ${i + 1}. Register: ${REGISTER_BY_ID[m.register]?.title ?? m.register}`
      if (m.kind === 'accounting')
        return [
          head,
          `     Debit:  ${m.debitAccount}  ${fmt(m.debitSubconto)}`,
          `     Credit: ${m.creditAccount}  ${fmt(m.creditSubconto)}`,
          `     Amount: ${m.amount}${m.quantity != null ? `   Quantity: ${m.quantity}` : ''}`,
        ]
      if (m.kind === 'accumulation')
        return [
          head,
          `     RecordType: ${m.recordType === 'receipt' ? 'Receipt (+)' : 'Expense (-)'}`,
          `     Dimensions: ${fmt(m.dimensions)}`,
          `     Resources:  ${JSON.stringify(m.resources)}`,
        ]
      return [head, `     Dimensions: ${fmt(m.dimensions)}`, `     Resources:  ${JSON.stringify(m.resources)}`]
    }),
    ``,
    `Transaction: COMMIT`,
    `Posted = true`,
  ].join('\n')

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="debug"
        lead="Одна й та сама дія має два описи. Користувачу потрібен результат, розробнику — структура. Найкорисніше вміння — вільно перемикатися між цими рівнями й перекладати одне в інше."
      />

      <div className="grid gap-3 md:grid-cols-2">
        {LEVELS.map((l) => (
          <Card
            key={l.id}
            className={cn(
              'transition',
              store.mode === l.id ? 'border-accent/55 shadow-panel' : 'opacity-80',
            )}
          >
            <CardHeader
              icon={l.icon}
              title={l.title}
              subtitle={l.who}
              right={
                <Button
                  size="sm"
                  variant={store.mode === l.id ? 'primary' : 'default'}
                  onClick={() => store.setMode(l.id as 'user' | 'debug')}
                >
                  {store.mode === l.id ? 'активний' : 'увімкнути'}
                </Button>
              }
            />
            <div className="grid gap-2 p-4 text-[13px] leading-6">
              <Row k="Відповідає на питання" v={l.question} />
              <Row k="Показує" v={l.sees} />
              <Row k="Приклад" v={l.example} mono />
              <div className="mt-1 grid gap-1.5 sm:grid-cols-2">
                <div className="rounded border border-ok/35 bg-ok/[0.06] px-2.5 py-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-ok">
                    сильна сторона
                  </div>
                  <div className="text-[12.5px] leading-5">{l.good}</div>
                </div>
                <div className="rounded border border-warn/35 bg-warn/[0.06] px-2.5 py-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-warn">
                    обмеження
                  </div>
                  <div className="text-[12.5px] leading-5">{l.bad}</div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          icon={<Eye size={16} />}
          title="Одна дія — два описи"
          subtitle="Оберіть документ і порівняйте, що бачить кожна роль"
          right={
            <Tabs
              size="sm"
              value={view}
              onChange={setView}
              tabs={[
                { id: 'split', label: 'Поруч' },
                { id: 'user', label: 'Тільки User' },
                { id: 'debug', label: 'Тільки Debug' },
              ]}
            />
          }
        />

        <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3">
          {DOCUMENTS.map((d) => (
            <button
              key={d.id}
              onClick={() => setDocId(d.id)}
              className={cn(
                'focus-ring rounded-lg border px-2.5 py-1 text-[11.5px] transition',
                docId === d.id
                  ? 'border-accent/55 bg-accent/[0.09] text-accent'
                  : 'border-line bg-elevated text-muted hover:text-fg',
              )}
            >
              {d.number}
            </button>
          ))}
        </div>

        <div
          className={cn(
            'grid gap-4 p-4',
            view === 'split' && 'lg:grid-cols-2',
          )}
        >
          {view !== 'debug' && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-faint">
                <User size={12} /> що бачить користувач
              </div>
              <div className="rounded-lg border border-ok/40 bg-ok/[0.06] px-4 py-4">
                <div className="text-[15px] font-medium leading-7">
                  {result.userSummary.map((s) => (
                    <p key={s}>{s}</p>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                <div className="rounded-lg border border-line bg-elevated px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-faint">Витрати періоду</div>
                  <div className="mt-0.5 font-mono text-[18px] font-semibold">
                    {money(expense)}
                  </div>
                </div>
                <p className="text-[12.5px] leading-6 text-muted">
                  Коротко, зрозуміло — і повністю непридатно для пошуку причини, якщо цифра
                  виявиться неочікуваною. Користувач не може відповісти на питання «чому 30 000, а не
                  36 000».
                </p>
              </div>
            </div>
          )}

          {view !== 'user' && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-faint">
                <Wrench size={12} /> що бачить розробник
              </div>
              <CodeBlock lang="log" caption="Debug output" code={debugText} />
              <p className="mt-2 text-[12.5px] leading-6 text-muted">
                Та сама дія. Тепер видно все: скільки записів, у які регістри, з якою аналітикою і
                чому саме така сума. На питання «чому 30 000, а не 36 000» відповідає рядок із
                рахунком 6442 — ПДВ пішов окремим записом.
              </p>
            </div>
          )}
        </div>
      </Card>

      <Callout kind="key" title="Навичка, заради якої існує цей розділ">
        Уміння <strong>перекладати</strong> між рівнями. Користувач каже «витрати завищені» —
        ви маєте почути «дебетовий оборот витратних рахунків за період більший за очікуваний» і
        одразу знати, які три речі перевірити: склад записів, період, аналітику. І навпаки:
        побачивши набір рухів, ви маєте вміти пояснити його одним реченням людською мовою.
      </Callout>

      <Section eyebrow="переклад" title="Словник: користувацька фраза → технічний зміст">
        <Table>
          <thead>
            <tr>
              <Th>Що каже користувач</Th>
              <Th>Що це означає технічно</Th>
              <Th>Де дивитись</Th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                '«Документ не проводиться»',
                'Отказ = Истина на етапі перевірок, або помилка на етапі запису; транзакція відкотилась',
                'Повідомлення при проведенні, журнал реєстрації',
              ],
              [
                '«Витрати не видно у звіті»',
                'Запит звіту не повертає записів із такими період / розріз / джерело',
                'Рухи документа → період → аналітика → відбори звіту',
              ],
              [
                '«Витрати задвоїлись»',
                'Два документи створили записи з однаковою аналітикою, або документ введено двічі',
                'Розшифровка комірки звіту до реєстратора',
              ],
              [
                '«Сума не та»',
                'У витрати потрапив ПДВ, або сума взята з іншого рядка ТЧ, або включено/виключено копійки',
                'Порівняти суму документа з ресурсом руху',
              ],
              [
                '«Було, а тепер нема»',
                'Документ розпроведено, перепроведено з іншими даними, або змінився період звіту',
                'Історія документа, поточні рухи, налаштування звіту',
              ],
              [
                '«Залишок від’ємний»',
                'Документ вибуття проведено раніше документа надходження, або хронологію порушено',
                'Рухи регістра залишків, упорядковані за періодом',
              ],
            ].map(([a, b, c]) => (
              <tr key={a}>
                <Td className="font-medium">{a}</Td>
                <Td className="max-w-[380px] text-[12px] text-muted">{b}</Td>
                <Td className="max-w-[280px] text-[12px] text-accent">{c}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Collapse title="Чому debug-режим варто закладати в продукт із самого початку" tone="accent">
        <p className="mb-2">
          Технічна панель «що саме система зробила» коштує 2–3 дні розробки, а економить місяці
          підтримки. Три причини:
        </p>
        <ul className="grid gap-1.5 pl-4 text-[13.5px] leading-6">
          <li>
            <strong>Підтримка.</strong> Замість «спробуйте перепровести» — конкретна відповідь про
            конкретний запис.
          </li>
          <li>
            <strong>Довіра.</strong> Користувач, який може розшифрувати цифру до джерела, перестає
            вважати систему «чорною скринькою».
          </li>
          <li>
            <strong>Розробка.</strong> Ви самі користуватиметесь нею щодня — і виявите власні
            помилки раніше, ніж їх знайдуть користувачі.
          </li>
        </ul>
        <p className="mt-2">
          Мінімальний обсяг: для будь-якої цифри у звіті — кнопка «показати записи, з яких вона
          зібрана», а для будь-якого запису — посилання на документ-джерело.
        </p>
      </Collapse>

      <Card>
        <CardHeader
          icon={<Layers size={16} />}
          title="Усі рухи цього документа"
          subtitle="технічний рівень: структура кожного запису"
        />
        <div className="p-4">
          <Table>
            <thead>
              <tr>
                <Th align="center">#</Th>
                <Th>Регістр</Th>
                <Th>Тип</Th>
                <Th>Ключові поля</Th>
                <Th align="right">Ресурси</Th>
              </tr>
            </thead>
            <tbody>
              {result.movements.map((m, i) => (
                <tr key={m.id}>
                  <Td align="center" mono className="text-faint">{i + 1}</Td>
                  <Td className="text-[12px]">{REGISTER_BY_ID[m.register]?.title}</Td>
                  <Td>
                    <Badge
                      tone={m.kind === 'accounting' ? 'accent' : m.kind === 'accumulation' ? 'ok' : 'cyan'}
                    >
                      {m.kind}
                    </Badge>
                  </Td>
                  <Td mono className="max-w-[340px] text-[11px] text-muted">
                    {m.kind === 'accounting'
                      ? `Дт ${m.debitAccount} / Кт ${m.creditAccount}`
                      : m.kind === 'accumulation'
                        ? `${m.recordType} · ${fmt(m.dimensions)}`
                        : fmt(m.dimensions)}
                  </Td>
                  <Td align="right" mono className="font-semibold">
                    {m.kind === 'accounting'
                      ? num(m.amount)
                      : Object.values(m.resources)
                          .map((v) => (typeof v === 'number' ? num(v) : v))
                          .join(' / ')}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <LmsBridge
        summary="У власній системі debug-режим — це не «лог у консоль». Це окреме представлення тих самих даних: для кожної операції показати створені записи, а для кожного числа у звіті — перелік записів, з яких воно зібране. Якщо ваш post() повертає масив створених записів, половина роботи вже зроблена."
        rows={[
          { onec: 'User mode', lms: 'flash-повідомлення / toast', note: 'Короткий підсумок дії людською мовою.' },
          { onec: 'Debug mode', lms: 'панель «Записи операції»', note: 'Таблиця того, що повернув post().' },
          { onec: 'Розшифровка звіту', lms: 'entryIds у рядку звіту', note: 'Клік → перелік записів → документ.' },
          { onec: 'Журнал реєстрації', lms: 'structured logs з sourceId', note: 'Пошук за id документа має давати всю історію.' },
        ]}
        code={`// post() повертає створені записи — і цього достатньо для debug-панелі
const entries = await postDocument(docId)

// user mode
toast.success(\`Проведено. Витрати +\${formatMoney(sumExpenses(entries))}\`)

// debug mode (той самий масив, інше представлення)
<EntriesTable entries={entries} />

// розшифровка у звіті
<td onClick={() => openEntries(row.entryIds)}>{row.amount}</td>`}
      />
    </div>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(120px,auto)_1fr] gap-3 border-b border-line2 py-1 last:border-0">
      <span className="text-[11.5px] text-muted">{k}</span>
      <span className={cn('text-[13px]', mono && 'font-mono text-[11.5px]')}>{v}</span>
    </div>
  )
}

function fmt(r: Record<string, string>): string {
  return (
    Object.entries(r)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ') || '—'
  )
}
