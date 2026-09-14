import { useMemo, useState } from 'react'
import { Network, Sigma } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { MechanismBreakdown } from '@/components/MechanismBreakdown'
import { EntryInspector } from '@/components/EntryInspector'
import { LmsBridge } from '@/components/LmsBridge'
import {
  Badge,
  Callout,
  Card,
  CardHeader,
  CodeBlock,
  Collapse,
  Section,
  Stat,
  Table,
  Td,
  Th,
} from '@/components/ui'
import { ACCOUNTS, ACCOUNT_BY_CODE, SUBCONTO_BY_KEY } from '@/engine/chartOfAccounts'
import { REGISTER_BY_ID } from '@/engine/registers'
import { money, num } from '@/engine/format'
import type { AccountingMovement } from '@/engine/types'

const DEMO: AccountingMovement = {
  id: 'demo-1',
  kind: 'accounting',
  register: 'accounting',
  period: '2026-09-01',
  registrar: 'doc-rent',
  registrarTitle: 'Надходження послуг №000001',
  lineNo: 1,
  debitAccount: '92',
  creditAccount: '631',
  debitSubconto: { costArticle: 'Оренда', department: 'Адміністрація' },
  creditSubconto: { counterparty: 'ТОВ «Бізнес-Центр Софія»', contract: 'Договір оренди №14' },
  amount: 30000,
  organization: 'ТОВ «Приклад»',
  comment: 'Оренда офісу за вересень 2026',
}

/** Набір записів для демонстрації математики оборотів. */
const MATH_ROWS = [
  { doc: 'ПНП-000001', date: '01.09', dt: '92', kt: '631', article: 'Оренда', dept: 'Адміністрація', amount: 30000 },
  { doc: 'ПНП-000003', date: '05.09', dt: '92', kt: '631', article: 'Зв’язок', dept: 'Адміністрація', amount: 2500 },
  { doc: 'ПНП-000004', date: '08.09', dt: '92', kt: '631', article: 'Аудит', dept: 'Адміністрація', amount: 18000 },
  { doc: 'НЗП-000007', date: '30.09', dt: '92', kt: '661', article: 'Оплата праці', dept: 'Адміністрація', amount: 40000 },
  { doc: 'НЗП-000007', date: '30.09', dt: '92', kt: '651', article: 'Податки на ФОП', dept: 'Адміністрація', amount: 8800 },
  { doc: 'ПНП-000006', date: '25.09', dt: '92', kt: '631', article: 'Оренда', dept: 'Адміністрація', amount: 30000 },
  { doc: 'ПНП-000007', date: '28.09', dt: '92', kt: '631', article: 'Комунальні', dept: 'Адміністрація', amount: 20700 },
  { doc: 'ПНП-000002', date: '10.09', dt: '93', kt: '631', article: 'Реклама', dept: 'Відділ продажів', amount: 15000 },
]

export default function AccountingRegister() {
  const [acc, setAcc] = useState('92')
  const [groupBy, setGroupBy] = useState<'none' | 'article' | 'dept'>('article')

  const account = ACCOUNT_BY_CODE[acc]
  const meta = REGISTER_BY_ID['accounting']

  const rows92 = MATH_ROWS.filter((r) => r.dt === '92')
  const total92 = rows92.reduce((s, r) => s + r.amount, 0)

  const grouped = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'Оборот по 92', amount: total92, n: rows92.length }]
    const map = new Map<string, { key: string; amount: number; n: number }>()
    for (const r of rows92) {
      const k = groupBy === 'article' ? r.article : r.dept
      const cur = map.get(k) ?? { key: k, amount: 0, n: 0 }
      cur.amount += r.amount
      cur.n += 1
      map.set(k, cur)
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount)
  }, [groupBy, rows92, total92])

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="accounting-register"
        lead="Регістр бухгалтерії — найскладніший за структурою. Кожен його запис одночасно містить два боки операції: що збільшилось і за рахунок чого. Саме тут живуть проводки, і саме звідси беруться баланс, ОСВ та звіт про фінансові результати."
      />

      <MechanismBreakdown
        title="Регістр бухгалтерії: повний розбір"
        mechanism={{
          what:
            'Регістр, прив’язаний до плану рахунків. Кожен запис — це бухгалтерська проводка: рахунок дебету, рахунок кредиту, суми, і два незалежні набори субконто (аналітики) — окремо для дебетового боку, окремо для кредитового.\n\nВажливо: один запис описує ОДНУ операцію з двох боків. Це не два записи.',
          why:
            'Щоб жодна величина не з’являлась і не зникала «з нізвідки». Якщо у вас зросли витрати, щось обов’язково має бути джерелом: або зріс борг, або зменшилось майно, або витратились гроші.\n\nПодвійний запис робить цю вимогу структурною: неможливо записати суму лише в одне місце. Саме тому оборот Дт по всій базі завжди дорівнює обороту Кт — це не результат нічної перевірки, а наслідок форми запису.',
          structure:
            'Період, Реєстратор, НомерРядка.\nОрганізація — вимірювання.\nСчетДт + СубконтоДт[1..3] — дебетовий бік.\nСчетКт + СубконтоКт[1..3] — кредитовий бік.\nСумма — основний ресурс.\nКоличество, Валюта, СуммаВал — додаткові ресурси, заповнюються лише для рахунків із відповідними ознаками.\nЗміст — реквізит.\n\nНабір дозволених субконто задає РАХУНОК, а конкретні значення підставляє ДОКУМЕНТ.',
          who:
            'Документи через проведення. У типових конфігураціях є ще документ «Операція», який дозволяє ввести проводку вручну — саме тому в обліку існує поняття «ручні коригування», які потім складно відстежити.',
          when:
            'У момент проведення документа. Записи впорядковуються за періодом і номером рядка; порядок усередині одного документа зазвичай не впливає на підсумки, але впливає на читабельність.',
          written:
            'Один атомарний факт господарського життя у формі кореспонденції. Наприклад: «1 вересня визнано адміністративну витрату за статтею Оренда у підрозділі Адміністрація на 30 000 за рахунок зростання боргу перед конкретним контрагентом за конкретним договором».\n\nЗверніть увагу, скільки інформації в одному рядку — саме тому структура така складна.',
          used:
            'Віртуальні таблиці:\n· ЗалишкиТаОбороти — основа ОСВ і балансу;\n· Обороти — основа звіту про фінансові результати (оборот Дт витратних рахунків = витрати періоду);\n· ОборотиДтКт — аналіз кореспонденцій «звідки-куди»;\n· ДвиженияССубконто — плоский список із розшифрованою аналітикою.\n\nБудь-який бухгалтерський звіт — це одна з цих таблиць плюс групування.',
          ownSystem:
            'Таблиця ledger_entries із полями debit_account, credit_account, amount і двома JSON/FK-наборами аналітики.\n\nПодвійний запис потрібен не завжди: якщо ваша задача — лише облік витрат за статтями, вистачить одного «напряму». Але щойно з’являються взаєморозрахунки, залишки і фінансовий результат — подвійний запис починає окупатись, бо він робить неможливими цілі класи помилок.',
          code: `РегистрБухгалтерии.Хозрасчетный
├── Период         : Дата
├── Регистратор    : ДокументСсылка
├── НомерСтроки    : Число
├── Организация    : Измерение
│
├── СчетДт         : ПланСчетовСсылка
├── СубконтоДт1..3 : Характеристика   ← склад задає рахунок
│
├── СчетКт         : ПланСчетовСсылка
├── СубконтоКт1..3 : Характеристика
│
├── Сумма          : Ресурс
├── Количество     : Ресурс (лише для кількісних рахунків)
└── Содержание     : Реквизит`,
          codeCaption: 'Структура регістра бухгалтерії',
        }}
      />

      <EntryInspector
        movement={DEMO}
        caption="Реальний запис із симулятора. Натисніть на будь-яке поле — побачите його роль, навіщо воно і як використовується у звітах."
      />

      <Section eyebrow="ключова відмінність" title="Рахунок відповідає «якого виду», аналітика — «що саме»">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
          <Card>
            <CardHeader icon={<Network size={16} />} title="План рахунків" subtitle="оберіть рахунок" />
            <div className="grid max-h-[420px] gap-1 overflow-y-auto p-3 scroll-thin">
              {ACCOUNTS.map((a) => (
                <button
                  key={a.code}
                  onClick={() => setAcc(a.code)}
                  className={cn(
                    'focus-ring flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition',
                    acc === a.code
                      ? 'border-accent/55 bg-accent/[0.09]'
                      : 'border-line bg-surface hover:bg-elevated',
                  )}
                >
                  <Badge tone={a.group === 'expense' ? 'warn' : a.group === 'income' ? 'ok' : 'neutral'} mono>
                    {a.code}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-[12.5px]">{a.title}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title={`${account.code} · ${account.title}`}
              subtitle={`${account.type === 'active' ? 'активний' : account.type === 'passive' ? 'пасивний' : 'активно-пасивний'} · ${GROUP_LABEL[account.group]}`}
              right={account.quantitative ? <Badge tone="cyan">кількісний облік</Badge> : undefined}
            />
            <div className="p-4">
              <p className="text-[13.5px] leading-6 text-fg/85">{account.explain}</p>

              <div className="mt-3">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  аналітичні розрізи, дозволені на цьому рахунку
                </div>
                {account.subconto.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-[12.5px] text-muted">
                    Субконто немає. Рахунок «плоский»: розшифрувати його сальдо нічим.
                  </div>
                ) : (
                  <div className="relative pl-4">
                    <div className="absolute bottom-3 left-1 top-0 w-px bg-line" />
                    {account.subconto.map((k) => {
                      const s = SUBCONTO_BY_KEY[k]
                      return (
                        <div key={k} className="relative mb-1.5">
                          <div className="absolute -left-3 top-3 h-px w-3 bg-line" />
                          <div className="rounded-lg border border-line bg-elevated px-3 py-2">
                            <div className="text-[12.5px] font-medium text-accent">{s.title}</div>
                            <div className="text-[11px] text-faint">{s.catalog}</div>
                            <p className="mt-1 text-[12px] leading-5 text-muted">{s.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="mt-3 rounded-lg border border-cyan/35 bg-cyan/[0.06] px-3 py-2">
                <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan">
                  де використовується у звітності
                </div>
                <p className="text-[13px] leading-6">{account.reportUsage}</p>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      <Callout kind="key" title="Один рахунок — багато розрізів">
        Рахунок 92 сам по собі не знає, на що пішли гроші. Він знає лише, що це{' '}
        <em>адміністративні витрати</em>. Деталізацію дає аналітика:{' '}
        <code>92 → {'{'}Оренда · Адміністрація{'}'}</code>,{' '}
        <code>92 → {'{'}Аудит · Адміністрація{'}'}</code>,{' '}
        <code>92 → {'{'}Зв’язок · Адміністрація{'}'}</code>. Саме тому не потрібно заводити окремий
        рахунок під кожен вид витрат — план рахунків залишається компактним, а деталізація
        необмежена.
      </Callout>

      <Card>
        <CardHeader
          icon={<Sigma size={16} />}
          title="Математика: як із багатьох записів виходить оборот"
          subtitle="Вісім записів вересня. Перемкніть групування — сума не змінюється, змінюється лише розбиття."
        />
        <div className="p-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {([
              ['none', 'Без групування'],
              ['article', 'За статтею витрат'],
              ['dept', 'За підрозділом'],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setGroupBy(k)}
                className={cn(
                  'focus-ring rounded-lg border px-2.5 py-1 text-[12px] font-medium transition',
                  groupBy === k
                    ? 'border-accent/55 bg-accent/[0.1] text-accent'
                    : 'border-line bg-elevated text-muted hover:text-fg',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-wide text-faint">
                записи регістра (дебет 92)
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th>Дата</Th>
                    <Th>Документ</Th>
                    <Th align="center">Дт</Th>
                    <Th align="center">Кт</Th>
                    <Th>Стаття</Th>
                    <Th align="right">Сума</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows92.map((r, i) => (
                    <tr key={i}>
                      <Td mono>{r.date}</Td>
                      <Td className="text-muted">{r.doc}</Td>
                      <Td align="center">
                        <Badge tone="accent" mono>{r.dt}</Badge>
                      </Td>
                      <Td align="center">
                        <Badge tone="violet" mono>{r.kt}</Badge>
                      </Td>
                      <Td>{r.article}</Td>
                      <Td align="right" mono>{num(r.amount)}</Td>
                    </tr>
                  ))}
                  <tr className="bg-elevated">
                    <Td colSpan={5} className="font-semibold">
                      Оборот по дебету 92
                    </Td>
                    <Td align="right" mono className="font-semibold text-accent">
                      {num(total92)}
                    </Td>
                  </tr>
                </tbody>
              </Table>
            </div>

            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-wide text-faint">
                результат агрегації
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th>{groupBy === 'article' ? 'Стаття' : groupBy === 'dept' ? 'Підрозділ' : 'Показник'}</Th>
                    <Th align="right">Записів</Th>
                    <Th align="right">Сума</Th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((g) => (
                    <tr key={g.key}>
                      <Td className="font-medium">{g.key}</Td>
                      <Td align="right" mono className="text-faint">{g.n}</Td>
                      <Td align="right" mono className="font-semibold">{num(g.amount)}</Td>
                    </tr>
                  ))}
                  <tr className="bg-elevated">
                    <Td className="font-semibold">Разом</Td>
                    <Td align="right" mono className="text-faint">{rows92.length}</Td>
                    <Td align="right" mono className="font-semibold text-accent">{num(total92)}</Td>
                  </tr>
                </tbody>
              </Table>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <Stat label="Оборот Дт 92" value={money(total92)} tone="warn" hint="це і є витрати" />
                <Stat label="Сальдо на 30.09" value="0,00 грн" tone="ok" hint="після закриття місяця" />
              </div>

              <CodeBlock
                className="mt-2"
                caption="Що робить платформа"
                code={`Дт 92 +30 000\nДт 92 +2 500\nДт 92 +18 000\nДт 92 +40 000\nДт 92 +8 800\nДт 92 +30 000\nДт 92 +20 700\n─────────────────\nОборот по 92 = ${num(total92)}`}
              />
            </div>
          </div>
        </div>
      </Card>

      <Collapse title="Чому у витратних рахунків немає сальдо на кінець року" tone="accent">
        <p className="mb-2">
          Витрата — це подія періоду, а не запас. Наприкінці місяця (або року, залежно від
          методики) витратні рахунки <strong>закриваються</strong>: їх дебетовий оборот списується на
          рахунок фінансового результату.
        </p>
        <CodeBlock
          caption="Закриття місяця (спрощено)"
          code={`Дт 791 «Результат операційної діяльності»  ← сюди збираються витрати
Кт 92  «Адміністративні витрати»            78 800
Кт 93  «Витрати на збут»                    15 000

// після цього сальдо 92 і 93 = 0,
// а на 791 формується прибуток або збиток`}
        />
        <p className="mt-2">
          Саме тому в звіті «Залишки» по рахунку 92 ви побачите нуль, а витрати треба шукати в
          звіті «Обороти». Якщо на 92 висить сальдо — місяць просто не закритий.
        </p>
      </Collapse>

      <Section eyebrow="структура" title="Поля регістра бухгалтерії">
        <Table>
          <thead>
            <tr>
              <Th>Поле</Th>
              <Th>Роль</Th>
              <Th>Тип</Th>
              <Th>Пояснення</Th>
            </tr>
          </thead>
          <tbody>
            {meta.fields.map((f) => (
              <tr key={f.name}>
                <Td mono className="font-medium">{f.name}</Td>
                <Td>
                  <Badge
                    tone={f.role === 'dimension' ? 'accent' : f.role === 'resource' ? 'ok' : 'neutral'}
                  >
                    {f.role === 'dimension'
                      ? 'вимірювання'
                      : f.role === 'resource'
                        ? 'ресурс'
                        : f.role === 'attribute'
                          ? 'реквізит'
                          : f.role === 'period'
                            ? 'період'
                            : f.role === 'registrar'
                              ? 'реєстратор'
                              : 'службове'}
                  </Badge>
                </Td>
                <Td mono className="text-[11.5px] text-muted">{f.type}</Td>
                <Td className="max-w-[400px] text-[12px] text-muted">{f.description}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <LmsBridge
        summary="Подвійний запис — потужний, але не безкоштовний інструмент. Він гарантує узгодженість і дає повну картину, але подвоює обсяг метаданих і вимагає плану рахунків. Для LMS, де треба рахувати, скажімо, нараховані й списані бали, зазвичай достатньо односторонніх записів із розрізами. Подвійний запис варто вводити тоді, коли з'являються взаємні зобов'язання між сторонами."
        rows={[
          { onec: 'Регістр бухгалтерії', lms: 'double_entry_ledger', note: 'Один рядок = обидва боки операції.' },
          { onec: 'СчетДт / СчетКт', lms: 'debit_account / credit_account', note: 'Коди з довідника рахунків, не вільний текст.' },
          { onec: 'СубконтоДт / СубконтоКт', lms: 'debit_dims / credit_dims (jsonb або FK)', note: 'Дві незалежні структури в одному рядку.' },
          { onec: 'Обороти(...)', lms: 'turnovers(from, to, accounts, groupBy)', note: 'SUM по дебету/кредиту з групуванням за аналітикою.' },
          { onec: 'Закриття місяця', lms: 'periodClose() — окрема команда', note: 'Створює записи списання, а не «обнуляє» старі.' },
        ]}
        code={`type LedgerEntry = {
  id: string
  occurredAt: string
  sourceType: string
  sourceId: string          // аналог реєстратора
  debitAccount: string
  creditAccount: string
  debitDims:  { costArticle?: string; department?: string; item?: string }
  creditDims: { counterparty?: string; contract?: string; warehouse?: string }
  amount: number
  quantity?: number
  organizationId: string
}

// інваріант, який варто перевіряти тестом:
// SUM(amount) по дебету === SUM(amount) по кредиту — завжди, автоматично`}
      />
    </div>
  )
}

const GROUP_LABEL: Record<string, string> = {
  expense: 'витрати',
  income: 'доходи',
  asset: 'активи',
  liability: 'зобов’язання',
  equity: 'капітал',
  result: 'фінансовий результат',
}
