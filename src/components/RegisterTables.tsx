import { cn } from '@/lib/cn'
import { REGISTER_BY_ID, REGISTER_KIND_LABEL } from '@/engine/registers'
import { SUBCONTO_BY_KEY } from '@/engine/chartOfAccounts'
import { dmy, num, qty } from '@/engine/format'
import type {
  AccountingMovement,
  AccumulationMovement,
  InformationMovement,
  Movement,
} from '@/engine/types'
import { Badge, Empty, Table, Td, Th } from './ui'

const subLabel = (rec: Record<string, string>) =>
  Object.entries(rec)
    .filter(([, v]) => v)
    .map(([k, v]) => `${SUBCONTO_BY_KEY[k]?.title ?? k}: ${v}`)
    .join(' · ')

/* --------------------------- бухгалтерія ---------------------------- */

export function AccountingTable({
  movements,
  onPick,
  activeId,
}: {
  movements: AccountingMovement[]
  onPick?: (id: string) => void
  activeId?: string
}) {
  if (!movements.length) return <Empty>У регістрі бухгалтерії немає жодного запису.</Empty>
  return (
    <Table>
      <thead>
        <tr>
          <Th>Період</Th>
          <Th>Реєстратор</Th>
          <Th align="center">Дт</Th>
          <Th>Субконто Дт</Th>
          <Th align="center">Кт</Th>
          <Th>Субконто Кт</Th>
          <Th align="right">Кількість</Th>
          <Th align="right">Сума</Th>
        </tr>
      </thead>
      <tbody>
        {movements.map((m) => (
          <tr
            key={m.id}
            onClick={() => onPick?.(m.id)}
            className={cn(
              onPick && 'cursor-pointer hover:bg-elevated',
              activeId === m.id && 'bg-accent/[0.09]',
            )}
          >
            <Td mono>{dmy(m.period)}</Td>
            <Td className="whitespace-nowrap text-muted">{m.registrarTitle}</Td>
            <Td align="center">
              <Badge tone="accent" mono>
                {m.debitAccount}
              </Badge>
            </Td>
            <Td className="text-[11.5px] text-muted">{subLabel(m.debitSubconto) || '—'}</Td>
            <Td align="center">
              <Badge tone="violet" mono>
                {m.creditAccount}
              </Badge>
            </Td>
            <Td className="text-[11.5px] text-muted">{subLabel(m.creditSubconto) || '—'}</Td>
            <Td align="right" mono>
              {m.quantity ? qty(m.quantity) : '—'}
            </Td>
            <Td align="right" mono className={cn('font-semibold', m.amount < 0 && 'text-danger')}>
              {num(m.amount)}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

/* -------------------------- накопичення ----------------------------- */

export function AccumulationTable({
  movements,
  register,
}: {
  movements: AccumulationMovement[]
  register: string
}) {
  const meta = REGISTER_BY_ID[register]
  if (!movements.length) return <Empty>У регістрі «{meta?.title}» немає записів.</Empty>
  const dimKeys = [...new Set(movements.flatMap((m) => Object.keys(m.dimensions)))]
  const resKeys = [...new Set(movements.flatMap((m) => Object.keys(m.resources)))]
  const hasRecordType = meta?.accumulationKind !== 'turnover'

  return (
    <Table>
      <thead>
        <tr>
          <Th>Період</Th>
          <Th>Реєстратор</Th>
          {hasRecordType && <Th align="center">Вид руху</Th>}
          {dimKeys.map((k) => (
            <Th key={k}>{RES_LABEL[k] ?? k}</Th>
          ))}
          {resKeys.map((k) => (
            <Th key={k} align="right">
              {RES_LABEL[k] ?? k}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {movements.map((m) => (
          <tr key={m.id} className="hover:bg-elevated">
            <Td mono>{dmy(m.period)}</Td>
            <Td className="whitespace-nowrap text-muted">{m.registrarTitle}</Td>
            {hasRecordType && (
              <Td align="center">
                <Badge tone={m.recordType === 'receipt' ? 'ok' : 'danger'}>
                  {m.recordType === 'receipt' ? '+ Прихід' : '− Витрата'}
                </Badge>
              </Td>
            )}
            {dimKeys.map((k) => (
              <Td key={k} className="text-[12px]">
                {m.dimensions[k] ?? '—'}
              </Td>
            ))}
            {resKeys.map((k) => (
              <Td key={k} align="right" mono className="font-semibold">
                {m.resources[k] != null ? num(m.resources[k]) : '—'}
              </Td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

/* --------------------------- відомостей ----------------------------- */

export function InformationTable({
  movements,
  register,
}: {
  movements: InformationMovement[]
  register: string
}) {
  const meta = REGISTER_BY_ID[register]
  if (!movements.length) return <Empty>У регістрі «{meta?.title}» немає записів.</Empty>
  const dimKeys = [...new Set(movements.flatMap((m) => Object.keys(m.dimensions)))]
  const resKeys = [...new Set(movements.flatMap((m) => Object.keys(m.resources)))]
  return (
    <Table>
      <thead>
        <tr>
          <Th>Період</Th>
          {dimKeys.map((k) => (
            <Th key={k}>{RES_LABEL[k] ?? k}</Th>
          ))}
          {resKeys.map((k) => (
            <Th key={k} align="right">
              {RES_LABEL[k] ?? k}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {movements.map((m) => (
          <tr key={m.id} className="hover:bg-elevated">
            <Td mono>{dmy(m.period)}</Td>
            {dimKeys.map((k) => (
              <Td key={k} className="text-[12px]">
                {m.dimensions[k] ?? '—'}
              </Td>
            ))}
            {resKeys.map((k) => (
              <Td key={k} align="right" mono>
                {typeof m.resources[k] === 'number' ? num(m.resources[k] as number) : m.resources[k]}
              </Td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

/* ----------------------------- dispatcher --------------------------- */

export function RegisterView({
  movements,
  registerId,
}: {
  movements: Movement[]
  registerId: string
}) {
  const meta = REGISTER_BY_ID[registerId]
  const own = movements.filter((m) => m.register === registerId)
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold">{meta?.title}</span>
        <Badge tone="cyan">{REGISTER_KIND_LABEL[meta?.kind ?? '']}</Badge>
        {meta?.accumulationKind && (
          <Badge tone="neutral">
            {meta.accumulationKind === 'balance' ? 'залишки + обороти' : 'тільки обороти'}
          </Badge>
        )}
        <Badge tone="neutral" mono>
          {own.length} зап.
        </Badge>
      </div>
      {meta?.kind === 'accounting' && (
        <AccountingTable movements={own as AccountingMovement[]} />
      )}
      {meta?.kind === 'accumulation' && (
        <AccumulationTable movements={own as AccumulationMovement[]} register={registerId} />
      )}
      {meta?.kind === 'information' && (
        <InformationTable movements={own as InformationMovement[]} register={registerId} />
      )}
    </div>
  )
}

export const RES_LABEL: Record<string, string> = {
  organization: 'Організація',
  costArticle: 'Стаття витрат',
  department: 'Підрозділ',
  counterparty: 'Контрагент',
  contract: 'Договір',
  item: 'Номенклатура',
  warehouse: 'Склад',
  employee: 'Працівник',
  priceType: 'Тип цін',
  rate: 'Ставка ПДВ',
  amount: 'Сума',
  quantity: 'Кількість',
  vatAmount: 'Сума ПДВ',
  baseAmount: 'База',
  settlement: 'Сума розрахунків',
  price: 'Ціна',
  source: 'Джерело',
}
