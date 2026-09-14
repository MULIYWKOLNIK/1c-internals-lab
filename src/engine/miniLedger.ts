/* ------------------------------------------------------------------ *
 * Мінімальний Ledger — концептуальний аналог механізму 1С у звичайному
 * TypeScript. Це НЕ спроба відтворити платформу: тут немає метаданих,
 * віртуальних таблиць, транзакцій СУБД і плану рахунків як об'єкта.
 *
 * Перенесено чотири принципи, які дають 90% користі:
 *   1) документ і запис — різні сутності;
 *   2) записи незмінні (append-only), виправлення = новий запис;
 *   3) кожен запис знає своє джерело (аналог реєстратора);
 *   4) звіт — це функція над записами, а не збережена таблиця.
 *
 * Цей код справді виконується на сторінці «Архітектура Ledger».
 * ------------------------------------------------------------------ */

export type EntryKind = 'EXPENSE' | 'ASSET' | 'COGS' | 'INCOME' | 'SETTLEMENT' | 'TAX'

export interface ExpenseDocument {
  id: string
  number: string
  date: string
  kind: 'SERVICE_RECEIPT' | 'PAYROLL' | 'GOODS_RECEIPT' | 'GOODS_SALE'
  net: number
  vat?: number
  costArticle?: string
  department?: string
  counterparty?: string
  itemId?: string
  quantity?: number
  unitPrice?: number
  /** документ-підстава для коригування */
  adjustsDocumentId?: string
}

export interface LedgerEntry {
  readonly id: string
  readonly occurredAt: string
  readonly sourceType: string
  readonly sourceId: string
  readonly kind: EntryKind
  readonly debitAccount: string
  readonly creditAccount: string
  readonly amount: number
  readonly quantity?: number
  readonly dimensions: Readonly<Record<string, string>>
  readonly reversesEntryId?: string
  readonly note: string
}

let counter = 0
const newId = () => `E${(++counter).toString().padStart(4, '0')}`
export const resetLedgerIds = () => {
  counter = 0
}

/* ----------------------- 1. buildEntries (чиста) --------------------- */

/**
 * Аналог «алгоритму проведення». Чиста функція: ті самі вхідні дані
 * завжди дають ті самі записи. Саме тому її легко тестувати —
 * і саме тому вона не має права нічого писати в базу.
 */
export function buildEntries(
  doc: ExpenseDocument,
  ctx: { unitCost: (itemId: string, date: string) => number },
): Omit<LedgerEntry, 'id'>[] {
  const base = {
    occurredAt: doc.date,
    sourceType: doc.kind,
    sourceId: doc.id,
  }

  switch (doc.kind) {
    case 'SERVICE_RECEIPT': {
      const out: Omit<LedgerEntry, 'id'>[] = [
        {
          ...base,
          kind: 'EXPENSE',
          debitAccount: expenseAccountOf(doc),
          creditAccount: '631',
          amount: doc.net,
          dimensions: {
            costArticle: doc.costArticle ?? '',
            department: doc.department ?? '',
            counterparty: doc.counterparty ?? '',
          },
          note: 'Визнання витрати за отриманою послугою',
        },
      ]
      if (doc.vat) {
        out.push({
          ...base,
          kind: 'TAX',
          debitAccount: '6442',
          creditAccount: '631',
          amount: doc.vat,
          dimensions: { counterparty: doc.counterparty ?? '' },
          note: 'ПДВ — розрахунки з бюджетом, не витрата',
        })
      }
      return out
    }

    case 'PAYROLL':
      return [
        {
          ...base,
          kind: 'EXPENSE',
          debitAccount: expenseAccountOf(doc),
          creditAccount: '661',
          amount: doc.net,
          dimensions: {
            costArticle: doc.costArticle ?? 'Оплата праці',
            department: doc.department ?? '',
          },
          note: 'Нарахування зарплати — витрата виникає тут, а не при виплаті',
        },
      ]

    case 'GOODS_RECEIPT':
      return [
        {
          ...base,
          kind: 'ASSET',
          debitAccount: '281',
          creditAccount: '631',
          amount: doc.net,
          quantity: doc.quantity,
          dimensions: { itemId: doc.itemId ?? '', counterparty: doc.counterparty ?? '' },
          note: 'Капіталізація: актив, а НЕ витрата періоду',
        },
      ]

    case 'GOODS_SALE': {
      const qty = doc.quantity ?? 0
      const cost = ctx.unitCost(doc.itemId ?? '', doc.date) * qty
      return [
        {
          ...base,
          kind: 'INCOME',
          debitAccount: '361',
          creditAccount: '702',
          amount: (doc.unitPrice ?? 0) * qty,
          dimensions: { counterparty: doc.counterparty ?? '', itemId: doc.itemId ?? '' },
          note: 'Визнання доходу',
        },
        {
          ...base,
          kind: 'COGS',
          debitAccount: '902',
          creditAccount: '281',
          amount: cost,
          quantity: qty,
          dimensions: {
            costArticle: 'Собівартість продажів',
            itemId: doc.itemId ?? '',
          },
          note: 'Актив став витратою: собівартість узята з ledger, а не з документа',
        },
      ]
    }
  }
}

function expenseAccountOf(doc: ExpenseDocument): string {
  if (doc.costArticle === 'Реклама' || doc.department === 'Відділ продажів') return '93'
  return '92'
}

/* ------------------------- 2. Сам Ledger ---------------------------- */

export class Ledger {
  private entries: LedgerEntry[] = []
  private postedDocs = new Set<string>()

  all(): readonly LedgerEntry[] {
    return this.entries
  }

  isPosted(docId: string): boolean {
    return this.postedDocs.has(docId)
  }

  /** Середня вартість одиниці — читається з самого ledger. */
  unitCost = (itemId: string, date: string): number => {
    let qty = 0
    let sum = 0
    for (const e of this.entries) {
      if (e.dimensions.itemId !== itemId) continue
      if (e.occurredAt > date) continue
      if (e.kind === 'ASSET') {
        qty += e.quantity ?? 0
        sum += e.amount
      } else if (e.kind === 'COGS') {
        qty -= e.quantity ?? 0
        sum -= e.amount
      }
    }
    return qty > 0 ? Math.round((sum / qty) * 100) / 100 : 0
  }

  /**
   * Аналог проведення. Ідемпотентний: повторний виклик спершу
   * прибирає власні записи, потім створює нові.
   * У справжній системі все це — всередині однієї транзакції.
   */
  postExpense(doc: ExpenseDocument): LedgerEntry[] {
    this.entries = this.entries.filter((e) => e.sourceId !== doc.id) // Движения.Очистить()

    const drafts = buildEntries(doc, { unitCost: this.unitCost })
    const created = drafts.map((d) => ({ ...d, id: newId() }))
    this.entries.push(...created)
    this.postedDocs.add(doc.id)
    return created
  }

  /** Розпроведення: прибрати всі записи цього джерела. */
  unpost(docId: string): void {
    this.entries = this.entries.filter((e) => e.sourceId !== docId)
    this.postedDocs.delete(docId)
  }

  /**
   * Сторно: НЕ видаляє, а додає дзеркальні записи.
   * Історія залишається повною.
   */
  reverse(docId: string, onDate: string, reason: string): LedgerEntry[] {
    const original = this.entries.filter((e) => e.sourceId === docId && !e.reversesEntryId)
    const reversal = original.map((e) => ({
      ...e,
      id: newId(),
      occurredAt: onDate,
      amount: -e.amount,
      quantity: e.quantity != null ? -e.quantity : undefined,
      reversesEntryId: e.id,
      note: reason,
    }))
    this.entries.push(...reversal)
    return reversal
  }

  reset(): void {
    this.entries = []
    this.postedDocs.clear()
    resetLedgerIds()
  }
}

/* -------------------------- 3. Звіти -------------------------------- */

export const EXPENSE_KINDS: EntryKind[] = ['EXPENSE', 'COGS']

export interface ExpenseReportRow {
  costArticle: string
  department: string
  amount: number
  entryIds: string[]
}

/**
 * Аналог звіту. Жодного власного стану: щоразу читає ledger заново.
 * «Витрата» тут — не таблиця, а ПРАВИЛО: kind ∈ {EXPENSE, COGS}.
 */
export function getExpenses(
  ledger: Ledger,
  period: { from: string; to: string },
  filters: { costArticle?: string; department?: string } = {},
): { rows: ExpenseReportRow[]; total: number } {
  const map = new Map<string, ExpenseReportRow>()

  for (const e of ledger.all()) {
    if (!EXPENSE_KINDS.includes(e.kind)) continue
    if (e.occurredAt < period.from || e.occurredAt > period.to) continue
    const article = e.dimensions.costArticle || '(без статті)'
    const dept = e.dimensions.department || '—'
    if (filters.costArticle && article !== filters.costArticle) continue
    if (filters.department && dept !== filters.department) continue

    const key = `${article}|${dept}`
    const row = map.get(key) ?? { costArticle: article, department: dept, amount: 0, entryIds: [] }
    row.amount += e.amount
    row.entryIds.push(e.id)
    map.set(key, row)
  }

  const rows = [...map.values()].sort((a, b) => b.amount - a.amount)
  return { rows, total: rows.reduce((s, r) => s + r.amount, 0) }
}

/** Залишок активу — теж обчислення, а не збережене поле. */
export function getStock(ledger: Ledger, itemId: string, onDate: string) {
  let qty = 0
  let amount = 0
  for (const e of ledger.all()) {
    if (e.dimensions.itemId !== itemId || e.occurredAt > onDate) continue
    if (e.kind === 'ASSET') {
      qty += e.quantity ?? 0
      amount += e.amount
    } else if (e.kind === 'COGS') {
      qty -= e.quantity ?? 0
      amount -= e.amount
    }
  }
  return { qty, amount }
}

/* ---------------------- 4. Демо-документи --------------------------- */

export const DEMO_DOCS: ExpenseDocument[] = [
  {
    id: 'd1',
    number: 'SRV-001',
    date: '2026-09-01',
    kind: 'SERVICE_RECEIPT',
    net: 30000,
    vat: 6000,
    costArticle: 'Оренда',
    department: 'Адміністрація',
    counterparty: 'Бізнес-Центр',
  },
  {
    id: 'd2',
    number: 'SRV-002',
    date: '2026-09-10',
    kind: 'SERVICE_RECEIPT',
    net: 15000,
    vat: 3000,
    costArticle: 'Реклама',
    department: 'Відділ продажів',
    counterparty: 'Meta',
  },
  {
    id: 'd3',
    number: 'PAY-001',
    date: '2026-09-30',
    kind: 'PAYROLL',
    net: 40000,
    costArticle: 'Оплата праці',
    department: 'Адміністрація',
  },
  {
    id: 'd4',
    number: 'GDS-IN-001',
    date: '2026-09-05',
    kind: 'GOODS_RECEIPT',
    net: 50000,
    quantity: 10,
    itemId: 'monitor-27',
    counterparty: 'Техно-Імпорт',
  },
  {
    id: 'd5',
    number: 'GDS-OUT-001',
    date: '2026-09-20',
    kind: 'GOODS_SALE',
    net: 28000,
    quantity: 4,
    unitPrice: 7000,
    itemId: 'monitor-27',
    counterparty: 'ФОП Коваленко',
  },
]
