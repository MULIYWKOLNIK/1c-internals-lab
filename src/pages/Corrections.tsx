import { useMemo, useState } from 'react'
import { Undo2, Plus, RotateCcw, History, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { LmsBridge } from '@/components/LmsBridge'
import { PostingDebugger } from '@/components/PostingDebugger'
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  CodeBlock,
  Collapse,
  Section,
  Stat,
  Table,
  Td,
  Th,
} from '@/components/ui'
import { money, num } from '@/engine/format'

interface Entry {
  id: number
  date: string
  doc: string
  kind: 'initial' | 'adjust' | 'reversal'
  dt: string
  kt: string
  article: string
  amount: number
  note: string
}

const INITIAL: Entry[] = [
  {
    id: 1,
    date: '01.09.2026',
    doc: 'ПНП-000001',
    kind: 'initial',
    dt: '92',
    kt: '631',
    article: 'Оренда',
    amount: 30000,
    note: 'Первинне визнання витрати за актом',
  },
]

export default function Corrections() {
  const [entries, setEntries] = useState<Entry[]>(INITIAL)
  const [nextId, setNextId] = useState(2)

  const total = useMemo(() => entries.reduce((s, e) => s + e.amount, 0), [entries])
  const hasReversal = entries.some((e) => e.kind === 'reversal')

  const addAdjust = () => {
    setEntries((es) => [
      ...es,
      {
        id: nextId,
        date: '25.09.2026',
        doc: `КОР-00000${nextId - 1}`,
        kind: 'adjust',
        dt: '92',
        kt: '631',
        article: 'Оренда',
        amount: -5000,
        note: 'Знижка від орендодавця: зменшення вартості на 5 000',
      },
    ])
    setNextId((n) => n + 1)
  }

  const addReversal = () => {
    setEntries((es) => [
      ...es,
      {
        id: nextId,
        date: '28.09.2026',
        doc: `СТОРНО-00000${nextId - 1}`,
        kind: 'reversal',
        dt: '92',
        kt: '631',
        article: 'Оренда',
        amount: -total,
        note: 'Повне сторно: акт визнано помилковим',
      },
    ])
    setNextId((n) => n + 1)
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="corrections"
        lead="Найважливіший принцип роботи з помилками: система не переписує історію. Щоб змінити результат, вона додає новий запис, який компенсує попередній. Стара сума залишається в базі назавжди — і це не баг, а основа аудиту."
      />

      <Card>
        <CardHeader
          icon={<History size={16} />}
          title="Пісочниця: append-only облік"
          subtitle="Додавайте коригування та сторно. Зверніть увагу: жоден попередній рядок не зникає і не змінюється."
          right={
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="ok" onClick={addAdjust} disabled={hasReversal}>
                <Plus size={12} /> Коригування −5 000
              </Button>
              <Button size="sm" variant="danger" onClick={addReversal} disabled={hasReversal || total === 0}>
                <Undo2 size={12} /> Сторно
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEntries(INITIAL)
                  setNextId(2)
                }}
              >
                <RotateCcw size={12} />
              </Button>
            </div>
          }
        />
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_minmax(0,290px)]">
          <div>
            <div className="mb-1.5 text-[11px] uppercase tracking-wide text-faint">
              записи регістра бухгалтерії ({entries.length})
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Період</Th>
                  <Th>Реєстратор</Th>
                  <Th align="center">Дт</Th>
                  <Th align="center">Кт</Th>
                  <Th>Стаття</Th>
                  <Th align="right">Сума</Th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className={cn(
                      e.kind === 'adjust' && 'bg-warn/[0.06]',
                      e.kind === 'reversal' && 'bg-danger/[0.07]',
                    )}
                  >
                    <Td mono>{e.date}</Td>
                    <Td className="whitespace-nowrap">
                      <span className="text-muted">{e.doc}</span>
                      {e.kind !== 'initial' && (
                        <Badge tone={e.kind === 'reversal' ? 'danger' : 'warn'} className="ml-1.5">
                          {e.kind === 'reversal' ? 'сторно' : 'коригування'}
                        </Badge>
                      )}
                    </Td>
                    <Td align="center">
                      <Badge tone="warn" mono>{e.dt}</Badge>
                    </Td>
                    <Td align="center">
                      <Badge tone="violet" mono>{e.kt}</Badge>
                    </Td>
                    <Td>{e.article}</Td>
                    <Td
                      align="right"
                      mono
                      className={cn('font-semibold', e.amount < 0 ? 'text-danger' : 'text-fg')}
                    >
                      {e.amount > 0 ? '+' : ''}
                      {num(e.amount)}
                    </Td>
                  </tr>
                ))}
                <tr className="bg-elevated">
                  <Td colSpan={5} className="font-semibold">
                    Оборот по Дт 92 за вересень
                  </Td>
                  <Td align="right" mono className="text-[14px] font-bold text-accent">
                    {num(total)}
                  </Td>
                </tr>
              </tbody>
            </Table>

            <div className="mt-2 grid gap-1">
              {entries.map((e) => (
                <div key={e.id} className="flex gap-2 text-[12px] leading-5">
                  <span className="font-mono text-faint">{e.doc}</span>
                  <span className="text-muted">{e.note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2 self-start">
            <Stat
              label="Витрати у звіті"
              value={money(total)}
              tone={total === 0 ? 'ok' : 'warn'}
              hint={total === 0 ? 'операція повністю скасована' : 'дебетовий оборот 92'}
            />
            <Stat
              label="Записів у регістрі"
              value={String(entries.length)}
              hint="жоден не видалено"
            />
            <CodeBlock
              caption="Арифметика"
              code={entries
                .map((e) => `${e.amount > 0 ? '+' : ''}${num(e.amount).padStart(12)}   ${e.doc}`)
                .concat(['─'.repeat(28), `${num(total).padStart(13)}   ПІДСУМОК`])
                .join('\n')}
            />
          </div>
        </div>
      </Card>

      <Callout kind="key" title="30 000 + (−30 000) = 0">
        Зверніть увагу, що саме сталося: результат став нульовим,{' '}
        <strong>але жоден запис не зник</strong>. Регістр знає і про початкову суму, і про її
        скасування, і про дати обох подій. Це фундаментальна відмінність між «виправити» і
        «компенсувати».
      </Callout>

      <Section eyebrow="порівняння" title="Три способи змінити результат">
        <Table>
          <thead>
            <tr>
              <Th>Спосіб</Th>
              <Th>Що робить</Th>
              <Th align="center">Історія</Th>
              <Th>Коли доречно</Th>
              <Th>Ризик</Th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-ok/[0.05]">
              <Td className="font-medium">Перепроведення</Td>
              <Td className="text-[12px] text-muted">
                Виправили документ і провели заново. Старі рухи видаляються, нові створюються
              </Td>
              <Td align="center" className="text-warn">часткова</Td>
              <Td className="text-[12px] text-muted">
                Період відкритий, помилка свіжа, звітність не здана
              </Td>
              <Td className="text-[12px] text-muted">
                Втрачається слід того, що було раніше
              </Td>
            </tr>
            <tr className="bg-warn/[0.05]">
              <Td className="font-medium">Коригування</Td>
              <Td className="text-[12px] text-muted">
                Новий документ із рухами на РІЗНИЦЮ (−5 000)
              </Td>
              <Td align="center" className="text-ok">повна</Td>
              <Td className="text-[12px] text-muted">
                Сума змінилась за угодою сторін: знижка, перерахунок, донарахування
              </Td>
              <Td className="text-[12px] text-muted">
                Треба вказати ту саму аналітику, інакше звіт «розвалиться» на два рядки
              </Td>
            </tr>
            <tr className="bg-danger/[0.05]">
              <Td className="font-medium">Сторно</Td>
              <Td className="text-[12px] text-muted">
                Новий документ, який дзеркалить ВСІ рухи підстави зі знаком мінус
              </Td>
              <Td align="center" className="text-ok">повна</Td>
              <Td className="text-[12px] text-muted">
                Операції не було взагалі; період закритий; потрібен слід виправлення
              </Td>
              <Td className="text-[12px] text-muted">
                Легко забути частину рухів (ПДВ, взаєморозрахунки) — і облік «поїде»
              </Td>
            </tr>
          </tbody>
        </Table>
      </Section>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-danger/35">
          <CardHeader title="Так робити не можна" subtitle="класичні помилки" />
          <div className="grid gap-2 p-4">
            {[
              ['Видалити запис із регістра вручну', 'Розсинхронізує документ і його рухи: документ виглядає проведеним, а рухів немає. Наступне перепроведення все «поверне», і ніхто не зрозуміє чому.'],
              ['Створити ще один документ на 25 000', 'У звіті буде 30 000 + 25 000 = 55 000. Найпоширеніша помилка початківців.'],
              ['Виправити суму в закритому періоді', 'Змінить уже здану звітність. Саме для цього й існує сторно поточною датою.'],
              ['Зробити коригування з іншою статтею витрат', 'Початкова сума залишиться в одній групі звіту, а мінус піде в іншу. Підсумок правильний, розшифровка — ні.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg border border-line bg-elevated px-3 py-2">
                <div className="text-[13px] font-medium text-danger">{t}</div>
                <p className="mt-0.5 text-[12.5px] leading-5 text-muted">{d}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-ok/35">
          <CardHeader
            icon={<ShieldCheck size={16} className="text-ok" />}
            title="Що дає append-only"
            subtitle="навіщо взагалі так складно"
          />
          <div className="grid gap-2 p-4">
            {[
              ['Аудит', 'Видно, що саме було, хто і коли це змінив. Аудитор може відтворити будь-який стан на будь-яку дату.'],
              ['Відтворюваність', 'Звіт за минулий період можна побудувати заново і отримати ту саму цифру — навіть через рік.'],
              ['Безпека виправлень', 'Виправлення помилки не може «непомітно» зіпсувати ще щось: воно додає, а не перезаписує.'],
              ['Паралельна робота', 'Два користувачі не перезаписують дані один одного: обидва лише додають записи.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg border border-line bg-elevated px-3 py-2">
                <div className="text-[13px] font-medium text-ok">{t}</div>
                <p className="mt-0.5 text-[12.5px] leading-5 text-muted">{d}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Collapse title="Сторно — це не просто «мінус у бухгалтерії»" tone="accent">
        <p className="mb-2">
          Документ сторно має дзеркалити <strong>усі</strong> рухи підстави, а не лише проводку
          витрат. Для нашої оренди це чотири записи:
        </p>
        <CodeBlock
          caption="Повне сторно ПНП-000001"
          code={`Дт 92   / Кт 631   −30 000    ← витрата
Дт 6442 / Кт 631   − 6 000    ← ПДВ
Регістр «Витрати за статтями»: {Оренда, Адміністрація}  −30 000
Регістр «Взаєморозрахунки»:    {Бізнес-Центр}           −36 000`}
        />
        <p className="mt-2">
          Якщо сторнувати тільки першу проводку, ви отримаєте нульові витрати, але «зависле»
          податкове зобов’язання і неправильну заборгованість перед постачальником. Саме тому сторно
          роблять спеціальним документом, а не ручною операцією.
        </p>
      </Collapse>

      <Section eyebrow="симулятор" title="Проведіть коригування і сторно самостійно">
        <PostingDebugger
          title="Симулятор коригувань"
          initialId="doc-adjust"
          documentIds={['doc-rent', 'doc-adjust', 'doc-ads', 'doc-reversal']}
        />
      </Section>

      <LmsBridge
        summary="Це найцінніший патерн з усього проєкту для перенесення. Зробіть ledger-таблицю append-only на рівні прав БД: GRANT SELECT, INSERT — і жодного UPDATE/DELETE. Тоді «зіпсувати історію» стане технічно неможливо, а не просто «не прийнято»."
        rows={[
          { onec: 'Сторно', lms: 'reversal entry (amount: −X)', note: 'Поле reversesEntryId вказує на оригінал.' },
          { onec: 'Коригування', lms: 'delta entry', note: 'Поле adjustsDocumentId + та сама аналітика.' },
          { onec: 'Перепроведення', lms: 'repost(): DELETE own + INSERT', note: 'Єдиний дозволений DELETE — і лише власних записів.' },
          { onec: 'Документ-підстава', lms: 'basisDocumentId', note: 'Дає ланцюг виправлень для аудиту.' },
        ]}
        code={`// 1. Права БД роблять історію недоторканною
REVOKE UPDATE, DELETE ON ledger_entries FROM app_user;
GRANT  SELECT, INSERT  ON ledger_entries TO   app_user;

// 2. Сторно = нові записи з протилежним знаком
export async function reverse(sourceId: string, reason: string) {
  const original = await db.select().from(ledger).where(eq(ledger.sourceId, sourceId))
  if (!original.length) throw new Error('нічого сторнувати')

  const reversal = original.map(e => ({
    ...e,
    id: newId(),
    occurredAt: today(),          // сторно поточною датою, якщо період закритий
    amount: -e.amount,            // ← уся суть
    reversesEntryId: e.id,
    note: reason,
  }))
  await db.insert(ledger).values(reversal)   // INSERT, ніколи не DELETE
}

// 3. Перевірка: сума оригіналу і сторно завжди 0
// 30 000 + (−30 000) = 0`}
        codeCaption="Append-only ledger із сторнуванням"
      />
    </div>
  )
}
