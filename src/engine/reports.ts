import type {
  AccountingMovement,
  AccumulationMovement,
  InformationMovement,
  Movement,
  ReportResult,
  ReportRow,
} from './types'
import { ACCOUNT_BY_CODE, accountTitle } from './chartOfAccounts'

/* ------------------------------------------------------------------ *
 * Звіти.
 *
 * Головна ідея розділу: звіт НІЧОГО не знає про документи.
 * Він знає лише: (1) з якого регістра брати дані, (2) за який період,
 * (3) за якими полями групувати. Усе інше — наслідок проведення.
 * ------------------------------------------------------------------ */

export interface Period {
  from: string
  to: string
}

export const SEPTEMBER: Period = { from: '2026-09-01', to: '2026-09-30' }

const inPeriod = (m: Movement, p: Period) => m.period >= p.from && m.period <= p.to

export function accounting(movements: Movement[]): AccountingMovement[] {
  return movements.filter((m): m is AccountingMovement => m.kind === 'accounting')
}

export function accumulation(movements: Movement[], register: string): AccumulationMovement[] {
  return movements.filter(
    (m): m is AccumulationMovement => m.kind === 'accumulation' && m.register === register,
  )
}

export function information(movements: Movement[], register: string): InformationMovement[] {
  return movements.filter(
    (m): m is InformationMovement => m.kind === 'information' && m.register === register,
  )
}

/* ------------------ 1. Звіт «Витрати за статтями» ------------------- */

export interface ExpenseFilter {
  period: Period
  costArticle?: string
  department?: string
  /** з якого джерела читати: управлінський регістр чи бухгалтерія */
  source: 'expensesByArticle' | 'accounting'
}

export function expenseReport(movements: Movement[], f: ExpenseFilter): ReportResult {
  const rows = new Map<string, ReportRow>()
  let total = 0

  if (f.source === 'expensesByArticle') {
    for (const m of accumulation(movements, 'expensesByArticle')) {
      if (!inPeriod(m, f.period)) continue
      if (f.costArticle && m.dimensions.costArticle !== f.costArticle) continue
      if (f.department && m.dimensions.department !== f.department) continue
      const key = m.dimensions.costArticle || '(без статті)'
      const sign = m.recordType === 'receipt' ? 1 : -1
      const amount = sign * (m.resources.amount ?? 0)
      const row = rows.get(key) ?? {
        key,
        label: key,
        sub: 'стаття витрат',
        values: { amount: 0 },
        children: [],
      }
      row.values.amount += amount
      const childKey = m.dimensions.department || '—'
      const child = row.children!.find((c) => c.key === childKey) ?? {
        key: childKey,
        label: childKey,
        sub: 'підрозділ',
        values: { amount: 0 },
      }
      child.values.amount += amount
      if (!row.children!.includes(child)) row.children!.push(child)
      rows.set(key, row)
      total += amount
    }
  } else {
    for (const m of accounting(movements)) {
      const a = ACCOUNT_BY_CODE[m.debitAccount]
      if (!a || a.group !== 'expense') continue
      if (!inPeriod(m, f.period)) continue
      const article = m.debitSubconto.costArticle || '(без статті)'
      const dept = m.debitSubconto.department || '—'
      if (f.costArticle && article !== f.costArticle) continue
      if (f.department && dept !== f.department) continue
      const key = article
      const row = rows.get(key) ?? {
        key,
        label: key,
        sub: `рахунок ${m.debitAccount}`,
        values: { amount: 0 },
        children: [],
      }
      row.values.amount += m.amount
      const child = row.children!.find((c) => c.key === dept) ?? {
        key: dept,
        label: dept,
        sub: 'підрозділ',
        values: { amount: 0 },
      }
      child.values.amount += m.amount
      if (!row.children!.includes(child)) row.children!.push(child)
      rows.set(key, row)
      total += m.amount
    }
  }

  const query =
    f.source === 'expensesByArticle'
      ? `-- КОНЦЕПТУАЛЬНА аналогія запиту (НЕ реальний SQL 1С)
SELECT
    СтаттяВитрат,
    Підрозділ,
    SUM(Сума) AS Сума
FROM РегістрНакопичення.ВитратиЗаСтаттями.Обороти(
        &ПочатокПеріоду, &КінецьПеріоду, Місяць,
        Організація = &Організація)
${f.costArticle ? `WHERE СтаттяВитрат = "${f.costArticle}"\n` : ''}GROUP BY СтаттяВитрат, Підрозділ
ORDER BY Сума DESC`
      : `-- КОНЦЕПТУАЛЬНА аналогія запиту (НЕ реальний SQL 1С)
SELECT
    СубконтоДт1 AS СтаттяВитрат,
    СубконтоДт2 AS Підрозділ,
    SUM(СумаОборотДт) AS Сума
FROM РегістрБухгалтерії.Госпрозрахунковий.Обороти(
        &ПочатокПеріоду, &КінецьПеріоду, ,
        Рахунок В ІЄРАРХІЇ (92, 93, 902, 23), ,
        Організація = &Організація, , )
GROUP BY СубконтоДт1, СубконтоДт2`

  return {
    title: 'Витрати за статтями',
    columns: [
      { key: 'label', title: 'Стаття / підрозділ' },
      { key: 'amount', title: 'Сума, грн', align: 'right' },
    ],
    rows: [...rows.values()].sort((a, b) => b.values.amount - a.values.amount),
    total: { amount: total },
    query,
    sources:
      f.source === 'expensesByArticle'
        ? ['РегістрНакопичення.ВитратиЗаСтаттями']
        : ['РегістрБухгалтерії.Госпрозрахунковий'],
    note:
      f.source === 'expensesByArticle'
        ? 'Джерело — регістр накопичення оборотів. Він не знає про дебет/кредит: звіт просто підсумовує ресурс «Сума» за вимірюваннями.'
        : 'Джерело — регістр бухгалтерії. Звіт бере ОБОРОТ ПО ДЕБЕТУ витратних рахунків і розшифровує його за субконто. Суми мають збігатися з управлінським регістром — якщо не збігаються, значить проведення записало не все.',
  }
}

/* --------------- 2. Оборотно-сальдова відомість (ОСВ) --------------- */

export function trialBalance(movements: Movement[], period: Period): ReportResult {
  const map = new Map<string, ReportRow>()
  const touch = (code: string) => {
    const r = map.get(code) ?? {
      key: code,
      label: `${code} · ${accountTitle(code)}`,
      sub: ACCOUNT_BY_CODE[code]?.group,
      values: { openDt: 0, openKt: 0, turnDt: 0, turnKt: 0, endDt: 0, endKt: 0 },
    }
    map.set(code, r)
    return r
  }

  for (const m of accounting(movements)) {
    const before = m.period < period.from
    const within = inPeriod(m, period)
    if (!before && !within) continue
    const dt = touch(m.debitAccount)
    const kt = touch(m.creditAccount)
    if (before) {
      dt.values.openDt += m.amount
      kt.values.openKt += m.amount
    } else {
      dt.values.turnDt += m.amount
      kt.values.turnKt += m.amount
    }
  }

  for (const r of map.values()) {
    const open = r.values.openDt - r.values.openKt
    const end = open + r.values.turnDt - r.values.turnKt
    r.values.openDt = open > 0 ? open : 0
    r.values.openKt = open < 0 ? -open : 0
    r.values.endDt = end > 0 ? end : 0
    r.values.endKt = end < 0 ? -end : 0
  }

  const rows = [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
  const total = rows.reduce(
    (acc, r) => {
      for (const k of Object.keys(r.values)) acc[k] = (acc[k] ?? 0) + r.values[k]
      return acc
    },
    {} as Record<string, number>,
  )

  return {
    title: 'Оборотно-сальдова відомість',
    columns: [
      { key: 'label', title: 'Рахунок' },
      { key: 'openDt', title: 'Сальдо поч. Дт', align: 'right' },
      { key: 'openKt', title: 'Сальдо поч. Кт', align: 'right' },
      { key: 'turnDt', title: 'Оборот Дт', align: 'right' },
      { key: 'turnKt', title: 'Оборот Кт', align: 'right' },
      { key: 'endDt', title: 'Сальдо кін. Дт', align: 'right' },
      { key: 'endKt', title: 'Сальдо кін. Кт', align: 'right' },
    ],
    rows,
    total,
    query: `-- КОНЦЕПТУАЛЬНА аналогія
SELECT
    Рахунок,
    СальдоПочатковеДт, СальдоПочатковеКт,
    ОборотДт, ОборотКт,
    СальдоКінцевеДт, СальдоКінцевеКт
FROM РегістрБухгалтерії.Госпрозрахунковий.ЗалишкиТаОбороти(
        &ПочатокПеріоду, &КінецьПеріоду, , , , Організація = &Організація)
ORDER BY Рахунок`,
    sources: ['РегістрБухгалтерії.Госпрозрахунковий'],
    note:
      'Рівність «Оборот Дт = Оборот Кт» по всій відомості — наслідок того, що кожен запис одночасно потрапляє і в дебет, і в кредит. Це не окрема перевірка, а властивість структури даних.',
  }
}

/* -------------------- 3. Залишки товарів на складі ------------------- */

export function stockReport(movements: Movement[], onDate: string): ReportResult {
  const map = new Map<string, ReportRow>()
  for (const m of accumulation(movements, 'stock')) {
    if (m.period > onDate) continue
    const key = `${m.dimensions.item}|${m.dimensions.warehouse}`
    const row = map.get(key) ?? {
      key,
      label: m.dimensions.item,
      sub: m.dimensions.warehouse,
      values: { quantity: 0, amount: 0 },
    }
    const sign = m.recordType === 'receipt' ? 1 : -1
    row.values.quantity += sign * (m.resources.quantity ?? 0)
    row.values.amount += sign * (m.resources.amount ?? 0)
    map.set(key, row)
  }
  const rows = [...map.values()]
  return {
    title: `Залишки товарів на ${onDate}`,
    columns: [
      { key: 'label', title: 'Номенклатура' },
      { key: 'quantity', title: 'Кількість', align: 'right' },
      { key: 'amount', title: 'Сума, грн', align: 'right' },
    ],
    rows,
    total: {
      quantity: rows.reduce((s, r) => s + r.values.quantity, 0),
      amount: rows.reduce((s, r) => s + r.values.amount, 0),
    },
    query: `-- КОНЦЕПТУАЛЬНА аналогія
SELECT Номенклатура, Склад, КількістьЗалишок, СумаЗалишок
FROM РегістрНакопичення.ТовариНаСкладах.Залишки(&НаДату)

-- «Залишок» не зберігається як окреме поле-істина:
-- це SUM(прихід) − SUM(витрата) за вимірюваннями.`,
    sources: ['РегістрНакопичення.ТовариНаСкладах'],
    note:
      'Це регістр залишків: у нього є вид руху (прихід/витрата). Залишок — обчислювана величина, а не збережене число.',
  }
}

/* ----------------- 4. Зріз останніх: ціна на дату ------------------- */

export function priceSlice(movements: Movement[], onDate: string): ReportResult {
  const latest = new Map<string, InformationMovement>()
  for (const m of information(movements, 'itemPrices')) {
    if (m.period > onDate) continue
    const key = `${m.dimensions.item}|${m.dimensions.priceType}`
    const prev = latest.get(key)
    if (!prev || m.period >= prev.period) latest.set(key, m)
  }
  const rows: ReportRow[] = [...latest.values()].map((m) => ({
    key: m.id,
    label: m.dimensions.item,
    sub: `${m.dimensions.priceType} · діє з ${m.period}`,
    values: { price: Number(m.resources.price) || 0 },
  }))
  return {
    title: `Зріз останніх на ${onDate}`,
    columns: [
      { key: 'label', title: 'Номенклатура' },
      { key: 'price', title: 'Ціна, грн', align: 'right' },
    ],
    rows,
    total: { price: rows.reduce((s, r) => s + r.values.price, 0) },
    query: `-- КОНЦЕПТУАЛЬНА аналогія «СрезПоследних»
SELECT Номенклатура, ТипЦін, Ціна
FROM РегістрВідомостей.ЦіниНоменклатури.ЗрізОстанніх(&НаДату)

-- еквівалент у звичайній БД:
-- SELECT DISTINCT ON (item_id, price_type) *
-- FROM price_history WHERE date <= :on_date
-- ORDER BY item_id, price_type, date DESC`,
    sources: ['РегістрВідомостей.ЦіниНоменклатури'],
    note:
      'Регістр відомостей зберігає СТАН. Тут немає приходу/витрати і нічого не підсумовується — питання завжди звучить «яке значення діяло на дату».',
  }
}

/* ------------------- 5. Заборгованість постачальникам ---------------- */

export function payablesReport(movements: Movement[], onDate: string): ReportResult {
  const map = new Map<string, ReportRow>()
  for (const m of accumulation(movements, 'payables')) {
    if (m.period > onDate) continue
    const key = `${m.dimensions.counterparty}|${m.dimensions.contract}`
    const row = map.get(key) ?? {
      key,
      label: m.dimensions.counterparty,
      sub: m.dimensions.contract,
      values: { settlement: 0 },
    }
    const sign = m.recordType === 'receipt' ? 1 : -1
    row.values.settlement += sign * (m.resources.settlement ?? 0)
    map.set(key, row)
  }
  const rows = [...map.values()]
  return {
    title: `Заборгованість перед постачальниками на ${onDate}`,
    columns: [
      { key: 'label', title: 'Контрагент / договір' },
      { key: 'settlement', title: 'Борг, грн', align: 'right' },
    ],
    rows,
    total: { settlement: rows.reduce((s, r) => s + r.values.settlement, 0) },
    query: `SELECT Контрагент, Договір, СумаВзаєморозрахунківЗалишок
FROM РегістрНакопичення.ВзаєморозрахункиЗПостачальниками.Залишки(&НаДату)`,
    sources: ['РегістрНакопичення.ВзаєморозрахункиЗПостачальниками'],
    note:
      'Ті самі гроші, що й на рахунку 631, але в іншій структурі. Оперативний регістр швидший для перевірок при проведенні; бухгалтерія — джерело істини для звітності.',
  }
}

/* ------------------- 6. Фінансовий результат ------------------------- */

export function profitAndLoss(movements: Movement[], period: Period): ReportResult {
  let income = 0
  const expenseByAccount = new Map<string, number>()
  for (const m of accounting(movements)) {
    if (!inPeriod(m, period)) continue
    if (ACCOUNT_BY_CODE[m.creditAccount]?.group === 'income') income += m.amount
    const a = ACCOUNT_BY_CODE[m.debitAccount]
    if (a?.group === 'expense')
      expenseByAccount.set(m.debitAccount, (expenseByAccount.get(m.debitAccount) ?? 0) + m.amount)
  }
  const rows: ReportRow[] = [
    { key: 'income', label: 'Чистий дохід від реалізації', sub: 'оборот Кт 702', values: { amount: income } },
    ...[...expenseByAccount.entries()].map(([code, amount]) => ({
      key: code,
      label: `${accountTitle(code)}`,
      sub: `оборот Дт ${code}`,
      values: { amount: -amount },
    })),
  ]
  const result = rows.reduce((s, r) => s + r.values.amount, 0)
  return {
    title: 'Фінансовий результат (спрощено)',
    columns: [
      { key: 'label', title: 'Показник' },
      { key: 'amount', title: 'Сума, грн', align: 'right' },
    ],
    rows,
    total: { amount: result },
    query: `-- КОНЦЕПТУАЛЬНА аналогія
SELECT
    SUM(CASE WHEN Рахунок.Вид = "Доходи"  THEN ОборотКт ELSE 0 END) AS Дохід,
    SUM(CASE WHEN Рахунок.Вид = "Витрати" THEN ОборотДт ELSE 0 END) AS Витрати
FROM РегістрБухгалтерії.Госпрозрахунковий.Обороти(&Початок, &Кінець, , , , , , )`,
    sources: ['РегістрБухгалтерії.Госпрозрахунковий'],
    note:
      'Прибуток — це не окреме поле в базі. Це різниця двох агрегатів, обчислена в момент побудови звіту.',
  }
}
