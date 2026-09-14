import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X, RotateCcw, Trophy, ArrowRight, ListChecks } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { QUIZ } from '@/data/quiz'
import { NAV_BY_SLUG } from '@/data/nav'
import { load, save } from '@/lib/storage'
import { useStore } from '@/state/store'
import { Badge, Button, Callout, Card, CardHeader, Section, Stat } from '@/components/ui'

type Answers = Record<string, number>

export default function Quiz() {
  const store = useStore()
  const [answers, setAnswers] = useState<Answers>(() => load<Answers>('quiz', {}))
  const [index, setIndex] = useState(0)
  const [review, setReview] = useState(false)

  useEffect(() => {
    save('quiz', answers)
  }, [answers])

  const q = QUIZ[index]
  const given = answers[q.id]
  const answeredCount = Object.keys(answers).length
  const correctCount = useMemo(
    () => QUIZ.filter((x) => answers[x.id] === x.correct).length,
    [answers],
  )
  const allAnswered = answeredCount === QUIZ.length
  const percent = QUIZ.length ? Math.round((correctCount / QUIZ.length) * 100) : 0

  const pick = (i: number) => {
    if (given != null) return
    setAnswers((a) => ({ ...a, [q.id]: i }))
  }

  const next = () => setIndex((i) => Math.min(i + 1, QUIZ.length - 1))
  const prev = () => setIndex((i) => Math.max(i - 1, 0))

  const reset = () => {
    setAnswers({})
    setIndex(0)
    setReview(false)
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        slug="quiz"
        lead="22 питання на розуміння причинно-наслідкових зв'язків, а не на запам'ятовування визначень. У більшості є правдоподібна хибна відповідь — саме та, яку зазвичай дає людина, що знає лише, де натискати кнопки."
      />

      <div className="grid gap-2 sm:grid-cols-4">
        <Stat label="Відповіли" value={`${answeredCount}/${QUIZ.length}`} />
        <Stat
          label="Правильно"
          value={String(correctCount)}
          tone={correctCount > QUIZ.length * 0.7 ? 'ok' : 'neutral'}
        />
        <Stat
          label="Результат"
          value={`${percent}%`}
          tone={percent >= 80 ? 'ok' : percent >= 60 ? 'warn' : 'danger'}
          hint={allAnswered ? verdict(percent) : 'тест ще не завершено'}
        />
        <div className="flex items-end">
          <Button onClick={reset} disabled={answeredCount === 0} className="w-full">
            <RotateCcw size={13} /> Скинути відповіді
          </Button>
        </div>
      </div>

      {!review && (
        <Card>
          <CardHeader
            icon={<ListChecks size={16} />}
            title={`Питання ${index + 1} з ${QUIZ.length}`}
            subtitle={q.topic}
            right={
              given != null ? (
                <Badge tone={given === q.correct ? 'ok' : 'danger'}>
                  {given === q.correct ? 'правильно' : 'неправильно'}
                </Badge>
              ) : (
                <Badge tone="neutral">без відповіді</Badge>
              )
            }
          />

          {/* смуга прогресу по питаннях */}
          <div className="flex flex-wrap gap-1 border-b border-line px-4 py-2.5">
            {QUIZ.map((x, i) => {
              const a = answers[x.id]
              return (
                <button
                  key={x.id}
                  onClick={() => setIndex(i)}
                  title={x.topic}
                  className={cn(
                    'focus-ring h-6 w-6 rounded font-mono text-[10px] font-semibold transition',
                    i === index && 'ring-2 ring-accent ring-offset-1 ring-offset-bg',
                    a == null
                      ? 'bg-elevated text-muted hover:bg-line'
                      : a === x.correct
                        ? 'bg-ok text-white'
                        : 'bg-danger text-white',
                  )}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>

          <div className="p-4">
            <h3 className="text-[17px] font-semibold leading-7 tracking-tight">{q.question}</h3>

            <div className="mt-3 grid gap-1.5">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.correct
                const isChosen = given === i
                const revealed = given != null
                return (
                  <button
                    key={i}
                    onClick={() => pick(i)}
                    disabled={revealed}
                    className={cn(
                      'focus-ring flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition',
                      !revealed && 'border-line bg-surface hover:border-accent/45 hover:bg-elevated',
                      revealed && isCorrect && 'border-ok/55 bg-ok/[0.09]',
                      revealed && isChosen && !isCorrect && 'border-danger/55 bg-danger/[0.09]',
                      revealed && !isCorrect && !isChosen && 'border-line bg-surface opacity-55',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold',
                        revealed && isCorrect
                          ? 'bg-ok text-white'
                          : revealed && isChosen
                            ? 'bg-danger text-white'
                            : 'bg-elevated text-muted',
                      )}
                    >
                      {revealed && isCorrect ? (
                        <Check size={12} />
                      ) : revealed && isChosen ? (
                        <X size={12} />
                      ) : (
                        String.fromCharCode(65 + i)
                      )}
                    </span>
                    <span className="text-[13.5px] leading-6">{opt}</span>
                  </button>
                )
              })}
            </div>

            {given != null && (
              <div className="mt-3 animate-fade-up">
                <Callout kind={given === q.correct ? 'ok' : 'warn'} title="Чому саме так">
                  {q.explain}
                </Callout>
                {q.ref && NAV_BY_SLUG[q.ref] && (
                  <Link
                    to={`/${q.ref}`}
                    className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-accent hover:underline"
                  >
                    Повернутись до розділу «{NAV_BY_SLUG[q.ref].title}» <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <Button onClick={prev} disabled={index === 0}>
                Попереднє
              </Button>
              <div className="flex gap-2">
                {allAnswered && (
                  <Button variant="primary" onClick={() => setReview(true)}>
                    <Trophy size={13} /> Показати підсумок
                  </Button>
                )}
                <Button onClick={next} disabled={index === QUIZ.length - 1}>
                  Наступне <ArrowRight size={13} />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {review && (
        <>
          <Card className={percent >= 80 ? 'border-ok/45' : 'border-warn/45'}>
            <CardHeader icon={<Trophy size={16} />} title="Підсумок тесту" subtitle={verdict(percent)} />
            <div className="p-4">
              <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-elevated">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    percent >= 80 ? 'bg-ok' : percent >= 60 ? 'bg-warn' : 'bg-danger',
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-[14px] leading-7">
                Правильних відповідей: <strong>{correctCount}</strong> із {QUIZ.length} ({percent}%).
              </p>
              {correctCount < QUIZ.length && (
                <p className="mt-2 text-[13.5px] leading-6 text-muted">
                  Нижче — питання, у яких ви помилились, із посиланнями на відповідні розділи.
                  Помилка тут корисніша за правильну відповідь: вона показує, де саме модель у
                  голові розходиться з тим, як система працює насправді.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => setReview(false)}>Повернутись до питань</Button>
                <Button onClick={reset}>
                  <RotateCcw size={13} /> Пройти заново
                </Button>
                {!store.done.includes('quiz') && percent >= 80 && (
                  <Button variant="ok" onClick={() => store.markDone('quiz')}>
                    <Check size={13} /> Позначити розділ пройденим
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {correctCount < QUIZ.length && (
            <Section eyebrow="розбір" title="Питання, у яких були помилки">
              <div className="grid gap-2">
                {QUIZ.filter((x) => answers[x.id] !== x.correct).map((x) => (
                  <Card key={x.id} className="border-danger/30">
                    <div className="p-3.5">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge tone="danger">{x.topic}</Badge>
                        {x.ref && NAV_BY_SLUG[x.ref] && (
                          <Link
                            to={`/${x.ref}`}
                            className="text-[11.5px] text-accent hover:underline"
                          >
                            → {NAV_BY_SLUG[x.ref].no}. {NAV_BY_SLUG[x.ref].title}
                          </Link>
                        )}
                      </div>
                      <div className="text-[14px] font-medium leading-6">{x.question}</div>
                      <div className="mt-1.5 grid gap-1 text-[13px] leading-6">
                        {answers[x.id] != null && (
                          <div className="text-danger">
                            <X size={11} className="mr-1 inline" />
                            Ваша відповідь: {x.options[answers[x.id]]}
                          </div>
                        )}
                        <div className="text-ok">
                          <Check size={11} className="mr-1 inline" />
                          Правильно: {x.options[x.correct]}
                        </div>
                      </div>
                      <p className="mt-1.5 text-[12.5px] leading-6 text-muted">{x.explain}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function verdict(p: number): string {
  if (p >= 90) return 'Відмінно: ви розумієте механіку, а не лише інтерфейс'
  if (p >= 80) return 'Добре: базова модель склалась, залишились деталі'
  if (p >= 60) return 'Непогано, але варто повернутись до розділів про витрати та регістри'
  if (p > 0) return 'Схоже, модель ще не склалась — почніть із розділів 01, 03 і 11'
  return 'Тест ще не пройдено'
}
