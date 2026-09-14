import { Fragment, useMemo, useState } from 'react'
import { BarChart3, Database, Filter, Play, Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { LmsBridge } from '@/components/LmsBridge'
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
  Stat,
  Table,
  Td,
  Th,
  Tabs,
} from '@/components/ui'
import { useStore } from '@/state/store'
import {
  expenseReport,
  profitAndLoss,
  trialBalance,
  accounting,
  accumulation,
  type Period,
} from '@/engine/reports'
import { dmy, money, num } from '@/engine/format'
import { DOCUMENT_BY_ID } from '@/engine/documents'

const PERIODS: { id: string; label: string; period: Period }[] = [
  { id: 'sep', label: 'Вересень 2026', period: { from: '2026-09-01', to: '2026-09-30' } },
  { id: 'sep1', label: '01–15 вересня', period: { from: '2026-09-01', to: '2026-09-15' } },
  { id: 'sep2', label: '16–30 вересня', period: { from: '2026-09-16', to: '2026-09-30' } },
  { id: 'oct', label: 'Жовтень 2026', period: { from: '2026-10-01', to: '2026-10-31' } },
]

const CHAIN: FlowNode[] = [
  {
    id: 'report',
    title: 'Звіт',
    caption: 'те, що відкриває людина',
    tone: 'accent',
    simple: 'Ви обираєте період і натискаєте «Сформувати».',
    technical:
      'Звіт — це опис: яке джерело даних, які поля групування, які відбори, як оформити. Жодних цифр у ньому не зберігається.',
    example: '«Витрати за статтями», період 01.09–30.09.',
  },
  {
    id: 'query',
    title: 'Запит',
    caption: 'переклад бажання на мову даних',
    tone: 'warn',
    simple: 'Система формує запит до потрібного регістра з вашими параметрами.',
    technical:
      'Текст мовою запитів 1С звертається до віртуальної таблиці регістра. Параметри періоду й відборів підставляються як параметри, а не склеюванням рядків.',
    example: 'Обороти(&Початок, &Кінець, , Організація = &Організація)',
    inside: `ВЫБРАТЬ
    Витрати.СтаттяВитрат,
    СУММА(Витрати.СумаОборот) ЯК Сума
ИЗ РегистрНакопления.ВитратиЗаСтаттями.Обороты(
        &ПочатокПеріоду, &КінецьПеріоду, ,
        Організація = &Організація) ЯК Витрати
СГРУППИРОВАТЬ ПО Витрати.СтаттяВитрат
УПОРЯДОЧИТЬ ПО Сума УБЫВ`,
  },
  {
    id: 'register',
    title: 'Регістр',
    caption: 'джерело істини',
    tone: 'ok',
    simple: 'Запит йде саме в той регістр, який вказаний у звіті.',
    technical:
      'Якщо звіт читає управлінський регістр, а документ записав тільки в бухгалтерський — сума не з’явиться. Це не помилка звіту, а розходження джерел.',
    example: 'РегістрНакопичення.ВитратиЗаСтаттями',
  },
  {
    id: 'records',
    title: 'Записи',
    caption: 'сирі рядки',
    tone: 'cyan',
    simple: 'Система відбирає всі записи, що підходять під умови.',
    technical:
      'На цьому етапі кожен запис ще окремий: із датою, реєстратором і повною аналітикою. Саме тут визначається, які суми взагалі візьмуть участь у підсумку.',
    example: '3 записи: оренда 30 000, зарплата 40 000, ЄСВ 8 800.',
  },
  {
    id: 'aggregate',
    title: 'Агрегація',
    caption: 'згортання',
    tone: 'violet',
    simple: 'Записи групуються за статтею і підсумовуються.',
    technical:
      'GROUP BY по вимірюваннях, SUM по ресурсах. Кількість рядків результату завжди менша або дорівнює кількості записів — інформація навмисно втрачається заради читабельності.',
    example: '3 записи → 3 рядки (усі статті різні). Якби було дві оренди — стало б 2 рядки.',
  },
  {
    id: 'result',
    title: 'Результат',
    caption: 'таблиця на екрані',
    tone: 'accent',
    simple: 'Ви бачите підсумки і можете розшифрувати будь-яку комірку.',
    technical:
      'Кожна комірка «пам’ятає», з яких записів вона зібрана, тому подвійний клік повертає до реєстратора — і далі до документа. Ланцюг замикається у зворотному напрямку.',
    example: 'Оплата праці — 40 000,00 · розшифровка: НЗП-000007.',
  },
]

export default function RegisterToReport() {
  const store = useStore()
  const [periodId, setPeriodId] = useState('sep')
  const [source, setSource] = useState<'expensesByArticle' | 'accounting'>('expensesByArticle')
  const [articleFilter, setArticleFilter] = useState<string | undefined>(undefined)
  const [tab, setTab] = useState<'expenses' | 'tb' | 'pl'>('expenses')
  const [drill, setDrill] = useState<string | null>(null)

  const period = PERIODS.find((p) => p.id === periodId)!.period

  const report = useMemo(
    () => expenseReport(store.movements, { period, source, costArticle: articleFilter }),
    [store.movements, period, source, articleFilter],
  )

  const rawRecords = useMemo(() => {
    if (source === 'expensesByArticle')
      return accumulation(store.movements, 'expensesByArticle').filter(
        (m) => m.period >= period.from && m.period <= period.to,
      )
    return accounting(store.movements).filter(
      (m) =>
        ['92', '93', '902', '23'].includes(m.debitAccount) &&
        m.period >= period.from &&
        m.period <= period.to,
    )
  }, [store.movements, period, source])

  const articles = useMemo(
    () => [...new Set(report.rows.map((r) => r.key))],
    [report],
  )

  const drillRecords = useMemo(() => {
    if (!drill) return []
    return rawRecords.filter((m) =>
      m.kind === 'accumulation'
        ? m.dimensions.costArticle === drill
        : m.debitSubconto.costArticle === drill,
    )
  }, [drill, rawRecords])

  const tb = useMemo(() => trialBalance(store.movements, period), [store.movements, period])
  const pl = useMemo(() => profitAndLoss(store.movements, period), [store.movements, period])

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="register-to-report"
        lead="Звіт не «знає» витрати сам по собі. Він знає лише три речі: з якого регістра брати дані, за який період і за якими полями групувати. Усе інше — наслідок проведення документів. Нижче — робочий звіт над реальними даними симулятора."
      />

      {store.posted.length === 0 ? (
        <Card className="border-warn/45">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="text-[14px] font-semibold">У регістрах поки що порожньо</div>
              <p className="mt-0.5 text-[13px] leading-6 text-muted">
                Жоден документ не проведено — і звіт чесно показує нуль. Це і є демонстрація головної
                тези: звіт не вигадує дані.
              </p>
            </div>
            <Button variant="primary" onClick={store.postAll}>
              <Play size={14} /> Провести всі документи
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="ok">проведено документів: {store.posted.length}</Badge>
          <Badge tone="neutral" mono>{store.movements.length} рухів у базі</Badge>
          <Button size="sm" onClick={store.resetLedger}>
            очистити базу
          </Button>
          <Button size="sm" variant="primary" onClick={store.postAll}>
            провести всі
          </Button>
        </div>
      )}

      <Flow
        nodes={CHAIN}
        title="Звіт → Запит → Регістр → Записи"
        subtitle="Той самий ланцюг, що й раніше, але у зворотному напрямку: від питання до даних"
        autoplayLabel="Програти шлях запиту"
      />

      <Card>
        <CardHeader
          icon={<BarChart3 size={16} />}
          title="Робочий звіт над даними симулятора"
          subtitle="Змінюйте параметри й дивіться, як змінюється результат — і як змінюється сам запит"
          right={
            <Tabs
              size="sm"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'expenses', label: 'Витрати' },
                { id: 'tb', label: 'ОСВ' },
                { id: 'pl', label: 'Фінрезультат' },
              ]}
            />
          }
        />

        {tab === 'expenses' && (
          <>
            <div className="grid gap-3 border-b border-line px-4 py-3 sm:grid-cols-3">
              <div>
                <div className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wide text-faint">
                  <Filter size={11} /> Період
                </div>
                <div className="flex flex-wrap gap-1">
                  {PERIODS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPeriodId(p.id)}
                      className={cn(
                        'focus-ring rounded border px-2 py-0.5 text-[11.5px] transition',
                        periodId === p.id
                          ? 'border-accent/55 bg-accent/[0.1] text-accent'
                          : 'border-line bg-elevated text-muted hover:text-fg',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wide text-faint">
                  <Database size={11} /> Джерело даних
                </div>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ['expensesByArticle', 'Регістр витрат'],
                      ['accounting', 'Регістр бухгалтерії'],
                    ] as const
                  ).map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => setSource(k)}
                      className={cn(
                        'focus-ring rounded border px-2 py-0.5 text-[11.5px] transition',
                        source === k
                          ? 'border-accent/55 bg-accent/[0.1] text-accent'
                          : 'border-line bg-elevated text-muted hover:text-fg',
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wide text-faint">
                  <Search size={11} /> Відбір за статтею
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setArticleFilter(undefined)}
                    className={cn(
                      'focus-ring rounded border px-2 py-0.5 text-[11.5px] transition',
                      !articleFilter
                        ? 'border-accent/55 bg-accent/[0.1] text-accent'
                        : 'border-line bg-elevated text-muted hover:text-fg',
                    )}
                  >
                    без відбору
                  </button>
                  {articles.map((a) => (
                    <button
                      key={a}
                      onClick={() => setArticleFilter(a)}
                      className={cn(
                        'focus-ring rounded border px-2 py-0.5 text-[11.5px] transition',
                        articleFilter === a
                          ? 'border-accent/55 bg-accent/[0.1] text-accent'
                          : 'border-line bg-elevated text-muted hover:text-fg',
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_minmax(0,360px)]">
              <div>
                <div className="mb-1.5 text-[11px] uppercase tracking-wide text-faint">
                  результат звіту
                </div>
                {report.rows.length === 0 ? (
                  <Empty>
                    За обраних параметрів записів немає. Це не «поламаний звіт» — це відсутність
                    даних у вибірці.
                  </Empty>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Стаття витрат</Th>
                        <Th align="right">Сума</Th>
                        <Th align="center">розшифрувати</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((r) => (
                        <Fragment key={r.key}>
                          <tr className="hover:bg-elevated">
                            <Td className="font-medium">{r.label}</Td>
                            <Td align="right" mono className="font-semibold">
                              {num(r.values.amount)}
                            </Td>
                            <Td align="center">
                              <button
                                onClick={() => setDrill(drill === r.key ? null : r.key)}
                                className="text-[11px] text-accent hover:underline"
                              >
                                {drill === r.key ? 'сховати' : 'до документів'}
                              </button>
                            </Td>
                          </tr>
                          {r.children?.map((c) => (
                            <tr key={`${r.key}-${c.key}`} className="bg-elevated/40">
                              <Td className="pl-7 text-[12px] text-muted">└ {c.label}</Td>
                              <Td align="right" mono className="text-muted">
                                {num(c.values.amount)}
                              </Td>
                              <Td />
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                      <tr className="bg-elevated">
                        <Td className="font-semibold">Разом</Td>
                        <Td align="right" mono className="text-[14px] font-bold text-accent">
                          {num(report.total.amount)}
                        </Td>
                        <Td />
                      </tr>
                    </tbody>
                  </Table>
                )}

                {drill && (
                  <div className="mt-3 animate-fade-up">
                    <div className="mb-1.5 text-[11px] uppercase tracking-wide text-faint">
                      розшифровка «{drill}» до реєстратора
                    </div>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Період</Th>
                          <Th>Реєстратор</Th>
                          <Th>Документ</Th>
                          <Th align="right">Сума</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {drillRecords.map((m) => (
                          <tr key={m.id}>
                            <Td mono>{dmy(m.period)}</Td>
                            <Td className="text-muted">{m.registrarTitle}</Td>
                            <Td className="text-[12px]">{DOCUMENT_BY_ID[m.registrar]?.title}</Td>
                            <Td align="right" mono>
                              {num(
                                m.kind === 'accumulation'
                                  ? (m.resources.amount ?? 0)
                                  : m.kind === 'accounting'
                                    ? m.amount
                                    : 0,
                              )}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    <p className="mt-1.5 text-[12px] leading-5 text-muted">
                      Саме це робить подвійний клік у 1С: бере комірку → знаходить записи, з яких
                      вона зібрана → читає їх реєстратор → відкриває документ.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-2 self-start">
                <Stat
                  label="Записів у вибірці"
                  value={String(rawRecords.length)}
                  hint={`з ${store.movements.length} у базі`}
                />
                <Stat label="Рядків у звіті" value={String(report.rows.length)} hint="після групування" />
                <Stat label="Підсумок" value={money(report.total.amount)} tone="warn" />

                <CodeBlock caption="Запит, який виконався" code={report.query} />

                <div className="rounded-lg border border-line bg-elevated px-3 py-2">
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    джерело
                  </div>
                  {report.sources.map((s) => (
                    <div key={s} className="font-mono text-[11.5px] text-accent">
                      {s}
                    </div>
                  ))}
                  <p className="mt-1.5 text-[12px] leading-5 text-muted">{report.note}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'tb' && (
          <div className="p-4">
            <Table>
              <thead>
                <tr>
                  {tb.columns.map((c) => (
                    <Th key={c.key} align={c.align}>
                      {c.title}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tb.rows.map((r) => (
                  <tr key={r.key}>
                    <Td className="font-medium">{r.label}</Td>
                    {tb.columns.slice(1).map((c) => (
                      <Td key={c.key} align="right" mono>
                        {r.values[c.key] ? num(r.values[c.key]) : '—'}
                      </Td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-elevated">
                  <Td className="font-semibold">Разом</Td>
                  {tb.columns.slice(1).map((c) => (
                    <Td key={c.key} align="right" mono className="font-semibold">
                      {tb.total[c.key] ? num(tb.total[c.key]) : '—'}
                    </Td>
                  ))}
                </tr>
              </tbody>
            </Table>
            <div className="mt-3">
              <Callout kind="ok" title="Оборот Дт = Оборот Кт">
                {tb.note}
              </Callout>
            </div>
            <CodeBlock className="mt-3" caption="Запит ОСВ" code={tb.query} />
          </div>
        )}

        {tab === 'pl' && (
          <div className="p-4">
            <Table>
              <thead>
                <tr>
                  <Th>Показник</Th>
                  <Th>Джерело</Th>
                  <Th align="right">Сума</Th>
                </tr>
              </thead>
              <tbody>
                {pl.rows.map((r) => (
                  <tr key={r.key}>
                    <Td className="font-medium">{r.label}</Td>
                    <Td mono className="text-[11.5px] text-muted">{r.sub}</Td>
                    <Td
                      align="right"
                      mono
                      className={cn('font-semibold', r.values.amount < 0 && 'text-danger')}
                    >
                      {num(r.values.amount)}
                    </Td>
                  </tr>
                ))}
                <tr className="bg-elevated">
                  <Td colSpan={2} className="font-semibold">
                    Фінансовий результат
                  </Td>
                  <Td
                    align="right"
                    mono
                    className={cn(
                      'text-[14px] font-bold',
                      pl.total.amount >= 0 ? 'text-ok' : 'text-danger',
                    )}
                  >
                    {num(pl.total.amount)}
                  </Td>
                </tr>
              </tbody>
            </Table>
            <div className="mt-3">
              <Callout kind="key">{pl.note}</Callout>
            </div>
            <CodeBlock className="mt-3" caption="Запит фінрезультату" code={pl.query} />
          </div>
        )}
      </Card>

      <Callout kind="warn" title="Дві різні цифри витрат можуть бути обидві правильними">
        Перемкніть джерело даних між «Регістр витрат» і «Регістр бухгалтерії». У нашому симуляторі
        суми збігаються — бо алгоритм проведення пише в обидва регістри узгоджено. У реальній базі
        вони можуть розійтися: наприклад, ручна бухгалтерська операція не створює запису в
        управлінському регістрі. Саме тому в типових конфігураціях існують звіти-звірки.
      </Callout>

      <Collapse title="Чому SQL у прикладах — це аналогія, а не справжній SQL 1С" tone="accent">
        <p className="mb-2">
          Запити в цьому проєкті написані у зрозумілому SQL-подібному вигляді навмисно: так легше
          побачити суть. Але точність вимагає трьох уточнень.
        </p>
        <ol className="mb-2 grid list-decimal gap-1.5 pl-5 text-[13.5px] leading-6">
          <li>
            1С має <strong>власну мову запитів</strong>, а не SQL. Вона схожа синтаксично, але працює
            з об’єктною моделлю: посиланнями, ієрархією, характеристиками.
          </li>
          <li>
            Віртуальні таблиці (<code>.Обороты(...)</code>) не існують фізично. Платформа
            розгортає їх у складніші конструкції до реальних таблиць і таблиць підсумків.
          </li>
          <li>
            Реальний SQL, що виконується в СУБД, генерує платформа. Він залежить від версії, режиму
            сумісності, СУБД і навіть від наявності підсумків. Покладатись на його вигляд не можна.
          </li>
        </ol>
        <p>
          Тому правильне формулювання: «концептуально це еквівалентно ось такому SQL», а не «1С
          виконує ось такий SQL».
        </p>
      </Collapse>

      <LmsBridge
        summary="Найголовніше правило звітності у власній системі: звіт не має власного стану. Якщо у вас з'явилася таблиця report_cache, яку хтось оновлює вручну — ви щойно створили друге джерело істини. Кешувати можна, але кеш має бути повністю відтворюваним із ledger однією командою."
        rows={[
          { onec: 'Звіт', lms: 'GET /reports/expenses?from&to&groupBy', note: 'Читає, нічого не зберігає.' },
          { onec: 'Запит', lms: 'repository.turnovers(params)', note: 'Параметризований, з білим списком полів групування.' },
          { onec: 'Віртуальна таблиця', lms: 'SQL view або CTE', note: 'Єдине місце, де описана логіка агрегації.' },
          { onec: 'Розшифровка', lms: 'повернути entryIds у рядку звіту', note: 'Дає drill-down до джерела одним запитом.' },
        ]}
        code={`export async function expenseReport(p: { from: string; to: string; groupBy: Dimension[] }) {
  const rows = await db
    .select({
      ...pick(ledger, p.groupBy),
      amount:   sum(ledger.amount),
      entryIds: arrayAgg(ledger.id),     // ← розшифровка «безкоштовно»
    })
    .from(ledger)
    .where(and(
      between(ledger.occurredAt, p.from, p.to),
      inArray(ledger.debitAccount, EXPENSE_ACCOUNTS),
    ))
    .groupBy(...p.groupBy.map(d => ledger[d]))

  return { rows, total: rows.reduce((s, r) => s + r.amount, 0) }
}

// drill-down: GET /ledger/entries?ids=... → а звідти до source_id → документ`}
      />
    </div>
  )
}
