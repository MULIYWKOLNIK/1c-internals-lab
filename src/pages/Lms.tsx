import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeftRight, GraduationCap, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
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
} from '@/components/ui'

const MAPPING = [
  { onec: 'Документ', lms: 'Event', generic: 'Command / Request', note: 'Зафіксований намір або факт. Ще не впливає на підсумки.' },
  { onec: 'Проведення', lms: 'Transaction', generic: 'post() / commit()', note: 'Єдине місце перетворення події на записи.' },
  { onec: 'Рух', lms: 'Entry', generic: 'Row', note: 'Один атомарний запис у певному ledger.' },
  { onec: 'Регістр', lms: 'Ledger', generic: 'Append-only table', note: 'Сховище записів із фіксованою структурою.' },
  { onec: 'Вимірювання', lms: 'Dimension', generic: 'GROUP BY column', note: 'Розріз, у якому можна дивитись підсумки.' },
  { onec: 'Ресурс', lms: 'Measure', generic: 'SUM() column', note: 'Число, яке підсумовується.' },
  { onec: 'Реєстратор', lms: 'sourceId', generic: 'FK to source', note: 'Зв’язок запису з подією, що його породила.' },
  { onec: 'Період', lms: 'occurredAt', generic: 'effective date', note: 'НЕ createdAt: звіт фільтрує саме за датою події.' },
  { onec: 'Оборот', lms: 'Turnover', generic: 'SUM за період', note: 'Обчислення, а не збережене поле.' },
  { onec: 'Залишок', lms: 'Balance', generic: 'running total', note: 'Теж обчислення. Ніколи не колонка, яку оновлюють.' },
  { onec: 'Звіт', lms: 'Report', generic: 'Projection / Query', note: 'Функція над записами без власного стану.' },
  { onec: 'Сторно', lms: 'Reversal', generic: 'compensating entry', note: 'Новий запис із мінусом, а не DELETE.' },
]

const LMS_CASES = [
  {
    id: 'points',
    title: 'Бали та досягнення',
    onecAnalog: 'Регістр накопичення (залишки)',
    event: 'Студент здав завдання',
    entries: '+50 балів {студент, курс, модуль}',
    report: 'Рейтинг студентів, прогрес по курсу',
    trap:
      'Спокуса зберігати users.points і робити UPDATE. Тоді ви ніколи не відповісте на питання «звідки у нього 340 балів» і не зможете скасувати нарахування.',
    code: `// ПОГАНО
await db.update(users).set({ points: sql\`points + 50\` }).where(eq(users.id, id))

// ДОБРЕ
await db.insert(pointsLedger).values({
  occurredAt: now, sourceType: 'SUBMISSION', sourceId: submission.id,
  studentId: id, courseId, moduleId, amount: 50, reason: 'Завдання зараховано',
})
// баланс = SELECT SUM(amount) ... GROUP BY student_id`,
  },
  {
    id: 'seats',
    title: 'Місця у групі',
    onecAnalog: 'Регістр накопичення (залишки) + контроль',
    event: 'Студент записався / відрахувався',
    entries: '−1 місце {група} / +1 місце {група}',
    report: 'Скільки вільних місць у кожній групі',
    trap:
      'Гонка при одночасному записі двох студентів на останнє місце. Потрібне блокування — прямий аналог оперативного проведення в 1С.',
    code: `await db.transaction(async tx => {
  const [g] = await tx.select().from(groups)
    .where(eq(groups.id, groupId)).for('update')      // ← блокування рядка

  const taken = await tx.select({ n: count() }).from(seatLedger)
    .where(and(eq(seatLedger.groupId, groupId), eq(seatLedger.direction, -1)))

  if (taken.n >= g.capacity) throw new NoSeatsLeft()

  await tx.insert(seatLedger).values({ groupId, studentId, direction: -1, sourceId: enrollment.id })
})`,
  },
  {
    id: 'progress',
    title: 'Прогрес по курсу',
    onecAnalog: 'Регістр відомостей (зріз останніх)',
    event: 'Студент відкрив урок / завершив урок',
    entries: 'стан {студент, урок} = COMPLETED, effectiveFrom = дата',
    report: 'Який статус був у студента на будь-яку дату',
    trap:
      'Зберігати лише поточний статус. Тоді неможливо побудувати звіт «скільки студентів завершили модуль станом на кінець вересня» — а це саме те, що просить керівництво.',
    code: `// регістр відомостей: історія станів
create table lesson_progress_history (
  student_id uuid, lesson_id uuid,
  effective_from timestamptz,
  status text,
  primary key (student_id, lesson_id, effective_from)
);

// «зріз останніх» на дату
select distinct on (student_id, lesson_id) *
from lesson_progress_history
where effective_from <= :on_date
order by student_id, lesson_id, effective_from desc`,
  },
  {
    id: 'money',
    title: 'Оплати і заборгованість',
    onecAnalog: 'Регістр бухгалтерії (подвійний запис)',
    event: 'Виставили рахунок / надійшла оплата',
    entries: 'Дт «Дебіторка» / Кт «Дохід»; потім Дт «Каса» / Кт «Дебіторка»',
    report: 'Хто скільки винен, скільки зароблено за період',
    trap:
      'Саме тут односторонніх записів уже мало. Подвійний запис робить неможливим стан «оплата є, а рахунку немає» — а такі розходження в платіжних даних коштують дорого.',
    code: `// рахунок виставлено
entry({ debit: 'AR', credit: 'REVENUE', amount: 3000, studentId, courseId })

// оплата надійшла
entry({ debit: 'CASH', credit: 'AR', amount: 3000, studentId, paymentId })

// заборгованість = SUM(debit=AR) − SUM(credit=AR)
// дохід періоду  = SUM(credit=REVENUE) за період
// обидва числа завжди узгоджені за побудовою`,
  },
]

const PRINCIPLES = [
  {
    take: true,
    title: 'Подія ≠ запис ≠ звіт',
    body: 'Три різні типи для трьох різних станів. Якщо у вас один тип обслуговує форму введення, зберігання й звіт — рано чи пізно хтось відредагує історію через форму.',
  },
  {
    take: true,
    title: 'Append-only записи',
    body: 'Виправлення — новий запис із компенсацією. Це дає аудит, відтворюваність звітів і безпечну паралельну роботу. Заборонити UPDATE/DELETE варто на рівні прав БД.',
  },
  {
    take: true,
    title: 'Кожен запис знає джерело',
    body: 'sourceType + sourceId. Без цього неможливі ні розшифровка звіту, ні безпечне перепроведення, ні розслідування «звідки взялась ця цифра».',
  },
  {
    take: true,
    title: 'Підсумки обчислюються',
    body: 'Баланс, оборот, залишок — завжди функція від записів. Кеш можна додати пізніше, але він має повністю перебудовуватись із ledger однією командою.',
  },
  {
    take: true,
    title: 'Проведення — єдина точка запису',
    body: 'Жоден інший код не має права писати в ledger. Щойно з’явиться другий шлях — узгодженість зникне.',
  },
  {
    take: true,
    title: 'Дата події, а не дата створення',
    body: 'occurredAt і createdAt — різні поля з різним змістом. Звіти фільтрують за першим, аудит дивиться на друге.',
  },
  {
    take: false,
    title: 'Метадані та власний «конфігуратор»',
    body: 'Спокуса зробити «щоб користувач сам створював регістри». Це побудова платформи всередині продукту — величезна складність, яка майже ніколи не окупається.',
  },
  {
    take: false,
    title: 'Повний план рахунків',
    body: 'Якщо у вас немає бухгалтерської звітності, коди 92/631 нічого не додають. Достатньо kind: EXPENSE | ASSET | INCOME.',
  },
  {
    take: false,
    title: 'Обов’язковий подвійний запис усюди',
    body: 'Для нарахування балів він надлишковий. Вводьте його там, де є взаємні зобов’язання: гроші, борги, взаєморозрахунки.',
  },
  {
    take: false,
    title: 'Таблиці підсумків із самого початку',
    body: 'Передчасна оптимізація. До сотень тисяч записів звичайний GROUP BY з індексом працює чудово, а підсумки додають цілий клас багів розсинхронізації.',
  },
]

export default function Lms() {
  const [openCase, setOpenCase] = useState('points')
  const c = LMS_CASES.find((x) => x.id === openCase)!

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="lms"
        lead="Цінність 1С — не в назвах «регістр» і «субконто», а в архітектурному принципі: незмінні атомарні записи з розрізами плюс обчислювані підсумки. Цей принцип переноситься у будь-яку систему, де треба рахувати щось, що змінюється з часом."
      />

      <Callout kind="key" title="Головне, що варто зрозуміти перед перенесенням">
        Не намагайтесь скопіювати 1С. Скопіюйте <strong>чотири правила</strong>: (1) подія і запис —
        різні сутності; (2) записи не змінюються; (3) кожен запис знає своє джерело; (4) підсумки
        обчислюються, а не зберігаються. Усе інше — деталі, які можна вирішувати як завгодно.
      </Callout>

      <Card>
        <CardHeader
          icon={<ArrowLeftRight size={16} />}
          title="Словник відповідностей"
          subtitle="Ті самі поняття трьома мовами"
        />
        <div className="p-4">
          <Table>
            <thead>
              <tr>
                <Th>1С / BAS</Th>
                <Th>LMS</Th>
                <Th>Загальна назва</Th>
                <Th>Суть</Th>
              </tr>
            </thead>
            <tbody>
              {MAPPING.map((m) => (
                <tr key={m.onec}>
                  <Td className="font-medium">{m.onec}</Td>
                  <Td mono className="text-violet">{m.lms}</Td>
                  <Td mono className="text-[11.5px] text-muted">{m.generic}</Td>
                  <Td className="max-w-[420px] text-[12px] text-muted">{m.note}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="mt-3 text-[13px] leading-6 text-muted">
            Назви не мають значення. Має значення те, що кожне поняття зліва має відповідник справа —
            якщо якогось немає, у вашій архітектурі дірка.
          </p>
        </div>
      </Card>

      <Section eyebrow="практика" title="Чотири задачі LMS і які механізми їм відповідають">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {LMS_CASES.map((x) => (
            <button
              key={x.id}
              onClick={() => setOpenCase(x.id)}
              className={cn(
                'focus-ring rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition',
                openCase === x.id
                  ? 'border-accent/55 bg-accent/[0.1] text-accent'
                  : 'border-line bg-elevated text-muted hover:text-fg',
              )}
            >
              {x.title}
            </button>
          ))}
        </div>

        <Card className="animate-fade-up" key={c.id}>
          <CardHeader
            icon={<GraduationCap size={16} />}
            title={c.title}
            subtitle={`Аналог у 1С: ${c.onecAnalog}`}
          />
          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,320px)_1fr]">
            <div className="grid gap-2">
              <Box label="Подія" value={c.event} tone="accent" />
              <Box label="Записи" value={c.entries} tone="violet" />
              <Box label="Звіт" value={c.report} tone="ok" />
              <div className="rounded-lg border border-warn/40 bg-warn/[0.07] px-3 py-2">
                <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-warn">
                  де зазвичай помиляються
                </div>
                <p className="text-[12.5px] leading-6">{c.trap}</p>
              </div>
            </div>
            <CodeBlock lang="ts" caption="Як це виглядає в коді" code={c.code} />
          </div>
        </Card>
      </Section>

      <Section eyebrow="фільтр рішень" title="Що брати, а що ні">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid gap-2">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-ok">
              <CheckCircle2 size={14} /> варто перенести
            </div>
            {PRINCIPLES.filter((p) => p.take).map((p) => (
              <div key={p.title} className="rounded-lg border border-ok/35 bg-ok/[0.05] px-3 py-2">
                <div className="text-[13px] font-medium">{p.title}</div>
                <p className="mt-0.5 text-[12.5px] leading-6 text-muted">{p.body}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-2">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-danger">
              <XCircle size={14} /> краще не переносити
            </div>
            {PRINCIPLES.filter((p) => !p.take).map((p) => (
              <div
                key={p.title}
                className="rounded-lg border border-danger/30 bg-danger/[0.05] px-3 py-2"
              >
                <div className="text-[13px] font-medium">{p.title}</div>
                <p className="mt-0.5 text-[12.5px] leading-6 text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Collapse title="Покроковий план: як додати ledger у наявний проєкт" tone="accent" defaultOpen>
        <ol className="grid list-decimal gap-2 pl-5 text-[13.5px] leading-7">
          <li>
            <strong>Оберіть ОДНУ величину</strong>, яку зараз рахуєте полем із UPDATE (бали,
            залишок, борг). Не намагайтесь переписати все одразу.
          </li>
          <li>
            <strong>Опишіть події</strong>, які цю величину змінюють. Їх зазвичай 3–7. Кожна стане
            sourceType.
          </li>
          <li>
            <strong>Створіть таблицю ledger</strong> з полями occurred_at, source_type, source_id,
            amount і розрізами. Індекси — на дату і на (source_type, source_id).
          </li>
          <li>
            <strong>Напишіть buildEntries()</strong> як чисту функцію без доступу до БД, і
            post() як єдину транзакційну обгортку навколо неї.
          </li>
          <li>
            <strong>Замініть читання поля</strong> на виклик balanceAt(). Спочатку — паралельно зі
            старим полем, звіряючи результати.
          </li>
          <li>
            <strong>Заповніть історію</strong> одним записом «початковий залишок» на дату міграції
            для кожної сутності.
          </li>
          <li>
            <strong>Приберіть старе поле</strong> і заберіть права на UPDATE/DELETE для таблиці
            ledger.
          </li>
          <li>
            <strong>Додайте тести</strong> з розділу «Архітектура Ledger»: ідемпотентність,
            фільтрація за періодом, сторно.
          </li>
        </ol>
      </Collapse>

      <Card>
        <CardHeader title="Дві архітектури поруч" subtitle="той самий функціонал, різна ціна помилки" />
        <div className="grid gap-3 p-4 md:grid-cols-2">
          <div>
            <Badge tone="danger" className="mb-2">Стан як поле</Badge>
            <CodeBlock
              lang="ts"
              caption="звично, але без історії"
              code={`// нарахувати бали
await db.update(users)
  .set({ points: sql\`points + 50\` })
  .where(eq(users.id, studentId))

// показати рейтинг
await db.select({ id: users.id, points: users.points })
  .from(users).orderBy(desc(users.points))

// ❌ звідки 340 балів — невідомо
// ❌ скасувати нарахування = вгадати суму
// ❌ «скільки було на 1 вересня» — неможливо
// ❌ два паралельні запити можуть загубити нарахування`}
            />
          </div>
          <div>
            <Badge tone="ok" className="mb-2">Стан як історія</Badge>
            <CodeBlock
              lang="ts"
              caption="трохи більше коду, значно більше можливостей"
              code={`// нарахувати бали
await db.insert(pointsLedger).values({
  occurredAt: now, sourceType: 'SUBMISSION', sourceId: sub.id,
  studentId, amount: 50, reason: 'Завдання зараховано',
})

// показати рейтинг
await db.select({ id: pointsLedger.studentId, points: sum(pointsLedger.amount) })
  .from(pointsLedger).groupBy(pointsLedger.studentId)

// ✅ повна розшифровка кожного бала
// ✅ скасування = запис із −50 і посиланням на оригінал
// ✅ стан на будь-яку дату: where occurred_at <= :date
// ✅ паралельні INSERT не конфліктують`}
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap justify-center gap-2">
        <Link to="/ledger">
          <Button variant="primary">
            Робоча модель Ledger <ArrowRight size={14} />
          </Button>
        </Link>
        <Link to="/diagnostics">
          <Button>Діагностика проблем</Button>
        </Link>
      </div>
    </div>
  )
}

function Box({ label, value, tone }: { label: string; value: string; tone: 'accent' | 'violet' | 'ok' }) {
  const cls = {
    accent: 'border-accent/40 bg-accent/[0.07] text-accent',
    violet: 'border-violet/40 bg-violet/[0.07] text-violet',
    ok: 'border-ok/40 bg-ok/[0.07] text-ok',
  }[tone]
  return (
    <div className={cn('rounded-lg border px-3 py-2', cls)}>
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider">{label}</div>
      <p className="text-[13px] leading-6 text-fg/90">{value}</p>
    </div>
  )
}
