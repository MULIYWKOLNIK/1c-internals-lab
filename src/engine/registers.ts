import type { RegisterMeta } from './types'

/**
 * Метадані регістрів.
 *
 * Регістр — це об'єкт моделі даних 1С із заданою логічною структурою
 * (вимірювання / ресурси / реквізити / період / реєстратор).
 * Як саме платформа зберігає це фізично в СУБД — окреме питання,
 * і воно залежить від версії платформи, режиму сумісності та самої СУБД.
 */

export const REGISTERS: RegisterMeta[] = [
  {
    id: 'accounting',
    title: 'Госпрозрахунковий (регістр бухгалтерії)',
    kind: 'accounting',
    purpose:
      'Зберігає бухгалтерські записи: кореспонденцію рахунків, суму та аналітику (субконто) з боку дебету і з боку кредиту. Це джерело для ОСВ, балансу та звіту про фінрезультати.',
    fields: [
      { name: 'Період', role: 'period', type: 'Дата', description: 'Момент, на який визнано операцію. Визначає, у який місяць/квартал потрапить запис.' },
      { name: 'Реєстратор', role: 'registrar', type: 'ДокументСсылка', description: 'Документ, який створив цей запис. Через нього звіт розшифровується «до документа».' },
      { name: 'НомерСтроки', role: 'system', type: 'Число', description: 'Порядковий номер запису в межах набору рухів документа.' },
      { name: 'Организация', role: 'dimension', type: 'СправочникСсылка', description: 'Розріз обліку: в одній базі може вестися кілька юросіб.' },
      { name: 'СчетДт', role: 'dimension', type: 'ПланСчетовСсылка', description: 'Рахунок дебету — куди «прийшло» значення.' },
      { name: 'СчетКт', role: 'dimension', type: 'ПланСчетовСсылка', description: 'Рахунок кредиту — звідки «пішло».' },
      { name: 'СубконтоДт', role: 'dimension', type: 'Структура видів характеристик', description: 'Аналітика дебетового боку: набір значень за видами субконто рахунку Дт.' },
      { name: 'СубконтоКт', role: 'dimension', type: 'Структура видів характеристик', description: 'Аналітика кредитового боку.' },
      { name: 'Сумма', role: 'resource', type: 'Число', description: 'Основний ресурс — грошова оцінка операції.' },
      { name: 'Количество', role: 'resource', type: 'Число', description: 'Ресурс кількісного обліку, заповнюється лише для рахунків із кількістю.' },
      { name: 'Содержание', role: 'attribute', type: 'Строка', description: 'Реквізит: текстовий опис. Не бере участі в агрегації, лише пояснює запис людині.' },
    ],
    virtualTables: [
      { name: 'ОстаткиИОбороты', description: 'Залишок на початок, обороти Дт/Кт, залишок на кінець — у розрізі рахунків і субконто.' },
      { name: 'Обороты', description: 'Тільки обороти за період. Саме звідси беруться суми витрат у звіті про фінрезультати.' },
      { name: 'ДвиженияССубконто', description: 'Плоский список записів разом із розшифрованою аналітикою.' },
    ],
    lmsAnalog: 'DoubleEntryLedger: таблиця з debit_account / credit_account / amount / analytics_json.',
  },
  {
    id: 'expensesByArticle',
    title: 'Витрати за статтями (регістр накопичення)',
    kind: 'accumulation',
    accumulationKind: 'turnover',
    subordination: 'registrar',
    purpose:
      'Управлінський зріз витрат. Не знає про дебет і кредит — знає лише «скільки витрачено, за якою статтею, у якому підрозділі». Дає швидкі обороти без розбору кореспонденцій.',
    fields: [
      { name: 'Период', role: 'period', type: 'Дата', description: 'Дата руху.' },
      { name: 'Регистратор', role: 'registrar', type: 'ДокументСсылка', description: 'Документ-джерело.' },
      { name: 'Организация', role: 'dimension', type: 'СправочникСсылка', description: 'Вимірювання.' },
      { name: 'СтатьяЗатрат', role: 'dimension', type: 'СправочникСсылка', description: 'Вимірювання — ключовий розріз звіту про витрати.' },
      { name: 'Подразделение', role: 'dimension', type: 'СправочникСсылка', description: 'Вимірювання.' },
      { name: 'Сумма', role: 'resource', type: 'Число', description: 'Ресурс, який підсумовується.' },
      { name: 'Комментарий', role: 'attribute', type: 'Строка', description: 'Реквізит — довідкова інформація.' },
    ],
    virtualTables: [
      { name: 'Обороты', description: 'СУМА(Сумма) з групуванням за вимірюваннями і періодичністю (день/місяць/квартал).' },
    ],
    lmsAnalog: 'ExpenseLedger: date, cost_article_id, department_id, amount, source_document_id.',
  },
  {
    id: 'stock',
    title: 'Товари на складах (регістр накопичення)',
    kind: 'accumulation',
    accumulationKind: 'balance',
    subordination: 'registrar',
    purpose:
      'Класичний регістр залишків. Прихід збільшує залишок, витрата зменшує. Саме цей регістр відповідає на питання «скільки товару є зараз».',
    fields: [
      { name: 'Период', role: 'period', type: 'Дата', description: 'Дата руху.' },
      { name: 'Регистратор', role: 'registrar', type: 'ДокументСсылка', description: 'Документ-джерело.' },
      { name: 'ВидДвижения', role: 'recordType', type: 'Приход | Расход', description: 'Напрям руху. Прихід додається до залишку, витрата віднімається.' },
      { name: 'Номенклатура', role: 'dimension', type: 'СправочникСсылка', description: 'Вимірювання.' },
      { name: 'Склад', role: 'dimension', type: 'СправочникСсылка', description: 'Вимірювання.' },
      { name: 'Количество', role: 'resource', type: 'Число', description: 'Ресурс.' },
      { name: 'Сумма', role: 'resource', type: 'Число', description: 'Ресурс — вартісна оцінка залишку.' },
    ],
    virtualTables: [
      { name: 'Остатки', description: 'Залишок на задану дату: СУМА(прихід) − СУМА(витрата) за вимірюваннями.' },
      { name: 'ОстаткиИОбороты', description: 'Залишок на початок + обороти + залишок на кінець.' },
    ],
    lmsAnalog: 'InventoryLedger із колонкою direction (+1 / −1) і матеріалізованим балансом.',
  },
  {
    id: 'vat',
    title: 'Податковий кредит з ПДВ (регістр накопичення)',
    kind: 'accumulation',
    accumulationKind: 'balance',
    subordination: 'registrar',
    purpose:
      'Окремий податковий облік. Той самий документ, який створює витрату, паралельно створює запис тут — але це вже інша предметна область і зовсім інша структура запису.',
    fields: [
      { name: 'Период', role: 'period', type: 'Дата', description: 'Дата виникнення права на кредит.' },
      { name: 'Регистратор', role: 'registrar', type: 'ДокументСсылка', description: 'Документ-джерело.' },
      { name: 'ВидДвижения', role: 'recordType', type: 'Приход | Расход', description: 'Прихід — виникнення права, витрата — підтвердження/використання.' },
      { name: 'Контрагент', role: 'dimension', type: 'СправочникСсылка', description: 'Вимірювання.' },
      { name: 'Договор', role: 'dimension', type: 'СправочникСсылка', description: 'Вимірювання.' },
      { name: 'СтавкаНДС', role: 'dimension', type: 'Перечисление', description: 'Вимірювання — ставка податку.' },
      { name: 'СуммаНДС', role: 'resource', type: 'Число', description: 'Ресурс.' },
      { name: 'СуммаБезНДС', role: 'resource', type: 'Число', description: 'Ресурс — база оподаткування.' },
    ],
    virtualTables: [
      { name: 'Остатки', description: 'Непідтверджений податковий кредит на дату.' },
      { name: 'Обороты', description: 'Обороти для декларації.' },
    ],
    lmsAnalog: 'TaxLedger — окрема таблиця, бо податкові правила змінюються незалежно від бухгалтерських.',
  },
  {
    id: 'payables',
    title: 'Взаєморозрахунки з постачальниками (регістр накопичення)',
    kind: 'accumulation',
    accumulationKind: 'balance',
    subordination: 'registrar',
    purpose:
      'Оперативний контроль заборгованості. Дублює частину інформації з бухгалтерії, але у структурі, зручній для швидких перевірок при проведенні.',
    fields: [
      { name: 'Период', role: 'period', type: 'Дата', description: 'Дата руху.' },
      { name: 'Регистратор', role: 'registrar', type: 'ДокументСсылка', description: 'Документ-джерело.' },
      { name: 'ВидДвижения', role: 'recordType', type: 'Приход | Расход', description: 'Прихід — зростання боргу, витрата — погашення.' },
      { name: 'Контрагент', role: 'dimension', type: 'СправочникСсылка', description: 'Вимірювання.' },
      { name: 'Договор', role: 'dimension', type: 'СправочникСсылка', description: 'Вимірювання.' },
      { name: 'СуммаВзаиморасчетов', role: 'resource', type: 'Число', description: 'Ресурс.' },
    ],
    virtualTables: [
      { name: 'Остатки', description: 'Скільки ми винні кожному контрагенту на дату.' },
    ],
    lmsAnalog: 'AccountsPayableLedger.',
  },
  {
    id: 'itemPrices',
    title: 'Ціни номенклатури (регістр відомостей)',
    kind: 'information',
    periodicity: 'day',
    subordination: 'independent',
    purpose:
      'Зберігає стан, а не подію. Відповідає на питання «яка ціна діяла на певну дату». Не має приходу/витрати і нічого не підсумовує.',
    fields: [
      { name: 'Период', role: 'period', type: 'Дата', description: 'Дата, з якої значення набуває чинності.' },
      { name: 'Номенклатура', role: 'dimension', type: 'СправочникСсылка', description: 'Вимірювання — частина ключа.' },
      { name: 'ТипЦен', role: 'dimension', type: 'СправочникСсылка', description: 'Вимірювання — частина ключа.' },
      { name: 'Цена', role: 'resource', type: 'Число', description: 'Ресурс — саме значення стану.' },
      { name: 'Источник', role: 'attribute', type: 'Строка', description: 'Реквізит: хто/що встановило ціну.' },
    ],
    virtualTables: [
      { name: 'СрезПоследних', description: 'Останнє значення на задану дату — головний інструмент роботи з періодичним регістром відомостей.' },
      { name: 'СрезПервых', description: 'Перше значення після заданої дати.' },
    ],
    lmsAnalog: 'PriceHistory + функція priceAt(itemId, date) з ORDER BY date DESC LIMIT 1.',
  },
]

export const REGISTER_BY_ID: Record<string, RegisterMeta> = Object.fromEntries(
  REGISTERS.map((r) => [r.id, r]),
)

export function registerTitle(id: string): string {
  return REGISTER_BY_ID[id]?.title ?? id
}

export const REGISTER_KIND_LABEL: Record<string, string> = {
  accumulation: 'Регістр накопичення',
  information: 'Регістр відомостей',
  accounting: 'Регістр бухгалтерії',
  calculation: 'Регістр розрахунку',
}
