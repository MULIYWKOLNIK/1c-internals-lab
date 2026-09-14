import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { load, save } from '@/lib/storage'
import { NAV } from '@/data/nav'
import { DOCUMENTS, DOCUMENT_BY_ID } from '@/engine/documents'
import { postDocument, resetMovementIds, stockFromMovements } from '@/engine/posting'
import type { Movement, PostingResult } from '@/engine/types'

export type Theme = 'dark' | 'light'
export type Mode = 'user' | 'debug'

/* ------------------------------ тема ------------------------------- */

function applyTheme(t: Theme) {
  const el = document.documentElement
  el.classList.toggle('dark', t === 'dark')
}

/* ------------------------- книга регістрів -------------------------- */

/**
 * "База даних" симулятора: які документи проведені та які рухи
 * зараз існують у регістрах. Розпроведення документа видаляє саме
 * його рухи — рівно так, як це робить платформа через реєстратор.
 */
export interface LedgerState {
  posted: string[]
  results: Record<string, PostingResult>
}

interface Store {
  theme: Theme
  toggleTheme: () => void
  mode: Mode
  setMode: (m: Mode) => void

  posted: string[]
  results: Record<string, PostingResult>
  movements: Movement[]
  post: (docId: string) => PostingResult
  unpost: (docId: string) => void
  postAll: () => void
  resetLedger: () => void
  isPosted: (docId: string) => boolean

  done: string[]
  toggleDone: (slug: string) => void
  markDone: (slug: string) => void
  resetProgress: () => void
  progress: { done: number; total: number; percent: number }

  searchOpen: boolean
  setSearchOpen: (v: boolean) => void
}

const Ctx = createContext<Store | null>(null)

const DEFAULT_ORDER = DOCUMENTS.map((d) => d.id)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => load<Theme>('theme', 'dark'))
  const [mode, setModeState] = useState<Mode>(() => load<Mode>('mode', 'user'))
  const [done, setDone] = useState<string[]>(() => load<string[]>('progress', []))
  const [ledger, setLedger] = useState<LedgerState>(() => ({ posted: [], results: {} }))
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    applyTheme(theme)
    save('theme', theme)
  }, [theme])

  useEffect(() => {
    save('mode', mode)
  }, [mode])

  useEffect(() => {
    save('progress', done)
  }, [done])

  /* ---- перерахунок усіх рухів у правильному порядку ---- */
  const recompute = useCallback((postedIds: string[]): LedgerState => {
    resetMovementIds()
    const ordered = DEFAULT_ORDER.filter((id) => postedIds.includes(id))
    const all: Movement[] = []
    const results: Record<string, PostingResult> = {}
    for (const id of ordered) {
      const doc = DOCUMENT_BY_ID[id]
      if (!doc) continue
      const res = postDocument(doc, stockFromMovements(all))
      results[id] = res
      all.push(...res.movements)
    }
    return { posted: ordered, results }
  }, [])

  const post = useCallback(
    (docId: string): PostingResult => {
      const next = recompute([...new Set([...ledger.posted, docId])])
      setLedger(next)
      return next.results[docId]
    },
    [ledger.posted, recompute],
  )

  const unpost = useCallback(
    (docId: string) => {
      setLedger(recompute(ledger.posted.filter((id) => id !== docId)))
    },
    [ledger.posted, recompute],
  )

  const postAll = useCallback(() => {
    setLedger(recompute(DEFAULT_ORDER))
  }, [recompute])

  const resetLedger = useCallback(() => {
    resetMovementIds()
    setLedger({ posted: [], results: {} })
  }, [])

  const movements = useMemo(
    () => ledger.posted.flatMap((id) => ledger.results[id]?.movements ?? []),
    [ledger],
  )

  const toggleDone = useCallback((slug: string) => {
    setDone((d) => (d.includes(slug) ? d.filter((s) => s !== slug) : [...d, slug]))
  }, [])

  const markDone = useCallback((slug: string) => {
    setDone((d) => (d.includes(slug) ? d : [...d, slug]))
  }, [])

  const value: Store = {
    theme,
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    mode,
    setMode: setModeState,

    posted: ledger.posted,
    results: ledger.results,
    movements,
    post,
    unpost,
    postAll,
    resetLedger,
    isPosted: (id: string) => ledger.posted.includes(id),

    done,
    toggleDone,
    markDone,
    resetProgress: () => setDone([]),
    progress: {
      done: done.length,
      total: NAV.length,
      percent: Math.round((done.length / NAV.length) * 100),
    },

    searchOpen,
    setSearchOpen,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used inside <StoreProvider>')
  return v
}
