/* eslint-disable no-console */
/**
 * Димовий тест застосунку: монтує React-дерево у jsdom,
 * проходить усіма маршрутами, натискає ключові кнопки і перевіряє,
 * що на сторінці з'являється очікуваний вміст.
 *
 * Запуск: npm run smoke
 */
import { dom } from './dom-setup'
import React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import App from '@/App'
import { NAV } from '@/data/nav'

let failed = 0
const errors: string[] = []

const origError = console.error
console.error = (...args: unknown[]) => {
  const msg = args.map(String).join(' ')
  if (msg.includes('not wrapped in act')) return
  if (msg.includes('ReactDOMTestUtils.act')) return
  if (msg.includes('Not implemented')) return
  if (msg.includes('Future Flag Warning')) return
  errors.push(msg)
  origError(...args)
}

function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log('  PASS  ' + name)
  else {
    failed++
    console.log('  FAIL  ' + name, extra ?? '')
  }
}

const container = dom.window.document.getElementById('root')!
let root: Root

const text = () => container.textContent ?? ''
const html = () => container.innerHTML
const h1 = () => container.querySelector('h1')?.textContent?.trim() ?? ''

const buttons = () => [...container.querySelectorAll('button')] as unknown as HTMLElement[]

function findButton(label: string): HTMLElement | undefined {
  return buttons().find((b) => (b.textContent ?? '').trim().includes(label))
}

function findButtonLast(label: string): HTMLElement | undefined {
  return [...buttons()].reverse().find((b) => (b.textContent ?? '').trim().includes(label))
}

function click(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

async function tick(ms = 20) {
  await act(async () => {
    await new Promise((res) => setTimeout(res, ms))
  })
}

async function goto(hash: string) {
  await act(async () => {
    dom.window.location.hash = hash
    await new Promise((res) => setTimeout(res, 15))
  })
}

function typeInto(input: HTMLInputElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype,
      'value',
    )!.set!
    setter.call(input, value)
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  })
}

async function main() {
  console.log('\n== монтування застосунку ==')
  act(() => {
    root = createRoot(container)
    root.render(React.createElement(App))
  })
  void root
  check('додаток змонтовано', container.children.length > 0)
  check('заголовок головної сторінки на місці', text().includes('Як 1С/BAS перетворює документи'))
  check('сайдбар містить усі розділи', NAV.every((n) => text().includes(n.title)))
  check('перемикач теми присутній', html().includes('aria-label="Тема"'))
  check('головна схема USER → REPORT на місці', ['USER', 'DOCUMENT', 'POSTING', 'MOVEMENTS', 'REGISTERS', 'QUERY', 'PROCESSING', 'REPORT'].every((s) => text().includes(s)))

  console.log('\n== обхід усіх маршрутів (перевірка H1) ==')
  for (const n of NAV) {
    await goto('#/' + n.slug)
    const ok = h1() === n.title && text().length > 1500
    check(`${n.no}. ${n.title}  (/${n.slug})`, ok, ok ? '' : `h1="${h1()}" len=${text().length}`)
  }

  console.log('\n== неіснуючий маршрут ==')
  await goto('#/no-such-page')
  check('редірект на головну', text().includes('Як 1С/BAS перетворює документи'))

  console.log('\n== симулятор проведення ==')
  await goto('#/posting')
  const postBtn = findButton('Провести документ')
  check('кнопка «Провести документ» знайдена', !!postBtn)
  if (postBtn) {
    click(postBtn)
    await tick(80)
    const skip = findButton('Пропустити анімацію')
    if (skip) click(skip)
    await tick(40)
    const t = text()
    check('показано всі 8 кроків', ['Завантаження документа', 'Перевірка реквізитів', 'Визначення алгоритму проведення', 'Визначення рахунків', 'Визначення аналітики', 'Формування рухів', 'Запис рухів у регістри', 'Документ проведено'].every((s) => t.includes(s)))
    check('показано блок «Було → Стало»', t.includes('Було') && t.includes('Стало'))
    check('показано браузер рухів', t.includes('Один документ — багато рухів'))
    check('є проводка Дт 92 / Кт 631', t.includes('Дт 92 / Кт 631'))
    const unpost = findButton('Розпровести')
    check('кнопка «Розпровести» активна', !!unpost && !(unpost as HTMLButtonElement).disabled)
    if (unpost) {
      click(unpost)
      await tick()
      check('після розпроведення 0 записів', text().includes('0 записів'))
    }
  }

  console.log('\n== Debug mode ==')
  await goto('#/debug')
  const debugTab = findButton('Тільки Debug')
  check('перемикач «Тільки Debug» присутній', !!debugTab)
  if (debugTab) {
    click(debugTab)
    await tick()
    const t = text()
    check('debug-вивід: Document ID', t.includes('Document ID'))
    check('debug-вивід: Posting procedure', t.includes('Posting procedure'))
    check('debug-вивід: Movements', t.includes('Movements'))
    check('debug-вивід: Register', t.includes('Register:'))
  }
  const userTab = findButton('Тільки User')
  if (userTab) {
    click(userTab)
    await tick()
    check('user-режим показує підсумок людською мовою', text().includes('Витрати збільшились на'))
  }

  console.log('\n== звіт над регістрами ==')
  await goto('#/register-to-report')
  const postAll = findButton('Провести всі документи')
  check('кнопка «Провести всі документи» присутня', !!postAll)
  if (postAll) {
    click(postAll)
    await tick()
    const t = text()
    check('звіт показує статті витрат', t.includes('Оренда') && t.includes('Оплата праці'))
    check('показано концептуальний запит', t.includes('КОНЦЕПТУАЛЬНА'))
    const drill = findButton('до документів')
    check('доступна розшифровка до документа', !!drill)
    if (drill) {
      click(drill)
      await tick()
      check('розшифровка показує реєстратор', text().includes('до реєстратора'))
    }
    const tbTab = findButton('ОСВ')
    if (tbTab) {
      click(tbTab)
      await tick()
      check('ОСВ будується', text().includes('Сальдо поч.'))
    }
    const plTab = findButton('Фінрезультат')
    if (plTab) {
      click(plTab)
      await tick()
      check('фінрезультат будується', text().includes('Чистий дохід'))
    }
  }

  console.log('\n== симулятор витрат ==')
  await goto('#/expense-cases')
  check(
    'шість сценаріїв на місці',
    ['Оренда офісу', 'Реклама', 'Придбання товару', 'Продаж товару', 'Коригування витрати', 'Нарахування зарплати'].every(
      (s) => text().includes(s),
    ),
  )
  const goodsCase = findButton('Придбання товару')
  if (goodsCase) {
    click(goodsCase)
    await tick()
    check('сценарій товару позначено як НЕ витрату', text().includes('НЕ витрата'))
    check('пояснення про актив присутнє', text().includes('це актив'))
  }

  console.log('\n== жива модель Ledger ==')
  await goto('#/ledger')
  const postAllLedger = findButton('Провести всі')
  check('кнопка «Провести всі» у пісочниці Ledger', !!postAllLedger)
  if (postAllLedger) {
    click(postAllLedger)
    await tick()
    const t = text()
    check('записи ledger створено', t.includes('E0001'))
    check('є запис типу ASSET', t.includes('ASSET'))
    check('є запис типу COGS', t.includes('COGS'))
    const reportTab = findButtonLast('getExpenses()')
    if (reportTab) {
      click(reportTab)
      await tick()
      check('звіт моделі рахує витрати', text().includes('Витрати вересня'))
    }
    const stockTab = findButtonLast('getStock()')
    if (stockTab) {
      click(stockTab)
      await tick()
      check('залишок рахується з ledger', text().includes('Залишок monitor-27'))
    }
  }

  console.log('\n== анімації ==')
  await goto('#/doc-to-register')
  const journeyPlay = findButton('Програти')
  check('кнопка «Програти» на схемі шляху суми', !!journeyPlay)
  if (journeyPlay) {
    check('стартовий етап — перший', text().includes('етап 1/7'))
    click(journeyPlay)
    await tick(1300)
    const stage = text().match(/етап (\d)\/7/)?.[1]
    check('анімація просуває етапи', Number(stage) > 1, 'етап ' + stage)
    const pause = findButton('Пауза')
    check('кнопка перетворилась на «Пауза»', !!pause)
    if (pause) click(pause)
    await tick()
  }

  await goto('#/expenses')
  const flowPlay = findButton('Програти життєвий цикл')
  check('кнопка «Програти життєвий цикл» присутня', !!flowPlay)
  if (flowPlay) {
    check('стартовий крок 1/11', text().includes('крок 1/11'))
    click(flowPlay)
    await tick(1200)
    const step = text().match(/крок (\d+)\/11/)?.[1]
    check('ланцюг витрати просувається', Number(step) > 1, 'крок ' + step)
    const p2 = findButton('Пауза')
    if (p2) click(p2)
    await tick()
  }

  await goto('#/map')
  const mapPlay = findButton('Програти')
  check('кнопка «Програти» на загальній карті', !!mapPlay)
  if (mapPlay) {
    click(mapPlay)
    await tick(1200)
    check('карта просувається до документа', text().includes('подія як дані'))
    const p3 = findButton('Пауза')
    if (p3) click(p3)
    await tick()
  }

  console.log('\n== «показати, що всередині» ==')
  await goto('#/')
  const insideBtn = findButton('Показати, що всередині')
  check('кнопка «Показати, що всередині» присутня', !!insideBtn)
  if (insideBtn) {
    click(insideBtn)
    await tick()
    check('структура розкривається', text().includes('ФормаДокумента'))
    const hide = findButton('Сховати')
    check('кнопка згортання зʼявилась', !!hide)
    if (hide) click(hide)
    await tick()
  }

  console.log('\n== діагностика ==')
  await goto('#/diagnostics')
  const no = findButton('Ні')
  check('кнопки відповіді присутні', !!findButton('Так') && !!no)
  if (no) {
    click(no)
    await tick()
    check('показано причину', text().includes('причину знайдено'))
    const again = findButton('Пройти ще раз')
    if (again) {
      click(again)
      await tick()
      check('дерево скидається', text().includes('Документ дійсно проведений?'))
    }
  }

  console.log('\n== тест ==')
  await goto('#/quiz')
  check('тест відкрито', text().includes('Питання 1 з 22'))
  const opt = buttons().find((b) =>
    (b.textContent ?? '').includes('Нічого: у регістрах немає жодного запису'),
  )
  check('варіанти відповіді присутні', !!opt)
  if (opt) {
    click(opt)
    await tick()
    check('показано пояснення', text().includes('Чому саме так'))
    check('відповідь зарахована як правильна', text().includes('правильно'))
    check('результат збережено', !!dom.window.localStorage.getItem('1c-lab:quiz'))
  }

  console.log('\n== глосарій ==')
  await goto('#/glossary')
  check(
    'чотири рівні пояснення',
    ['Простими словами', 'Технічно', 'Приклад', 'Аналог у власній системі'].every((s) =>
      text().includes(s),
    ),
  )
  const gInput = container.querySelector('input') as unknown as HTMLInputElement | null
  check('поле пошуку глосарію присутнє', !!gInput)
  if (gInput) {
    typeInto(gInput, 'сторно')
    await tick()
    check('фільтр глосарію працює', text().includes('показано 1 з') || text().includes('показано 2 з'), text().match(/показано \d+ з \d+/)?.[0])
    typeInto(gInput, '')
    await tick()
  }
  const termBtn = buttons().find((b) => (b.textContent ?? '').trim().startsWith('Субконто'))
  if (termBtn) {
    click(termBtn)
    await tick()
    check('термін відкривається', text().includes('Аналітика всередині рахунку'))
  }

  console.log('\n== глобальний пошук ==')
  await goto('#/')
  const searchBtn = findButton('Пошук')
  check('кнопка пошуку присутня', !!searchBtn)
  if (searchBtn) {
    click(searchBtn)
    await tick()
    check('палітра пошуку відкрилась', text().includes('Спробуйте'))
    const sInput = container.querySelector('input') as unknown as HTMLInputElement | null
    check('поле вводу пошуку присутнє', !!sInput)
    if (sInput) {
      typeInto(sInput, 'витрати')
      await tick()
      const t = text()
      const count = Number(t.match(/(\d+) результат/)?.[1] ?? 0)
      check('пошук «витрати» повертає результати', count >= 5, count)
      check('серед результатів є «Стаття витрат»', t.includes('Стаття витрат'))
      check('серед результатів є «Коригування витрат»', t.includes('Коригування витрат'))
      check('серед результатів є «Звіт по витратах»', t.includes('Звіт по витратах'))
    }
  }

  console.log('\n== прогрес і localStorage ==')
  await goto('#/basics')
  const markBtn = findButton('Позначити як пройдений')
  check('кнопка прогресу присутня', !!markBtn)
  if (markBtn) {
    click(markBtn)
    await tick()
    check('розділ позначено пройденим', text().includes('Розділ пройдено'))
    check('лічильник прогресу оновився', text().includes('1 / 21'))
    const stored = dom.window.localStorage.getItem('1c-lab:progress')
    check('прогрес збережено у localStorage', !!stored && stored.includes('basics'), stored)
  }

  console.log('\n== навігація «Наступний розділ» ==')
  const nextLink = [...container.querySelectorAll('a')].find((a) =>
    (a.textContent ?? '').includes('Як влаштована 1С'),
  ) as unknown as HTMLElement | undefined
  check('посилання на наступний розділ присутнє', !!nextLink)

  console.log('\n== тема ==')
  const themeBtn = buttons().find((b) => b.getAttribute('aria-label') === 'Тема')
  check('кнопка теми присутня', !!themeBtn)
  if (themeBtn) {
    const wasDark = dom.window.document.documentElement.classList.contains('dark')
    click(themeBtn)
    await tick()
    check(
      'тема перемикається',
      dom.window.document.documentElement.classList.contains('dark') !== wasDark,
    )
    check('тему збережено', !!dom.window.localStorage.getItem('1c-lab:theme'))
    click(themeBtn)
    await tick()
  }

  console.log('\n== консольні помилки React ==')
  check('немає помилок рендеру', errors.length === 0, errors.slice(0, 5))

  console.log('\n' + (failed === 0 ? 'SMOKE TEST PASSED' : failed + ' CHECK(S) FAILED') + '\n')
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => {
  console.log('CRASH', e)
  process.exit(1)
})
