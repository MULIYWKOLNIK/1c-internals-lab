import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Play,
  RotateCcw,
  Terminal,
  User,
  Wrench,
  CheckCircle2,
  Loader2,
  ArrowRight,
  FileText,
  Database,
  AlertTriangle,
  SkipForward,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useStore } from '@/state/store'
import { DOCUMENTS, DOCUMENT_BY_ID, DOC_KIND_LABEL, POSTING_PROCEDURE } from '@/engine/documents'
import { REGISTER_BY_ID } from '@/engine/registers'
import { dmy, money, num } from '@/engine/format'
import type { AccountingMovement, Movement, PostingResult } from '@/engine/types'
import { Badge, Button, Card, CardHeader, CodeBlock, Callout, Tabs, Empty } from './ui'
import { RES_LABEL } from './RegisterTables'

export function PostingDebugger({
  documentIds,
  initialId,
  title = 'Debugger проведення',
}: {
  documentIds?: string[]
  initialId?: string
  title?: string
}) {
  const store = useStore()
  const ids = documentIds ?? DOCUMENTS.map((d) => d.id)
  const [docId, setDocId] = useState(initialId ?? ids[0])
  const [step, setStep] = useState(-1)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<PostingResult | null>(null)
  const [activeMovement, setActiveMovement] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const doc = DOCUMENT_BY_ID[docId]
  const posted = store.isPosted(docId)

  const resultsRef = useRef(store.results)
  resultsRef.current = store.results

  // Скидаємо стан ЛИШЕ при зміні документа. Інакше запис у сховище
  // під час проведення миттєво «перемотав» би анімацію в кінець.
  useEffect(() => {
    const existing = resultsRef.current[docId]
    if (existing) {
      setResult(existing)
      setStep(existing.steps.length - 1)
    } else {
      setResult(null)
      setStep(-1)
    }
    setActiveMovement(null)
    setRunning(false)
    if (timer.current) window.clearInterval(timer.current)
  }, [docId])

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current) }, [])

  const run = () => {
    const res = store.post(docId)
    setResult(res)
    setStep(0)
    setRunning(true)
    let i = 0
    timer.current = window.setInterval(() => {
      i += 1
      if (i >= res.steps.length) {
        window.clearInterval(timer.current!)
        setRunning(false)
        setStep(res.steps.length - 1)
        return
      }
      setStep(i)
    }, 620)
  }

  const skip = () => {
    if (timer.current) window.clearInterval(timer.current)
    setRunning(false)
    if (result) setStep(result.steps.length - 1)
  }

  const reset = () => {
    if (timer.current) window.clearInterval(timer.current)
    store.unpost(docId)
    setResult(null)
    setStep(-1)
    setRunning(false)
    setActiveMovement(null)
  }

  const finished = result != null && step >= result.steps.length - 1 && !running
  const movementsByRegister = useMemo(() => {
    const map = new Map<string, Movement[]>()
    for (const m of result?.movements ?? []) {
      if (!map.has(m.register)) map.set(m.register, [])
      map.get(m.register)!.push(m)
    }
    return map
  }, [result])

  const visibleMovements = finished ? (result?.movements ?? []) : []

  return (
    <div className="grid gap-4">
      {/* ------------------------- панель керування ------------------------ */}
      <Card>
        <CardHeader
          icon={<Terminal size={16} />}
          title={title}
          subtitle="Оберіть документ і подивіться, що саме робить система під час проведення"
          right={
            <Tabs
              size="sm"
              value={store.mode}
              onChange={store.setMode}
              tabs={[
                { id: 'user', label: <span className="flex items-center gap-1"><User size={12} /> User</span> },
                { id: 'debug', label: <span className="flex items-center gap-1"><Wrench size={12} /> Debug</span> },
              ]}
            />
          }
        />

        <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3">
          {ids.map((id) => {
            const d = DOCUMENT_BY_ID[id]
            return (
              <button
                key={id}
                onClick={() => setDocId(id)}
                className={cn(
                  'focus-ring rounded-lg border px-2.5 py-1.5 text-left text-[12px] transition',
                  docId === id
                    ? 'border-accent/55 bg-accent/[0.09]'
                    : 'border-line bg-surface hover:bg-elevated',
                )}
              >
                <span className="block font-mono text-[10.5px] text-muted">{d.number}</span>
                <span className="block max-w-[190px] truncate font-medium">{d.title}</span>
                {store.isPosted(id) && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-ok">
                    <CheckCircle2 size={10} /> проведено
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* -------------------------- документ -------------------------- */}
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-faint">
              <FileText size={13} /> Документ (дані)
            </div>
            <div className="rounded-lg border border-line bg-elevated p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="cyan">{DOC_KIND_LABEL[doc.kind]}</Badge>
                <span className="font-mono text-[12px] text-muted">{doc.number}</span>
                <span className="font-mono text-[12px] text-muted">від {dmy(doc.date)}</span>
              </div>
              <div className="mt-1.5 text-[14px] font-semibold">{doc.title}</div>
              <div className="mt-2 grid gap-1">
                {doc.lines.map((l) => (
                  <div
                    key={l.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line2 py-1 last:border-0"
                  >
                    <span className="text-[12.5px]">{l.name}</span>
                    <span className="font-mono text-[12.5px] font-semibold tabular-nums">
                      {l.quantity ? `${l.quantity} × ${num(l.price ?? 0)} = ` : ''}
                      {num(l.amount)}
                      {l.vat ? <span className="text-muted"> (+ПДВ {num(l.vat)})</span> : null}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[12px] leading-5 text-muted">{doc.comment}</p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-faint">
              <Database size={13} /> Стан регістрів
            </div>
            <div
              className={cn(
                'rounded-lg border p-3 transition',
                finished ? 'border-ok/45 bg-ok/[0.07]' : 'border-line bg-elevated',
              )}
            >
              {!finished ? (
                <>
                  <div className="font-mono text-[13px] text-muted">0 записів</div>
                  <p className="mt-1 text-[12.5px] leading-5 text-muted">
                    Документ існує, але в обліку його ще <strong className="text-fg">немає</strong>.
                    Жоден звіт його не побачить. Документ ≠ запис в обліку.
                  </p>
                </>
              ) : (
                <>
                  <div className="font-mono text-[13px] font-semibold text-ok">
                    {result!.movements.length} рух(ів) у {movementsByRegister.size} регістр(ах)
                  </div>
                  <div className="mt-1.5 grid gap-1">
                    {[...movementsByRegister.entries()].map(([reg, ms]) => (
                      <div key={reg} className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="truncate text-muted">{REGISTER_BY_ID[reg]?.title ?? reg}</span>
                        <Badge tone="ok" mono>{ms.length}</Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" onClick={run} disabled={running || finished}>
                {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Провести документ
              </Button>
              {running && (
                <Button onClick={skip} variant="ghost">
                  <SkipForward size={14} /> Пропустити анімацію
                </Button>
              )}
              <Button onClick={reset} disabled={!posted && !result}>
                <RotateCcw size={14} /> Розпровести
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ---------------------------- кроки -------------------------------- */}
      {result && (
        <Card>
          <CardHeader
            icon={<Wrench size={16} />}
            title="Що робить система, крок за кроком"
            subtitle={
              store.mode === 'debug'
                ? POSTING_PROCEDURE[doc.kind]
                : 'Переключіть режим на Debug, щоб побачити технічні деталі кожного кроку'
            }
            right={<Badge tone="accent" mono>{Math.min(step + 1, result.steps.length)}/{result.steps.length}</Badge>}
          />
          <div className="grid gap-2 p-4">
            {result.steps.map((s, i) => {
              const state = i < step ? 'done' : i === step ? 'current' : 'pending'
              return (
                <div
                  key={s.id}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 transition-all',
                    state === 'pending' && 'border-line bg-surface opacity-40',
                    state === 'current' && 'border-accent/55 bg-accent/[0.07] shadow-sm',
                    state === 'done' && 'border-line bg-elevated',
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold',
                        state === 'pending' && 'bg-line text-muted',
                        state === 'current' && 'bg-accent text-white',
                        state === 'done' && 'bg-ok text-white',
                      )}
                    >
                      {state === 'done' ? <CheckCircle2 size={12} /> : s.no}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold">{s.title}</div>
                      {state !== 'pending' && (
                        <div className="mt-1 animate-fade-up">
                          <p className="text-[13px] leading-6 text-fg/85">{s.user}</p>
                          {store.mode === 'debug' && (
                            <div className="mt-2 grid gap-2">
                              <div className="rounded border border-line bg-surface px-2.5 py-1.5">
                                <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan">
                                  технічно
                                </div>
                                <p className="whitespace-pre-line text-[12.5px] leading-6 text-muted">
                                  {s.technical}
                                </p>
                              </div>
                              {s.pseudo && <CodeBlock code={s.pseudo} caption="Псевдокод етапу" />}
                              {s.failure && (
                                <div className="flex gap-1.5 rounded border border-warn/35 bg-warn/[0.07] px-2.5 py-1.5">
                                  <AlertTriangle size={12} className="mt-0.5 shrink-0 text-warn" />
                                  <p className="text-[12px] leading-5 text-fg/80">
                                    <span className="font-semibold text-warn">Що може піти не так: </span>
                                    {s.failure}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ---------------------------- результат ---------------------------- */}
      {finished && result && (
        <>
          <Card className="border-ok/35">
            <CardHeader
              icon={<CheckCircle2 size={16} />}
              title="Було → Стало"
              subtitle="Документ сам по собі нічого не змінює. Змінюють рухи, які він створив."
            />
            <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto_1fr]">
              <div className="rounded-lg border border-line bg-elevated p-3">
                <div className="mb-1 text-[11px] uppercase tracking-wide text-faint">Було</div>
                <div className="font-mono text-[12.5px] leading-6 text-muted">
                  Документ{'\n'}0 записів у регістрах{'\n'}Витрати у звіті: 0,00
                </div>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight size={20} className="text-ok" />
              </div>
              <div className="rounded-lg border border-ok/40 bg-ok/[0.07] p-3">
                <div className="mb-1 text-[11px] uppercase tracking-wide text-ok">Стало</div>
                <div className="whitespace-pre-line font-mono text-[12.5px] leading-6">
                  {`Документ\n  ↓\n${result.movements.length} рухи\n  ↓\n${movementsByRegister.size} регістри\n  ↓\nбухгалтерський результат`}
                </div>
              </div>
            </div>
            <div className="border-t border-line px-4 py-3">
              {store.mode === 'user' ? (
                <div className="grid gap-1">
                  {result.userSummary.map((s) => (
                    <p key={s} className="text-[13.5px] leading-6">
                      {s}
                    </p>
                  ))}
                </div>
              ) : (
                <CodeBlock
                  caption="Debug output"
                  lang="log"
                  code={[
                    `Document ID: ${doc.id}`,
                    `Number: ${doc.number}`,
                    `Date: ${doc.date}`,
                    ``,
                    `Posting procedure:`,
                    `  ${POSTING_PROCEDURE[doc.kind]}`,
                    ``,
                    `Movements: ${result.movements.length}`,
                    ...result.movements.map((m, i) => movementDebugLine(m, i)),
                    ``,
                    ...result.log,
                  ].join('\n')}
                />
              )}
            </div>
          </Card>

          <MovementBrowser
            movements={visibleMovements}
            activeId={activeMovement}
            onPick={setActiveMovement}
          />
        </>
      )}
    </div>
  )
}

function movementDebugLine(m: Movement, i: number): string {
  if (m.kind === 'accounting')
    return `  ${i + 1}. register=Accounting debit=${m.debitAccount} credit=${m.creditAccount} amount=${m.amount}`
  if (m.kind === 'accumulation')
    return `  ${i + 1}. register=${m.register} type=${m.recordType} ${JSON.stringify(m.resources)}`
  return `  ${i + 1}. register=${m.register} ${JSON.stringify(m.resources)}`
}

/* ------------------ браузер рухів: клік на кожен рух ----------------- */

export function MovementBrowser({
  movements,
  activeId,
  onPick,
}: {
  movements: Movement[]
  activeId: string | null
  onPick: (id: string | null) => void
}) {
  if (!movements.length) return <Empty>Немає рухів для перегляду.</Empty>
  const active = movements.find((m) => m.id === activeId) ?? movements[0]

  return (
    <Card>
      <CardHeader
        icon={<Database size={16} />}
        title="Один документ — багато рухів"
        subtitle="Натисніть на будь-який рух, щоб побачити його структуру й призначення"
        right={<Badge tone="violet" mono>{movements.length} рух(ів)</Badge>}
      />
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="grid gap-1.5 self-start">
          {movements.map((m, i) => (
            <button
              key={m.id}
              onClick={() => onPick(m.id)}
              className={cn(
                'focus-ring rounded-lg border px-2.5 py-2 text-left transition',
                active.id === m.id
                  ? 'border-violet/55 bg-violet/[0.08]'
                  : 'border-line bg-surface hover:bg-elevated',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-faint">рух {i + 1}</span>
                <Badge
                  tone={
                    m.kind === 'accounting' ? 'accent' : m.kind === 'accumulation' ? 'ok' : 'cyan'
                  }
                >
                  {m.kind === 'accounting'
                    ? 'бухгалтерія'
                    : m.kind === 'accumulation'
                      ? 'накопичення'
                      : 'відомості'}
                </Badge>
              </div>
              <div className="mt-0.5 truncate text-[12.5px] font-medium">
                {REGISTER_BY_ID[m.register]?.title ?? m.register}
              </div>
              <div className="truncate font-mono text-[11.5px] text-muted">
                {m.kind === 'accounting'
                  ? `Дт ${m.debitAccount} / Кт ${m.creditAccount} — ${num(m.amount)}`
                  : m.kind === 'accumulation'
                    ? `${m.recordType === 'receipt' ? '+' : '−'} ${Object.values(m.resources).map(num).join(' / ')}`
                    : Object.values(m.resources).join(' / ')}
              </div>
            </button>
          ))}
        </div>

        <div className="min-w-0 animate-fade-up" key={active.id}>
          <MovementDetail movement={active} />
        </div>
      </div>
    </Card>
  )
}

function MovementDetail({ movement: m }: { movement: Movement }) {
  const meta = REGISTER_BY_ID[m.register]
  return (
    <div>
      <div className="mb-2">
        <h3 className="text-[15px] font-semibold tracking-tight">{meta?.title}</h3>
        <p className="mt-0.5 text-[12.5px] leading-5 text-muted">{meta?.purpose}</p>
      </div>

      <div className="rounded-lg border border-line bg-elevated px-3 py-2.5">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          структура цього запису
        </div>
        <div className="grid gap-0.5">
          <Row k="Період" v={dmy(m.period)} />
          <Row k="Реєстратор" v={m.registrarTitle} />
          {m.kind === 'accounting' && (
            <>
              <Row k="Рахунок Дт" v={m.debitAccount} />
              <Row k="Субконто Дт" v={fmtRec(m.debitSubconto)} />
              <Row k="Рахунок Кт" v={m.creditAccount} />
              <Row k="Субконто Кт" v={fmtRec(m.creditSubconto)} />
              <Row k="Сума" v={money(m.amount)} />
              {m.quantity != null && <Row k="Кількість" v={String(m.quantity)} />}
              <Row k="Організація" v={m.organization} />
            </>
          )}
          {m.kind === 'accumulation' && (
            <>
              <Row k="Вид руху" v={m.recordType === 'receipt' ? 'Прихід (+)' : 'Витрата (−)'} />
              {Object.entries(m.dimensions).map(([k, v]) => (
                <Row key={k} k={`Вимір · ${RES_LABEL[k] ?? k}`} v={v} />
              ))}
              {Object.entries(m.resources).map(([k, v]) => (
                <Row key={k} k={`Ресурс · ${RES_LABEL[k] ?? k}`} v={num(v)} />
              ))}
            </>
          )}
          {m.kind === 'information' && (
            <>
              {Object.entries(m.dimensions).map(([k, v]) => (
                <Row key={k} k={`Вимір · ${RES_LABEL[k] ?? k}`} v={v} />
              ))}
              {Object.entries(m.resources).map(([k, v]) => (
                <Row key={k} k={`Ресурс · ${RES_LABEL[k] ?? k}`} v={String(v)} />
              ))}
            </>
          )}
        </div>
      </div>

      <div className="mt-3">
        <Callout kind="key">{m.comment}</Callout>
      </div>

      {meta && (
        <div className="mt-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            що система вміє порахувати з цього регістра
          </div>
          <div className="grid gap-1.5">
            {meta.virtualTables.map((vt) => (
              <div key={vt.name} className="rounded border border-line bg-surface px-2.5 py-1.5">
                <span className="font-mono text-[12px] font-semibold text-accent">{vt.name}</span>
                <p className="mt-0.5 text-[12px] leading-5 text-muted">{vt.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[minmax(120px,auto)_1fr] gap-3 border-b border-line2 py-1 last:border-0">
      <span className="text-[11.5px] text-muted">{k}</span>
      <span className="break-words font-mono text-[12px]">{v || '—'}</span>
    </div>
  )
}

function fmtRec(r: Record<string, string>): string {
  const s = Object.entries(r)
    .filter(([, v]) => v)
    .map(([k, v]) => `${RES_LABEL[k] ?? k} = ${v}`)
    .join(', ')
  return s || '—'
}

export type { AccountingMovement }
