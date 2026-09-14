import { useMemo, useState } from 'react'
import { CalendarClock, History } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { MechanismBreakdown } from '@/components/MechanismBreakdown'
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
import { dmy, num } from '@/engine/format'
import { REGISTER_BY_ID } from '@/engine/registers'

interface PriceRec {
  date: string
  item: string
  type: string
  price: number
  source: string
}

const PRICES: PriceRec[] = [
  { date: '2026-09-01', item: 'Монітор 27"', type: 'Закупівельна', price: 5000, source: 'ПНТ-000011' },
  { date: '2026-09-01', item: 'Монітор 27"', type: 'Роздрібна', price: 7000, source: 'Встановлення цін' },
  { date: '2026-09-12', item: 'Монітор 27"', type: 'Закупівельна', price: 5200, source: 'ПНТ-000012' },
  { date: '2026-09-15', item: 'Монітор 27"', type: 'Роздрібна', price: 7400, source: 'Встановлення цін' },
  { date: '2026-09-03', item: 'Клавіатура', type: 'Роздрібна', price: 900, source: 'Встановлення цін' },
  { date: '2026-09-22', item: 'Клавіатура', type: 'Роздрібна', price: 950, source: 'Встановлення цін' },
]

const DATES = ['2026-09-01', '2026-09-05', '2026-09-12', '2026-09-16', '2026-09-25', '2026-09-30']

export default function Information() {
  const [onDate, setOnDate] = useState('2026-09-16')

  const slice = useMemo(() => {
    const latest = new Map<string, PriceRec>()
    for (const p of PRICES) {
      if (p.date > onDate) continue
      const key = `${p.item}|${p.type}`
      const prev = latest.get(key)
      if (!prev || p.date >= prev.date) latest.set(key, p)
    }
    return [...latest.values()].sort((a, b) => a.item.localeCompare(b.item))
  }, [onDate])

  const meta = REGISTER_BY_ID['itemPrices']

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="information"
        lead="Регістр відомостей зберігає не події, а стани: «яке значення діяло на цю дату». Він нічого не підсумовує і не має приходу/витрати. Це найпростіший тип регістра — і водночас той, який найчастіше застосовують неправильно."
      />

      <MechanismBreakdown
        title="Регістр відомостей: повний розбір"
        mechanism={{
          what:
            'Таблиця значень із унікальним ключем. Ключ складається з вимірювань, а для періодичного регістра — ще й з періоду.\n\nВідповідає на питання «яке значення?», а не «скільки?». Саме тому в ньому немає виду руху і немає підсумовування.',
          why:
            'Не всі дані є подіями. Ціна, курс валюти, ставка податку, відповідальний менеджер, налаштування користувача — це СТАНИ, які змінюються з часом.\n\nЗберігати їх у реквізиті довідника не можна: реквізит має лише одне, поточне значення. Змінили ціну — історія зникла, і минулий документ уже не перерахуєш правильно. Регістр відомостей вирішує саме цю проблему.',
          structure:
            'Період — з якої дати значення чинне (лише у періодичному регістрі).\nВимірювання — формують УНІКАЛЬНИЙ ключ. Два записи з однаковим ключем існувати не можуть.\nРесурси — самі значення стану (можуть бути будь-якого типу, не тільки числа).\nРеквізити — довідкові поля.\n\nОкремо важливий режим запису: підпорядкований реєстратору (пише документ) або незалежний (пише хто завгодно).',
          who:
            'Незалежний регістр — обробки, код, користувач вручну, форма списку.\nПідпорядкований реєстратору — документ під час проведення, як і будь-який інший регістр.\n\nУ симуляторі цього проєкту ціни пише документ надходження товарів — тобто регістр підпорядкований.',
          when:
            'Незалежний — будь-коли, це звичайний запис у базу.\nПідпорядкований — у момент проведення документа.\n\nВажливо: запис із тим самим ключем ЗАМІНЮЄ попередній. Тут, на відміну від регістрів накопичення, «перезапис» — нормальна штатна поведінка.',
          written:
            'Значення, чинне з указаної дати. Не «зміна на +200», а «з 12.09 ціна дорівнює 5 200».\n\nЦе принципова відмінність від регістра накопичення: там пишуть ДЕЛЬТУ, тут — АБСОЛЮТНЕ значення.',
          used:
            'Головний інструмент — ЗрізОстанніх(&Дата, Умова): останнє значення, чинне на момент або раніше.\nТакож є ЗрізПерших(&Дата) — перше значення після дати.\n\nАлгоритми проведення постійно звертаються до зрізу останніх: щоб підставити ціну, курс, ставку податку на дату документа, а не на сьогодні.',
          ownSystem:
            'Таблиця history: (entity_id, key_fields…, effective_from, value). Унікальний індекс по (ключ + effective_from).\n\nЧитання — завжди через функцію valueAt(key, date), яка робить ORDER BY effective_from DESC LIMIT 1 з умовою effective_from <= date. Ніколи не читайте «поточне значення» з окремої колонки: саме так втрачається можливість перерахувати минулий період.',
          code: `РегистрСведений.ЦіниНоменклатури  (періодичний, у межах дня)
├── Период        : Дата        ← частина ключа
├── Номенклатура  : Измерение   ← частина ключа
├── ТипЦен        : Измерение   ← частина ключа
├── Цена          : Ресурс      ← саме значення
└── Источник      : Реквизит

// унікальність: (Период, Номенклатура, ТипЦен)`,
          codeCaption: 'Структура періодичного регістра відомостей',
        }}
      />

      <Card>
        <CardHeader
          icon={<CalendarClock size={16} />}
          title="Пісочниця: зріз останніх"
          subtitle="Перемістіть дату і подивіться, яке значення система вважає чинним"
        />
        <div className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[12px] text-muted">Зріз на дату:</span>
            {DATES.map((d) => (
              <button
                key={d}
                onClick={() => setOnDate(d)}
                className={cn(
                  'focus-ring rounded-lg border px-2.5 py-1 font-mono text-[12px] transition',
                  onDate === d
                    ? 'border-accent/55 bg-accent/[0.1] text-accent'
                    : 'border-line bg-elevated text-muted hover:text-fg',
                )}
              >
                {dmy(d)}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-faint">
                <History size={12} /> усі записи регістра
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th>Період</Th>
                    <Th>Номенклатура</Th>
                    <Th>Тип цін</Th>
                    <Th align="right">Ціна</Th>
                  </tr>
                </thead>
                <tbody>
                  {[...PRICES]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((p, i) => {
                      const isFuture = p.date > onDate
                      const isActive = slice.includes(p)
                      return (
                        <tr
                          key={i}
                          className={cn(
                            isFuture && 'opacity-35',
                            isActive && 'bg-accent/[0.09]',
                          )}
                        >
                          <Td mono>{dmy(p.date)}</Td>
                          <Td>{p.item}</Td>
                          <Td className="text-muted">{p.type}</Td>
                          <Td align="right" mono className={cn(isActive && 'font-semibold text-accent')}>
                            {num(p.price)}
                          </Td>
                        </tr>
                      )
                    })}
                </tbody>
              </Table>
              <p className="mt-2 text-[12px] leading-5 text-faint">
                Блідим показані записи «з майбутнього» — на обрану дату вони ще не діяли.
                Підсвічені — ті, що потрапили у зріз.
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-faint">
                <CalendarClock size={12} /> ЗрізОстанніх({dmy(onDate)})
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th>Номенклатура</Th>
                    <Th>Тип цін</Th>
                    <Th align="right">Ціна</Th>
                    <Th>Діє з</Th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((p, i) => (
                    <tr key={i}>
                      <Td className="font-medium">{p.item}</Td>
                      <Td className="text-muted">{p.type}</Td>
                      <Td align="right" mono className="font-semibold">
                        {num(p.price)}
                      </Td>
                      <Td mono className="text-faint">{dmy(p.date)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <CodeBlock
                className="mt-2"
                caption="Що виконалось"
                code={`ВЫБРАТЬ Номенклатура, ТипЦін, Ціна
ИЗ РегистрСведений.ЦіниНоменклатури.СрезПоследних(&НаДату)

-- концептуальний SQL-аналог:
SELECT DISTINCT ON (item_id, price_type) *
FROM   price_history
WHERE  effective_from <= '${onDate}'
ORDER  BY item_id, price_type, effective_from DESC`}
              />
            </div>
          </div>
        </div>
      </Card>

      <Callout kind="key" title="Чому не можна зберігати ціну реквізитом довідника">
        Реквізит має <strong>одне</strong> значення — поточне. Змінили ціну 15 вересня — і документ
        від 1 вересня, якщо його перепровести, візьме нову ціну. Історія зникла, а звіти за минулий
        період перестали відтворюватись. Регістр відомостей зберігає всі значення разом із датами,
        тому будь-який минулий розрахунок можна повторити точно.
      </Callout>

      <Section eyebrow="порівняння" title="Три типи регістрів поруч">
        <Table>
          <thead>
            <tr>
              <Th />
              <Th>Накопичення</Th>
              <Th>Відомостей</Th>
              <Th>Бухгалтерії</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td className="text-muted">Питання</Td>
              <Td>Скільки?</Td>
              <Td>Яке значення?</Td>
              <Td>Яка кореспонденція?</Td>
            </tr>
            <tr>
              <Td className="text-muted">Запис — це</Td>
              <Td>дельта (зміна)</Td>
              <Td>абсолютне значення (стан)</Td>
              <Td>дельта в двох розрізах одночасно</Td>
            </tr>
            <tr>
              <Td className="text-muted">Підсумовується?</Td>
              <Td className="text-ok">так</Td>
              <Td className="text-danger">ні</Td>
              <Td className="text-ok">так</Td>
            </tr>
            <tr>
              <Td className="text-muted">Перезапис ключа</Td>
              <Td className="text-danger">не буває</Td>
              <Td className="text-ok">штатна поведінка</Td>
              <Td className="text-danger">не буває</Td>
            </tr>
            <tr>
              <Td className="text-muted">Головна віртуальна таблиця</Td>
              <Td mono className="text-[11.5px]">Остатки / Обороты</Td>
              <Td mono className="text-[11.5px]">СрезПоследних</Td>
              <Td mono className="text-[11.5px]">ОстаткиИОбороты</Td>
            </tr>
          </tbody>
        </Table>
      </Section>

      <Collapse title="Типова помилка: використати регістр відомостей там, де потрібне накопичення" tone="accent">
        <p className="mb-2">
          Спокуса: «зберігатиму поточний залишок товару в регістрі відомостей, це ж швидше».
          Наслідки з’являються не одразу:
        </p>
        <ul className="grid gap-1 pl-4 text-[13.5px] leading-6">
          <li>· два документи, проведені одночасно, перезапишуть значення один одного;</li>
          <li>· неможливо дізнатись, ЯКИЙ документ змінив залишок і на скільки;</li>
          <li>· неможливо порахувати залишок на минулу дату;</li>
          <li>· після виправлення старого документа залишок не перерахується.</li>
        </ul>
        <p className="mt-2">
          Правило просте: якщо значення <strong>накопичується з внесків</strong> — це регістр
          накопичення. Якщо воно <strong>встановлюється цілком</strong> — регістр відомостей.
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
                        f.role === 'dimension' ? 'accent' : f.role === 'resource' ? 'ok' : 'neutral'
                      }
                    >
                      {f.role === 'dimension'
                        ? 'вимірювання (ключ)'
                        : f.role === 'resource'
                          ? 'ресурс'
                          : f.role === 'period'
                            ? 'період'
                            : 'реквізит'}
                    </Badge>
                  </Td>
                  <Td className="max-w-[460px] text-[12px] text-muted">{f.description}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <LmsBridge
        summary="У власній системі це найпростіший і найнедооціненіший патерн. Щойно у вас з'явиться будь-яке значення, яке «змінюється з часом» — ціна, тариф, ставка, курс, відповідальний — не робіть його колонкою. Робіть таблицю історії. Переписати колонку легко; повернути втрачену історію неможливо."
        rows={[
          { onec: 'Регістр відомостей', lms: 'history / effective-dated table', note: 'Ключ + дата початку дії + значення.' },
          { onec: 'ЗрізОстанніх(&Дата)', lms: 'valueAt(key, date)', note: 'ORDER BY effective_from DESC LIMIT 1.' },
          { onec: 'Періодичність', lms: 'гранулярність effective_from', note: 'День чи секунда — вирішіть одразу, змінити важко.' },
          { onec: 'Незалежний регістр', lms: 'звичайний CRUD', note: 'Пише хто завгодно; реєстратора немає.' },
        ]}
        code={`create table price_history (
  item_id        uuid not null,
  price_type     text not null,
  effective_from date not null,
  price          numeric(18,2) not null,
  source         text,
  primary key (item_id, price_type, effective_from)
);

export async function priceAt(itemId: string, type: string, date: string) {
  const [row] = await db.query(\`
    SELECT price FROM price_history
    WHERE item_id = $1 AND price_type = $2 AND effective_from <= $3
    ORDER BY effective_from DESC LIMIT 1\`, [itemId, type, date])
  return row?.price ?? null
}`}
      />
    </div>
  )
}
