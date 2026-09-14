import { useState } from 'react'
import { Layers, Server, Settings2, Database, Code2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { Callout, Card, CardHeader, CodeBlock, Collapse, Section, Table, Td, Th } from '@/components/ui'
import { LmsBridge } from '@/components/LmsBridge'

interface LayerDef {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  tone: string
  what: string
  owns: string[]
  notOwns: string[]
  code?: string
  mistake: string
}

const LAYERS: LayerDef[] = [
  {
    id: 'platform',
    title: 'Платформа',
    subtitle: '«1С:Підприємство» / BAS — рушій',
    icon: <Server size={16} />,
    tone: 'accent',
    what: 'Виконує прикладне рішення: надає типи об’єктів, механізм проведення, мову запитів, роботу з СУБД, транзакції, права, інтерфейс.',
    owns: [
      'Типи об’єктів: Документ, Довідник, Регістр, План рахунків',
      'Механізм проведення і транзакційність',
      'Мова запитів і віртуальні таблиці',
      'Відображення логічної моделі у фізичне зберігання',
      'Механізм блокувань і послідовностей',
    ],
    notOwns: [
      'Які саме документи існують у вашому обліку',
      'Який рахунок відповідає оренді',
      'Скільки рухів створює документ',
    ],
    mistake:
      'Казати «1С так робить» про правило, яке насправді прописане в конфігурації. Платформа не знає слова «оренда».',
  },
  {
    id: 'config',
    title: 'Конфігурація',
    subtitle: 'прикладне рішення: BAS Бухгалтерія, УТ, власна',
    icon: <Settings2 size={16} />,
    tone: 'violet',
    what: 'Описує ваш облік: які документи, які регістри, яка структура, які алгоритми проведення, які звіти.',
    owns: [
      'Склад метаданих: документи, регістри, їх вимірювання і ресурси',
      'План рахунків і види субконто',
      'Алгоритми проведення (модулі об’єктів)',
      'Звіти та їх схеми компонування',
    ],
    notOwns: ['Як фізично зберігаються дані', 'Як виконується транзакція'],
    code: `// Конфігурація визначає структуру:
РегистрНакопления.ВитратиЗаСтаттями
  Измерения: Організація, СтаттяВитрат, Підрозділ
  Ресурсы:   Сума

// і правила заповнення:
Функция ПолучитьСчетЗатрат(Стаття, Підрозділ)
    Если Підрозділ.Вид = "Збут" Тогда
        Возврат ПланыСчетов.Хозрасчетный.Счет93;
    КонецЕсли;
    Возврат ПланыСчетов.Хозрасчетный.Счет92;
КонецФункции`,
    mistake:
      'Очікувати, що дві конфігурації дадуть однакові проводки на однакових даних. Не дадуть — логіка тут різна.',
  },
  {
    id: 'docLogic',
    title: 'Логіка конкретного документа',
    subtitle: 'модуль об’єкта',
    icon: <Code2 size={16} />,
    tone: 'cyan',
    what: 'Найточніший рівень: що робить саме цей вид документа при проведенні саме в цій конфігурації.',
    owns: [
      'Які рухи створюються і в якому порядку',
      'Які перевірки виконуються перед записом',
      'Які дані читаються з інших регістрів (наприклад, собівартість)',
    ],
    notOwns: ['Структуру регістрів', 'Правила, спільні для всіх документів'],
    code: `Процедура ОбработкаПроведения(Отказ, Режим)
    Движения.Очистить();
    ПроверитьЗаполнение(Отказ);
    Если Отказ Тогда Возврат; КонецЕсли;

    Для Каждого Строка Из Услуги Цикл
        Д = Движения.Хозрасчетный.Добавить();
        Д.Период = Дата;
        Д.СчетДт = ПолучитьСчетЗатрат(Строка.Стаття, Строка.Підрозділ);
        Д.СчетКт = ПланыСчетов.Хозрасчетный.Счет631;
        Д.Сумма  = Строка.Сумма;
    КонецЦикла;
КонецПроцедуры`,
    mistake:
      'Шукати відповідь «чому така проводка» в довідниках і налаштуваннях, коли вона зашита в цьому модулі.',
  },
  {
    id: 'model',
    title: 'Концептуальна модель',
    subtitle: 'логічна структура даних',
    icon: <Layers size={16} />,
    tone: 'ok',
    what: 'Те, як дані виглядають з точки зору обліку: регістр має період, вимірювання, ресурси; запис бухгалтерії має Дт/Кт/субконто.',
    owns: [
      'Поняття вимірювання / ресурсу / реквізиту',
      'Віртуальні таблиці: Залишки, Обороти, ЗрізОстанніх',
      'Правила агрегації',
    ],
    notOwns: ['Кількість фізичних таблиць', 'Індекси, партиціонування, типи колонок'],
    mistake:
      'Ототожнювати цей рівень із наступним. «Регістр» — поняття моделі, а не назва таблиці в базі.',
  },
  {
    id: 'storage',
    title: 'Фізичне зберігання в СУБД',
    subtitle: 'PostgreSQL / MS SQL / файлова база',
    icon: <Database size={16} />,
    tone: 'warn',
    what: 'Як платформа насправді розкладає логічну структуру по таблицях, індексах і підсумках.',
    owns: [
      'Реальні таблиці, індекси, плани виконання',
      'Таблиці підсумків і послідовностей',
      'Блокування на рівні СУБД',
    ],
    notOwns: ['Бізнес-зміст даних', 'Гарантію стабільності схеми між версіями'],
    mistake:
      'Писати звіти напряму по таблицях СУБД в обхід платформи. Схема не документована як контракт і змінюється між версіями та режимами сумісності.',
  },
]

export default function Architecture() {
  const [active, setActive] = useState('platform')
  const l = LAYERS.find((x) => x.id === active)!

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="architecture"
        lead="Найчастіше джерело плутанини — змішування п'яти різних рівнів. Фраза «у 1С витрати працюють так» майже завжди стосується одного конкретного рівня, і без цього уточнення вона неправильна."
      />

      <Callout kind="warn" title="Правило, яке варто запам’ятати назавжди">
        Перш ніж відповідати на питання «чому так», з’ясуйте <strong>на якому рівні</strong> лежить
        відповідь. Механізм транзакції — платформа. Рахунок для оренди — конфігурація. Порядок
        рухів — модуль документа. Кількість таблиць — СУБД. Це чотири різні розмови.
      </Callout>

      <Card>
        <CardHeader
          icon={<Layers size={16} />}
          title="П’ять рівнів"
          subtitle="Натисніть на рівень, щоб побачити його зону відповідальності"
        />
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,260px)_1fr]">
          <div className="grid gap-1.5 self-start">
            {LAYERS.map((x, i) => (
              <button
                key={x.id}
                onClick={() => setActive(x.id)}
                className={cn(
                  'focus-ring flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition',
                  active === x.id
                    ? 'border-accent/55 bg-accent/[0.09]'
                    : 'border-line bg-surface hover:bg-elevated',
                )}
              >
                <span className="mt-0.5 text-accent">{x.icon}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium">{x.title}</span>
                  <span className="block text-[11px] leading-4 text-muted">{x.subtitle}</span>
                </span>
                <span className="ml-auto font-mono text-[10px] text-faint">{i + 1}</span>
              </button>
            ))}
          </div>

          <div className="min-w-0 animate-fade-up" key={l.id}>
            <h3 className="text-[16px] font-semibold tracking-tight">{l.title}</h3>
            <p className="mt-1 text-[13.5px] leading-6 text-fg/85">{l.what}</p>

            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-lg border border-ok/35 bg-ok/[0.06] px-3 py-2">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ok">
                  відповідає за
                </div>
                <ul className="grid gap-1">
                  {l.owns.map((o) => (
                    <li key={o} className="text-[12.5px] leading-5 text-fg/85">
                      · {o}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-danger/30 bg-danger/[0.05] px-3 py-2">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-danger">
                  НЕ відповідає за
                </div>
                <ul className="grid gap-1">
                  {l.notOwns.map((o) => (
                    <li key={o} className="text-[12.5px] leading-5 text-fg/85">
                      · {o}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {l.code && <CodeBlock className="mt-3" code={l.code} caption="Приклад цього рівня" />}

            <div className="mt-3 rounded-lg border border-warn/35 bg-warn/[0.07] px-3 py-2">
              <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-warn">
                типова помилка
              </div>
              <p className="text-[13px] leading-6 text-fg/85">{l.mistake}</p>
            </div>
          </div>
        </div>
      </Card>

      <Section eyebrow="термінологічна гігієна" title="Формулювання: неточне vs точне">
        <Table>
          <thead>
            <tr>
              <Th>Неточно</Th>
              <Th>Точно</Th>
              <Th>Чому це важливо</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td className="text-danger">«Регістр 1С — це таблиця SQL»</Td>
              <Td className="text-ok">
                «Регістр — об’єкт моделі даних із логічною структурою; фізичне зберігання залежить
                від платформи, режиму сумісності та СУБД»
              </Td>
              <Td className="text-muted">
                Один регістр може відображатись у кілька фізичних таблиць (основна + підсумки), а
                схема не є стабільним контрактом
              </Td>
            </tr>
            <tr>
              <Td className="text-danger">«Рух = проводка»</Td>
              <Td className="text-ok">
                «Проводка — це рух регістра бухгалтерії; рухи інших регістрів мають іншу структуру»
              </Td>
              <Td className="text-muted">
                Інакше незрозуміло, чому один документ створює 5 «проводок», з яких тільки 2 мають
                Дт/Кт
              </Td>
            </tr>
            <tr>
              <Td className="text-danger">«1С не бачить мою витрату»</Td>
              <Td className="text-ok">
                «Запит звіту не повертає записів із такими період/розріз/джерело»
              </Td>
              <Td className="text-muted">Друге формулювання одразу підказує, де шукати</Td>
            </tr>
            <tr>
              <Td className="text-danger">«Витрата зберігається в документі»</Td>
              <Td className="text-ok">
                «Витрата обчислюється як дебетовий оборот витратних рахунків за період»
              </Td>
              <Td className="text-muted">Пояснює, чому цифра змінюється при зміні періоду</Td>
            </tr>
          </tbody>
        </Table>
      </Section>

      <Collapse title="Чому не можна писати звіти напряму по таблицях СУБД" tone="accent">
        <p className="mb-2">Технічно — можна підключитись і побачити таблиці. Практично є чотири проблеми:</p>
        <ol className="grid list-decimal gap-1 pl-5 text-[13.5px] leading-6">
          <li>Імена й структура таблиць не є документованим контрактом і змінюються між версіями.</li>
          <li>
            Частина логіки живе не в даних, а в платформі: розрахунок віртуальних таблиць, підсумки,
            роздільники, права на рівні записів.
          </li>
          <li>Обхід платформи ігнорує блокування — можна прочитати неузгоджений стан посеред транзакції.</li>
          <li>Ви втрачаєте всю аналітику планів рахунків і видів характеристик, яка теж інтерпретується платформою.</li>
        </ol>
        <p className="mt-2">
          Правильний шлях для інтеграції — запити мовою 1С, HTTP/OData-сервіси або вивантаження, а не
          прямий SELECT.
        </p>
      </Collapse>

      <LmsBridge
        summary="Найкорисніше, що можна перенести з цієї схеми, — свідоме розділення шарів. Ваш фреймворк (Django, Rails, NestJS) — це «платформа». Ваші моделі та сервіси — «конфігурація». Код конкретного use-case — «логіка документа». Схема БД — фізичний рівень. Коли ці шари змішуються, кожна зміна правил обліку перетворюється на міграцію бази."
        rows={[
          { onec: 'Платформа', lms: 'Framework / ORM / БД', note: 'Інфраструктура, яку ви не змінюєте під бізнес-правила.' },
          { onec: 'Конфігурація', lms: 'Domain models + сервіси', note: 'Опис вашої предметної області.' },
          { onec: 'Модуль документа', lms: 'Use-case / command handler', note: 'Логіка одного конкретного сценарію.' },
          { onec: 'Концептуальна модель', lms: 'Домені типи, інваріанти', note: 'Що таке запис і які в нього обов’язкові розрізи.' },
          { onec: 'Фізичне зберігання', lms: 'Таблиці, індекси, міграції', note: 'Деталь реалізації, прихована за репозиторієм.' },
        ]}
      />

      <Callout kind="key">
        Далі ми спускаємось на рівень концептуальної моделі й розбираємо головний об’єкт усієї
        системи — <strong>регістр</strong>.
      </Callout>
    </div>
  )
}
