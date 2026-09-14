import { NAV } from './nav'
import { GLOSSARY } from './glossary'
import { REGISTERS } from '@/engine/registers'
import { ACCOUNTS, SUBCONTO_KINDS } from '@/engine/chartOfAccounts'
import { DOCUMENTS } from '@/engine/documents'

export type HitKind = 'topic' | 'term' | 'register' | 'account' | 'document' | 'example'

export interface SearchHit {
  id: string
  kind: HitKind
  title: string
  subtitle: string
  path: string
  keywords: string
}

export const KIND_LABEL: Record<HitKind, string> = {
  topic: 'Розділ',
  term: 'Термін',
  register: 'Регістр',
  account: 'Рахунок',
  document: 'Документ',
  example: 'Приклад',
}

const EXTRA: SearchHit[] = [
  {
    id: 'x-expense-lifecycle',
    kind: 'example',
    title: 'Життєвий цикл витрати',
    subtitle: 'Дія → документ → проведення → рухи → регістри → звіт',
    path: '/expenses',
    keywords: 'витрати життєвий цикл ланцюг схема етапи витрата',
  },
  {
    id: 'x-expense-account',
    kind: 'example',
    title: 'Рахунок витрат: як система його обирає',
    subtitle: '92 vs 93 vs 902 — правило визначення',
    path: '/expenses',
    keywords: 'рахунок витрат 92 93 902 визначення алгоритм витрати',
  },
  {
    id: 'x-expense-posting',
    kind: 'example',
    title: 'Проведення витрат',
    subtitle: 'Покроковий debugger на документі оренди',
    path: '/posting',
    keywords: 'проведення витрат debugger кроки провести витрати',
  },
  {
    id: 'x-expense-correction',
    kind: 'example',
    title: 'Коригування витрат',
    subtitle: '30 000 − 5 000 = 25 000 через нові рухи',
    path: '/corrections',
    keywords: 'коригування витрат сторно мінус виправлення витрати',
  },
  {
    id: 'x-expense-report',
    kind: 'example',
    title: 'Звіт по витратах',
    subtitle: 'Запит, групування, розшифровка до документа',
    path: '/register-to-report',
    keywords: 'звіт по витратах запит групування агрегація витрати report',
  },
  {
    id: 'x-expense-vs-asset',
    kind: 'example',
    title: 'Придбання товару ≠ витрата',
    subtitle: 'Коли актив стає витратою',
    path: '/expense-cases',
    keywords: 'товар актив витрата собівартість 281 902 придбання витрати',
  },
  {
    id: 'x-ledger-model',
    kind: 'example',
    title: 'Модель LedgerEntry',
    subtitle: 'Робочий TypeScript-аналог регістра',
    path: '/ledger',
    keywords: 'ledger entry модель typescript lms аналог реалізація',
  },
]

export const SEARCH_INDEX: SearchHit[] = [
  ...NAV.map<SearchHit>((n) => ({
    id: `topic-${n.slug}`,
    kind: 'topic',
    title: `${n.no}. ${n.title}`,
    subtitle: n.short,
    path: `/${n.slug}`,
    keywords: `${n.title} ${n.short} ${n.group}`.toLowerCase(),
  })),
  ...GLOSSARY.map<SearchHit>((g) => ({
    id: `term-${g.id}`,
    kind: 'term',
    title: g.term,
    subtitle: g.simple,
    path: `/glossary?term=${g.id}`,
    keywords: `${g.term} ${(g.aliases ?? []).join(' ')} ${g.simple} ${g.technical}`.toLowerCase(),
  })),
  ...REGISTERS.map<SearchHit>((r) => ({
    id: `reg-${r.id}`,
    kind: 'register',
    title: r.title,
    subtitle: r.purpose.slice(0, 110) + '…',
    path:
      r.kind === 'accounting'
        ? '/accounting-register'
        : r.kind === 'information'
          ? '/information'
          : '/accumulation',
    keywords: `${r.title} ${r.purpose} ${r.fields.map((f) => f.name).join(' ')}`.toLowerCase(),
  })),
  ...ACCOUNTS.map<SearchHit>((a) => ({
    id: `acc-${a.code}`,
    kind: 'account',
    title: `${a.code} · ${a.title}`,
    subtitle: a.explain.slice(0, 110) + '…',
    path: '/accounting-register',
    keywords: `${a.code} ${a.title} ${a.explain} ${a.reportUsage}`.toLowerCase(),
  })),
  ...SUBCONTO_KINDS.map<SearchHit>((s) => ({
    id: `sub-${s.key}`,
    kind: 'account',
    title: `Субконто: ${s.title}`,
    subtitle: s.description.slice(0, 110) + '…',
    path: '/expenses',
    keywords: `субконто аналітика ${s.title} ${s.description}`.toLowerCase(),
  })),
  ...DOCUMENTS.map<SearchHit>((d) => ({
    id: `doc-${d.id}`,
    kind: 'document',
    title: d.title,
    subtitle: `${d.number} · ${d.date}`,
    path: '/expense-cases',
    keywords: `${d.title} ${d.number} ${d.comment} ${d.lines.map((l) => l.name).join(' ')}`.toLowerCase(),
  })),
  ...EXTRA.map((e) => ({ ...e, keywords: e.keywords.toLowerCase() })),
]

export function search(q: string, limit = 24): SearchHit[] {
  const query = q.trim().toLowerCase()
  if (!query) return []
  const words = query.split(/\s+/).filter(Boolean)

  const scored = SEARCH_INDEX.map((hit) => {
    const hay = `${hit.title} ${hit.subtitle} ${hit.keywords}`.toLowerCase()
    let score = 0
    for (const w of words) {
      if (!hay.includes(w)) return { hit, score: -1 }
      if (hit.title.toLowerCase().includes(w)) score += 10
      if (hit.title.toLowerCase().startsWith(w)) score += 6
      if (hit.subtitle.toLowerCase().includes(w)) score += 3
      score += 1
    }
    if (hit.kind === 'topic') score += 2
    return { hit, score }
  })

  return scored
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.hit)
}
