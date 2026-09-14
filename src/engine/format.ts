const nf = new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nfInt = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 })

export function money(v: number): string {
  return `${nf.format(v)} грн`
}

export function num(v: number): string {
  return nf.format(v)
}

export function qty(v: number): string {
  return nfInt.format(v)
}

export function signed(v: number): string {
  return (v > 0 ? '+' : '') + nf.format(v)
}

/** 2026-09-01 → 01.09.2026 */
export function dmy(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

const MONTHS = [
  'січень', 'лютий', 'березень', 'квітень', 'травень', 'червень',
  'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень',
]

export function monthLabel(iso: string): string {
  const [y, m] = iso.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`
}
