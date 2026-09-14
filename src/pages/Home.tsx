import { Link } from 'react-router-dom'
import { ArrowRight, Boxes, Star, Terminal, Target, BookOpen, Braces } from 'lucide-react'
import { useStore } from '@/state/store'
import { NAV } from '@/data/nav'
import { Badge, Button, Card, CardHeader, Callout, Stat } from '@/components/ui'
import { Flow, type FlowNode } from '@/components/viz/Flow'
import { CausalChain } from '@/components/CausalChain'

const MAIN_FLOW: FlowNode[] = [
  {
    id: 'user',
    title: 'USER',
    caption: 'Користувач',
    tone: 'cyan',
    simple:
      'Людина фіксує господарську подію: отримали послугу, нарахували зарплату, продали товар.',
    technical:
      'Жодних змін в обліку на цьому етапі немає. Є лише намір і форма введення даних. Права доступу, інтерфейс, підстановки за замовчуванням — усе це шар представлення, а не обліку.',
    example:
      'Бухгалтер відкриває «Надходження послуг» і вводить оренду офісу за вересень на 30 000 грн.',
    inside: `// Що існує на цьому етапі:\nФормаДокумента (UI)\n  ├── реквізити шапки\n  ├── таблична частина\n  └── кнопка «Провести»\n\n// Що НЕ існує:\n// жодного запису в жодному регістрі`,
    insideCaption: 'Стан системи',
  },
  {
    id: 'document',
    title: 'DOCUMENT',
    caption: 'Документ',
    tone: 'accent',
    simple: 'Подія перетворилась на збережені дані. Але в обліку її ще немає.',
    technical:
      'Об’єкт документа з датою, номером, реквізитами і табличними частинами. Після Записать() він існує в базі, але поле Проведен = Ложь, і жоден звіт його не бачить. Документ — ДЖЕРЕЛО події, а не сама витрата.',
    example: 'ПНП-000001 від 01.09.2026, контрагент «Бізнес-Центр Софія», сума 30 000 + ПДВ 6 000.',
    inside: `Документ.НадходженняПослуг\n├── Дата              : Дата\n├── Номер             : Строка\n├── Організація       : СправочникСсылка\n├── Контрагент        : СправочникСсылка\n├── Договір           : СправочникСсылка\n└── Послуги (ТЧ)      : ТаблицаЗначений\n    ├── Найменування\n    ├── Сума\n    ├── СтаттяВитрат\n    └── Підрозділ`,
    insideCaption: 'Структура об’єкта',
  },
  {
    id: 'posting',
    title: 'POSTING',
    caption: 'Проведення',
    tone: 'violet',
    simple: 'Натиснули «Провести» — система почала перетворювати документ на записи обліку.',
    technical:
      'Платформа відкриває транзакцію і викликає ОбработкаПроведения() у модулі об’єкта. Далі все залежить від КОНФІГУРАЦІЇ: саме її код вирішує, які рухи створити. Платформа лише надає механізм.',
    example: 'Запускається СформироватьДвиженияПоУслугам() для документа оренди.',
    inside: `Процедура ОбработкаПроведения(Отказ, Режим)\n    Движения.Очистить();          // знести свої старі рухи\n    ПроверитьЗаполнение(Отказ);\n    Если Отказ Тогда Возврат; КонецЕсли;\n\n    СформироватьДвиженияПоУслугам();\n    СформироватьДвиженияПоНДС();\n    СформироватьДвиженияПоРасчетам();\nКонецПроцедуры`,
    insideCaption: 'Модуль об’єкта документа',
  },
  {
    id: 'movements',
    title: 'MOVEMENTS',
    caption: 'Рухи',
    tone: 'violet',
    simple: 'Система формує окремі записи — по одному на кожен факт, який треба зберегти.',
    technical:
      'Набори записів у пам’яті. Один документ зазвичай створює кілька рухів РІЗНОЇ структури: проводку Дт/Кт, запис у регістр накопичення з вимірюваннями та ресурсами, запис у регістр відомостей. «Рух = проводка» — хибне спрощення.',
    example:
      'Рух 1: Дт 92 / Кт 631 — 30 000. Рух 2: Дт 6442 / Кт 631 — 6 000. Рух 3: витрати за статтею «Оренда» — 30 000. Рух 4: борг контрагенту — 36 000.',
    inside: `Движение = Движения.Хозрасчетный.Добавить();\nДвижение.Период  = Дата;\nДвижение.СчетДт  = Счет92;\nДвижение.СчетКт  = Счет631;\nДвижение.Сумма   = 30000;\nДвижение.СубконтоДт[СтатьиЗатрат]  = "Оренда";\nДвижение.СубконтоДт[Подразделения] = "Адміністрація";`,
    insideCaption: 'Формування руху',
  },
  {
    id: 'registers',
    title: 'REGISTERS',
    caption: 'Регістри',
    tone: 'ok',
    simple: 'Рухи збережені. Саме тут тепер живе ваш облік.',
    technical:
      'Регістр — об’єкт моделі даних із логічною структурою (період, реєстратор, вимірювання, ресурси, реквізити). Фізичне зберігання визначає платформа; покладатись на конкретну схему таблиць СУБД не можна. Над регістром платформа надає віртуальні таблиці: Залишки, Обороти, ЗрізОстанніх.',
    example:
      'Регістр бухгалтерії: 2 записи. Регістр «Витрати за статтями»: 1 запис. Регістр ПДВ: 1 запис. Регістр взаєморозрахунків: 1 запис.',
    inside: `РегистрБухгалтерии.Хозрасчетный\n├── Период, Регистратор, НомерСтроки\n├── СчетДт, СубконтоДт[1..3]\n├── СчетКт, СубконтоКт[1..3]\n├── Организация  (вимірювання)\n├── Сумма        (ресурс)\n└── Количество   (ресурс)\n\nВіртуальні таблиці:\n  .ОстаткиИОбороты(...)\n  .Обороты(...)`,
    insideCaption: 'Логічна структура регістра',
  },
  {
    id: 'query',
    title: 'QUERY',
    caption: 'Запит',
    tone: 'warn',
    simple: 'Ви відкриваєте звіт — і він питає у системи потрібні дані.',
    technical:
      'Звіт виконує запит мовою запитів 1С до таблиць регістрів (найчастіше — до віртуальних). Платформа транслює його у звернення до СУБД. Це НЕ той SQL, який ви пишете напряму, і його конкретний вигляд залежить від платформи та СУБД.',
    example: 'Вибрати обороти регістра витрат за 01.09–30.09 з групуванням за статтею.',
    inside: `ВЫБРАТЬ\n    Витрати.СтаттяВитрат,\n    СУММА(Витрати.СумаОборот) ЯК Сума\nИЗ\n    РегистрНакопления.ВитратиЗаСтаттями.Обороты(\n        &ПочатокПеріоду, &КінецьПеріоду, ,\n        Організація = &Організація) ЯК Витрати\nСГРУППИРОВАТЬ ПО\n    Витрати.СтаттяВитрат`,
    insideCaption: 'Запит звіту (мова запитів 1С)',
  },
  {
    id: 'processing',
    title: 'PROCESSING',
    caption: 'Обробка даних',
    tone: 'warn',
    simple: 'Отримані записи групуються, підсумовуються і сортуються.',
    technical:
      'Агрегація за вимірюваннями (GROUP BY), обчислення підсумків і ієрархії, застосування відборів компонувальника даних, оформлення. Саме тут «багато записів» перетворюються на «кілька рядків звіту».',
    example: 'Три записи по статті «Оренда» згортаються в один рядок із сумою 30 000.',
    inside: `// Логіка агрегації (концептуально):\nrows = movements\n  .filter(m => m.period >= from && m.period <= to)\n  .groupBy(m => m.dimensions.costArticle)\n  .map(g => ({ article: g.key, amount: sum(g, 'amount') }))\n  .sortBy(r => -r.amount)`,
    insideCaption: 'Агрегація (TypeScript-аналогія)',
  },
  {
    id: 'report',
    title: 'REPORT',
    caption: 'Звіт',
    tone: 'ok',
    simple: 'Ви бачите готову таблицю: витрати за вересень — 30 000 грн.',
    technical:
      'Звіт не зберігає цифр. Він щоразу заново читає регістри й рахує агрегати. Тому виправлений документ миттєво змінює звіт, і тому «сума зникла» майже завжди означає проблему в даних, періоді або відборах — а не «поламаний звіт».',
    example: 'Витрати за статтями, вересень 2026: Оренда — 30 000,00 грн.',
    inside: `Звіт «Витрати за статтями»\n├── Джерело даних : РегистрНакопления.ВитратиЗаСтаттями.Обороты\n├── Період        : 01.09.2026 – 30.09.2026\n├── Групування    : СтаттяВитрат › Підрозділ\n├── Ресурс        : Сума\n└── Розшифровка   : Реєстратор → документ`,
    insideCaption: 'Схема компонування',
  },
]

export default function Home() {
  const store = useStore()

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-panel sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative">
          <Badge tone="accent" mono>
            <Boxes size={11} /> Interactive lab
          </Badge>
          <h1 className="mt-3 max-w-[22ch] text-[30px] font-semibold leading-[1.12] tracking-tight sm:text-[40px]">
            Як 1С/BAS перетворює документи на дані, а дані — на звіти
          </h1>
          <p className="mt-3 max-w-[70ch] text-[15.5px] leading-7 text-muted">
            Це не курс «де натискати кнопки». Це розбір внутрішньої механіки: структури даних,
            алгоритм проведення, рухи, регістри, агрегація. З симулятором, покроковим debugger&apos;ом
            і робочою моделлю, яку можна перенести у власну систему.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/expenses">
              <Button variant="primary">
                <Star size={14} /> Почати з витрат
              </Button>
            </Link>
            <Link to="/posting">
              <Button>
                <Terminal size={14} /> Debugger проведення
              </Button>
            </Link>
            <Link to="/basics">
              <Button variant="ghost">
                <BookOpen size={14} /> З самого початку
                <ArrowRight size={13} />
              </Button>
            </Link>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-4">
            <Stat label="Розділів" value={String(NAV.length)} hint="від основ до архітектури" />
            <Stat
              label="Пройдено"
              value={`${store.progress.done}/${store.progress.total}`}
              hint={`${store.progress.percent}%`}
              tone={store.progress.done > 0 ? 'ok' : 'neutral'}
            />
            <Stat label="Сценаріїв витрат" value="7" hint="від оренди до сторно" tone="accent" />
            <Stat label="Регістрів у симуляторі" value="6" hint="3 типи структур" tone="accent" />
          </div>
        </div>
      </section>

      <Callout kind="key" title="Головна теза проєкту">
        <strong>Документ ≠ витрата.</strong> Документ — це джерело події. Під час проведення він
        формує рухи. Рухи потрапляють у регістри. А «витрата» — це вже{' '}
        <em>інтерпретація</em> записів у регістрі: дебетовий оборот витратних рахунків за період у
        потрібному розрізі. Саме тому витрату не можна «знайти в базі» — її щоразу{' '}
        <strong>обчислюють</strong>.
      </Callout>

      <Flow
        nodes={MAIN_FLOW}
        title="Головна схема: від дії користувача до звіту"
        subtitle="Кожен блок клікабельний. «Показати, що всередині» відкриває структуру даних або код етапу."
        autoplayLabel="Програти весь шлях"
      />

      <CausalChain
        values={[
          'отримали оренду',
          'ПНП-000001',
          'кнопка «Провести»',
          'СформироватьДвижения',
          'Дт 92 / Кт 631',
          'Госпрозрахунковий',
          '30 000 записано',
          'Обороти(...)',
          'GROUP BY стаття',
          'Оренда — 30 000',
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <NavCard
          to="/expenses"
          icon={<Target size={16} />}
          title="Витрати"
          text="Ключовий модуль: повний життєвий цикл витрати з розбором кожного етапу."
          tone="warn"
        />
        <NavCard
          to="/ledger"
          icon={<Braces size={16} />}
          title="Архітектура Ledger"
          text="Робоча TypeScript-модель: ExpenseDocument → postExpense() → LedgerEntry → getExpenses()."
          tone="violet"
        />
        <NavCard
          to="/diagnostics"
          icon={<Terminal size={16} />}
          title="Діагностика"
          text="«Документ проведений, але у звіті немає витрати» — дерево причин крок за кроком."
          tone="cyan"
        />
      </div>

      <Card>
        <CardHeader
          title="Чого ви навчитесь"
          subtitle="Критерій якості: після розділу «Витрати» ви маєте вміти пояснити весь ланцюг самостійно"
        />
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {[
            'Що саме створює користувач і чому це ще не облік',
            'Що відбувається під час проведення, крок за кроком',
            'Що таке рух і чим він відрізняється від проводки',
            'Куди потрапляє рух і чому регістрів кілька',
            'Як формується бухгалтерський запис і хто обирає рахунок',
            'Як визначається витрата і чому товар на складі — не витрата',
            'Де зберігається інформація і що обчислюється на льоту',
            'Як звіт знаходить дані і чому він нічого не пам’ятає',
            'Як перенести цю архітектуру у власну програму або LMS',
          ].map((t, i) => (
            <div key={t} className="flex gap-2.5 rounded-lg border border-line bg-elevated px-3 py-2">
              <span className="font-mono text-[11px] text-accent">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-[13px] leading-6">{t}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function NavCard({
  to,
  icon,
  title,
  text,
  tone,
}: {
  to: string
  icon: React.ReactNode
  title: string
  text: string
  tone: 'warn' | 'violet' | 'cyan'
}) {
  const border = {
    warn: 'hover:border-warn/55',
    violet: 'hover:border-violet/55',
    cyan: 'hover:border-cyan/55',
  }[tone]
  const color = { warn: 'text-warn', violet: 'text-violet', cyan: 'text-cyan' }[tone]
  return (
    <Link
      to={to}
      className={`focus-ring group rounded-xl border border-line bg-surface p-4 shadow-panel transition ${border}`}
    >
      <div className={`mb-2 ${color}`}>{icon}</div>
      <div className="flex items-center gap-1.5 text-[14px] font-semibold">
        {title}
        <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
      </div>
      <p className="mt-1 text-[13px] leading-6 text-muted">{text}</p>
    </Link>
  )
}
