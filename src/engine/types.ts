/* ------------------------------------------------------------------
 * Концептуальна модель даних 1С/BAS.
 *
 * УВАГА: це НЕ внутрішній код 1С і не схема таблиць СУБД.
 * Це навчальна модель, яка відтворює логічну структуру об'єктів
 * платформи (документ, рух, регістр) настільки точно, наскільки це
 * потрібно, щоб зрозуміти причинно-наслідковий ланцюг:
 *   подія → документ → проведення → рухи → регістри → запит → звіт.
 * ------------------------------------------------------------------ */

export type Money = number
export type ISODate = string

/** Тип регістра — визначає структуру записів, які в нього потрапляють. */
export type RegisterKind = 'accumulation' | 'information' | 'accounting' | 'calculation'

/** Вид руху регістра накопичення. */
export type RecordType = 'receipt' | 'expense'

/** Вид регістра накопичення: залишки чи тільки обороти. */
export type AccumulationKind = 'balance' | 'turnover'

/* ----------------------------- План рахунків ----------------------------- */

export type AccountType = 'active' | 'passive' | 'active-passive'

export interface SubcontoKind {
  /** технічний ключ, яким користуються рухи */
  key: string
  /** назва виду субконто, як у плані видів характеристик */
  title: string
  /** до якого довідника посилається */
  catalog: string
  description: string
}

export interface Account {
  code: string
  title: string
  type: AccountType
  /** чи є рахунок «витратним» з точки зору фінансового результату */
  group: 'expense' | 'income' | 'asset' | 'liability' | 'equity' | 'result'
  /** види субконто (аналітичні розрізи), доступні на цьому рахунку */
  subconto: string[]
  /** чи ведеться кількісний облік */
  quantitative?: boolean
  explain: string
  reportUsage: string
}

/* ------------------------------ Метадані ------------------------------- */

export interface RegisterField {
  name: string
  role: 'period' | 'registrar' | 'dimension' | 'resource' | 'attribute' | 'recordType' | 'system'
  type: string
  description: string
}

export interface RegisterMeta {
  id: string
  title: string
  kind: RegisterKind
  accumulationKind?: AccumulationKind
  /** періодичність для регістра відомостей */
  periodicity?: 'none' | 'day' | 'second'
  subordination?: 'registrar' | 'independent'
  purpose: string
  fields: RegisterField[]
  /** що система вміє порахувати з цього регістра */
  virtualTables: { name: string; description: string }[]
  lmsAnalog: string
}

/* -------------------------------- Рухи --------------------------------- */

export interface BaseMovement {
  id: string
  register: string
  period: ISODate
  registrar: string
  registrarTitle: string
  lineNo: number
  /** людське пояснення, навіщо цей конкретний рух */
  comment: string
}

export interface AccountingMovement extends BaseMovement {
  kind: 'accounting'
  debitAccount: string
  creditAccount: string
  debitSubconto: Record<string, string>
  creditSubconto: Record<string, string>
  amount: Money
  quantity?: number
  organization: string
}

export interface AccumulationMovement extends BaseMovement {
  kind: 'accumulation'
  recordType: RecordType
  dimensions: Record<string, string>
  resources: Record<string, number>
}

export interface InformationMovement extends BaseMovement {
  kind: 'information'
  dimensions: Record<string, string>
  resources: Record<string, string | number>
}

export type Movement = AccountingMovement | AccumulationMovement | InformationMovement

/* ------------------------------ Документи ------------------------------- */

export interface DocumentLine {
  id: string
  name: string
  quantity?: number
  price?: Money
  amount: Money
  vat?: Money
  /** аналітика рядка */
  costArticle?: string
  department?: string
  account?: string
}

export type DocumentKind =
  | 'serviceReceipt'
  | 'payroll'
  | 'goodsReceipt'
  | 'goodsSale'
  | 'adjustment'
  | 'reversal'

export interface SimDocument {
  id: string
  number: string
  kind: DocumentKind
  title: string
  date: ISODate
  organization: string
  counterparty?: string
  contract?: string
  warehouse?: string
  employee?: string
  lines: DocumentLine[]
  /** документ-підстава для коригування/сторно */
  basisDocumentId?: string
  comment: string
  /** реквізити, які алгоритм проведення читає окремо */
  attributes: { label: string; value: string; note: string }[]
}

/* ---------------------------- Проведення -------------------------------- */

export interface PostingStep {
  no: number
  id: string
  title: string
  /** пояснення для користувача */
  user: string
  /** пояснення для розробника */
  technical: string
  /** псевдокод етапу */
  pseudo?: string
  /** рухи, які саме цей крок додав */
  produced?: string[]
  /** діагностика: що може піти не так саме тут */
  failure?: string
}

export interface PostingResult {
  documentId: string
  ok: boolean
  steps: PostingStep[]
  movements: Movement[]
  /** технічний лог у стилі debug-виводу платформи */
  log: string[]
  /** підсумок для користувацького режиму */
  userSummary: string[]
  errors: string[]
}

/* ------------------------------- Звіти ---------------------------------- */

export interface ReportRow {
  key: string
  label: string
  sub?: string
  values: Record<string, number>
  children?: ReportRow[]
}

export interface ReportResult {
  title: string
  columns: { key: string; title: string; align?: 'left' | 'right' }[]
  rows: ReportRow[]
  total: Record<string, number>
  /** концептуальний запит, який описує вибірку */
  query: string
  /** з яких регістрів узяті дані */
  sources: string[]
  note: string
}
