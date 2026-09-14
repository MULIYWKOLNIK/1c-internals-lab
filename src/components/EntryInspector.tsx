import { useState } from 'react'
import { ArrowDown, FileText, Layers, Database, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ACCOUNT_BY_CODE, SUBCONTO_BY_KEY } from '@/engine/chartOfAccounts'
import { dmy, money } from '@/engine/format'
import type { AccountingMovement } from '@/engine/types'
import { Badge, Card, CardHeader, CodeBlock } from './ui'

interface FieldInfo {
  id: string
  label: string
  value: string
  tone: 'accent' | 'violet' | 'cyan' | 'ok' | 'warn' | 'muted'
  what: string
  why: string
  how: string
  code?: string
  chain?: string[]
}

const TONE_CLS: Record<string, string> = {
  accent: 'border-accent/50 bg-accent/[0.08] text-accent',
  violet: 'border-violet/50 bg-violet/[0.08] text-violet',
  cyan: 'border-cyan/50 bg-cyan/[0.08] text-cyan',
  ok: 'border-ok/50 bg-ok/[0.08] text-ok',
  warn: 'border-warn/50 bg-warn/[0.08] text-warn',
  muted: 'border-line bg-elevated text-muted',
}

function buildFields(m: AccountingMovement): FieldInfo[] {
  const dt = ACCOUNT_BY_CODE[m.debitAccount]
  const kt = ACCOUNT_BY_CODE[m.creditAccount]
  const fields: FieldInfo[] = [
    {
      id: 'dt',
      label: `Дт ${m.debitAccount}`,
      value: dt?.title ?? '',
      tone: 'accent',
      what: `Рахунок ${m.debitAccount} «${dt?.title ?? ''}». ${dt?.explain ?? ''}`,
      why:
        'Рахунок задає НАПРЯМ обліку — у якому розділі звітності опиниться сума. Це найгрубіший, найважливіший класифікатор. Помилка в рахунку означає, що сума потрапить не в той рядок звіту, хоч вона й є в базі.',
      how: `Де використовується: ${dt?.reportUsage ?? ''}`,
      code: `// Рахунок визначається алгоритмом проведення, а не вводиться вручну:\nСчетЗатрат = ПолучитьСчетЗатрат(СтатьяЗатрат, Подразделение);\nДвижение.СчетДт = СчетЗатрат;   // ${m.debitAccount}`,
    },
    {
      id: 'kt',
      label: `Кт ${m.creditAccount}`,
      value: kt?.title ?? '',
      tone: 'violet',
      what: `Рахунок ${m.creditAccount} «${kt?.title ?? ''}». ${kt?.explain ?? ''}`,
      why:
        'Кредит відповідає на питання «за рахунок чого». Витрата не виникає з нічого: щось має одночасно зрости (борг) або зменшитись (актив). Саме це і робить облік замкненим.',
      how: `Де використовується: ${kt?.reportUsage ?? ''}`,
      code: `Движение.СчетКт = ПланыСчетов.Хозрасчетный.Счет${m.creditAccount};\n// Дт і Кт — це ДВА ВИМІРЮВАННЯ ОДНОГО запису,\n// а не два різні записи.`,
    },
    {
      id: 'amount',
      label: 'Сума',
      value: money(m.amount),
      tone: 'ok',
      what: 'Ресурс запису — грошова оцінка операції.',
      why:
        'Сума — єдине поле, яке звіт СУМУЄ. Усі інші поля лише визначають, у яку групу ця сума потрапить. Тому структура звіту = «за якими полями групуємо» + «який ресурс підсумовуємо».',
      how: 'Використовується в SUM() при побудові будь-якого звіту з оборотами.',
      code: `Движение.Сумма = СтрокаТЧ.Сумма;   // ${m.amount}\n\n// у звіті:\nSUM(Сума) GROUP BY СтаттяВитрат`,
    },
    {
      id: 'org',
      label: 'Організація',
      value: m.organization,
      tone: 'cyan',
      what: 'Вимірювання, яке розділяє облік кількох юридичних осіб в одній базі.',
      why:
        'Без цього вимірювання дані двох компаній змішались би в одному звіті. Майже кожен регістр у типових конфігураціях має це вимірювання першим.',
      how: 'Стає обов’язковим відбором майже в кожному звіті.',
    },
  ]

  for (const [key, value] of Object.entries(m.debitSubconto)) {
    if (!value) continue
    const s = SUBCONTO_BY_KEY[key]
    if (!s) continue
    fields.push({
      id: `dt-${key}`,
      label: `Субконто Дт: ${s.title}`,
      value,
      tone: key === 'costArticle' ? 'warn' : 'muted',
      what: `${s.description} Значення береться з ${s.catalog}.`,
      why:
        key === 'costArticle'
          ? 'Стаття витрат — це НЕ рахунок. Рахунок 92 каже «адміністративні витрати», а стаття каже «саме оренда». На одному рахунку 92 можуть жити десятки статей, і звіт за статтями розшифровує рахунок зсередини.'
          : 'Аналітика дає другий, третій і подальші розрізи всередині одного рахунку. Це дозволяє будувати звіти, не створюючи новий рахунок під кожен випадок.',
      how:
        key === 'costArticle'
          ? 'Використовується як поле групування у звіті «Витрати за статтями» та як вимірювання регістра накопичення.'
          : 'Використовується як відбір і групування у звітах та розшифровках.',
      code: `// Рахунок задає, ЯКІ субконто дозволені:\n// Счет92.ВидыСубконто = [СтатьиЗатрат, Подразделения]\n\n// Документ задає, ЯКІ ЗНАЧЕННЯ підставити:\nДвижение.СубконтоДт[ВидыСубконто.${s.title}] = "${value}";`,
    })
  }

  for (const [key, value] of Object.entries(m.creditSubconto)) {
    if (!value) continue
    const s = SUBCONTO_BY_KEY[key]
    if (!s) continue
    fields.push({
      id: `kt-${key}`,
      label: `Субконто Кт: ${s.title}`,
      value,
      tone: 'muted',
      what: `${s.description} Значення береться з ${s.catalog}.`,
      why: 'Аналітика кредитового боку живе окремо від дебетового: у одного запису два незалежні набори субконто.',
      how: 'Розшифровка заборгованості, акти звірки, аналіз рахунку.',
    })
  }

  fields.push(
    {
      id: 'period',
      label: 'Період',
      value: dmy(m.period),
      tone: 'cyan',
      what: 'Дата, на яку операція визнана в обліку.',
      why:
        'Період вирішує, у який звітний інтервал потрапить сума. Це найчастіша причина «я все зробив, а у звіті порожньо»: дані є, але поза межами періоду звіту.',
      how: 'Кожен запит до регістра починається з обмеження періоду: Обороти(&Початок, &Кінець, …).',
      code: `Движение.Период = Документ.Дата;   // ${m.period}\n\n// у звіті:\nWHERE Період МЕЖДУ &ПочатокПеріоду И &КінецьПеріоду`,
    },
    {
      id: 'registrar',
      label: 'Реєстратор',
      value: m.registrarTitle,
      tone: 'accent',
      what: 'Посилання на документ, який створив цей запис.',
      why:
        'Реєстратор — це «підпис автора» запису. Саме він робить можливими дві речі: розшифровку звіту до документа і безпечне перепроведення (всі старі рухи з цим реєстратором видаляються і створюються заново).',
      how: 'Подвійний клік у звіті → система знаходить записи → бере реєстратор → відкриває документ.',
      chain: ['Реєстратор', 'Рух', 'Регістр', 'Звіт'],
      code: `// перепроведення = видалити все своє і записати заново\nDELETE FROM Регістр WHERE Реєстратор = ЦейДокумент;\nINSERT нові рухи;\n\n// саме тому не можна «дописати» рух до чужого документа`,
    },
    {
      id: 'lineNo',
      label: 'Номер рядка',
      value: String(m.lineNo),
      tone: 'muted',
      what: 'Порядковий номер запису в наборі рухів документа.',
      why: 'Забезпечує унікальність і стабільний порядок записів одного реєстратора.',
      how: 'Технічне поле; у звітах майже не використовується.',
    },
  )

  return fields
}

export function EntryInspector({
  movement,
  caption,
}: {
  movement: AccountingMovement
  caption?: string
}) {
  const fields = buildFields(movement)
  const [active, setActive] = useState(fields[0].id)
  const f = fields.find((x) => x.id === active) ?? fields[0]

  return (
    <Card>
      <CardHeader
        icon={<Layers size={16} />}
        title="Розбір бухгалтерського запису"
        subtitle={caption ?? 'Натисніть на будь-яке поле, щоб побачити його роль в обліку'}
        right={<Badge tone="accent" mono>1 запис = {fields.length} полів</Badge>}
      />

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,300px)_1fr]">
        <div className="flex flex-wrap gap-1.5 self-start lg:flex-col">
          {fields.map((x) => (
            <button
              key={x.id}
              onClick={() => setActive(x.id)}
              className={cn(
                'focus-ring rounded-lg border px-2.5 py-1.5 text-left transition',
                active === x.id
                  ? TONE_CLS[x.tone]
                  : 'border-line bg-surface text-muted hover:bg-elevated',
              )}
            >
              <span className="block font-mono text-[11.5px] font-semibold">{x.label}</span>
              <span
                className={cn(
                  'block max-w-[240px] truncate text-[12px]',
                  active === x.id ? 'text-fg' : 'text-faint',
                )}
              >
                {x.value}
              </span>
            </button>
          ))}
        </div>

        <div className="min-w-0 animate-fade-up" key={f.id}>
          <div className="mb-2 flex items-baseline gap-2">
            <h3 className="font-mono text-[15px] font-semibold">{f.label}</h3>
            <span className="truncate text-[13px] text-muted">{f.value}</span>
          </div>

          <div className="grid gap-2.5">
            <Para icon={<FileText size={13} />} label="Що це" text={f.what} />
            <Para icon={<Database size={13} />} label="Навіщо потрібне" text={f.why} />
            <Para icon={<BarChart3 size={13} />} label="Як використовується далі" text={f.how} />
          </div>

          {f.chain && (
            <div className="mt-3 flex flex-col items-start gap-0.5 rounded-lg border border-accent/35 bg-accent/[0.06] px-3 py-2.5">
              {f.chain.map((c, i) => (
                <div key={c} className="flex items-center gap-2">
                  <span className="font-mono text-[12.5px] font-semibold text-accent">{c}</span>
                  {i < f.chain!.length - 1 && <ArrowDown size={11} className="text-accent/60" />}
                </div>
              ))}
            </div>
          )}

          {f.code && <CodeBlock className="mt-3" code={f.code} caption="Як це виглядає в коді" />}
        </div>
      </div>
    </Card>
  )
}

function Para({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="rounded-lg border border-line bg-elevated px-3 py-2">
      <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        {icon}
        {label}
      </div>
      <div className="text-[13.5px] leading-6 text-fg/90">{text}</div>
    </div>
  )
}
