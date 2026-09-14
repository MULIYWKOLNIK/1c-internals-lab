import type { Account, SubcontoKind } from './types'

/**
 * Спрощений план рахунків (українська традиція, як у BAS/1С-конфігураціях).
 * Узято лише ті рахунки, які потрібні для навчальних сценаріїв.
 */

export const SUBCONTO_KINDS: SubcontoKind[] = [
  {
    key: 'costArticle',
    title: 'Статті витрат',
    catalog: 'Довідник «Статті витрат»',
    description:
      'Відповідає на питання «що саме за витрата»: оренда, реклама, зарплата, комунальні. Рахунок 92 скаже «це адміністративні витрати», а стаття — «це саме оренда».',
  },
  {
    key: 'department',
    title: 'Підрозділи',
    catalog: 'Довідник «Підрозділи»',
    description:
      'Відповідає на питання «чиї це витрати»: адміністрація, відділ продажів, склад. Дозволяє порівнювати підрозділи між собою на одному рахунку.',
  },
  {
    key: 'counterparty',
    title: 'Контрагенти',
    catalog: 'Довідник «Контрагенти»',
    description: 'Кому ми винні або хто винен нам. Основа для розшифровки заборгованості.',
  },
  {
    key: 'contract',
    title: 'Договори',
    catalog: 'Довідник «Договори контрагентів»',
    description:
      'Другий рівень розшифровки заборгованості: один контрагент може мати кілька договорів.',
  },
  {
    key: 'item',
    title: 'Номенклатура',
    catalog: 'Довідник «Номенклатура»',
    description: 'Конкретний товар або послуга. На рахунках запасів дає товарну аналітику.',
  },
  {
    key: 'warehouse',
    title: 'Склади',
    catalog: 'Довідник «Склади»',
    description: 'Місце зберігання. Один і той самий товар на різних складах — різні залишки.',
  },
  {
    key: 'employee',
    title: 'Працівники',
    catalog: 'Довідник «Фізичні особи / Працівники»',
    description: 'Розшифровка розрахунків із персоналом.',
  },
  {
    key: 'incomeArticle',
    title: 'Статті доходів',
    catalog: 'Довідник «Статті доходів»',
    description: 'Аналог статей витрат, але для доходної частини.',
  },
]

export const SUBCONTO_BY_KEY: Record<string, SubcontoKind> = Object.fromEntries(
  SUBCONTO_KINDS.map((s) => [s.key, s]),
)

export const ACCOUNTS: Account[] = [
  {
    code: '23',
    title: 'Виробництво',
    type: 'active',
    group: 'asset',
    subconto: ['costArticle', 'department'],
    explain:
      'Накопичувальний «кошик» витрат, які ще не стали витратами періоду: вони осідають у собівартості продукції. Списується далі, коли продукція виготовлена та продана.',
    reportUsage: 'Незавершене виробництво, калькуляція собівартості.',
  },
  {
    code: '281',
    title: 'Товари на складі',
    type: 'active',
    group: 'asset',
    subconto: ['item', 'warehouse'],
    quantitative: true,
    explain:
      'Актив. Поки товар лежить на складі — це НЕ витрата, а майно. Гроші «перетворились» на товар, фінансовий результат не змінився.',
    reportUsage: 'Залишки товарів, оборотно-сальдова відомість по 281.',
  },
  {
    code: '311',
    title: 'Поточні рахунки в банку',
    type: 'active',
    group: 'asset',
    subconto: [],
    explain:
      'Гроші на рахунку. Оплата постачальнику зменшує 311, але сама по собі не створює витрату — змінюється лише форма активу.',
    reportUsage: 'Виписка банку, залишки коштів.',
  },
  {
    code: '361',
    title: 'Розрахунки з вітчизняними покупцями',
    type: 'active',
    group: 'asset',
    subconto: ['counterparty', 'contract'],
    explain: 'Дебіторська заборгованість покупців.',
    reportUsage: 'Заборгованість покупців, акти звірки.',
  },
  {
    code: '631',
    title: 'Розрахунки з вітчизняними постачальниками',
    type: 'passive',
    group: 'liability',
    subconto: ['counterparty', 'contract'],
    explain:
      'Кредиторська заборгованість. Коли ми отримали послугу, але ще не заплатили — борг «висить» тут. Саме тому Кт 631 стоїть навпроти Дт 92.',
    reportUsage: 'Заборгованість перед постачальниками, розшифровка по контрагентах.',
  },
  {
    code: '6442',
    title: 'Податковий кредит непідтверджений',
    type: 'active',
    group: 'asset',
    subconto: ['counterparty', 'contract'],
    explain:
      'ПДВ, який ми маємо право зарахувати, але податкова накладна ще не зареєстрована. Це НЕ витрата — це розрахунки з бюджетом.',
    reportUsage: 'Звіти з ПДВ, реєстр податкових накладних.',
  },
  {
    code: '641',
    title: 'Розрахунки за податками',
    type: 'active-passive',
    group: 'liability',
    subconto: [],
    explain: 'Узагальнені розрахунки з бюджетом, зокрема субрахунок ПДВ.',
    reportUsage: 'Декларація з ПДВ, розрахунки з бюджетом.',
  },
  {
    code: '651',
    title: 'Розрахунки за соціальним страхуванням (ЄСВ)',
    type: 'passive',
    group: 'liability',
    subconto: ['department'],
    explain:
      'Нарахований ЄСВ — зобов’язання перед фондом. Саме нарахування ЄСВ є витратою роботодавця, а не утриманням із працівника.',
    reportUsage: 'Звітність з ЄСВ.',
  },
  {
    code: '661',
    title: 'Розрахунки за виплатами працівникам',
    type: 'passive',
    group: 'liability',
    subconto: ['employee', 'department'],
    explain:
      'Зобов’язання перед працівниками. Нарахування зарплати — витрата; виплата зарплати — вже рух грошей і погашення боргу, не витрата.',
    reportUsage: 'Розрахункові відомості, заборгованість із зарплати.',
  },
  {
    code: '702',
    title: 'Дохід від реалізації товарів',
    type: 'passive',
    group: 'income',
    subconto: ['incomeArticle', 'item'],
    explain: 'Дохід визнається у момент переходу контролю над товаром, незалежно від оплати.',
    reportUsage: 'Звіт про фінансові результати, рядок «Чистий дохід».',
  },
  {
    code: '902',
    title: 'Собівартість реалізованих товарів',
    type: 'active',
    group: 'expense',
    subconto: ['item', 'costArticle'],
    explain:
      'Ось де придбаний товар нарешті стає витратою — у момент вибуття, а не у момент придбання. Ключовий рахунок для розуміння різниці «актив vs витрата».',
    reportUsage: 'Звіт про фінрезультати, рядок «Собівартість реалізації».',
  },
  {
    code: '92',
    title: 'Адміністративні витрати',
    type: 'active',
    group: 'expense',
    subconto: ['costArticle', 'department'],
    explain:
      'Витрати на управління підприємством: оренда офісу, зарплата адміністрації, аудит, зв’язок. Дебет 92 = «визнали адміністративну витрату періоду».',
    reportUsage:
      'Звіт про фінрезультати, рядок «Адміністративні витрати»; звіт «Витрати за статтями».',
  },
  {
    code: '93',
    title: 'Витрати на збут',
    type: 'active',
    group: 'expense',
    subconto: ['costArticle', 'department'],
    explain:
      'Витрати, пов’язані з продажем: реклама, доставка покупцям, комісія маркетплейсу, зарплата продавців.',
    reportUsage: 'Звіт про фінрезультати, рядок «Витрати на збут».',
  },
  {
    code: '791',
    title: 'Результат операційної діяльності',
    type: 'active-passive',
    group: 'result',
    subconto: [],
    explain:
      'Рахунок-«закриття». Наприкінці періоду витратні рахунки списуються сюди, і саме тут народжується прибуток або збиток.',
    reportUsage: 'Закриття місяця, формування фінансового результату.',
  },
]

export const ACCOUNT_BY_CODE: Record<string, Account> = Object.fromEntries(
  ACCOUNTS.map((a) => [a.code, a]),
)

export const EXPENSE_ACCOUNTS = ACCOUNTS.filter((a) => a.group === 'expense').map((a) => a.code)

export function accountTitle(code: string): string {
  return ACCOUNT_BY_CODE[code]?.title ?? code
}

export function isExpenseAccount(code: string): boolean {
  return EXPENSE_ACCOUNTS.includes(code)
}
