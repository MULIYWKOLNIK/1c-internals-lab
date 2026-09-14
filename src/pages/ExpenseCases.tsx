import { useMemo, useState } from 'react'
import { PackageCheck, AlertTriangle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { PostingDebugger } from '@/components/PostingDebugger'
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
import { DOCUMENT_BY_ID } from '@/engine/documents'
import { postDocument, stockFromMovements } from '@/engine/posting'
import { money, num } from '@/engine/format'
import { accounting } from '@/engine/reports'

interface Scenario {
  no: number
  id: string
  docId: string
  title: string
  question: string
  isExpense: 'yes' | 'no' | 'partial'
  answer: string
  key: string
}

const SCENARIOS: Scenario[] = [
  {
    no: 1,
    id: 'rent',
    docId: 'doc-rent',
    title: 'Оренда офісу',
    question: 'Отримали акт на оренду 30 000 + ПДВ 6 000. Скільки витрат?',
    isExpense: 'yes',
    answer: '30 000 грн витрат вересня. ПДВ у витрати не входить.',
    key:
      'Найпростіший випадок: послуга спожита в тому ж періоді, коли отримана. Витрата визнається датою документа, незалежно від того, чи ми вже заплатили.',
  },
  {
    no: 2,
    id: 'payroll',
    docId: 'doc-payroll',
    title: 'Нарахування зарплати',
    question: 'Нарахували 40 000 зарплати і 8 800 ЄСВ. Скільки витрат?',
    isExpense: 'yes',
    answer: '48 800 грн. І зарплата, і ЄСВ — витрати роботодавця.',
    key:
      'Тут немає контрагента і немає ПДВ, але механіка та сама. Важливо: витрата виникає у момент НАРАХУВАННЯ. Виплата зарплати (Дт 661 / Кт 311) витратою вже не буде — це погашення боргу.',
  },
  {
    no: 3,
    id: 'ads',
    docId: 'doc-ads',
    title: 'Реклама',
    question: 'Той самий вид документа, що й оренда. Той самий рахунок?',
    isExpense: 'yes',
    answer: '15 000 грн, але на рахунку 93, а не 92.',
    key:
      'Стаття «Реклама» і підрозділ «Відділ продажів» класифікують витрату як збутову. У звіті про фінрезультати вона піде в інший рядок, ніж оренда — хоча документ того самого виду.',
  },
  {
    no: 4,
    id: 'goods',
    docId: 'doc-goods-in',
    title: 'Придбання товару',
    question: 'Купили моніторів на 50 000. Скільки витрат?',
    isExpense: 'no',
    answer: 'НУЛЬ. Це не витрата, це актив.',
    key:
      'Найважливіший сценарій розділу. Жодного руху по рахунках 92/93/902 немає. Гроші (точніше, борг) перетворились на майно. Фінансовий результат не змінився.',
  },
  {
    no: 5,
    id: 'sale',
    docId: 'doc-goods-out',
    title: 'Продаж товару',
    question: 'Продали 4 монітори. Тепер витрата з’явилась?',
    isExpense: 'yes',
    answer: '20 000 грн собівартості — саме тут актив став витратою.',
    key:
      'Товар вибув, і раніше капіталізована вартість перетворилась на витрату періоду через рахунок 902. Одночасно визнано дохід — але це окремий запис.',
  },
  {
    no: 6,
    id: 'adjust',
    docId: 'doc-adjust',
    title: 'Коригування витрати',
    question: 'Орендодавець дав знижку 5 000. Як зменшити витрату?',
    isExpense: 'partial',
    answer: '−5 000 грн новим документом. У звіті стане 25 000.',
    key:
      'Старий документ не редагується. Створюється новий із від’ємними рухами. Історія зберігається повністю: видно і початкову суму, і коригування.',
  },
]

export default function ExpenseCases() {
  const [active, setActive] = useState('rent')
  const sc = SCENARIOS.find((s) => s.id === active)!

  /* Локальний розрахунок результату сценарію (не чіпає загальну базу). */
  const preview = useMemo(() => {
    const base =
      sc.docId === 'doc-goods-out'
        ? postDocument(DOCUMENT_BY_ID['doc-goods-in']).movements
        : []
    const res = postDocument(DOCUMENT_BY_ID[sc.docId], stockFromMovements(base))
    const expense = accounting(res.movements)
      .filter((m) => ['92', '93', '902', '23'].includes(m.debitAccount))
      .reduce((s, m) => s + m.amount, 0)
    const asset = accounting(res.movements)
      .filter((m) => ['281'].includes(m.debitAccount))
      .reduce((s, m) => s + m.amount, 0)
    return { res, expense, asset }
  }, [sc])

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="expense-cases"
        lead="Шість сценаріїв, які покривають більшість реальних питань про витрати. У кожному — те саме питання: що саме потрапить у звіт і чому. Два сценарії навмисно показують випадки, де інтуїція підводить."
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={cn(
              'focus-ring rounded-xl border p-3.5 text-left transition',
              active === s.id
                ? 'border-accent/55 bg-accent/[0.08] shadow-sm'
                : 'border-line bg-surface hover:border-accent/35',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-faint">СЦЕНАРІЙ {s.no}</span>
              <Badge
                tone={s.isExpense === 'yes' ? 'ok' : s.isExpense === 'no' ? 'danger' : 'warn'}
              >
                {s.isExpense === 'yes' ? 'витрата' : s.isExpense === 'no' ? 'НЕ витрата' : 'зміна витрати'}
              </Badge>
            </div>
            <div className="mt-1 text-[14px] font-semibold">{s.title}</div>
            <p className="mt-1 text-[12px] leading-5 text-muted">{s.question}</p>
          </button>
        ))}
      </div>

      <Card className={sc.isExpense === 'no' ? 'border-danger/40' : 'border-ok/35'}>
        <CardHeader
          icon={<PackageCheck size={16} />}
          title={`Сценарій ${sc.no}: ${sc.title}`}
          subtitle={sc.question}
          right={
            <Badge tone={sc.isExpense === 'no' ? 'danger' : sc.isExpense === 'partial' ? 'warn' : 'ok'}>
              {sc.answer}
            </Badge>
          }
        />
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_minmax(0,320px)]">
          <div>
            <p className="text-[14px] leading-7 text-fg/90">{sc.key}</p>

            <div className="mt-3">
              <div className="mb-1.5 text-[11px] uppercase tracking-wide text-faint">
                бухгалтерські записи
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th align="center">Дт</Th>
                    <Th align="center">Кт</Th>
                    <Th align="right">Сума</Th>
                    <Th>Що це означає</Th>
                  </tr>
                </thead>
                <tbody>
                  {accounting(preview.res.movements).map((m) => (
                    <tr key={m.id}>
                      <Td align="center">
                        <Badge tone={['92', '93', '902'].includes(m.debitAccount) ? 'warn' : 'accent'} mono>
                          {m.debitAccount}
                        </Badge>
                      </Td>
                      <Td align="center">
                        <Badge tone="violet" mono>{m.creditAccount}</Badge>
                      </Td>
                      <Td align="right" mono className={cn('font-semibold', m.amount < 0 && 'text-danger')}>
                        {num(m.amount)}
                      </Td>
                      <Td className="max-w-[360px] text-[12px] text-muted">{m.comment}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>

          <div className="grid gap-2 self-start">
            <Stat
              label="Витрати періоду"
              value={money(preview.expense)}
              tone={preview.expense > 0 ? 'warn' : preview.expense < 0 ? 'ok' : 'neutral'}
              hint={preview.expense === 0 ? 'фінрезультат не змінився' : 'оборот Дт 92/93/902'}
            />
            <Stat
              label="Приріст активів"
              value={money(preview.asset)}
              tone={preview.asset > 0 ? 'accent' : 'neutral'}
              hint={preview.asset > 0 ? 'майно на складі' : '—'}
            />
            <Stat
              label="Рухів створено"
              value={String(preview.res.movements.length)}
              hint={`у ${new Set(preview.res.movements.map((m) => m.register)).size} регістр(ах)`}
            />
          </div>
        </div>
      </Card>

      {/* ---------------- ключовий сценарій: товар ---------------- */}
      <Section eyebrow="найважливіше" title="Придбання товару ≠ витрата періоду">
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="border-danger/35">
            <CardHeader
              icon={<AlertTriangle size={16} className="text-danger" />}
              title="05.09 · Придбали 10 моніторів на 50 000"
              subtitle="Витрат: 0,00 грн"
            />
            <div className="p-4">
              <CodeBlock
                caption="Рухи документа надходження"
                code={`Дт 281  {Монітор, Основний склад}
Кт 631  {Техно-Імпорт, Договір №3}      50 000
   ↑ АКТИВ, а не витрата

Дт 6442 {Техно-Імпорт}
Кт 631  {Техно-Імпорт}                  10 000
   ↑ розрахунки з бюджетом

// рахунків 92 / 93 / 902 тут НЕМАЄ`}
              />
              <p className="mt-2.5 text-[13.5px] leading-6">
                Змінилась лише <strong>структура балансу</strong>: зріс актив (товар) і зріс пасив
                (борг). Фінансовий результат — нуль. Якщо зараз побудувати звіт про витрати, ви
                побачите порожній рядок, і це <em>правильно</em>.
              </p>
            </div>
          </Card>

          <Card className="border-ok/35">
            <CardHeader
              icon={<ArrowRight size={16} className="text-ok" />}
              title="20.09 · Продали 4 монітори"
              subtitle="Витрат: 20 000,00 грн"
            />
            <div className="p-4">
              <CodeBlock
                caption="Рухи документа реалізації"
                code={`Дт 361  {ФОП Коваленко}
Кт 702  {Продаж товарів}                 33 600
   ↑ ДОХІД

Дт 902  {Монітор, Собівартість продажів}
Кт 281  {Монітор, Основний склад}        20 000
   ↑ ОСЬ ТУТ народжується витрата

// 4 шт × 5 000 (вартість узята з РЕГІСТРА)`}
              />
              <p className="mt-2.5 text-[13.5px] leading-6">
                Товар вибув — і рівно 40% його вартості (4 з 10 шт) перетворилось на витрату. Решта
                60% залишилась активом на складі й стане витратою тоді, коли буде продана.
              </p>
            </div>
          </Card>
        </div>

        <div className="mt-3">
          <Callout kind="key" title="Чому це принципово">
            Якби придбання одразу вважалось витратою, компанія, яка закупила товар на склад під
            новорічний сезон, показала б у листопаді величезний збиток, а у грудні — неправдоподібний
            прибуток. Принцип відповідності доходів і витрат вимагає, щоб собівартість визнавалась{' '}
            <strong>у тому самому періоді, що й дохід від продажу</strong>. Саме тому вартість
            «чекає» на складі.
          </Callout>
        </div>
      </Section>

      <Collapse title="Коли актив перетворюється на витрату: повний перелік механізмів" tone="accent">
        <Table>
          <thead>
            <tr>
              <Th>Актив</Th>
              <Th>Момент перетворення</Th>
              <Th>Проводка</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>Товар (281)</Td>
              <Td>продаж</Td>
              <Td mono className="text-[11.5px]">Дт 902 / Кт 281</Td>
            </tr>
            <tr>
              <Td>Матеріали (201)</Td>
              <Td>передача у виробництво</Td>
              <Td mono className="text-[11.5px]">Дт 23 / Кт 201 → далі у собівартість</Td>
            </tr>
            <tr>
              <Td>Основний засіб (10)</Td>
              <Td>поступово, щомісяця</Td>
              <Td mono className="text-[11.5px]">Дт 92/93 / Кт 131 (амортизація)</Td>
            </tr>
            <tr>
              <Td>Витрати майбутніх періодів (39)</Td>
              <Td>настання періоду, якого вони стосуються</Td>
              <Td mono className="text-[11.5px]">Дт 92 / Кт 39</Td>
            </tr>
            <tr>
              <Td>Незавершене виробництво (23)</Td>
              <Td>випуск і продаж продукції</Td>
              <Td mono className="text-[11.5px]">Дт 26 / Кт 23, потім Дт 901 / Кт 26</Td>
            </tr>
          </tbody>
        </Table>
        <p className="mt-2 text-[13px] leading-6">
          Спільне правило: витрата визнається тоді, коли <strong>спожита економічна вигода</strong>,
          а не тоді, коли витрачені гроші.
        </p>
      </Collapse>

      {/* ---------------- симулятор ---------------- */}
      <Section eyebrow="симулятор" title="Проведіть будь-який сценарій самостійно">
        <PostingDebugger
          key={sc.docId}
          title="Симулятор формування витрат"
          initialId={sc.docId}
          documentIds={SCENARIOS.map((s) => s.docId)}
        />
      </Section>

      <Section eyebrow="підсумок" title="Шість сценаріїв поруч">
        <Table>
          <thead>
            <tr>
              <Th align="center">#</Th>
              <Th>Сценарій</Th>
              <Th align="center">Рахунок Дт</Th>
              <Th align="right">Витрата</Th>
              <Th>Чому саме так</Th>
            </tr>
          </thead>
          <tbody>
            {SCENARIOS.map((s) => {
              const base =
                s.docId === 'doc-goods-out'
                  ? postDocument(DOCUMENT_BY_ID['doc-goods-in']).movements
                  : []
              const r = postDocument(DOCUMENT_BY_ID[s.docId], stockFromMovements(base))
              const exp = accounting(r.movements).filter((m) =>
                ['92', '93', '902', '23'].includes(m.debitAccount),
              )
              const sum = exp.reduce((a, m) => a + m.amount, 0)
              return (
                <tr
                  key={s.id}
                  className={cn('cursor-pointer hover:bg-elevated', active === s.id && 'bg-accent/[0.07]')}
                  onClick={() => setActive(s.id)}
                >
                  <Td align="center" mono>{s.no}</Td>
                  <Td className="font-medium">{s.title}</Td>
                  <Td align="center">
                    {exp.length ? (
                      [...new Set(exp.map((m) => m.debitAccount))].map((a) => (
                        <Badge key={a} tone="warn" mono className="mr-1">
                          {a}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </Td>
                  <Td align="right" mono className={cn('font-semibold', sum === 0 && 'text-muted', sum < 0 && 'text-ok')}>
                    {num(sum)}
                  </Td>
                  <Td className="max-w-[420px] text-[12px] text-muted">{s.answer}</Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Section>

      <LmsBridge
        summary="У власній системі корисно явно розділити «зобов'язання» і «споживання». Оплата підписки на рік — це не витрата місяця. Якщо ви фіксуєте лише факт платежу, ви ніколи не порахуєте нормальну собівартість. Модель має дозволяти запис «капіталізувати зараз, визнати витратою потім»."
        rows={[
          { onec: 'Дт 92 / Кт 631', lms: 'entry(type: EXPENSE)', note: 'Одразу зменшує результат періоду.' },
          { onec: 'Дт 281 / Кт 631', lms: 'entry(type: ASSET)', note: 'Створює актив; результат не змінює.' },
          { onec: 'Дт 902 / Кт 281', lms: 'entry(type: COGS)', note: 'Перетворює актив на витрату при вибутті.' },
          { onec: 'Собівартість із регістра', lms: 'costOf(itemId, date)', note: 'Читає ledger, а не поле довідника.' },
          { onec: 'Коригування', lms: 'entry(amount: -X, adjusts: docId)', note: 'Новий запис, не UPDATE.' },
        ]}
        code={`type EntryKind = 'EXPENSE' | 'ASSET' | 'COGS' | 'INCOME' | 'SETTLEMENT'

function buildEntries(doc: Document): LedgerEntryDraft[] {
  switch (doc.kind) {
    case 'SERVICE_RECEIPT':          // спожили одразу
      return [{ kind: 'EXPENSE', amount: doc.net, costArticle: doc.article }]

    case 'GOODS_RECEIPT':            // капіталізуємо
      return [{ kind: 'ASSET', amount: doc.net, itemId: doc.itemId, qty: doc.qty }]

    case 'GOODS_SALE': {             // ось тут актив стає витратою
      const unitCost = costOf(doc.itemId, doc.date)   // ЧИТАЄМО ledger
      return [
        { kind: 'INCOME', amount: doc.price * doc.qty },
        { kind: 'COGS',   amount: unitCost * doc.qty, itemId: doc.itemId },
      ]
    }
  }
}

// звіт про витрати бере kind IN ('EXPENSE', 'COGS') — і тільки їх`}
        codeCaption="Розділення актив / витрата у власній моделі"
      />
    </div>
  )
}
