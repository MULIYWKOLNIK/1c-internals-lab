import { useMemo, useState } from 'react'
import { Plus, Minus, Trash2, Boxes } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { MechanismBreakdown } from '@/components/MechanismBreakdown'
import { LmsBridge } from '@/components/LmsBridge'
import {
  Badge,
  Button,
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
import { REGISTER_BY_ID } from '@/engine/registers'
import { num } from '@/engine/format'

interface Row {
  id: number
  date: string
  doc: string
  type: 'receipt' | 'expense'
  item: string
  warehouse: string
  qty: number
  amount: number
}

const INITIAL: Row[] = [
  { id: 1, date: '2026-09-05', doc: 'ПНТ-000011', type: 'receipt', item: 'Монітор 27"', warehouse: 'Основний', qty: 10, amount: 50000 },
  { id: 2, date: '2026-09-12', doc: 'ПНТ-000012', type: 'receipt', item: 'Монітор 27"', warehouse: 'Основний', qty: 5, amount: 26000 },
  { id: 3, date: '2026-09-20', doc: 'РТП-000004', type: 'expense', item: 'Монітор 27"', warehouse: 'Основний', qty: 4, amount: 20000 },
  { id: 4, date: '2026-09-22', doc: 'ПНТ-000013', type: 'receipt', item: 'Клавіатура', warehouse: 'Основний', qty: 20, amount: 12000 },
]

export default function Accumulation() {
  const [rows, setRows] = useState<Row[]>(INITIAL)
  const [nextId, setNextId] = useState(5)

  const balances = useMemo(() => {
    const map = new Map<string, { item: string; qty: number; amount: number }>()
    for (const r of rows) {
      const sign = r.type === 'receipt' ? 1 : -1
      const cur = map.get(r.item) ?? { item: r.item, qty: 0, amount: 0 }
      cur.qty += sign * r.qty
      cur.amount += sign * r.amount
      map.set(r.item, cur)
    }
    return [...map.values()]
  }, [rows])

  const turnovers = useMemo(() => {
    let inQty = 0
    let outQty = 0
    for (const r of rows) {
      if (r.type === 'receipt') inQty += r.qty
      else outQty += r.qty
    }
    return { inQty, outQty }
  }, [rows])

  const add = (type: 'receipt' | 'expense') => {
    setRows((rs) => [
      ...rs,
      {
        id: nextId,
        date: '2026-09-28',
        doc: type === 'receipt' ? 'ПНТ-00001' + nextId : 'РТП-00000' + nextId,
        type,
        item: 'Монітор 27"',
        warehouse: 'Основний',
        qty: 2,
        amount: 10000,
      },
    ])
    setNextId((n) => n + 1)
  }

  const meta = REGISTER_BY_ID['stock']

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="accumulation"
        lead="Регістр накопичення відповідає на два питання: «скільки чогось є зараз» і «скільки пройшло за період». Ключова ідея — залишок ніде не зберігається як число. Він завжди обчислюється з рухів."
      />

      <MechanismBreakdown
        title="Регістр накопичення: повний розбір"
        mechanism={{
          what:
            'Регістр для кількісних і сумових підсумків. Має два різновиди:\n\n· ЗАЛИШКИ — має вид руху Прихід/Витрата. Відповідає на «скільки є на дату». Приклад: товари на складах, гроші в касі, заборгованість.\n\n· ОБОРОТИ — виду руху немає, лише підсумовування за період. Відповідає на «скільки пройшло». Приклад: витрати за статтями, продажі, нараховані податки.',
          why:
            'Бухгалтерський регістр теж уміє давати залишки, але він важкий: кожен запис тягне за собою два рахунки, два набори субконто, правила подвійного запису.\n\nДля оперативних задач це надлишково. Коли треба швидко відповісти «чи вистачає товару на складі» просто зараз, під час проведення документа, потрібна легка структура з двома-трьома вимірюваннями. Саме її дає регістр накопичення.',
          structure:
            'Період, Реєстратор, НомерРядка — службові.\nВидРуху (тільки для залишків) — Прихід або Витрата.\nВимірювання — розрізи: Номенклатура, Склад, Організація.\nРесурси — Кількість, Сума.\nРеквізити — довідкові поля.',
          who:
            'Документи через проведення. Прихід створюють документи надходження, витрату — документи вибуття.\n\nОдин і той самий документ може створити і прихід, і витрату в одному регістрі — наприклад, переміщення між складами: витрата зі складу А і прихід на склад Б.',
          when:
            'У момент проведення. Важливо: при проведенні документ часто СПОЧАТКУ ЧИТАЄ залишки (щоб перевірити достатність товару або порахувати собівартість), а потім пише свої рухи. Тому порядок і дати документів впливають на результат.',
          written:
            'Кожен рух — це зміна, а не стан. «Прийшло 10 шт» і «пішло 4 шт», а не «тепер 6 шт». Система ніколи не переписує попередній запис, щоб оновити залишок.',
          used:
            'Через віртуальні таблиці:\n· Залишки(&Дата, Умова) — стан на момент;\n· Обороти(&Початок, &Кінець, Періодичність, Умова) — рух за період;\n· ЗалишкиТаОбороти — залишок на початок + обороти + залишок на кінець.\n\nПлатформа може використовувати допоміжні таблиці підсумків для швидкодії, але логічно результат завжди виводиться з рухів.',
          ownSystem:
            'Додайте до ledger колонку direction (+1 / −1) або зберігайте від’ємні суми для вибуття.\n\nБаланс рахуйте функцією, а не полем. Якщо швидкодії не вистачить — додайте матеріалізоване подання або таблицю знімків із датою, але завжди з можливістю перерахувати її з нуля. Поле «поточний залишок», яке оновлюється UPDATE-ом, рано чи пізно розійдеться з історією, і ви не дізнаєтесь коли.',
          code: `РегистрНакопления.ТовариНаСкладах  (вид: Залишки)
├── Период        : Дата
├── Регистратор   : ДокументСсылка
├── ВидДвижения   : Приход | Расход
├── Номенклатура  : Измерение
├── Склад         : Измерение
├── Количество    : Ресурс
└── Сумма         : Ресурс`,
          codeCaption: 'Структура регістра залишків',
        }}
      />

      <Card>
        <CardHeader
          icon={<Boxes size={16} />}
          title="Пісочниця: залишок як результат обчислення"
          subtitle="Додайте рухи і подивіться, як змінюється залишок. Жодне число нижче не збережене — усе рахується на льоту."
          right={
            <div className="flex gap-1.5">
              <Button size="sm" variant="ok" onClick={() => add('receipt')}>
                <Plus size={12} /> Прихід
              </Button>
              <Button size="sm" variant="danger" onClick={() => add('expense')}>
                <Minus size={12} /> Витрата
              </Button>
              <Button size="sm" onClick={() => setRows(INITIAL)}>
                скинути
              </Button>
            </div>
          }
        />
        <div className="grid gap-4 p-4 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <div className="mb-1.5 text-[11px] uppercase tracking-wide text-faint">
              рухи регістра ({rows.length})
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Період</Th>
                  <Th>Реєстратор</Th>
                  <Th align="center">Вид руху</Th>
                  <Th>Номенклатура</Th>
                  <Th align="right">К-сть</Th>
                  <Th align="right">Сума</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-elevated">
                    <Td mono>{r.date}</Td>
                    <Td className="text-muted">{r.doc}</Td>
                    <Td align="center">
                      <Badge tone={r.type === 'receipt' ? 'ok' : 'danger'}>
                        {r.type === 'receipt' ? '+ Прихід' : '− Витрата'}
                      </Badge>
                    </Td>
                    <Td>{r.item}</Td>
                    <Td align="right" mono className={r.type === 'expense' ? 'text-danger' : 'text-ok'}>
                      {r.type === 'receipt' ? '+' : '−'}
                      {r.qty}
                    </Td>
                    <Td align="right" mono>
                      {num(r.amount)}
                    </Td>
                    <Td align="center">
                      <button
                        onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                        className="text-faint transition hover:text-danger"
                        title="Видалити рух"
                      >
                        <Trash2 size={12} />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          <div className="grid gap-3 self-start">
            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-wide text-faint">
                віртуальна таблиця «Залишки»
              </div>
              <div className="grid gap-2">
                {balances.map((b) => (
                  <div
                    key={b.item}
                    className={cn(
                      'rounded-lg border px-3 py-2',
                      b.qty < 0 ? 'border-danger/50 bg-danger/[0.08]' : 'border-ok/40 bg-ok/[0.07]',
                    )}
                  >
                    <div className="text-[12px] text-muted">{b.item}</div>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="font-mono text-[18px] font-semibold tabular-nums">
                        {b.qty} шт
                      </span>
                      <span className="font-mono text-[12px] text-muted">{num(b.amount)} грн</span>
                    </div>
                    {b.qty < 0 && (
                      <div className="mt-1 text-[11px] text-danger">
                        Від’ємний залишок! У реальній системі проведення тут би зупинилось.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Stat label="Оборот прихід" value={`${turnovers.inQty} шт`} tone="ok" />
              <Stat label="Оборот витрата" value={`${turnovers.outQty} шт`} tone="danger" />
            </div>

            <CodeBlock
              caption="Як це рахується"
              lang="ts"
              code={`balance = Σ(прихід) − Σ(витрата)
        = ${rows.filter((r) => r.type === 'receipt').reduce((s, r) => s + r.qty, 0)} − ${rows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.qty, 0)}

// у мові запитів 1С:
ВЫБРАТЬ Номенклатура, КоличествоОстаток
ИЗ РегистрНакопления
     .ТовариНаСкладах
     .Остатки(&НаДату)`}
            />
          </div>
        </div>
      </Card>

      <Callout kind="warn" title="Обережно з термінами">
        «Витрата» у регістрі накопичення — це <strong>напрям руху</strong> (мінус до залишку), а не
        бухгалтерська витрата. Списання товару зі складу дає «витрату» в регістрі залишків і
        одночасно створює витрату періоду на рахунку 902. А от переміщення між складами теж дає
        «витрату» в регістрі — але жодної витрати періоду при цьому не виникає. Однакове слово,
        різні поняття.
      </Callout>

      <Section eyebrow="два різновиди" title="Залишки vs Обороти">
        <Table>
          <thead>
            <tr>
              <Th />
              <Th>Вид «Залишки»</Th>
              <Th>Вид «Обороти»</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td className="text-muted">Питання</Td>
              <Td>Скільки є на дату?</Td>
              <Td>Скільки пройшло за період?</Td>
            </tr>
            <tr>
              <Td className="text-muted">Вид руху</Td>
              <Td className="text-ok">є (Прихід / Витрата)</Td>
              <Td className="text-danger">немає</Td>
            </tr>
            <tr>
              <Td className="text-muted">Віртуальні таблиці</Td>
              <Td mono className="text-[11.5px]">Остатки, Обороты, ОстаткиИОбороты</Td>
              <Td mono className="text-[11.5px]">Обороты</Td>
            </tr>
            <tr>
              <Td className="text-muted">Приклад</Td>
              <Td>Товари на складах, Грошові кошти, Взаєморозрахунки</Td>
              <Td>Витрати за статтями, Продажі, Нарахування податків</Td>
            </tr>
            <tr>
              <Td className="text-muted">Чому саме так</Td>
              <Td className="text-[12px] text-muted">
                Товар можна порахувати «зараз» — він фізично існує
              </Td>
              <Td className="text-[12px] text-muted">
                «Залишок витрат» не має сенсу: витрата — це подія за період, а не запас
              </Td>
            </tr>
          </tbody>
        </Table>
      </Section>

      <Collapse title="Чому регістр «Витрати за статтями» — оборотний, а не залишковий" tone="accent">
        <p className="mb-2">
          Бо питання «скільки витрат залишилось на 30 вересня» безглузде. Витрата — це подія, яка
          сталася в певний момент; вона не «лежить» ніде після цього.
        </p>
        <p className="mb-2">
          Те саме у бухгалтерії: рахунки 92, 93, 902 наприкінці періоду <strong>закриваються</strong>{' '}
          на 791 і не мають сальдо. Якщо ви побачили ненульове сальдо на 92 — місяць не закритий.
        </p>
        <p>
          А от рахунок 281 «Товари» сальдо має, бо товар — це запас. Ось чому одна й та сама сума
          спочатку живе як залишок (281), а потім перетворюється на оборот (902).
        </p>
      </Collapse>

      <Card>
        <CardHeader title={meta.title} subtitle="структура регістра з симулятора" />
        <div className="p-4">
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
                      tone={
                        f.role === 'dimension'
                          ? 'accent'
                          : f.role === 'resource'
                            ? 'ok'
                            : f.role === 'recordType'
                              ? 'violet'
                              : 'neutral'
                      }
                    >
                      {ROLE_LABEL[f.role]}
                    </Badge>
                  </Td>
                  <Td mono className="text-[11.5px] text-muted">{f.type}</Td>
                  <Td className="max-w-[420px] text-[12px] text-muted">{f.description}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <LmsBridge
        summary="Найважливіше, що варто скопіювати, — заборона зберігати залишок як окреме поле. Баланс має бути функцією від історії. Це дає безкоштовно: відтворюваність, аудит, можливість перерахувати минуле після виправлення помилки і відповідь на питання «а скільки було на будь-яку дату в минулому»."
        rows={[
          { onec: 'Прихід / Витрата', lms: 'direction: 1 | -1', note: 'Або зберігайте від’ємні amount — головне, одноманітно.' },
          { onec: 'Залишки(&Дата)', lms: 'balanceAt(date, dims)', note: 'SUM(amount * direction) WHERE occurred_at <= date.' },
          { onec: 'Обороти(&П1,&П2)', lms: 'turnovers(from, to, groupBy)', note: 'SUM(amount) у межах періоду.' },
          { onec: 'Таблиці підсумків', lms: 'materialized view / snapshots', note: 'Лише як кеш, який завжди можна перебудувати з нуля.' },
        ]}
        code={`export function balanceAt(entries: LedgerEntry[], date: string, dims: Partial<Dims>) {
  return entries
    .filter(e => e.occurredAt <= date)
    .filter(e => Object.entries(dims).every(([k, v]) => e.dimensions[k] === v))
    .reduce((sum, e) => sum + e.amount * e.direction, 0)
}

// НІКОЛИ так:
// await db.update(items).set({ stock: items.stock - qty })   // ← втрата історії`}
      />
    </div>
  )
}

const ROLE_LABEL: Record<string, string> = {
  period: 'період',
  registrar: 'реєстратор',
  dimension: 'вимірювання',
  resource: 'ресурс',
  attribute: 'реквізит',
  recordType: 'вид руху',
  system: 'службове',
}
