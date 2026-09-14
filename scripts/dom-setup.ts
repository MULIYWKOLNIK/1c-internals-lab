/**
 * Готує глобальне DOM-середовище ДО того, як завантажиться React.
 * Винесено в окремий модуль навмисно: імпорти виконуються по порядку,
 * тому React побачить уже налаштований window.
 */
import { JSDOM } from 'jsdom'

export const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})

// React визначає підтримку події input як ('oninput' in document).
// jsdom цю властивість на Document не оголошує, і React вмикає
// IE-полі́філ, який падає на attachEvent. Оголошуємо явно.
if (!('oninput' in dom.window.document)) {
  Object.defineProperty(dom.window.Document.prototype, 'oninput', {
    value: null,
    writable: true,
    configurable: true,
  })
}

const g = globalThis as unknown as Record<string, unknown>
g.window = dom.window
g.document = dom.window.document
g.navigator = dom.window.navigator
g.HTMLElement = dom.window.HTMLElement
g.HTMLInputElement = dom.window.HTMLInputElement
g.SVGElement = dom.window.SVGElement
g.Node = dom.window.Node
g.Event = dom.window.Event
g.MouseEvent = dom.window.MouseEvent
g.KeyboardEvent = dom.window.KeyboardEvent
g.getComputedStyle = dom.window.getComputedStyle
g.localStorage = dom.window.localStorage
g.requestAnimationFrame = (cb: FrameRequestCallback) => dom.window.setTimeout(() => cb(0), 0)
g.cancelAnimationFrame = (id: number) => dom.window.clearTimeout(id)
g.IS_REACT_ACT_ENVIRONMENT = true

dom.window.scrollTo = () => {}
dom.window.HTMLElement.prototype.scrollIntoView = () => {}
