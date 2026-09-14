import type {
  AccountingMovement,
  AccumulationMovement,
  InformationMovement,
  Movement,
  PostingResult,
  PostingStep,
  SimDocument,
} from './types'
import { DOCUMENT_BY_ID, POSTING_PROCEDURE } from './documents'
import { money } from './format'

/* ------------------------------------------------------------------ *
 * Алгоритм проведення.
 *
 * У реальній 1С це процедура ОбработкаПроведения() у модулі об'єкта
 * документа (або механізм на базі регламентованих правил). Тут — її
 * навчальна модель: ті самі етапи, та сама послідовність, але
 * прозорий, читабельний код.
 * ------------------------------------------------------------------ */

let seq = 0
const nextId = (p: string) => `${p}-${(++seq).toString(36)}`
export const resetMovementIds = () => {
  seq = 0
}

/* --------------------- визначення рахунку витрат -------------------- */

export interface AccountDecision {
  account: string
  rule: string
  reason: string
}

export function resolveExpenseAccount(
  costArticle: string | undefined,
  department: string | undefined,
  explicit?: string,
): AccountDecision {
  if (explicit === '281') {
    return {
      account: '281',
      rule: 'ЕслиЭтоЗапас → СчетУчета = 281',
      reason:
        'Надходить матеріальна цінність. Вона стає активом, а не витратою, тому витратний рахунок взагалі не використовується.',
    }
  }
  if (explicit === '902' || costArticle === 'Собівартість продажів') {
    return {
      account: '902',
      rule: 'ЕслиВыбытиеЗапаса → СчетЗатрат = 902',
      reason:
        'Товар вибуває. Саме в цей момент раніше капіталізована вартість перетворюється на витрату періоду.',
    }
  }
  if (costArticle === 'Реклама' || department === 'Відділ продажів') {
    return {
      account: '93',
      rule: 'ЕслиПодразделениеСбытовое ИЛИ СтатьяСбытовая → СчетЗатрат = 93',
      reason:
        'Стаття «Реклама» і підрозділ «Відділ продажів» класифікують витрату як збутову. Рахунок 93 — «Витрати на збут».',
    }
  }
  return {
    account: '92',
    rule: 'Иначе → СчетЗатрат = 92',
    reason:
      'Підрозділ «Адміністрація» і загальногосподарський характер статті дають адміністративні витрати — рахунок 92.',
  }
}

/* ------------------------------ helpers ----------------------------- */

interface Ctx {
  doc: SimDocument
  movements: Movement[]
  log: string[]
  lineNo: number
}

function acc(
  ctx: Ctx,
  m: Omit<AccountingMovement, 'id' | 'kind' | 'register' | 'period' | 'registrar' | 'registrarTitle' | 'lineNo' | 'organization'>,
): AccountingMovement {
  const mv: AccountingMovement = {
    id: nextId('mv'),
    kind: 'accounting',
    register: 'accounting',
    period: ctx.doc.date,
    registrar: ctx.doc.id,
    registrarTitle: `${ctx.doc.number} від ${ctx.doc.date}`,
    lineNo: ++ctx.lineNo,
    organization: ctx.doc.organization,
    ...m,
  }
  ctx.movements.push(mv)
  ctx.log.push(
    `Движения.Хозрасчетный.Добавить(): Дт ${mv.debitAccount} Кт ${mv.creditAccount} Сумма=${mv.amount}`,
  )
  return mv
}

function accum(
  ctx: Ctx,
  register: string,
  m: Omit<AccumulationMovement, 'id' | 'kind' | 'register' | 'period' | 'registrar' | 'registrarTitle' | 'lineNo'>,
): AccumulationMovement {
  const mv: AccumulationMovement = {
    id: nextId('mv'),
    kind: 'accumulation',
    register,
    period: ctx.doc.date,
    registrar: ctx.doc.id,
    registrarTitle: `${ctx.doc.number} від ${ctx.doc.date}`,
    lineNo: ++ctx.lineNo,
    ...m,
  }
  ctx.movements.push(mv)
  ctx.log.push(
    `Движения.${register}.Добавить(): ВидДвижения=${mv.recordType === 'receipt' ? 'Приход' : 'Расход'} ${JSON.stringify(mv.resources)}`,
  )
  return mv
}

function info(
  ctx: Ctx,
  register: string,
  m: Omit<InformationMovement, 'id' | 'kind' | 'register' | 'period' | 'registrar' | 'registrarTitle' | 'lineNo'>,
): InformationMovement {
  const mv: InformationMovement = {
    id: nextId('mv'),
    kind: 'information',
    register,
    period: ctx.doc.date,
    registrar: ctx.doc.id,
    registrarTitle: `${ctx.doc.number} від ${ctx.doc.date}`,
    lineNo: ++ctx.lineNo,
    ...m,
  }
  ctx.movements.push(mv)
  ctx.log.push(`Движения.${register}.Добавить(): ${JSON.stringify(mv.resources)}`)
  return mv
}

/* ------------------------ формування рухів -------------------------- */

/** Витратний блок: бухгалтерія + управлінський регістр витрат. */
function expenseBlock(ctx: Ctx) {
  const { doc } = ctx
  for (const line of doc.lines) {
    const decision = resolveExpenseAccount(line.costArticle, line.department, line.account)
    if (decision.account === '281') continue

    const amount = line.amount
    const creditAccount =
      doc.kind === 'payroll'
        ? line.costArticle === 'Податки на ФОП'
          ? '651'
          : '661'
        : doc.kind === 'goodsSale'
          ? '281'
          : '631'

    const creditSubconto: Record<string, string> =
      creditAccount === '631'
        ? { counterparty: doc.counterparty ?? '', contract: doc.contract ?? '' }
        : creditAccount === '661'
          ? { employee: doc.employee ?? '', department: line.department ?? '' }
          : creditAccount === '651'
            ? { department: line.department ?? '' }
            : { item: line.name, warehouse: doc.warehouse ?? '' }

    acc(ctx, {
      debitAccount: decision.account,
      creditAccount,
      debitSubconto: {
        costArticle: line.costArticle ?? '',
        ...(line.department ? { department: line.department } : {}),
        ...(decision.account === '902' ? { item: line.name } : {}),
      },
      creditSubconto,
      amount,
      comment: `${decision.rule} — ${decision.reason}`,
    })

    accum(ctx, 'expensesByArticle', {
      recordType: 'receipt',
      dimensions: {
        organization: doc.organization,
        costArticle: line.costArticle ?? '',
        department: line.department ?? '—',
      },
      resources: { amount },
      comment:
        'Управлінський зріз тієї самої витрати. Бухгалтерія знає кореспонденцію, цей регістр — лише статтю й суму.',
    })
  }
}

/** ПДВ: окремий бухгалтерський запис + окремий податковий регістр. */
function vatBlock(ctx: Ctx) {
  const { doc } = ctx
  const vat = doc.lines.reduce((s, l) => s + (l.vat ?? 0), 0)
  if (!vat) return
  const amount = vat
  acc(ctx, {
    debitAccount: '6442',
    creditAccount: doc.kind === 'goodsSale' ? '702' : '631',
    debitSubconto: { counterparty: doc.counterparty ?? '', contract: doc.contract ?? '' },
    creditSubconto: { counterparty: doc.counterparty ?? '', contract: doc.contract ?? '' },
    amount,
    comment:
      'ПДВ не є витратою: це розрахунки з бюджетом. Він збільшує суму боргу постачальнику, але не збільшує собівартість/витрати.',
  })
  accum(ctx, 'vat', {
    recordType: amount >= 0 ? 'receipt' : 'expense',
    dimensions: {
      counterparty: doc.counterparty ?? '',
      contract: doc.contract ?? '',
      rate: '20%',
    },
    resources: {
      vatAmount: Math.abs(amount),
      baseAmount: Math.abs(doc.lines.reduce((s, l) => s + l.amount, 0)),
    },
    comment:
      'Той самий документ пише ще й у податковий регістр. Структура запису тут зовсім інша — це не бухгалтерська проводка.',
  })
}

/** Взаєморозрахунки з постачальником. */
function payablesBlock(ctx: Ctx, total: number) {
  const { doc } = ctx
  if (!doc.counterparty) return
  const amount = total
  accum(ctx, 'payables', {
    recordType: amount >= 0 ? 'receipt' : 'expense',
    dimensions: { counterparty: doc.counterparty, contract: doc.contract ?? '' },
    resources: { settlement: Math.abs(amount) },
    comment:
      'Оперативний контур заборгованості. Дублює бухгалтерію за сумою, але у структурі, зручній для швидкої перевірки при проведенні.',
  })
}

/* ----------------------------- сценарії ----------------------------- */

function buildMovements(ctx: Ctx, stock: StockSnapshot): void {
  const { doc } = ctx
  const net = doc.lines.reduce((s, l) => s + l.amount, 0)
  const vat = doc.lines.reduce((s, l) => s + (l.vat ?? 0), 0)

  switch (doc.kind) {
    case 'serviceReceipt':
    case 'payroll':
    case 'adjustment':
    case 'reversal': {
      expenseBlock(ctx)
      vatBlock(ctx)
      if (doc.counterparty) payablesBlock(ctx, net + vat)
      break
    }

    case 'goodsReceipt': {
      for (const line of doc.lines) {
        acc(ctx, {
          debitAccount: '281',
          creditAccount: '631',
          debitSubconto: { item: line.name, warehouse: doc.warehouse ?? '' },
          creditSubconto: { counterparty: doc.counterparty ?? '', contract: doc.contract ?? '' },
          amount: line.amount,
          quantity: line.quantity,
          comment:
            'Дебет 281 — це АКТИВ, а не витрата. Фінансовий результат не змінився: гроші (борг) перетворились на майно.',
        })
        accum(ctx, 'stock', {
          recordType: 'receipt',
          dimensions: { item: line.name, warehouse: doc.warehouse ?? '' },
          resources: { quantity: line.quantity ?? 0, amount: line.amount },
          comment: 'Прихід збільшує залишок товару на складі.',
        })
        info(ctx, 'itemPrices', {
          dimensions: { item: line.name, priceType: 'Закупівельна' },
          resources: { price: line.price ?? 0, source: doc.number },
          comment:
            'Регістр відомостей фіксує СТАН (ціна на дату), а не подію. Тут немає приходу/витрати і нічого не підсумовується.',
        })
      }
      vatBlock(ctx)
      payablesBlock(ctx, net + vat)
      break
    }

    case 'goodsSale': {
      for (const line of doc.lines) {
        const qty = line.quantity ?? 0
        const cost = stock.costPerUnit(line.name) * qty

        // 1. Дохід
        acc(ctx, {
          debitAccount: '361',
          creditAccount: '702',
          debitSubconto: { counterparty: doc.counterparty ?? '', contract: doc.contract ?? '' },
          creditSubconto: { incomeArticle: 'Продаж товарів', item: line.name },
          amount: line.amount + (line.vat ?? 0),
          comment: 'Визнання доходу. Дохід і витрата — різні записи, які створює один документ.',
        })

        // 2. Собівартість — ось де народжується витрата
        acc(ctx, {
          debitAccount: '902',
          creditAccount: '281',
          debitSubconto: { item: line.name, costArticle: 'Собівартість продажів' },
          creditSubconto: { item: line.name, warehouse: doc.warehouse ?? '' },
          amount: cost,
          quantity: qty,
          comment: `Собівартість ${qty} шт × ${money(stock.costPerUnit(line.name))} = ${money(cost)}. Вартість узята З РЕГІСТРА, а не з документа.`,
        })

        accum(ctx, 'stock', {
          recordType: 'expense',
          dimensions: { item: line.name, warehouse: doc.warehouse ?? '' },
          resources: { quantity: qty, amount: cost },
          comment: 'Витрата зі складу зменшує залишок.',
        })

        accum(ctx, 'expensesByArticle', {
          recordType: 'receipt',
          dimensions: {
            organization: doc.organization,
            costArticle: 'Собівартість продажів',
            department: '—',
          },
          resources: { amount: cost },
          comment: 'Тільки тепер придбаний товар потрапляє у звіт про витрати.',
        })
      }
      break
    }
  }
}

/* -------------------------- знімок залишків ------------------------- */

export interface StockSnapshot {
  costPerUnit: (item: string) => number
}

export const DEFAULT_STOCK: StockSnapshot = {
  costPerUnit: () => 5000,
}

export function stockFromMovements(movements: Movement[]): StockSnapshot {
  return {
    costPerUnit: (item: string) => {
      let qty = 0
      let sum = 0
      for (const m of movements) {
        if (m.kind !== 'accumulation' || m.register !== 'stock') continue
        if (m.dimensions.item !== item) continue
        const sign = m.recordType === 'receipt' ? 1 : -1
        qty += sign * (m.resources.quantity ?? 0)
        sum += sign * (m.resources.amount ?? 0)
      }
      if (qty <= 0) return 5000
      return Math.round((sum / qty) * 100) / 100
    },
  }
}

/* --------------------------- головна функція ------------------------ */

export function postDocument(doc: SimDocument, stock: StockSnapshot = DEFAULT_STOCK): PostingResult {
  const ctx: Ctx = { doc, movements: [], log: [], lineNo: 0 }
  const errors: string[] = []
  const steps: PostingStep[] = []

  ctx.log.push(`// ---- ОбработкаПроведения(Отказ, Режим) : ${doc.number} ----`)
  ctx.log.push(`Документ = Документы.${doc.kind}.НайтиПоНомеру("${doc.number}")`)

  /* 1 */
  steps.push({
    no: 1,
    id: 'load',
    title: 'Завантаження документа',
    user: `Система відкриває документ «${doc.title}» і читає його реквізити та табличну частину.`,
    technical:
      'Платформа створює об’єкт документа в пам’яті: шапка (реквізити) + табличні частини. Поки що це просто дані — жодного запису в регістрах не існує.',
    pseudo: `ДокОбъект = ДокументСсылка.ПолучитьОбъект();\n// ДокОбъект.Дата, .Организация, .Товары (ТаблицаЗначений)`,
    failure: 'Документ не знайдено або він помічений на видалення — проведення не почнеться.',
  })

  /* 2 */
  const missing: string[] = []
  if (!doc.date) missing.push('Дата')
  if (!doc.organization) missing.push('Организация')
  if (doc.lines.length === 0) missing.push('Табличная часть')
  if (missing.length) errors.push(`Не заповнені обов’язкові реквізити: ${missing.join(', ')}`)

  steps.push({
    no: 2,
    id: 'check',
    title: 'Перевірка реквізитів',
    user:
      missing.length === 0
        ? 'Усі обов’язкові поля заповнені: дата, організація, суми, аналітика.'
        : `Не вистачає: ${missing.join(', ')}`,
    technical:
      'Виконується ПроверитьЗаполнение() та власні перевірки модуля. Якщо Отказ = Истина — жоден рух не буде записано, транзакція відкотиться цілком.',
    pseudo: `Если НЕ ЗначениеЗаполнено(Организация) Тогда\n    Отказ = Истина;\n    Сообщить("Не заполнена организация");\nКонецЕсли;`,
    failure:
      'Порожня стаття витрат або підрозділ — документ проведеться, але аналітика буде порожня, і у звіті з відбором сума «зникне».',
  })

  /* 3 */
  steps.push({
    no: 3,
    id: 'algorithm',
    title: 'Визначення алгоритму проведення',
    user: `Система розуміє, що це «${doc.title.split(':')[0]}», і запускає відповідний сценарій обробки.`,
    technical: `Викликається процедура, прив’язана до виду документа: ${POSTING_PROCEDURE[doc.kind]}. Саме конфігурація (а не платформа) вирішує, які рухи створювати.`,
    pseudo: `Процедура ОбработкаПроведения(Отказ, Режим)\n    Движения.Очистить();\n    ${POSTING_PROCEDURE[doc.kind].split('→ ')[1]}\nКонецПроцедуры`,
    failure: 'Документ проведено «порожнім» алгоритмом → рухів немає, у звіті нічого немає.',
  })

  /* 4 */
  const decisions = doc.lines.map((l) => ({
    line: l,
    decision: resolveExpenseAccount(l.costArticle, l.department, l.account),
  }))
  steps.push({
    no: 4,
    id: 'accounts',
    title: 'Визначення рахунків',
    user: decisions
      .map((d) => `«${d.line.name}» → рахунок ${d.decision.account}`)
      .join('; '),
    technical: decisions
      .map((d) => `${d.decision.rule}\n   → ${d.decision.reason}`)
      .join('\n'),
    pseudo: `СчетЗатрат = ПолучитьСчетЗатрат(СтатьяЗатрат, Подразделение);\nСчетРасчетов = ПолучитьСчетРасчетов(ВидДоговора);`,
    failure:
      'Рахунок визначено неправильно (наприклад, 93 замість 92) — сума є в обліку, але не в тому рядку звіту.',
  })

  /* 5 */
  const analytics = doc.lines.flatMap((l) =>
    [
      l.costArticle ? `Стаття витрат = ${l.costArticle}` : null,
      l.department ? `Підрозділ = ${l.department}` : null,
      doc.counterparty ? `Контрагент = ${doc.counterparty}` : null,
      doc.warehouse ? `Склад = ${doc.warehouse}` : null,
    ].filter(Boolean) as string[],
  )
  steps.push({
    no: 5,
    id: 'analytics',
    title: 'Визначення аналітики',
    user: 'Система підставляє аналітичні розрізи: ' + [...new Set(analytics)].join(', ') + '.',
    technical:
      'Заповнюються субконто дебету і кредиту згідно з видами субконто, дозволеними на кожному рахунку, а також вимірювання регістрів накопичення. Рахунок задає, ЯКІ субконто дозволені; документ задає, ЯКІ ЗНАЧЕННЯ підставити.',
    pseudo: `Проводка.СубконтоДт[СтатьиЗатрат] = СтрокаТЧ.СтатьяЗатрат;\nПроводка.СубконтоДт[Подразделения] = СтрокаТЧ.Подразделение;\nПроводка.СубконтоКт[Контрагенты]   = Шапка.Контрагент;`,
    failure:
      'Найчастіша причина «витрата не видно у звіті»: сума записана без статті витрат, а звіт групує саме за статтею.',
  })

  /* 6 */
  const beforeCount = ctx.movements.length
  buildMovements(ctx, stock)
  const produced = ctx.movements.slice(beforeCount).map((m) => m.id)

  const byRegister = new Map<string, number>()
  for (const m of ctx.movements) byRegister.set(m.register, (byRegister.get(m.register) ?? 0) + 1)

  steps.push({
    no: 6,
    id: 'movements',
    title: 'Формування рухів',
    user: `Сформовано ${ctx.movements.length} рух(ів) у ${byRegister.size} регістр(ах).`,
    technical:
      'Рухи створюються в ПАМ’ЯТІ як набори записів (НаборЗаписей). Це ще не запис у базу: тут їх можна змінювати, перевіряти, скасовувати.\n' +
      [...byRegister.entries()].map(([r, n]) => `  ${r}: ${n} запис(ів)`).join('\n'),
    pseudo: `Движение = Движения.Хозрасчетный.Добавить();\nДвижение.Период = Дата;\nДвижение.СчетДт = ПланыСчетов.Хозрасчетный.Счет92;\nДвижение.СчетКт = ПланыСчетов.Хозрасчетный.Счет631;\nДвижение.Сумма  = СтрокаТЧ.Сумма;`,
    produced,
    failure:
      'Рух сформовано не в той регістр — дані є, але звіт читає інше джерело і їх не бачить.',
  })

  /* 7 */
  steps.push({
    no: 7,
    id: 'write',
    title: 'Запис рухів у регістри',
    user: 'Рухи збережено. Тепер вони існують в обліку і їх бачать звіти.',
    technical:
      'Движения.Записать() у межах транзакції. Старі рухи цього ж реєстратора видаляються та замінюються новими (Записывать = Истина). Якщо транзакція впаде — не запишеться НІЧОГО.',
    pseudo: `Движения.Хозрасчетный.Записывать = Истина;\nДвижения.ЗатратыПоСтатьям.Записывать = Истина;\n// фактичний запис виконує платформа при завершенні транзакції`,
    failure:
      'Документ проведено в закритому періоді — платформа відхилить запис або дані потраплять у період, який звіт не охоплює.',
  })

  /* 8 */
  steps.push({
    no: 8,
    id: 'done',
    title: 'Документ проведено',
    user: 'Документ отримав статус «Проведено». Дані доступні у звітах.',
    technical:
      'Проведен = Истина. Зв’язок «документ ↔ рухи» зберігається через реєстратор: розпроведення просто видалить усі рухи з цим реєстратором.',
    pseudo: `// Отказ = Ложь → платформа встановлює Проведен = Истина\n// Відтепер: РегистрБухгалтерии.Хозрасчетный.Регистратор = ЭтотДокумент`,
    failure: 'Немає — на цьому етапі помилки вже неможливі.',
  })

  const total = doc.lines.reduce((s, l) => s + l.amount, 0)
  const userSummary = buildUserSummary(doc, total, ctx.movements)

  ctx.log.push(`Движения.Записать() → OK`)
  ctx.log.push(`Проведен = Истина`)

  return {
    documentId: doc.id,
    ok: errors.length === 0,
    steps,
    movements: ctx.movements,
    log: ctx.log,
    userSummary,
    errors,
  }
}

function buildUserSummary(doc: SimDocument, total: number, movements: Movement[]): string[] {
  const expenseAmount = movements
    .filter((m): m is AccountingMovement => m.kind === 'accounting')
    .filter((m) => ['92', '93', '902', '23'].includes(m.debitAccount))
    .reduce((s, m) => s + m.amount, 0)

  const out = [`Документ «${doc.title}» проведено.`]
  if (expenseAmount > 0) out.push(`Витрати збільшились на ${money(expenseAmount)}.`)
  else if (expenseAmount < 0) out.push(`Витрати зменшились на ${money(Math.abs(expenseAmount))}.`)
  else out.push('Витрати НЕ змінились — операція не створює витрату періоду.')

  if (doc.kind === 'goodsReceipt')
    out.push(`На складі з’явився товар на ${money(total)}. Це майно, а не витрата.`)
  if (doc.kind === 'goodsSale')
    out.push('Визнано дохід від продажу і одночасно списано собівартість товару.')
  if (doc.basisDocumentId) {
    const basis = DOCUMENT_BY_ID[doc.basisDocumentId]
    if (basis) out.push(`Скориговано результат документа «${basis.number}». Сам документ не змінювався.`)
  }
  return out
}
