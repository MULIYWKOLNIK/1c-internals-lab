import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Network, Target, Split } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { Flow, type FlowNode } from '@/components/viz/Flow'
import { LmsBridge } from '@/components/LmsBridge'
import { CausalChain } from '@/components/CausalChain'
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
import { resolveExpenseAccount } from '@/engine/posting'
import { ACCOUNT_BY_CODE, SUBCONTO_BY_KEY } from '@/engine/chartOfAccounts'

/* --------------------- життєвий цикл витрати ---------------------- */

const LIFECYCLE: FlowNode[] = [
  {
    id: 'action',
    title: 'Дія користувача',
    caption: 'людина щось робить',
    tone: 'cyan',
    simple: 'Бухгалтер отримує акт від орендодавця і вирішує внести його в систему.',
    technical:
      'Поки що нічого не відбулося. Є лише намір і первинний документ на папері чи в пошті. У базі — жодних змін.',
    example: 'На столі акт: «Оренда офісу за вересень 2026 — 30 000 грн + ПДВ 6 000 грн».',
  },
  {
    id: 'doc',
    title: 'Документ',
    caption: 'подія стала даними',
    tone: 'accent',
    simple: 'Створено «Надходження послуг»: контрагент, договір, сума, стаття витрат, підрозділ.',
    technical:
      'Об’єкт документа записано в базу. Проведен = Ложь. Жодного запису в жодному регістрі. Для будь-якого звіту цієї витрати НЕ ІСНУЄ.',
    example: 'ПНП-000001 від 01.09.2026, стаття «Оренда», підрозділ «Адміністрація».',
    inside: `Документ.НадходженняПослуг
├── Дата         = 01.09.2026
├── Контрагент   = ТОВ «Бізнес-Центр Софія»
├── Договір      = Договір оренди №14
└── Послуги
    └── [0] Найменування  = Оренда офісу, вересень
            Сума          = 30 000
            СтаттяВитрат  = Оренда
            Підрозділ     = Адміністрація
            СумаПДВ       = 6 000`,
    insideCaption: 'Дані документа',
  },
  {
    id: 'posting',
    title: 'Проведення',
    caption: 'запуск перетворення',
    tone: 'violet',
    simple: 'Натиснули «Провести». Система починає перетворювати документ на записи обліку.',
    technical:
      'Відкривається транзакція, викликається ОбработкаПроведения(). Перше, що робить процедура — очищає власні попередні рухи, щоб перепроведення не дублювало записи.',
    example: 'Запуск СформироватьДвиженияПоУслугам() для ПНП-000001.',
    inside: `Процедура ОбработкаПроведения(Отказ, Режим)
    Движения.Очистить();
    ПроверитьЗаполнение(Отказ);
    Если Отказ Тогда Возврат; КонецЕсли;
    СформироватьДвиженияПоУслугам();
КонецПроцедуры`,
  },
  {
    id: 'algorithm',
    title: 'Алгоритм проведення',
    caption: 'код конфігурації',
    tone: 'violet',
    simple: 'Система йде по рядках табличної частини і для кожного вирішує, які записи створити.',
    technical:
      'Це найважливіший етап для розуміння: тут немає «магії 1С». Є конкретний код конкретної конфігурації. Дві різні конфігурації з тих самих даних зроблять різні проводки.',
    example: 'Один рядок «Оренда офісу» → бухгалтерська проводка + запис ПДВ + управлінський запис + борг.',
  },
  {
    id: 'accounts',
    title: 'Визначення рахунків',
    caption: 'який вид витрати',
    tone: 'warn',
    simple: 'Система вирішує: це адміністративна витрата (92) чи збутова (93)?',
    technical:
      'Правило залежить від конфігурації. Найчастіше — від виду підрозділу, від налаштувань статті витрат або від рахунків обліку номенклатури. Рахунок відповідає на питання «у який РЯДОК ЗВІТНОСТІ це піде».',
    example: 'Підрозділ «Адміністрація» + стаття «Оренда» → рахунок 92. Кредит — 631 (борг постачальнику).',
    inside: `Функция ПолучитьСчетЗатрат(Стаття, Підрозділ)
    Если Підрозділ.ВидДіяльності = "Збут" Тогда
        Возврат Счет93;   // Витрати на збут
    КонецЕсли;
    Если Стаття.ВидВитрат = "Виробничі" Тогда
        Возврат Счет23;   // Виробництво (ще НЕ витрата періоду!)
    КонецЕсли;
    Возврат Счет92;       // Адміністративні витрати
КонецФункции`,
  },
  {
    id: 'analytics',
    title: 'Визначення аналітики',
    caption: 'що саме і для кого',
    tone: 'warn',
    simple: 'Підставляються стаття витрат, підрозділ, контрагент, договір.',
    technical:
      'Рахунок задає, ЯКІ види субконто дозволені. Документ підставляє КОНКРЕТНІ значення. Якщо тут щось залишиться порожнім — документ усе одно проведеться, але у звіті з відбором сума «зникне».',
    example: 'СубконтоДт = {Оренда, Адміністрація}; СубконтоКт = {Бізнес-Центр, Договір №14}.',
    inside: `Д.СубконтоДт[ВидыСубконто.СтатьиЗатрат]  = Строка.СтаттяВитрат;
Д.СубконтоДт[ВидыСубконто.Подразделения] = Строка.Підрозділ;
Д.СубконтоКт[ВидыСубконто.Контрагенты]   = Шапка.Контрагент;
Д.СубконтоКт[ВидыСубконто.Договоры]      = Шапка.Договір;`,
  },
  {
    id: 'movements',
    title: 'Формування рухів',
    caption: 'записи в пам’яті',
    tone: 'violet',
    simple: 'Створюються чотири окремі записи — по одному на кожну облікову задачу.',
    technical:
      'Вони існують лише в пам’яті процесу. Їх ще можна змінити або скасувати. Якщо зараз станеться помилка — не збережеться жоден.',
    example:
      'Рух 1: Дт 92/Кт 631 — 30 000. Рух 2: Дт 6442/Кт 631 — 6 000. Рух 3: витрати за статтею — 30 000. Рух 4: борг — 36 000.',
  },
  {
    id: 'write',
    title: 'Запис у регістри',
    caption: 'COMMIT',
    tone: 'ok',
    simple: 'Рухи збережено. Витрата тепер існує в обліку.',
    technical:
      'Транзакція зафіксована. Записи бачать усі користувачі; вони впливають на баланс і на проведення інших документів. Змінити їх можна лише перепроведенням або новим документом.',
    example: 'Регістр бухгалтерії: +2 записи. Регістр витрат: +1. Регістр ПДВ: +1. Взаєморозрахунки: +1.',
  },
  {
    id: 'turnover',
    title: 'Обороти / залишки',
    caption: 'агрегати',
    tone: 'ok',
    simple: 'Система вміє порахувати, скільки всього пройшло по рахунку 92 за вересень.',
    technical:
      'Оборот Дт 92 = SUM(Сума) по всіх записах з дебетом 92 у межах періоду. Це обчислення, а не збережене поле. Сальдо у витратних рахунків на кінець періоду немає — вони закриваються на 791.',
    example: 'Оборот Дт 92 за вересень = 30 000 + 40 000 + 8 800 + … = 78 800.',
  },
  {
    id: 'expense',
    title: 'Витрата',
    caption: 'інтерпретація даних',
    tone: 'warn',
    simple: 'Ось тільки тут з’являється поняття «витрата» у звичному сенсі.',
    technical:
      'Витрата = дебетовий оборот витратних рахунків за період у заданому розрізі. Це НЕ об’єкт бази даних. Немає таблиці «Витрати». Є записи і правило їх інтерпретації — тому цифра залежить від періоду, відборів і джерела.',
    example: 'Витрати вересня за статтею «Оренда» = 30 000 грн.',
    inside: `// «Витрата» — це формула, а не таблиця:
Витрати(період, розріз) =
    SUM(Сума)
    WHERE РахунокДт IN (92, 93, 902, 23*)
      AND Період BETWEEN період.від AND період.до
      AND (розріз збігається)

// * 23 стає витратою лише після закриття на 90`,
    insideCaption: 'Визначення витрати',
  },
  {
    id: 'report',
    title: 'Звіт',
    caption: 'те, що бачить людина',
    tone: 'accent',
    simple: 'Звіт «Витрати за статтями» за вересень показує рядок «Оренда — 30 000,00».',
    technical:
      'Звіт виконує запит, групує за статтею і виводить результат. Він не зберігає нічого. Подвійний клік по комірці повертає до реєстратора — і ланцюг замикається назад до документа.',
    example: 'Оренда — 30 000,00 грн · розшифровка: ПНП-000001 від 01.09.2026.',
  },
]

/* ------------------------ розділення понять ----------------------- */

const CONCEPTS = [
  {
    id: 'doc',
    term: 'Документ',
    is: 'Джерело події',
    isNot: 'Не витрата',
    body: 'Форма з даними: хто, коли, скільки, за що. Може існувати непроведеним скільки завгодно довго і не впливати на облік. Може бути видалений.',
    tone: 'accent',
  },
  {
    id: 'operation',
    term: 'Господарська операція',
    is: 'Факт реального світу',
    isNot: 'Не об’єкт бази',
    body: 'Те, що сталося насправді: приміщення використовувалось, послуга спожита. У базі даних немає сутності «операція» — є документ, що її фіксує, і записи, що її відображають.',
    tone: 'cyan',
  },
  {
    id: 'entry',
    term: 'Бухгалтерський запис',
    is: 'Відображення операції',
    isNot: 'Не сама витрата',
    body: 'Рядок Дт 92 / Кт 631 з аналітикою. Один із кількох рухів, які створює документ. Витратою його робить не форма запису, а те, що в дебеті стоїть витратний рахунок.',
    tone: 'violet',
  },
  {
    id: 'movement',
    term: 'Рух регістра',
    is: 'Будь-який запис документа',
    isNot: 'Не обов’язково проводка',
    body: 'Загальніше поняття. Рух регістра накопичення має вимірювання й ресурси і про дебет/кредит нічого не знає. Проводка — лише один із видів руху.',
    tone: 'violet',
  },
  {
    id: 'turnover',
    term: 'Оборот',
    is: 'Сума за період',
    isNot: 'Не збережене число',
    body: 'Результат SUM() над записами у межах періоду. Обчислюється щоразу заново. Саме оборот по дебету витратних рахунків і є витратами періоду.',
    tone: 'ok',
  },
  {
    id: 'balance',
    term: 'Залишок',
    is: 'Стан на момент',
    isNot: 'Не для витрат',
    body: 'Накопичений підсумок. У витратних рахунків залишку на кінець періоду немає — вони закриваються на фінансовий результат. Якщо бачите сальдо на 92 — місяць не закритий.',
    tone: 'ok',
  },
  {
    id: 'expense',
    term: 'Витрата',
    is: 'Інтерпретація записів',
    isNot: 'Не таблиця і не поле',
    body: 'Зменшення економічної вигоди періоду. Технічно — дебетовий оборот витратних рахунків у заданому розрізі. Змініть період або відбір — зміниться й цифра.',
    tone: 'warn',
  },
  {
    id: 'analytics',
    term: 'Аналітика',
    is: 'Розрізи всередині рахунку',
    isNot: 'Не рахунок',
    body: 'Стаття витрат, підрозділ, контрагент. Дозволяє деталізувати один рахунок як завгодно глибоко, не створюючи нових рахунків.',
    tone: 'warn',
  },
  {
    id: 'report',
    term: 'Звіт',
    is: 'Обчислення на вимогу',
    isNot: 'Не сховище',
    body: 'Запит + групування + оформлення. Не зберігає жодної цифри. Тому «звіт показує неправильно» майже завжди означає «дані або відбори не такі, як ви очікуєте».',
    tone: 'accent',
  },
]

const CONCEPT_BORDER: Record<string, string> = {
  accent: 'border-accent/30',
  cyan: 'border-cyan/30',
  violet: 'border-violet/30',
  ok: 'border-ok/30',
  warn: 'border-warn/30',
}

/* ---------------- інтерактив: визначення рахунку ------------------ */

const ARTICLES = ['Оренда', 'Реклама', 'Оплата праці', 'Комунальні', 'Собівартість продажів']
const DEPTS = ['Адміністрація', 'Відділ продажів', 'Склад']

export default function Expenses() {
  const [article, setArticle] = useState('Оренда')
  const [dept, setDept] = useState('Адміністрація')
  const decision = resolveExpenseAccount(article, dept)
  const account = ACCOUNT_BY_CODE[decision.account]

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="expenses"
        lead="Ключовий розділ проєкту. Тут ми не пояснюємо «витрати — це рахунки 92 і 93». Ми простежуємо повний життєвий цикл витрати: від дії людини до комірки у звіті, з розбором того, що саме відбувається на кожному етапі."
      />

      <Callout kind="key" title="Головна теза розділу">
        <strong>Документ ≠ витрата.</strong> Документ — джерело події. Під час проведення він формує
        рухи. Рухи лягають у регістри. А «витрата» — це вже <em>інтерпретація</em> цих записів:
        дебетовий оборот витратних рахунків за період у потрібному розрізі. У базі немає таблиці
        «Витрати». Є записи і формула.
      </Callout>

      <Flow
        nodes={LIFECYCLE}
        title="Життєвий цикл витрати: 11 етапів"
        subtitle="Кожен етап клікабельний. «Показати, що всередині» відкриває структуру даних або код."
        autoplayLabel="Програти життєвий цикл"
      />

      <Section eyebrow="термінологія" title="Дев'ять понять, які плутають між собою">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CONCEPTS.map((c) => (
            <Card key={c.id} className={CONCEPT_BORDER[c.tone]}>
              <div className="px-3.5 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13.5px] font-semibold">{c.term}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <Badge tone="ok">{c.is}</Badge>
                  <Badge tone="danger">{c.isNot}</Badge>
                </div>
                <p className="mt-2 text-[12.5px] leading-6 text-muted">{c.body}</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Card>
        <CardHeader
          icon={<Target size={16} />}
          title="Інтерактив: як система обирає рахунок витрат"
          subtitle="Змініть статтю або підрозділ — і подивіться, як змінюється рішення алгоритму"
        />
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <div>
            <div className="mb-1.5 text-[11px] uppercase tracking-wide text-faint">
              вхідні дані з документа
            </div>
            <div className="mb-3">
              <div className="mb-1 text-[12px] text-muted">Стаття витрат</div>
              <div className="flex flex-wrap gap-1.5">
                {ARTICLES.map((a) => (
                  <button
                    key={a}
                    onClick={() => setArticle(a)}
                    className={cn(
                      'focus-ring rounded-lg border px-2.5 py-1 text-[12px] transition',
                      article === a
                        ? 'border-accent/55 bg-accent/[0.1] text-accent'
                        : 'border-line bg-elevated text-muted hover:text-fg',
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[12px] text-muted">Підрозділ</div>
              <div className="flex flex-wrap gap-1.5">
                {DEPTS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDept(d)}
                    className={cn(
                      'focus-ring rounded-lg border px-2.5 py-1 text-[12px] transition',
                      dept === d
                        ? 'border-accent/55 bg-accent/[0.1] text-accent'
                        : 'border-line bg-elevated text-muted hover:text-fg',
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="animate-fade-up" key={decision.account}>
            <div className="mb-1.5 text-[11px] uppercase tracking-wide text-faint">
              рішення алгоритму
            </div>
            <div className="rounded-lg border border-accent/45 bg-accent/[0.08] px-3.5 py-3">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[24px] font-bold text-accent">
                  Дт {decision.account}
                </span>
                <span className="text-[13px] text-muted">{account?.title}</span>
              </div>
              <CodeBlock className="mt-2" caption="Спрацювало правило" code={decision.rule} />
              <p className="mt-2 text-[13px] leading-6 text-fg/85">{decision.reason}</p>
            </div>
            <div className="mt-2 rounded-lg border border-line bg-elevated px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-faint">у звітності це</div>
              <p className="mt-0.5 text-[13px] leading-6">{account?.reportUsage}</p>
            </div>
          </div>
        </div>
      </Card>

      <Section eyebrow="критична відмінність" title="Рахунок vs Аналітика">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader icon={<Network size={16} />} title="Рахунок 92" subtitle="один рахунок — багато розрізів" />
            <div className="p-4">
              <div className="relative pl-5">
                <div className="absolute bottom-4 left-1.5 top-2 w-px bg-accent/40" />
                <div className="mb-2 font-mono text-[14px] font-semibold text-accent">
                  Рахунок 92 «Адміністративні витрати»
                </div>
                {['costArticle', 'department'].map((k) => {
                  const s = SUBCONTO_BY_KEY[k]
                  return (
                    <div key={k} className="relative mb-1.5">
                      <div className="absolute -left-3.5 top-3.5 h-px w-3.5 bg-accent/40" />
                      <div className="rounded-lg border border-line bg-elevated px-3 py-2">
                        <div className="text-[12.5px] font-medium">{s.title}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(k === 'costArticle'
                            ? ['Оренда', 'Аудит', 'Зв’язок', 'Оплата праці', 'Комунальні']
                            : ['Адміністрація', 'Бухгалтерія', 'IT']
                          ).map((v) => (
                            <Badge key={v} tone="neutral">
                              {v}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader icon={<Split size={16} />} title="Хто на яке питання відповідає" />
            <div className="p-4">
              <Table>
                <thead>
                  <tr>
                    <Th />
                    <Th>Рахунок</Th>
                    <Th>Аналітика</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <Td className="text-muted">Питання</Td>
                    <Td>Якого це виду?</Td>
                    <Td>Що саме / для кого?</Td>
                  </tr>
                  <tr>
                    <Td className="text-muted">Приклад значення</Td>
                    <Td mono>92</Td>
                    <Td>Оренда · Адміністрація</Td>
                  </tr>
                  <tr>
                    <Td className="text-muted">Кількість варіантів</Td>
                    <Td>десятки (план рахунків)</Td>
                    <Td>сотні (довідники)</Td>
                  </tr>
                  <tr>
                    <Td className="text-muted">Хто визначає</Td>
                    <Td>алгоритм проведення</Td>
                    <Td>дані документа</Td>
                  </tr>
                  <tr>
                    <Td className="text-muted">Впливає на</Td>
                    <Td>рядок фінзвітності</Td>
                    <Td>деталізацію всередині рядка</Td>
                  </tr>
                  <tr>
                    <Td className="text-muted">Якщо помилитись</Td>
                    <Td className="text-danger">сума в іншому рядку звіту</Td>
                    <Td className="text-warn">сума в рядку «(не вказано)»</Td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </Card>
        </div>
      </Section>

      <Collapse
        title="Три речі, які часто вважають витратами, хоча вони ними не є"
        tone="accent"
        defaultOpen
      >
        <div className="grid gap-2.5">
          <div className="rounded-lg border border-line bg-elevated px-3 py-2">
            <div className="text-[13px] font-medium">1. Оплата постачальнику</div>
            <p className="mt-0.5 text-[13px] leading-6 text-muted">
              <code>Дт 631 / Кт 311</code> — гроші пішли, але витрата вже була визнана раніше, у
              момент отримання послуги. Тут лише гаситься борг. Змінюється форма активів, а не
              фінансовий результат.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-elevated px-3 py-2">
            <div className="text-[13px] font-medium">2. Придбання товару чи основного засобу</div>
            <p className="mt-0.5 text-[13px] leading-6 text-muted">
              <code>Дт 281 / Кт 631</code> — виник актив. Витратою це стане пізніше: товар — через
              собівартість при продажу (902), основний засіб — поступово через амортизацію.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-elevated px-3 py-2">
            <div className="text-[13px] font-medium">3. ПДВ у вхідній накладній</div>
            <p className="mt-0.5 text-[13px] leading-6 text-muted">
              <code>Дт 6442 / Кт 631</code> — це розрахунки з бюджетом. Для платника ПДВ він не
              збільшує витрати: у звіті буде 30 000, а не 36 000.
            </p>
          </div>
        </div>
      </Collapse>

      <CausalChain
        values={[
          'спожили оренду',
          'ПНП-000001',
          'Провести',
          'СчетЗатрат = 92',
          'Дт 92 / Кт 631',
          'Госпрозрахунковий',
          '30 000 записано',
          'Обороти(09.2026)',
          'GROUP BY стаття',
          'Оренда — 30 000',
        ]}
        subtitle="Життєвий цикл витрати у наскрізній моделі проєкту"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/expense-cases" className="focus-ring">
          <Card className="h-full transition hover:border-accent/50">
            <div className="p-4">
              <div className="flex items-center gap-1.5 text-[14px] font-semibold">
                Витрати: п’ять сценаріїв <ArrowRight size={13} />
              </div>
              <p className="mt-1 text-[13px] leading-6 text-muted">
                Оренда, зарплата, реклама, придбання товару (яке не є витратою) і коригування — з
                робочим симулятором проведення.
              </p>
            </div>
          </Card>
        </Link>
        <Link to="/register-to-report" className="focus-ring">
          <Card className="h-full transition hover:border-accent/50">
            <div className="p-4">
              <div className="flex items-center gap-1.5 text-[14px] font-semibold">
                Як звіт знаходить витрату <ArrowRight size={13} />
              </div>
              <p className="mt-1 text-[13px] leading-6 text-muted">
                Запит, агрегація, розшифровка до документа — і чому дві різні цифри витрат можуть
                бути обидві правильними.
              </p>
            </div>
          </Card>
        </Link>
      </div>

      <LmsBridge
        summary="Головне, що варто перенести: не створюйте сутність «Витрата». Створіть незмінний запис із розрізами і функцію, яка інтерпретує ці записи як витрати. Тоді ви зможете додавати нові види витрат, не змінюючи модель даних, і завжди зможете пояснити будь-яку цифру у звіті."
        rows={[
          { onec: 'Документ', lms: 'ExpenseDocument', note: 'Зберігає намір. Має статус posted.' },
          { onec: 'Проведення', lms: 'postExpense(doc)', note: 'Єдина точка перетворення на записи.' },
          { onec: 'Рахунок витрат', lms: 'expenseAccount / category', note: 'Визначається правилом, а не вводиться вручну.' },
          { onec: 'Стаття витрат', lms: 'costArticleId', note: 'FK на довідник. Головне поле групування у звіті.' },
          { onec: 'Оборот по 92', lms: 'getExpenses(period, filters)', note: 'SUM над записами, а не колонка.' },
        ]}
        code={`const EXPENSE_ACCOUNTS = ['92', '93', '902', '23'] as const

export async function getExpenses(period: Period, filters: Filters = {}) {
  return db
    .select({
      costArticle: ledger.costArticleId,
      department:  ledger.departmentId,
      amount:      sum(ledger.amount),
    })
    .from(ledger)
    .where(and(
      between(ledger.occurredAt, period.from, period.to),
      inArray(ledger.debitAccount, EXPENSE_ACCOUNTS),
      filters.costArticle ? eq(ledger.costArticleId, filters.costArticle) : undefined,
    ))
    .groupBy(ledger.costArticleId, ledger.departmentId)
}

// зверніть увагу: НЕМАЄ таблиці expenses.
// Є ledger і функція, яка знає, що вважати витратою.`}
        codeCaption="Витрата як функція, а не як таблиця"
      />

      <div className="flex justify-center">
        <Link to="/expense-cases">
          <Button variant="primary">
            Перейти до сценаріїв <ArrowRight size={14} />
          </Button>
        </Link>
      </div>
    </div>
  )
}
