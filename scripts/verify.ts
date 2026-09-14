/* eslint-disable no-console */
/**
 * Перевірка логіки рушія симулятора.
 * Запуск: npm run verify
 */
import { DOCUMENT_BY_ID, DOCUMENTS } from '@/engine/documents'
import { postDocument, stockFromMovements, resolveExpenseAccount } from '@/engine/posting'
import {
  expenseReport,
  trialBalance,
  stockReport,
  priceSlice,
  profitAndLoss,
  accounting,
  SEPTEMBER,
} from '@/engine/reports'
import { Ledger, getExpenses, getStock, DEMO_DOCS } from '@/engine/miniLedger'
import type { Movement } from '@/engine/types'
import { QUIZ } from '@/data/quiz'
import { GLOSSARY } from '@/data/glossary'
import { NAV } from '@/data/nav'
import { SEARCH_INDEX, search } from '@/data/searchIndex'
import { DIAGNOSTICS } from '@/data/diagnostics'

let failed = 0

function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log('  PASS  ' + name)
  } else {
    failed++
    console.log('  FAIL  ' + name, extra ?? '')
  }
}

function eq(name: string, a: unknown, b: unknown) {
  check(`${name}  [${String(a)} === ${String(b)}]`, Object.is(a, b))
}

console.log('\n== engine: проведення ==')
const rent = postDocument(DOCUMENT_BY_ID['doc-rent'])
eq('оренда: 8 кроків', rent.steps.length, 8)
eq('оренда: кількість рухів', rent.movements.length, 5)
const rentAcc = accounting(rent.movements)
eq('оренда: проводок', rentAcc.length, 2)
eq('оренда: рахунок дебету', rentAcc[0].debitAccount, '92')
eq('оренда: рахунок кредиту', rentAcc[0].creditAccount, '631')
eq('оренда: сума витрати', rentAcc[0].amount, 30000)
eq('оренда: ПДВ окремою проводкою', rentAcc[1].debitAccount, '6442')
eq('оренда: сума ПДВ', rentAcc[1].amount, 6000)
check('оренда: субконто статті заповнено', rentAcc[0].debitSubconto.costArticle === 'Оренда')
check('оренда: рухи у 4 регістри', new Set(rent.movements.map((m) => m.register)).size === 4)

const ads = postDocument(DOCUMENT_BY_ID['doc-ads'])
eq('реклама дає рахунок 93', accounting(ads.movements)[0].debitAccount, '93')

const payroll = postDocument(DOCUMENT_BY_ID['doc-payroll'])
const payAcc = accounting(payroll.movements)
eq('зарплата: проводок', payAcc.length, 2)
eq('зарплата: кредит 661', payAcc[0].creditAccount, '661')
eq('ЄСВ: кредит 651', payAcc[1].creditAccount, '651')
eq(
  'зарплата: разом витрат',
  payAcc.reduce((s, m) => s + m.amount, 0),
  48800,
)

console.log('\n== engine: придбання товару не є витратою ==')
const gin = postDocument(DOCUMENT_BY_ID['doc-goods-in'])
const ginAcc = accounting(gin.movements)
eq('надходження товару: дебет 281', ginAcc[0].debitAccount, '281')
check(
  'надходження товару: жодного витратного рахунку',
  ginAcc.every((m) => !['92', '93', '902', '23'].includes(m.debitAccount)),
)
eq(
  'надходження товару: витрат нуль',
  expenseReport(gin.movements, { period: SEPTEMBER, source: 'accounting' }).total.amount,
  0,
)

const gout = postDocument(DOCUMENT_BY_ID['doc-goods-out'], stockFromMovements(gin.movements))
const goutAcc = accounting(gout.movements)
eq('реалізація: дохід на 702', goutAcc[0].creditAccount, '702')
eq('реалізація: собівартість на 902', goutAcc[1].debitAccount, '902')
eq('реалізація: собівартість 4 x 5000', goutAcc[1].amount, 20000)

console.log('\n== engine: коригування і сторно ==')
const adj = postDocument(DOCUMENT_BY_ID['doc-adjust'])
eq('коригування дає мінус', accounting(adj.movements)[0].amount, -5000)
eq(
  'оренда з коригуванням: 25 000',
  expenseReport([...rent.movements, ...adj.movements], {
    period: SEPTEMBER,
    source: 'accounting',
  }).total.amount,
  25000,
)

const rev = postDocument(DOCUMENT_BY_ID['doc-reversal'])
const adsPlusRev = [...ads.movements, ...rev.movements]
eq(
  'сторно обнуляє результат',
  expenseReport(adsPlusRev, { period: SEPTEMBER, source: 'accounting' }).total.amount,
  0,
)
eq('сторно не видаляє записів', accounting(adsPlusRev).length, 4)

console.log('\n== engine: звіти ==')
let all: Movement[] = []
for (const d of DOCUMENTS) {
  all = all.concat(postDocument(d, stockFromMovements(all)).movements)
}
const full = expenseReport(all, { period: SEPTEMBER, source: 'accounting' })
const fullMgmt = expenseReport(all, { period: SEPTEMBER, source: 'expensesByArticle' })
eq('бухгалтерія і управлінка збігаються', full.total.amount, fullMgmt.total.amount)
check('звіт про витрати непорожній', full.rows.length > 0, full.rows.length)

const tb = trialBalance(all, SEPTEMBER)
eq('ОСВ: оборот Дт = оборот Кт', Math.round(tb.total.turnDt), Math.round(tb.total.turnKt))

const monitor = stockReport(all, '2026-09-30').rows.find((r) => r.label.includes('Монітор'))
eq('залишок моніторів 10 - 4', monitor?.values.quantity, 6)

check('зріз цін непорожній', priceSlice(all, '2026-09-30').rows.length > 0)
check('фінрезультат обчислюється', typeof profitAndLoss(all, SEPTEMBER).total.amount === 'number')
eq(
  'поза періодом звіт порожній',
  expenseReport(all, { period: { from: '2026-10-01', to: '2026-10-31' }, source: 'accounting' })
    .total.amount,
  0,
)

console.log('\n== engine: визначення рахунку витрат ==')
eq('Оренда / Адміністрація', resolveExpenseAccount('Оренда', 'Адміністрація').account, '92')
eq('Реклама / Відділ продажів', resolveExpenseAccount('Реклама', 'Відділ продажів').account, '93')
eq('Собівартість продажів', resolveExpenseAccount('Собівартість продажів', undefined).account, '902')

console.log('\n== miniLedger: модель для власної системи ==')
const PER = { from: '2026-09-01', to: '2026-09-30' }
const L = new Ledger()
eq('порожній ledger', getExpenses(L, PER).total, 0)
L.postExpense(DEMO_DOCS[0])
L.postExpense(DEMO_DOCS[0])
L.postExpense(DEMO_DOCS[0])
eq('проведення ідемпотентне', getExpenses(L, PER).total, 30000)

L.reset()
L.postExpense(DEMO_DOCS[3])
eq('придбання товару не витрата', getExpenses(L, PER).total, 0)
eq('залишок після приходу', getStock(L, 'monitor-27', '2026-09-30').qty, 10)
L.postExpense(DEMO_DOCS[4])
eq('продаж створює витрату', getExpenses(L, PER).total, 20000)
eq('залишок після продажу', getStock(L, 'monitor-27', '2026-09-30').qty, 6)

L.reset()
L.postExpense(DEMO_DOCS[0])
const before = L.all().length
L.reverse('d1', '2026-09-28', 'помилка')
eq('сторно обнуляє підсумок', getExpenses(L, PER).total, 0)
eq('сторно подвоює кількість записів', L.all().length, before * 2)

L.reset()
L.postExpense({ ...DEMO_DOCS[0], date: '2026-10-01' })
eq('звіт фільтрує за датою події', getExpenses(L, PER).total, 0)

console.log('\n== контент ==')
eq('розділів у навігації', NAV.length, 21)
check('slug унікальні', new Set(NAV.map((n) => n.slug)).size === NAV.length)
check('питань у тесті не менше 20', QUIZ.length >= 20, QUIZ.length)
check(
  'індекси правильних відповідей у межах',
  QUIZ.every((q) => q.correct >= 0 && q.correct < q.options.length),
)
check('id питань унікальні', new Set(QUIZ.map((q) => q.id)).size === QUIZ.length)
check(
  'посилання питань ведуть на наявні розділи',
  QUIZ.every((q) => !q.ref || NAV.some((n) => n.slug === q.ref)),
  QUIZ.filter((q) => q.ref && !NAV.some((n) => n.slug === q.ref)).map((q) => q.id),
)
check('термінів у глосарії не менше 26', GLOSSARY.length >= 26, GLOSSARY.length)
check(
  'перехресні посилання глосарію коректні',
  GLOSSARY.every((g) => (g.related ?? []).every((r) => GLOSSARY.some((x) => x.id === r))),
  GLOSSARY.flatMap((g) => (g.related ?? []).filter((r) => !GLOSSARY.some((x) => x.id === r))),
)
eq('кроків діагностики', DIAGNOSTICS.length, 7)

console.log('\n== пошук ==')
check('індекс пошуку непорожній', SEARCH_INDEX.length > 40, SEARCH_INDEX.length)
const hits = search('витрати')
check('запит «витрати» дає результати', hits.length >= 5, hits.length)
console.log('    -> ' + hits.slice(0, 8).map((h) => h.title).join(' | '))
check('запит «сторно» знаходить термін', search('сторно').some((h) => h.title.includes('Сторно')))
check('запит «регістр» дає результати', search('регістр').length > 3)
check('запит «ledger» дає результати', search('ledger').length > 0)
const badPaths = SEARCH_INDEX.filter((h) => {
  const p = h.path.split('?')[0].replace(/^\//, '')
  return p !== '' && !NAV.some((n) => n.slug === p)
}).map((h) => h.path)
check('усі шляхи індексу існують у маршрутах', badPaths.length === 0, badPaths)

console.log('\n' + (failed === 0 ? 'ALL CHECKS PASSED' : failed + ' CHECK(S) FAILED') + '\n')
process.exit(failed === 0 ? 0 : 1)
