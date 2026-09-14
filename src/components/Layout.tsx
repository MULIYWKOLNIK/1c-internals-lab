import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Search,
  Sun,
  Moon,
  User,
  Wrench,
  Menu,
  X,
  CheckCircle2,
  Circle,
  Star,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Boxes,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useStore } from '@/state/store'
import { NAV, NAV_GROUPS, NAV_BY_SLUG, neighbours } from '@/data/nav'
import { Button, Tabs } from './ui'
import { SearchPalette } from './SearchPalette'

export function Layout() {
  const store = useStore()
  const loc = useLocation()
  const [open, setOpen] = useState(false)

  const slug = loc.pathname.replace(/^\//, '') || 'home'
  const current = NAV_BY_SLUG[slug]

  useEffect(() => {
    setOpen(false)
    window.scrollTo({ top: 0 })
  }, [loc.pathname])

  return (
    <div className="min-h-screen bg-bg">
      <SearchPalette />

      {/* ------------------------------ TOPBAR ------------------------------ */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
          <button
            onClick={() => setOpen((o) => !o)}
            className="focus-ring rounded-lg border border-line p-1.5 lg:hidden"
            aria-label="Меню"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>

          <Link to="/" className="focus-ring flex items-center gap-2 rounded-lg">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
              <Boxes size={16} />
            </span>
            <span className="hidden sm:block">
              <span className="block text-[13px] font-semibold leading-4 tracking-tight">
                1C / BAS Internals Lab
              </span>
              <span className="block font-mono text-[10px] leading-3 text-muted">
                документ → рухи → регістри → звіт
              </span>
            </span>
          </Link>

          <button
            onClick={() => store.setSearchOpen(true)}
            className="focus-ring group ml-auto flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-muted transition hover:border-accent/45 hover:text-fg sm:w-64"
          >
            <Search size={14} />
            <span className="hidden sm:inline">Пошук…</span>
            <span className="kbd ml-auto hidden sm:inline-flex">Ctrl K</span>
          </button>

          <Tabs
            size="sm"
            value={store.mode}
            onChange={store.setMode}
            tabs={[
              {
                id: 'user',
                label: (
                  <span className="flex items-center gap-1">
                    <User size={12} />
                    <span className="hidden md:inline">User</span>
                  </span>
                ),
              },
              {
                id: 'debug',
                label: (
                  <span className="flex items-center gap-1">
                    <Wrench size={12} />
                    <span className="hidden md:inline">Debug</span>
                  </span>
                ),
              },
            ]}
          />

          <button
            onClick={store.toggleTheme}
            className="focus-ring rounded-lg border border-line bg-surface p-1.5 text-muted transition hover:text-fg"
            aria-label="Тема"
            title="Світла / темна тема"
          >
            {store.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        {/* ----------------------------- SIDEBAR ---------------------------- */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-[286px] shrink-0 border-r border-line bg-surface pt-14 transition-transform lg:sticky lg:top-14 lg:z-0 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 lg:pt-0',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="scroll-thin flex h-full flex-col overflow-y-auto">
            <div className="border-b border-line px-4 py-3">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[11px] uppercase tracking-wide text-faint">Прогрес</span>
                <span className="font-mono text-[12px] font-semibold">
                  {store.progress.done} / {store.progress.total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${store.progress.percent}%` }}
                />
              </div>
              {store.progress.done > 0 && (
                <button
                  onClick={store.resetProgress}
                  className="mt-2 flex items-center gap-1 text-[11px] text-faint transition hover:text-danger"
                >
                  <RotateCcw size={10} /> скинути прогрес
                </button>
              )}
            </div>

            <nav className="flex-1 px-2 py-2">
              {NAV_GROUPS.map((g) => (
                <div key={g.group} className="mb-2">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                    {g.group}
                  </div>
                  {g.items.map((n) => {
                    const done = store.done.includes(n.slug)
                    return (
                      <NavLink
                        key={n.slug}
                        to={`/${n.slug}`}
                        className={({ isActive }) =>
                          cn(
                            'group flex items-start gap-2 rounded-lg px-2 py-1.5 transition',
                            isActive
                              ? 'bg-accent/[0.12] text-fg ring-1 ring-accent/30'
                              : 'text-muted hover:bg-elevated hover:text-fg',
                          )
                        }
                      >
                        <span className="mt-[3px] font-mono text-[10px] text-faint">{n.no}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-medium">{n.title}</span>
                            {n.star && <Star size={11} className="shrink-0 fill-warn text-warn" />}
                          </span>
                          <span className="block truncate text-[11px] text-faint">{n.short}</span>
                        </span>
                        {done ? (
                          <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-ok" />
                        ) : (
                          <Circle size={13} className="mt-0.5 shrink-0 text-line" />
                        )}
                      </NavLink>
                    )
                  })}
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {open && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* ------------------------------ MAIN ------------------------------ */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1080px]">
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
            {current && <PageFooter slug={current.slug} />}
          </div>
        </main>
      </div>
    </div>
  )
}

/** Скелет, який видно, поки вантажиться чанк розділу. */
function PageFallback() {
  return (
    <div className="grid gap-3" aria-busy="true">
      <div className="h-7 w-2/3 animate-pulse rounded bg-elevated" />
      <div className="h-4 w-full animate-pulse rounded bg-elevated" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-elevated" />
      <div className="mt-3 h-56 w-full animate-pulse rounded-xl bg-elevated" />
    </div>
  )
}

function PageFooter({ slug }: { slug: string }) {
  const store = useStore()
  const { prev, next } = neighbours(slug)
  const done = store.done.includes(slug)
  const idx = NAV.findIndex((n) => n.slug === slug)

  return (
    <div className="mt-10 border-t border-line pt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button variant={done ? 'ok' : 'primary'} onClick={() => store.toggleDone(slug)}>
          {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
          {done ? 'Розділ пройдено' : 'Позначити як пройдений'}
        </Button>
        <span className="font-mono text-[11px] text-faint">
          розділ {idx + 1} з {NAV.length}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {prev ? (
          <Link
            to={`/${prev.slug}`}
            className="focus-ring group rounded-lg border border-line bg-surface px-3 py-2.5 transition hover:border-accent/45"
          >
            <span className="flex items-center gap-1.5 text-[11px] text-faint">
              <ArrowLeft size={11} /> Попередній
            </span>
            <span className="mt-0.5 block truncate text-[13px] font-medium">
              {prev.no}. {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            to={`/${next.slug}`}
            className="focus-ring group rounded-lg border border-line bg-surface px-3 py-2.5 text-right transition hover:border-accent/45 sm:col-start-2"
          >
            <span className="flex items-center justify-end gap-1.5 text-[11px] text-faint">
              Наступний <ArrowRight size={11} />
            </span>
            <span className="mt-0.5 block truncate text-[13px] font-medium">
              {next.no}. {next.title}
            </span>
          </Link>
        )}
      </div>
    </div>
  )
}
