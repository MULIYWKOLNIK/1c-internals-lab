import { PageHeader } from '@/components/PageHeader'
import { AmountJourney, type JourneyStage } from '@/components/viz/AmountJourney'
import { LmsBridge } from '@/components/LmsBridge'
import { CausalChain } from '@/components/CausalChain'
import {
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

const STAGES: JourneyStage[] = [
  {
    id: 'doc',
    label: 'Документ',
    sub: 'ПНП-000001 · 01.09.2026',
    state: `Сума = 30 000
існує як: реквізит рядка табличної частини
видима у: формі документа
впливає на облік: НІ`,
    detail:
      'Це поле у формі. Його можна змінити, стерти, зберегти чернеткою. Для системи це просто число в рядку таблиці, яке ще нічого не означає в бухгалтерському сенсі.',
  },
  {
    id: 'posting',
    label: 'Проведення',
    sub: 'ОбработкаПроведения()',
    state: `Сума = 30 000
існує як: змінна в пам'яті
видима у: ніде
впливає на облік: ЩЕ НІ`,
    detail:
      'Алгоритм прочитав суму з документа і тримає її в пам’яті. Одночасно він визначає рахунок (92) та аналітику (Оренда, Адміністрація). Якщо зараз станеться помилка — сума просто зникне разом із транзакцією.',
  },
  {
    id: 'movement',
    label: 'Рух',
    sub: 'Дт 92 / Кт 631',
    state: `Сума = 30 000
існує як: поле «Сумма» набору записів
видима у: наборі рухів (у пам'яті)
впливає на облік: ЩЕ НІ`,
    detail:
      'Сума отримала контекст: вона більше не просто число, а «30 000 за статтею Оренда у підрозділі Адміністрація, визнані 1 вересня за рахунок боргу перед Бізнес-Центром». Але записана вона поки що тільки в оперативну пам’ять.',
  },
  {
    id: 'register',
    label: 'Регістр',
    sub: 'Госпрозрахунковий',
    state: `Сума = 30 000
існує як: рядок у регістрі
видима у: всіх звітах
впливає на облік: ТАК`,
    detail:
      'COMMIT відбувся. З цієї миті сума — факт обліку. Її бачать інші користувачі, вона впливає на баланс, її можна знайти запитом. Змінити її тепер можна лише через перепроведення або новий документ.',
  },
  {
    id: 'query',
    label: 'Запит',
    sub: 'Обороти(01.09–30.09)',
    state: `Сума = 30 000
існує як: рядок вибірки
відбір: період, організація, рахунок
впливає на облік: ні (лише читання)`,
    detail:
      'Звіт попросив дані. Сума потрапила у вибірку, бо її період у межах 01.09–30.09, рахунок 92 входить в умову відбору, а організація збігається. Змініть будь-яку з цих умов — і сума з вибірки зникне, залишившись у базі.',
  },
  {
    id: 'aggregate',
    label: 'Агрегація',
    sub: 'GROUP BY стаття',
    state: `Сума = 30 000
існує як: доданок у SUM()
групування: СтаттяВитрат = «Оренда»
разом у групі: 30 000`,
    detail:
      'Сума злилась з іншими сумами тієї самої групи. Якби у вересні була ще одна оренда на 12 000, у цьому рядку було б 42 000, і окремої «нашої» суми вже не існувало б — лише підсумок із можливістю розшифровки.',
  },
  {
    id: 'report',
    label: 'Звіт',
    sub: 'Витрати за статтями',
    state: `Оренда ........ 30 000,00
існує як: комірка звіту
розшифровується до: ПНП-000001
впливає на облік: ні`,
    detail:
      'Кінцева точка. Комірка знає свій реєстратор, тому подвійний клік поверне вас до документа — ланцюг замикається у зворотному напрямку.',
  },
]

export default function DocToRegister() {
  return (
    <div className="grid gap-6">
      <PageHeader
        slug="doc-to-register"
        lead="Простежимо одну конкретну суму — 30 000 грн оренди — від поля у формі документа до комірки у звіті. На кожному етапі вона існує в іншому вигляді й має інші властивості."
      />

      <AmountJourney
        stages={STAGES}
        amountLabel="30к"
        title="Шлях 30 000 грн крізь систему"
        subtitle="Натисніть «Програти» або клікайте на будь-який блок схеми"
      />

      <Callout kind="key" title="Момент істини — між етапами 3 і 4">
        До запису в регістр сума існує лише в пам’яті процесу. Після запису вона стає{' '}
        <strong>спільним фактом</strong>: її бачать усі, вона впливає на рішення інших документів,
        її не можна «тихо» змінити. Саме ця межа відділяє «я щось ввів» від «в обліку це сталося».
      </Callout>

      <Section eyebrow="таблиця станів" title="Одна сума — сім різних станів">
        <Table>
          <thead>
            <tr>
              <Th>Етап</Th>
              <Th>Форма існування</Th>
              <Th align="center">Видно у звіті</Th>
              <Th align="center">Можна змінити</Th>
              <Th>Хто бачить</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td className="font-medium">Документ</Td>
              <Td className="text-muted">реквізит рядка ТЧ</Td>
              <Td align="center" className="text-danger">ні</Td>
              <Td align="center" className="text-ok">так, вільно</Td>
              <Td className="text-muted">автор документа</Td>
            </tr>
            <tr>
              <Td className="font-medium">Проведення</Td>
              <Td className="text-muted">змінна в пам’яті</Td>
              <Td align="center" className="text-danger">ні</Td>
              <Td align="center" className="text-ok">так, кодом</Td>
              <Td className="text-muted">ніхто</Td>
            </tr>
            <tr>
              <Td className="font-medium">Рух</Td>
              <Td className="text-muted">поле набору записів</Td>
              <Td align="center" className="text-danger">ні</Td>
              <Td align="center" className="text-ok">так, до запису</Td>
              <Td className="text-muted">ніхто</Td>
            </tr>
            <tr className="bg-accent/[0.06]">
              <Td className="font-semibold">Регістр</Td>
              <Td className="font-medium">рядок у базі</Td>
              <Td align="center" className="text-ok">так</Td>
              <Td align="center" className="text-warn">лише перепроведенням</Td>
              <Td>усі користувачі</Td>
            </tr>
            <tr>
              <Td className="font-medium">Запит</Td>
              <Td className="text-muted">рядок вибірки</Td>
              <Td align="center" className="text-ok">так</Td>
              <Td align="center" className="text-danger">ні</Td>
              <Td className="text-muted">той, хто будує звіт</Td>
            </tr>
            <tr>
              <Td className="font-medium">Агрегація</Td>
              <Td className="text-muted">доданок у SUM()</Td>
              <Td align="center" className="text-ok">так, у складі групи</Td>
              <Td align="center" className="text-danger">ні</Td>
              <Td className="text-muted">—</Td>
            </tr>
            <tr>
              <Td className="font-medium">Звіт</Td>
              <Td className="text-muted">комірка</Td>
              <Td align="center" className="text-ok">так</Td>
              <Td align="center" className="text-danger">ні</Td>
              <Td className="text-muted">читач звіту</Td>
            </tr>
          </tbody>
        </Table>
      </Section>

      <Collapse title="А що, якщо сума «зникла» — на якому саме етапі її втратили?" tone="accent">
        <p className="mb-2">
          Ця таблиця — готовий алгоритм діагностики. Йдіть згори вниз і перевіряйте, де ланцюг
          обірвався:
        </p>
        <ul className="grid gap-1.5 pl-4 text-[13.5px] leading-6">
          <li>
            <strong>Документ → Проведення:</strong> документ не проведено, або сума в документі нульова.
          </li>
          <li>
            <strong>Проведення → Рух:</strong> алгоритм не створив рух (умова в коді, вимкнена опція).
          </li>
          <li>
            <strong>Рух → Регістр:</strong> транзакція відкотилась; документ виглядає проведеним, але
            перевірте рухи.
          </li>
          <li>
            <strong>Регістр → Запит:</strong> період, організація або рахунок не проходять відбір.
          </li>
          <li>
            <strong>Запит → Агрегація:</strong> сума потрапила в іншу групу (порожня стаття витрат).
          </li>
        </ul>
        <p className="mt-2">
          Повний інтерактивний варіант цього алгоритму — у розділі «Діагностика».
        </p>
      </Collapse>

      <Card>
        <CardHeader title="Той самий шлях у коді" subtitle="кожен рядок — один етап схеми" />
        <div className="p-4">
          <CodeBlock
            lang="ts"
            caption="Від поля форми до комірки звіту"
            code={`// 1. Документ: сума — просто поле
const doc = { id: 'D-1', date: '2026-09-01', article: 'Оренда',
              department: 'Адміністрація', net: 30000, vat: 6000 }

// 2-3. Проведення: сума отримує контекст
function buildEntries(doc) {
  return [{
    occurredAt: doc.date,
    sourceId:   doc.id,              // ← реєстратор
    debit: '92', credit: '631',      // ← рахунки визначив алгоритм
    dims: { article: doc.article, department: doc.department },
    amount: doc.net,                 // ← 30 000 їде далі
  }]
}

// 4. Регістр: сума стає фактом
await db.transaction(async tx => {
  await tx.delete(ledger).where(eq(ledger.sourceId, doc.id))
  await tx.insert(ledger).values(buildEntries(doc))
})

// 5-6. Запит + агрегація
const rows = await db
  .select({ article: ledger.dims.article, amount: sum(ledger.amount) })
  .from(ledger)
  .where(and(
    between(ledger.occurredAt, from, to),   // ← тут сума може «зникнути»
    inArray(ledger.debit, ['92','93','902'])
  ))
  .groupBy(ledger.dims.article)

// 7. Звіт
// Оренда ........ 30 000,00`}
          />
        </div>
      </Card>

      <CausalChain
        values={[
          'оренда офісу',
          'ПНП-000001',
          'Провести',
          'СчетЗатрат = 92',
          'Дт 92 / Кт 631',
          'Госпрозрахунковий',
          '30 000 у базі',
          'Обороти(...)',
          'GROUP BY стаття',
          'Оренда 30 000',
        ]}
        subtitle="Ті самі сім етапів у повній десятикроковій моделі"
      />

      <LmsBridge
        summary="Коли проєктуєте власну систему, корисно явно назвати ці стани в коді й типах. Якщо у вас один тип Expense використовується і як форма введення, і як запис ledger, і як рядок звіту — ви гарантовано отримаєте баги, де хтось «випадково» змінив історичний запис через форму редагування."
        rows={[
          { onec: 'Реквізит документа', lms: 'CreateExpenseDto', note: 'Змінюваний. Валідується на вході.' },
          { onec: 'Рух у пам’яті', lms: 'LedgerEntryDraft', note: 'Результат чистої функції buildEntries().' },
          { onec: 'Запис регістра', lms: 'LedgerEntry (readonly)', note: 'Незмінний тип без сетерів.' },
          { onec: 'Рядок вибірки', lms: 'ExpenseReportRow', note: 'Формується запитом, не зберігається.' },
        ]}
        code={`// три РІЗНІ типи для трьох різних станів — це не надлишковість
type CreateExpenseDto  = { date: string; amount: number; article: string }
type LedgerEntryDraft  = Omit<LedgerEntry, 'id' | 'createdAt'>
type LedgerEntry       = Readonly<{ id: string; occurredAt: string; amount: number; /* ... */ }>
type ExpenseReportRow  = { article: string; amount: number; entryIds: string[] }`}
      />
    </div>
  )
}
