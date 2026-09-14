import { useMemo, useState } from 'react'
import { GitFork } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { MovementBrowser } from '@/components/PostingDebugger'
import { LmsBridge } from '@/components/LmsBridge'
import {
  Badge,
  Callout,
  Card,
  CardHeader,
  CodeBlock,
  Collapse,
  Section,
  Table,
  Td,
  Th,
} from '@/components/ui'
import { DOCUMENTS, DOCUMENT_BY_ID } from '@/engine/documents'
import { postDocument, stockFromMovements } from '@/engine/posting'
import { REGISTER_BY_ID, REGISTER_KIND_LABEL } from '@/engine/registers'
import { num } from '@/engine/format'
import type { Movement } from '@/engine/types'

const DEMO_IDS = ['doc-rent', 'doc-payroll', 'doc-goods-in', 'doc-goods-out']

export default function Movements() {
  const [docId, setDocId] = useState('doc-rent')
  const [active, setActive] = useState<string | null>(null)

  /** Локальне проведення: не чіпає загальну базу симулятора. */
  const result = useMemo(() => {
    // для реалізації потрібен попередній прихід товару — проводимо його «подумки»
    const base =
      docId === 'doc-goods-out'
        ? postDocument(DOCUMENT_BY_ID['doc-goods-in']).movements
        : ([] as Movement[])
    return postDocument(DOCUMENT_BY_ID[docId], stockFromMovements(base))
  }, [docId])

  const byRegister = useMemo(() => {
    const map = new Map<string, Movement[]>()
    for (const m of result.movements) {
      if (!map.has(m.register)) map.set(m.register, [])
      map.get(m.register)!.push(m)
    }
    return [...map.entries()]
  }, [result])

  const doc = DOCUMENT_BY_ID[docId]

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="movements"
        lead="Один документ майже ніколи не створює один запис. Він створює набір рухів у різних регістрах — і структура цих рухів різна. Саме тут руйнується спрощення «рух = проводка»."
      />

      <Card>
        <CardHeader
          icon={<GitFork size={16} />}
          title="Дерево рухів документа"
          subtitle="Оберіть документ і подивіться, на скільки різних записів він розпадається"
        />
        <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3">
          {DEMO_IDS.map((id) => {
            const d = DOCUMENT_BY_ID[id]
            return (
              <button
                key={id}
                onClick={() => {
                  setDocId(id)
                  setActive(null)
                }}
                className={cn(
                  'focus-ring rounded-lg border px-2.5 py-1.5 text-left text-[12px] transition',
                  docId === id
                    ? 'border-accent/55 bg-accent/[0.09]'
                    : 'border-line bg-surface hover:bg-elevated',
                )}
              >
                <span className="block font-mono text-[10.5px] text-muted">{d.number}</span>
                <span className="block max-w-[200px] truncate font-medium">{d.title}</span>
              </button>
            )
          })}
        </div>

        <div className="p-4">
          <div className="mb-3 rounded-lg border border-line bg-elevated px-3 py-2">
            <div className="text-[13px] font-semibold">{doc.title}</div>
            <p className="mt-0.5 text-[12px] leading-5 text-muted">{doc.comment}</p>
          </div>

          {/* дерево */}
          <div className="relative pl-5">
            <div className="absolute bottom-6 left-1.5 top-3 w-px bg-line" />
            {byRegister.map(([reg, ms]) => {
              const meta = REGISTER_BY_ID[reg]
              return (
                <div key={reg} className="relative mb-2">
                  <div className="absolute -left-3.5 top-4 h-px w-3.5 bg-line" />
                  <div className="rounded-lg border border-line bg-surface">
                    <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
                      <span className="text-[13px] font-medium">{meta?.title ?? reg}</span>
                      <Badge tone="cyan">{REGISTER_KIND_LABEL[meta?.kind ?? '']}</Badge>
                      <Badge tone="neutral" mono>{ms.length} рух(ів)</Badge>
                    </div>
                    <div className="grid gap-1 p-2">
                      {ms.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setActive(m.id)}
                          className={cn(
                            'focus-ring rounded border px-2.5 py-1.5 text-left font-mono text-[11.5px] transition',
                            active === m.id
                              ? 'border-violet/55 bg-violet/[0.09]'
                              : 'border-line bg-elevated hover:border-accent/45',
                          )}
                        >
                          {m.kind === 'accounting' && (
                            <>
                              <span className="text-accent">Дт {m.debitAccount}</span>
                              {' / '}
                              <span className="text-violet">Кт {m.creditAccount}</span>
                              {' — '}
                              <span className="font-semibold">{num(m.amount)}</span>
                            </>
                          )}
                          {m.kind === 'accumulation' && (
                            <>
                              <span className={m.recordType === 'receipt' ? 'text-ok' : 'text-danger'}>
                                {m.recordType === 'receipt' ? '+ Прихід' : '− Витрата'}
                              </span>
                              {' — '}
                              {Object.entries(m.resources)
                                .map(([k, v]) => `${k}: ${num(v)}`)
                                .join(', ')}
                            </>
                          )}
                          {m.kind === 'information' && (
                            <>
                              <span className="text-cyan">стан</span>
                              {' — '}
                              {Object.entries(m.resources)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ')}
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <MovementBrowser movements={result.movements} activeId={active} onPick={setActive} />

      <Callout kind="key" title="Чому рух ≠ проводка">
        Подивіться на структури вище. Запис регістра бухгалтерії має{' '}
        <code>Дт / Кт / субконто</code>. Запис регістра накопичення має{' '}
        <code>вид руху / вимірювання / ресурси</code> і про рахунки нічого не знає. Запис регістра
        відомостей взагалі не має ні того, ні іншого. Усі троє — <strong>рухи</strong>. Тільки
        перший — <strong>проводка</strong>.
      </Callout>

      <Section eyebrow="порівняння" title="Скільки рухів створюють різні документи">
        <Table>
          <thead>
            <tr>
              <Th>Документ</Th>
              <Th align="center">Усього рухів</Th>
              <Th align="center">Регістрів</Th>
              <Th>Які саме регістри</Th>
            </tr>
          </thead>
          <tbody>
            {DOCUMENTS.map((d) => {
              const r =
                d.id === 'doc-goods-out'
                  ? postDocument(d, stockFromMovements(postDocument(DOCUMENT_BY_ID['doc-goods-in']).movements))
                  : postDocument(d)
              const regs = [...new Set(r.movements.map((m) => m.register))]
              return (
                <tr key={d.id}>
                  <Td>
                    <span className="font-medium">{d.title}</span>
                    <span className="ml-2 font-mono text-[11px] text-faint">{d.number}</span>
                  </Td>
                  <Td align="center" mono className="font-semibold">{r.movements.length}</Td>
                  <Td align="center" mono>{regs.length}</Td>
                  <Td className="text-[12px] text-muted">
                    {regs.map((x) => REGISTER_BY_ID[x]?.title ?? x).join(' · ')}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Section>

      <Collapse title="Чому не зробити один «універсальний» регістр на все" tone="accent">
        <p className="mb-2">
          Спокуслива ідея: одна широка таблиця з усіма можливими полями. На практиці вона
          розвалюється з трьох причин.
        </p>
        <ol className="mb-2 grid list-decimal gap-1.5 pl-5 text-[13.5px] leading-6">
          <li>
            <strong>Різні ключі агрегації.</strong> Для складу ключ — {'{'}товар, склад{'}'}, для
            витрат — {'{'}стаття, підрозділ{'}'}, для ПДВ — {'{'}контрагент, ставка{'}'}. В одній
            таблиці більшість полів завжди порожні, а індекси перестають працювати.
          </li>
          <li>
            <strong>Різна швидкість змін.</strong> Податкові правила змінюються щороку, складські —
            раз на кілька років. Спільна таблиця означає, що податкова зміна зачіпає складські звіти.
          </li>
          <li>
            <strong>Різні правила цілісності.</strong> Склад не терпить від’ємних залишків, витрати —
            цілком (сторно). Спільна перевірка неможлива.
          </li>
        </ol>
        <p>
          Ціна розділення — дублювання даних і ризик розходження між регістрами. Саме тому в типових
          конфігураціях існують звіти-звірки «бухгалтерський vs управлінський облік».
        </p>
      </Collapse>

      <Card>
        <CardHeader title="Debug-вивід набору рухів" subtitle="той самий документ очима розробника" />
        <div className="p-4">
          <CodeBlock
            lang="log"
            caption={`${doc.number} — ${result.movements.length} рух(ів)`}
            code={result.log.join('\n')}
          />
        </div>
      </Card>

      <LmsBridge
        summary="Ключовий висновок для власної системи: одна подія може породжувати записи в кількох ledger'ах, і це нормально. Головне — щоб усі вони створювались в ОДНІЙ транзакції та мали однаковий source_id. Тоді ви завжди зможете відповісти на питання «що саме зробив цей документ» одним запитом."
        rows={[
          { onec: 'Набір рухів документа', lms: 'масив записів, повернутий post()', note: 'Створюються атомарно, однією транзакцією.' },
          { onec: 'Різні регістри', lms: 'кілька ledger-таблиць', note: 'Кожна зі своїм набором розрізів.' },
          { onec: 'Реєстратор', lms: 'source_type + source_id', note: 'Однакові в усіх записах одного документа.' },
          { onec: 'Розпроведення', lms: 'DELETE з усіх ledger за source_id', note: 'Теж однією транзакцією.' },
        ]}
        code={`function buildEntries(doc: ExpenseDocument): AllEntries {
  return {
    accounting: [
      { debit: '92', credit: '631', amount: doc.net,  dims: {...} },
      { debit: '6442', credit: '631', amount: doc.vat, dims: {...} },
    ],
    expenses: [
      { costArticle: doc.article, department: doc.dept, amount: doc.net },
    ],
    payables: [
      { counterparty: doc.counterparty, amount: doc.net + doc.vat, direction: 1 },
    ],
  }
}

// один виклик — один набір, одна транзакція, один source_id`}
      />
    </div>
  )
}
