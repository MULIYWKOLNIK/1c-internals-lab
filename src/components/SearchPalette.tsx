import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useStore } from '@/state/store'
import { KIND_LABEL, search, type SearchHit } from '@/data/searchIndex'
import { Badge } from './ui'

const SUGGESTIONS = ['витрати', 'регістр', 'проведення', 'сторно', 'субконто', 'звіт', 'ledger']

export function SearchPalette() {
  const { searchOpen, setSearchOpen } = useStore()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const nav = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const hits = useMemo(() => search(q), [q])

  useEffect(() => {
    if (searchOpen) {
      setQ('')
      setSel(0)
      window.setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [searchOpen])

  useEffect(() => setSel(0), [q])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSearchOpen])

  if (!searchOpen) return null

  const go = (hit: SearchHit) => {
    setSearchOpen(false)
    nav(hit.path)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-[10vh] backdrop-blur-sm"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search size={17} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSel((s) => Math.min(s + 1, hits.length - 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSel((s) => Math.max(s - 1, 0))
              }
              if (e.key === 'Enter' && hits[sel]) go(hits[sel])
            }}
            placeholder="Пошук: витрати, регістр, сторно, субконто…"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
          />
          <span className="kbd">Esc</span>
        </div>

        {!q && (
          <div className="px-4 py-3">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-faint">Спробуйте</div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setQ(s)}
                  className="chip hover:border-accent/50 hover:text-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {q && (
          <div className="scroll-thin max-h-[52vh] overflow-y-auto py-1.5">
            {hits.length === 0 && (
              <div className="px-4 py-8 text-center text-[13px] text-muted">
                Нічого не знайдено за запитом «{q}»
              </div>
            )}
            {hits.map((h, i) => (
              <button
                key={h.id}
                onMouseEnter={() => setSel(i)}
                onClick={() => go(h)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2 text-left transition',
                  i === sel ? 'bg-accent/[0.1]' : 'hover:bg-elevated',
                )}
              >
                <Badge
                  tone={
                    h.kind === 'topic'
                      ? 'accent'
                      : h.kind === 'term'
                        ? 'violet'
                        : h.kind === 'register'
                          ? 'cyan'
                          : h.kind === 'example'
                            ? 'ok'
                            : 'neutral'
                  }
                  className="w-[76px] shrink-0 justify-center"
                >
                  {KIND_LABEL[h.kind]}
                </Badge>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{h.title}</span>
                  <span className="block truncate text-[12px] text-muted">{h.subtitle}</span>
                </span>
                {i === sel && <CornerDownLeft size={13} className="shrink-0 text-muted" />}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[11px] text-faint">
          <span className="flex items-center gap-1.5">
            <span className="kbd">↑</span>
            <span className="kbd">↓</span> навігація
            <span className="kbd">↵</span> відкрити
          </span>
          <span>{hits.length} результат(ів)</span>
        </div>
      </div>
    </div>
  )
}
