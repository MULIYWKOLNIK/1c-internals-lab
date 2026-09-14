import { useState } from 'react'
import { Stethoscope, Check, X, RotateCcw, ArrowDown, Search, Wrench } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { LmsBridge } from '@/components/LmsBridge'
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  Collapse,
  Section,
  Table,
  Td,
  Th,
} from '@/components/ui'
import { DIAGNOSTICS } from '@/data/diagnostics'

type Answer = 'yes' | 'no'

export default function Diagnostics() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [currentIndex, setCurrentIndex] = useState(0)

  const current = DIAGNOSTICS[currentIndex]
  const failedAt = DIAGNOSTICS.find((d) => answers[d.id] === 'no')
  const finished = failedAt != null || currentIndex >= DIAGNOSTICS.length

  const answer = (a: Answer) => {
    setAnswers((prev) => ({ ...prev, [current.id]: a }))
    if (a === 'yes') setCurrentIndex((i) => i + 1)
  }

  const reset = () => {
    setAnswers({})
    setCurrentIndex(0)
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="diagnostics"
        lead="«Документ проведений, але у звіті немає витрати» — найчастіше звернення у підтримку. Причин може бути сім, і вони перевіряються у строго визначеному порядку: рухом даних від документа до звіту."
      />

      <Callout kind="warn" title="Чому порядок перевірок саме такий">
        Він повторює <strong>шлях даних</strong>: документ → рухи → регістр → рахунок → період →
        аналітика → запит звіту. Перевіряти з кінця (лізти в налаштування звіту) — найгірша
        стратегія: у 80% випадків проблема на перших трьох кроках, і ви витратите годину даремно.
      </Callout>

      <Card>
        <CardHeader
          icon={<Stethoscope size={16} />}
          title="Інтерактивне дерево діагностики"
          subtitle="Відповідайте на питання — система підкаже ймовірну причину"
          right={
            <Button size="sm" onClick={reset} disabled={Object.keys(answers).length === 0}>
              <RotateCcw size={12} /> Спочатку
            </Button>
          }
        />

        <div className="p-4">
          {/* пройдені кроки */}
          <div className="mb-3 grid gap-1.5">
            {DIAGNOSTICS.filter((d) => answers[d.id]).map((d) => (
              <div
                key={d.id}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-1.5',
                  answers[d.id] === 'yes'
                    ? 'border-ok/40 bg-ok/[0.06]'
                    : 'border-danger/45 bg-danger/[0.07]',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded',
                    answers[d.id] === 'yes' ? 'bg-ok text-white' : 'bg-danger text-white',
                  )}
                >
                  {answers[d.id] === 'yes' ? <Check size={12} /> : <X size={12} />}
                </span>
                <span className="text-[13px] font-medium">{d.question}</span>
                <Badge
                  tone={answers[d.id] === 'yes' ? 'ok' : 'danger'}
                  className="ml-auto"
                >
                  {answers[d.id] === 'yes' ? 'ТАК' : 'НІ'}
                </Badge>
              </div>
            ))}
          </div>

          {/* поточне питання */}
          {!finished && current && (
            <div className="animate-fade-up rounded-xl border border-accent/50 bg-accent/[0.07] p-4">
              <div className="mb-1 flex items-center gap-2">
                <Badge tone="accent" mono>
                  крок {current.step} / {DIAGNOSTICS.length}
                </Badge>
              </div>
              <h3 className="text-[17px] font-semibold tracking-tight">{current.question}</h3>
              <div className="mt-2 flex gap-1.5 rounded-lg border border-line bg-surface px-3 py-2">
                <Search size={13} className="mt-0.5 shrink-0 text-muted" />
                <p className="text-[13px] leading-6 text-muted">
                  <span className="font-medium text-fg">Як перевірити: </span>
                  {current.howToCheck}
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="ok" onClick={() => answer('yes')}>
                  <Check size={14} /> Так
                </Button>
                <Button variant="danger" onClick={() => answer('no')}>
                  <X size={14} /> Ні
                </Button>
              </div>
            </div>
          )}

          {/* знайдена причина */}
          {failedAt && (
            <div className="animate-fade-up mt-3 rounded-xl border border-danger/50 bg-danger/[0.07] p-4">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge tone="danger">причину знайдено</Badge>
                <span className="font-mono text-[11px] text-faint">крок {failedAt.step}</span>
              </div>
              <h3 className="text-[17px] font-semibold tracking-tight text-danger">
                {failedAt.no.cause}
              </h3>
              <p className="mt-2 text-[14px] leading-7">{failedAt.no.why}</p>
              <div className="mt-3 rounded-lg border border-ok/40 bg-ok/[0.07] px-3 py-2">
                <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ok">
                  <Wrench size={11} /> що робити
                </div>
                <p className="text-[13.5px] leading-6">{failedAt.no.fix}</p>
              </div>
              <Button className="mt-3" onClick={reset}>
                <RotateCcw size={13} /> Пройти ще раз
              </Button>
            </div>
          )}

          {/* дійшли до кінця */}
          {!failedAt && currentIndex >= DIAGNOSTICS.length && (
            <div className="animate-fade-up rounded-xl border border-warn/50 bg-warn/[0.07] p-4">
              <Badge tone="warn">усі дані коректні</Badge>
              <h3 className="mt-1 text-[17px] font-semibold tracking-tight">
                Проблема не в даних, а у самому звіті або в правах
              </h3>
              <p className="mt-2 text-[14px] leading-7">
                Ви пройшли всі перевірки: документ проведено, рухи є, регістр той самий, рахунок
                правильний, період підходить, аналітика заповнена. Отже, записи в базі коректні — і
                далі шукати треба у звіті.
              </p>
              <ul className="mt-2 grid gap-1 pl-4 text-[13.5px] leading-6">
                <li>· збережений варіант звіту з «зайвим» відбором (у т. ч. прихованим);</li>
                <li>· обмеження доступу на рівні записів (RLS) для цього користувача;</li>
                <li>
                  · звіт побудований на іншій віртуальній таблиці — наприклад, на Залишках замість
                  Оборотів, а у витратних рахунків залишку немає;
                </li>
                <li>· звіт читає інший регістр, ніж той, у який пише документ.</li>
              </ul>
              <Button className="mt-3" onClick={reset}>
                <RotateCcw size={13} /> Пройти ще раз
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Section eyebrow="повне дерево" title="Усі сім перевірок одразу">
        <div className="grid gap-1.5">
          {DIAGNOSTICS.map((d, i) => (
            <div key={d.id}>
              <Collapse
                title={
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-accent font-mono text-[10px] font-bold text-white">
                      {d.step}
                    </span>
                    {d.question}
                  </span>
                }
                subtitle={`Якщо НІ: ${d.no.cause}`}
              >
                <div className="grid gap-2">
                  <div className="rounded-lg border border-line bg-elevated px-3 py-2">
                    <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                      як перевірити
                    </div>
                    <p className="text-[13px] leading-6">{d.howToCheck}</p>
                  </div>
                  <div className="rounded-lg border border-danger/35 bg-danger/[0.05] px-3 py-2">
                    <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-danger">
                      чому так буває
                    </div>
                    <p className="text-[13px] leading-6">{d.no.why}</p>
                  </div>
                  <div className="rounded-lg border border-ok/35 bg-ok/[0.05] px-3 py-2">
                    <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-ok">
                      що робити
                    </div>
                    <p className="text-[13px] leading-6">{d.no.fix}</p>
                  </div>
                </div>
              </Collapse>
              {i < DIAGNOSTICS.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <ArrowDown size={12} className="text-line" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="інші симптоми" title="Швидкий довідник проблем">
        <Table>
          <thead>
            <tr>
              <Th>Симптом</Th>
              <Th>Найімовірніша причина</Th>
              <Th>Друга за ймовірністю</Th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                'Витрата задвоїлась',
                'Документ введено двічі (наприклад, ще й через інтеграцію)',
                'Алгоритм пише в два регістри, а звіт підсумовує обидва',
              ],
              [
                'Сума на 20% більша, ніж очікувалось',
                'У витрати потрапив ПДВ: контрагент або договір позначені як «без ПДВ»',
                'Ставка ПДВ у документі не збігається з договірною',
              ],
              [
                'Витрата є в бухгалтерському звіті, але немає в управлінському',
                'Введено ручну операцію — вона не створює рухів в управлінському регістрі',
                'Алгоритм документа не формує управлінський рух для цього виду операції',
              ],
              [
                'Собівартість нульова',
                'Документ вибуття проведено раніше документа надходження',
                'Не виконано закриття місяця / розрахунок собівартості',
              ],
              [
                'Від’ємний залишок на складі',
                'Порушена хронологія документів',
                'Списано більше, ніж було оприбутковано (немає контролю залишків)',
              ],
              [
                'Сальдо на рахунку 92 наприкінці місяця',
                'Місяць не закритий: витрати не списані на 791',
                'Помилка в налаштуваннях закриття для цього підрозділу',
              ],
              [
                'Цифра змінилась сама собою',
                'Хтось перепровів документи заднім числом',
                'Змінились дані, від яких залежить проведення (ціни, курси, налаштування)',
              ],
            ].map(([s, a, b]) => (
              <tr key={s}>
                <Td className="font-medium">{s}</Td>
                <Td className="max-w-[340px] text-[12px] text-muted">{a}</Td>
                <Td className="max-w-[340px] text-[12px] text-faint">{b}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Collapse title="Універсальний алгоритм: чотири питання до будь-якої дивної цифри" tone="accent" defaultOpen>
        <ol className="grid list-decimal gap-2 pl-5 text-[13.5px] leading-7">
          <li>
            <strong>Які записи взагалі існують?</strong> Відкрийте регістр без жодних відборів, крім
            періоду. Якщо записів немає — проблема до звіту.
          </li>
          <li>
            <strong>Які з них потрапляють у вибірку?</strong> Додавайте відбори по одному й дивіться,
            на якому сума «зникає». Той відбір і є причиною.
          </li>
          <li>
            <strong>Як вони згортаються?</strong> Перевірте поля групування: можливо, сума є, але в
            рядку «(не вказано)», який ви не помітили.
          </li>
          <li>
            <strong>Чи те це джерело?</strong> Переконайтесь, що звіт читає саме той регістр, у який
            пише документ. Розходження бухгалтерського й управлінського обліку — класика.
          </li>
        </ol>
        <p className="mt-2 text-[13.5px] leading-6">
          Цей алгоритм працює в будь-якій обліковій системі, не тільки в 1С: він випливає зі
          структури «записи → відбір → групування → підсумок».
        </p>
      </Collapse>

      <LmsBridge
        summary="Діагностика у власній системі — це не «додати логи». Це закласти можливість пройти ланцюг у зворотному напрямку: від цифри у звіті до записів, від записів до документа, від документа до користувача і часу. Якщо кожна ланка має посилання назад, розслідування будь-якої проблеми займає хвилини."
        rows={[
          { onec: 'Рухи документа', lms: 'GET /documents/:id/entries', note: 'Крок 2: чи є записи взагалі.' },
          { onec: 'Відбір за реєстратором', lms: 'WHERE source_id = :id', note: 'Крок 3: у які саме ledger потрапили.' },
          { onec: 'Розшифровка звіту', lms: 'entryIds у рядку', note: 'Крок 1 у зворотний бік: від цифри до записів.' },
          { onec: 'Журнал реєстрації', lms: 'audit log з userId + timestamp', note: 'Хто і коли провів або перепровів.' },
        ]}
        code={`// мінімальний набір діагностичних ендпойнтів
GET /documents/:id                 // сам документ + posted
GET /documents/:id/entries         // що саме він створив   ← кроки 1-2
GET /ledger/entries?ids=...        // розшифровка цифри      ← зворотний хід
GET /ledger/entries?from&to&dims   // сирі записи без групування ← крок 3

// правило: у відповіді звіту КОЖЕН рядок несе entryIds.
// Без цього drill-down доведеться «додумувати» запитами, і він розійдеться
// з тим, що насправді порахував звіт.`}
      />
    </div>
  )
}
