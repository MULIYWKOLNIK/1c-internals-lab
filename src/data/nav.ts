export interface NavItem {
  no: string
  slug: string
  title: string
  short: string
  group: string
  star?: boolean
}

export const NAV: NavItem[] = [
  { no: '01', slug: 'basics', title: 'Основи', short: 'Подія → дані → відповідь', group: 'Фундамент' },
  { no: '02', slug: 'architecture', title: 'Як влаштована 1С', short: 'Платформа, конфігурація, дані', group: 'Фундамент' },
  { no: '03', slug: 'register', title: 'Що таке регістр', short: 'Об’єкт моделі даних, а не таблиця', group: 'Фундамент' },
  { no: '04', slug: 'dimensions', title: 'Виміри та ресурси', short: 'Ключ, значення, реквізит', group: 'Структури даних' },
  { no: '05', slug: 'accumulation', title: 'Регістр накопичення', short: 'Прихід, витрата, залишок', group: 'Структури даних' },
  { no: '06', slug: 'information', title: 'Регістр відомостей', short: 'Стан на дату, зріз останніх', group: 'Структури даних' },
  { no: '07', slug: 'accounting-register', title: 'Регістр бухгалтерії', short: 'Дт/Кт, субконто, обороти', group: 'Структури даних' },
  { no: '08', slug: 'posting', title: 'Проведення', short: 'Debugger проведення', group: 'Механіка' },
  { no: '09', slug: 'movements', title: 'Рухи', short: 'Один документ — багато рухів', group: 'Механіка' },
  { no: '10', slug: 'doc-to-register', title: 'Документ → Регістр', short: 'Анімований шлях суми', group: 'Механіка' },
  { no: '11', slug: 'expenses', title: 'Витрати', short: 'Життєвий цикл витрати', group: 'Витрати', star: true },
  { no: '12', slug: 'expense-cases', title: 'Витрати: приклади', short: '5 сценаріїв із симулятором', group: 'Витрати' },
  { no: '13', slug: 'corrections', title: 'Коригування та сторно', short: 'Компенсація замість видалення', group: 'Витрати' },
  { no: '14', slug: 'register-to-report', title: 'Регістр → Звіт', short: 'Запит, агрегація, результат', group: 'Витрати' },
  { no: '15', slug: 'lms', title: 'Аналог у власній системі', short: 'Event · Transaction · Ledger', group: 'Перенесення' },
  { no: '16', slug: 'ledger', title: 'Архітектура Ledger', short: 'Робоча модель на TypeScript', group: 'Перенесення' },
  { no: '17', slug: 'debug', title: 'Debug mode', short: 'Два погляди на ту саму дію', group: 'Практика' },
  { no: '18', slug: 'diagnostics', title: 'Діагностика', short: 'Витрати немає у звіті', group: 'Практика' },
  { no: '19', slug: 'quiz', title: 'Тест', short: '22 питання на розуміння', group: 'Практика' },
  { no: '20', slug: 'glossary', title: 'Глосарій', short: '26 термінів із аналогами', group: 'Довідка' },
  { no: '21', slug: 'map', title: 'Загальна карта', short: 'Повна картина системи', group: 'Довідка' },
]

export const NAV_BY_SLUG: Record<string, NavItem> = Object.fromEntries(NAV.map((n) => [n.slug, n]))

export const NAV_GROUPS = NAV.reduce<{ group: string; items: NavItem[] }[]>((acc, item) => {
  const last = acc[acc.length - 1]
  if (last && last.group === item.group) last.items.push(item)
  else acc.push({ group: item.group, items: [item] })
  return acc
}, [])

export function neighbours(slug: string): { prev?: NavItem; next?: NavItem } {
  const i = NAV.findIndex((n) => n.slug === slug)
  if (i < 0) return {}
  return { prev: NAV[i - 1], next: NAV[i + 1] }
}
