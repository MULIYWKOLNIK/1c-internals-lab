import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Map as MapIcon, ArrowRight, Play, Pause, RotateCcw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { CausalChain } from '@/components/CausalChain'
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  CodeBlock,
  Section,
  Table,
  Td,
  Th,
} from '@/components/ui'

interface MapNode {
  id: string
  label: string
  sub: string
  x: number
  y: number
  w: number
  h: number
  tone: 'cyan' | 'accent' | 'violet' | 'ok' | 'warn'
  what: string
  inside: string
  insideCaption: string
  link?: string
  linkLabel?: string
}

const W = 760
const H = 600

const NODES: MapNode[] = [
  {
    id: 'user',
    label: 'Користувач',
    sub: 'дія людини',
    x: 280, y: 8, w: 200, h: 50,
    tone: 'cyan',
    what: 'Людина фіксує господарську подію. На цьому етапі в обліку не змінюється нічого — є лише інтерфейс і намір.',
    inside: `Форма документа
├── реквізити шапки
├── таблична частина
├── права доступу
└── кнопка «Провести»

Стан обліку: без змін`,
    insideCaption: 'Що існує на цьому рівні',
    link: '/basics',
    linkLabel: 'Основи',
  },
  {
    id: 'document',
    label: 'Документ',
    sub: 'подія як дані',
    x: 280, y: 88, w: 200, h: 50,
    tone: 'accent',
    what: 'Об’єкт із датою, номером, реквізитами і табличними частинами. Записаний, але поки не проведений — для звітів його не існує.',
    inside: `Документ.НадходженняПослуг
├── Дата, Номер, Проведен
├── Організація, Контрагент, Договір
└── Послуги (таблична частина)
    ├── Найменування, Сума, СумаПДВ
    └── СтаттяВитрат, Підрозділ

Записів у регістрах: 0`,
    insideCaption: 'Структура об’єкта',
    link: '/doc-to-register',
    linkLabel: 'Документ → Регістр',
  },
  {
    id: 'posting',
    label: 'Проведення',
    sub: 'перетворення',
    x: 280, y: 168, w: 200, h: 50,
    tone: 'violet',
    what: 'Транзакція + виклик алгоритму конфігурації. Вісім етапів: завантаження, перевірки, вибір алгоритму, рахунки, аналітика, формування рухів, запис, фіксація.',
    inside: `Процедура ОбработкаПроведения(Отказ, Режим)
    Движения.Очистить();          // 1
    ПроверитьЗаполнение(Отказ);   // 2
    Если Отказ Тогда Возврат; КонецЕсли;

    СформироватьДвиженияПоУслугам();  // 3-6
    // 7-8: запис і COMMIT виконує платформа
КонецПроцедуры`,
    insideCaption: 'Модуль об’єкта документа',
    link: '/posting',
    linkLabel: 'Debugger проведення',
  },
  {
    id: 'movements',
    label: 'Рухи',
    sub: 'набори записів',
    x: 280, y: 248, w: 200, h: 50,
    tone: 'violet',
    what: 'Записи, сформовані в пам’яті. Один документ створює кілька рухів РІЗНОЇ структури — по одному на кожну облікову задачу.',
    inside: `Рух 1 → бухгалтерія:  Дт 92   / Кт 631  30 000
Рух 2 → бухгалтерія:  Дт 6442 / Кт 631   6 000
Рух 3 → витрати:      {Оренда, Адмін}    30 000
Рух 4 → ПДВ:          {Контрагент, 20%}   6 000
Рух 5 → розрахунки:   {Контрагент}       36 000

Увага: лише перші два мають Дт/Кт.
Рух ≠ проводка.`,
    insideCaption: 'Набір рухів документа',
    link: '/movements',
    linkLabel: 'Рухи',
  },
  {
    id: 'accounting',
    label: 'Регістр бухгалтерії',
    sub: 'Дт / Кт / субконто',
    x: 60, y: 348, w: 230, h: 60,
    tone: 'ok',
    what: 'Подвійний запис. Кожен рядок містить обидва боки операції та два незалежні набори аналітики. Джерело балансу, ОСВ і фінрезультату.',
    inside: `РегистрБухгалтерии.Хозрасчетный
├── Период, Регистратор, НомерСтроки
├── Организация            (вимірювання)
├── СчетДт + СубконтоДт1..3
├── СчетКт + СубконтоКт1..3
├── Сумма                  (ресурс)
└── Количество             (ресурс)

Віртуальні таблиці:
  .ОстаткиИОбороты  .Обороты  .ОборотыДтКт`,
    insideCaption: 'Логічна структура',
    link: '/accounting-register',
    linkLabel: 'Регістр бухгалтерії',
  },
  {
    id: 'accumulation',
    label: 'Регістри накопичення',
    sub: 'виміри / ресурси',
    x: 330, y: 348, w: 230, h: 60,
    tone: 'ok',
    what: 'Легкі оперативні регістри: витрати за статтями, ПДВ, залишки товарів, взаєморозрахунки. Не знають про рахунки — лише вимірювання і ресурси.',
    inside: `РегистрНакопления.ВитратиЗаСтаттями
├── Период, Регистратор
├── Організація     (вимірювання)
├── СтаттяВитрат    (вимірювання)
├── Підрозділ       (вимірювання)
└── Сума            (ресурс)

Віртуальні таблиці:
  .Обороты   (вид «обороти»)
  .Остатки   (вид «залишки» + ВидДвижения)`,
    insideCaption: 'Логічна структура',
    link: '/accumulation',
    linkLabel: 'Регістр накопичення',
  },
  {
    id: 'information',
    label: 'Регістр відомостей',
    sub: 'стан на дату',
    x: 600, y: 348, w: 150, h: 60,
    tone: 'ok',
    what: 'Зберігає стани, а не події: ціни, курси, ставки. Нічого не підсумовує; головний інструмент — зріз останніх на дату.',
    inside: `РегистрСведений.ЦіниНоменклатури
├── Период        (частина ключа)
├── Номенклатура  (вимірювання)
├── ТипЦен        (вимірювання)
└── Цена          (ресурс)

Віртуальна таблиця:
  .СрезПоследних(&НаДату)`,
    insideCaption: 'Логічна структура',
    link: '/information',
    linkLabel: 'Регістр відомостей',
  },
  {
    id: 'query',
    label: 'Запит',
    sub: 'відбір + групування',
    x: 280, y: 448, w: 200, h: 50,
    tone: 'warn',
    what: 'Звіт звертається до віртуальної таблиці регістра з параметрами періоду й відборів. Платформа транслює це у звернення до СУБД.',
    inside: `ВЫБРАТЬ
    Витрати.СтаттяВитрат,
    СУММА(Витрати.СумаОборот) ЯК Сума
ИЗ РегистрНакопления.ВитратиЗаСтаттями.Обороты(
       &ПочатокПеріоду, &КінецьПеріоду, ,
       Організація = &Організація) ЯК Витрати
СГРУППИРОВАТЬ ПО Витрати.СтаттяВитрат

// КОНЦЕПТУАЛЬНО. Реальний SQL генерує платформа.`,
    insideCaption: 'Мова запитів 1С',
    link: '/register-to-report',
    linkLabel: 'Регістр → Звіт',
  },
  {
    id: 'report',
    label: 'Звіт',
    sub: 'результат для людини',
    x: 280, y: 528, w: 200, h: 50,
    tone: 'accent',
    what: 'Таблиця підсумків. Не зберігає жодної цифри: щоразу читає регістри заново. Кожна комірка розшифровується до реєстратора і далі до документа.',
    inside: `Витрати за статтями · вересень 2026
────────────────────────────────────
Оплата праці ................ 40 000,00
Оренда ...................... 30 000,00
Податки на ФОП ...............  8 800,00
Реклама ..................... 15 000,00
────────────────────────────────────
Разом ....................... 93 800,00

Подвійний клік → реєстратор → документ`,
    insideCaption: 'Результат',
    link: '/register-to-report',
    linkLabel: 'Як будується звіт',
  },
]

const EDGES: [string, string][] = [
  ['user', 'document'],
  ['document', 'posting'],
  ['posting', 'movements'],
  ['movements', 'accounting'],
  ['movements', 'accumulation'],
  ['movements', 'information'],
  ['accounting', 'query'],
  ['accumulation', 'query'],
  ['information', 'query'],
  ['query', 'report'],
]

const TONE: Record<string, { fill: string; stroke: string }> = {
  cyan: { fill: 'rgb(var(--c-cyan) / 0.12)', stroke: 'rgb(var(--c-cyan))' },
  accent: { fill: 'rgb(var(--c-accent) / 0.12)', stroke: 'rgb(var(--c-accent))' },
  violet: { fill: 'rgb(var(--c-violet) / 0.12)', stroke: 'rgb(var(--c-violet))' },
  ok: { fill: 'rgb(var(--c-ok) / 0.12)', stroke: 'rgb(var(--c-ok))' },
  warn: { fill: 'rgb(var(--c-warn) / 0.12)', stroke: 'rgb(var(--c-warn))' },
}

const ORDER = ['user', 'document', 'posting', 'movements', 'accounting', 'query', 'report']

export default function BigMap() {
  const [active, setActive] = useState('user')
  const [playing, setPlaying] = useState(false)
  const [lit, setLit] = useState<string[]>([])
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!playing) return
    let i = 0
    setLit([ORDER[0]])
    setActive(ORDER[0])
    timer.current = window.setInterval(() => {
      i += 1
      if (i >= ORDER.length) {
        setPlaying(false)
        return
      }
      const id = ORDER[i]
      setLit((l) => [...l, id, ...(id === 'accounting' ? ['accumulation', 'information'] : [])])
      setActive(id)
    }, 950)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [playing])

  const node = NODES.find((n) => n.id === active)!

  const byId = (id: string) => NODES.find((n) => n.id === id)!

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="map"
        lead="Повна картина: усі елементи системи на одній схемі. Кожен блок клікабельний — можна побачити його внутрішню структуру. Якщо ви можете пояснити цю схему вголос від початку до кінця, матеріал засвоєно."
      />

      <Card>
        <CardHeader
          icon={<MapIcon size={16} />}
          title="Повна картина"
          subtitle="Натисніть на будь-який блок, щоб побачити, що всередині"
          right={
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant={playing ? 'danger' : 'primary'}
                onClick={() => {
                  if (playing) setPlaying(false)
                  else {
                    setLit([])
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
                  setLit([])
                }}
              >
                <RotateCcw size={12} />
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <div className="scroll-thin overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[620px]" role="img" aria-label="Повна схема системи">
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 z" fill="rgb(var(--c-line))" />
                </marker>
                <marker id="arrow-lit" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 z" fill="rgb(var(--c-accent))" />
                </marker>
              </defs>

              {EDGES.map(([from, to]) => {
                const a = byId(from)
                const b = byId(to)
                const x1 = a.x + a.w / 2
                const y1 = a.y + a.h
                const x2 = b.x + b.w / 2
                const y2 = b.y
                const isLit = lit.includes(from) && lit.includes(to)
                const midY = (y1 + y2) / 2
                const d =
                  x1 === x2
                    ? `M${x1},${y1} L${x2},${y2 - 2}`
                    : `M${x1},${y1} L${x1},${midY} L${x2},${midY} L${x2},${y2 - 2}`
                return (
                  <path
                    key={`${from}-${to}`}
                    d={d}
                    fill="none"
                    stroke={isLit ? 'rgb(var(--c-accent))' : 'rgb(var(--c-line))'}
                    strokeWidth={isLit ? 2 : 1.5}
                    markerEnd={isLit ? 'url(#arrow-lit)' : 'url(#arrow)'}
                    className={cn('flow-edge', playing && isLit && 'is-live')}
                  />
                )
              })}

              {NODES.map((n) => {
                const t = TONE[n.tone]
                const isActive = n.id === active
                const isLit = lit.includes(n.id)
                return (
                  <g
                    key={n.id}
                    onClick={() => {
                      setPlaying(false)
                      setActive(n.id)
                    }}
                    className="cursor-pointer"
                  >
                    <rect
                      x={n.x}
                      y={n.y}
                      width={n.w}
                      height={n.h}
                      rx="10"
                      fill={isActive || isLit ? t.fill : 'rgb(var(--c-elevated))'}
                      stroke={isActive ? t.stroke : isLit ? t.stroke : 'rgb(var(--c-line))'}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      className="transition-all"
                    />
                    <text
                      x={n.x + n.w / 2}
                      y={n.y + n.h / 2 - 3}
                      textAnchor="middle"
                      className="select-none fill-[rgb(var(--c-fg))]"
                      style={{ fontSize: 13, fontWeight: 600 }}
                    >
                      {n.label}
                    </text>
                    <text
                      x={n.x + n.w / 2}
                      y={n.y + n.h / 2 + 14}
                      textAnchor="middle"
                      className="select-none fill-[rgb(var(--c-muted))]"
                      style={{ fontSize: 10.5 }}
                    >
                      {n.sub}
                    </text>
                  </g>
                )
              })}

              <text x={12} y={378} className="fill-[rgb(var(--c-faint))]" style={{ fontSize: 10 }}>
                регістри
              </text>
            </svg>
          </div>

          <div className="min-w-0 animate-fade-up" key={node.id}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-[16px] font-semibold tracking-tight">{node.label}</h3>
              <Badge tone={node.tone === 'cyan' ? 'cyan' : node.tone}>{node.sub}</Badge>
            </div>
            <p className="text-[13.5px] leading-7 text-fg/85">{node.what}</p>
            <CodeBlock className="mt-3" caption={node.insideCaption} code={node.inside} />
            {node.link && (
              <Link
                to={node.link}
                className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-accent hover:underline"
              >
                {node.linkLabel} <ArrowRight size={12} />
              </Link>
            )}
          </div>
        </div>
      </Card>

      <Callout kind="key" title="Три межі, які варто бачити на цій схемі">
        <strong>1.</strong> Між «Документом» і «Проведенням» — межа між даними і обліком.{' '}
        <strong>2.</strong> Між «Рухами» і «Регістрами» — межа між пам’яттю і базою (COMMIT).{' '}
        <strong>3.</strong> Між «Регістрами» і «Запитом» — межа між зберіганням і обчисленням: усе
        нижче цієї лінії рахується заново щоразу.
      </Callout>

      <Section eyebrow="самоперевірка" title="Дев'ять питань, на які ви маєте вміти відповісти">
        <Table>
          <thead>
            <tr>
              <Th align="center">#</Th>
              <Th>Питання</Th>
              <Th>Коротка відповідь</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Що створює користувач?', 'Документ — дані про подію. Облік не змінюється.'],
              ['Що відбувається при проведенні?', 'Транзакція + алгоритм конфігурації формує набори рухів і записує їх.'],
              ['Що таке рух?', 'Один запис у конкретному регістрі. Структура залежить від типу регістра.'],
              ['Куди потрапляє рух?', 'У регістр: бухгалтерії, накопичення або відомостей — залежно від задачі.'],
              ['Як формується бухгалтерський запис?', 'Алгоритм визначає рахунки, підставляє субконто з документа, записує суму.'],
              ['Як визначається витрата?', 'Дебетовий оборот витратних рахунків за період у потрібному розрізі. Це формула, не таблиця.'],
              ['Де зберігається інформація?', 'У регістрах — атомарними записами. Підсумки не зберігаються.'],
              ['Як звіт її знаходить?', 'Запит до віртуальної таблиці з відбором за періодом і групуванням за вимірюваннями.'],
              ['Як це реалізувати у себе?', 'Append-only ledger + post() + функції-звіти. Деталі — у розділах 15 і 16.'],
            ].map(([q, a], i) => (
              <tr key={q}>
                <Td align="center" mono className="text-accent">{i + 1}</Td>
                <Td className="font-medium">{q}</Td>
                <Td className="max-w-[520px] text-[12.5px] text-muted">{a}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <CausalChain
        title="Наскрізна модель ще раз — тепер вона має читатись як очевидна"
        subtitle="Якщо кожен етап зрозумілий і ви бачите зв'язок із сусідніми — мета проєкту досягнута"
        values={[
          'подія',
          'дані',
          'команда',
          'код',
          'запис у пам’яті',
          'запис у базі',
          'COMMIT',
          'відбір',
          'SUM + GROUP BY',
          'цифра на екрані',
        ]}
      />

      <Card>
        <CardHeader
          title="Те саме одним екраном коду"
          subtitle="уся схема, стиснута до двадцяти рядків"
        />
        <div className="p-4">
          <CodeBlock
            lang="ts"
            caption="Повна картина у псевдокоді"
            code={`// 1. КОРИСТУВАЧ + ДОКУМЕНТ
const doc = { id: 'D1', date: '2026-09-01', net: 30000, vat: 6000,
              article: 'Оренда', department: 'Адміністрація' }

// 2. ПРОВЕДЕННЯ (єдина точка запису, транзакція, ідемпотентність)
await db.transaction(async tx => {
  validate(doc)
  await tx.delete(ledger).where(eq(ledger.sourceId, doc.id))

  // 3. РУХИ (чиста функція: рахунки + аналітика + суми)
  const entries = buildEntries(doc)          // → 5 записів у 4 «регістри»

  // 4. РЕГІСТРИ (COMMIT робить їх фактом)
  await tx.insert(ledger).values(entries)
  await tx.update(documents).set({ posted: true }).where(eq(documents.id, doc.id))
})

// 5. ЗАПИТ + АГРЕГАЦІЯ + ЗВІТ (нічого не зберігається)
const report = await db
  .select({ article: ledger.article, amount: sum(ledger.amount) })
  .from(ledger)
  .where(and(between(ledger.occurredAt, from, to),
             inArray(ledger.debitAccount, ['92','93','902'])))
  .groupBy(ledger.article)

// Оренда — 30 000,00`}
          />
        </div>
      </Card>

      <Card className="border-accent/40">
        <CardHeader title="Куди далі" subtitle="якщо картина склалась" />
        <div className="grid gap-2 p-4 sm:grid-cols-3">
          <Link to="/quiz" className="focus-ring rounded-lg border border-line bg-elevated p-3 transition hover:border-accent/50">
            <div className="text-[13.5px] font-semibold">Перевірити себе</div>
            <p className="mt-0.5 text-[12.5px] leading-5 text-muted">
              22 питання на причинно-наслідкові зв’язки
            </p>
          </Link>
          <Link to="/ledger" className="focus-ring rounded-lg border border-line bg-elevated p-3 transition hover:border-accent/50">
            <div className="text-[13.5px] font-semibold">Побудувати своє</div>
            <p className="mt-0.5 text-[12.5px] leading-5 text-muted">
              Робоча модель Ledger із тестами
            </p>
          </Link>
          <Link to="/diagnostics" className="focus-ring rounded-lg border border-line bg-elevated p-3 transition hover:border-accent/50">
            <div className="text-[13.5px] font-semibold">Навчитись шукати</div>
            <p className="mt-0.5 text-[12.5px] leading-5 text-muted">
              Дерево діагностики проблем зі звітами
            </p>
          </Link>
        </div>
      </Card>
    </div>
  )
}
