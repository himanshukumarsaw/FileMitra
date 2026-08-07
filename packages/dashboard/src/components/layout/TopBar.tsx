import { Search, Bell, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/providers/ThemeProvider'

export function TopBar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-surface bg-slate-dark/80 px-6 backdrop-blur-md">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-muted" />
        <input
          type="text"
          placeholder="Search alerts, nodes..."
          className="h-9 w-full rounded-lg border border-slate-surface bg-slate-surface/50 pl-9 pr-4 text-sm text-slate-text placeholder:text-slate-muted focus:border-forest-light focus:outline-none focus:ring-1 focus:ring-forest-light/50"
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-slate-muted transition-colors hover:bg-slate-surface hover:text-slate-text">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            3
          </span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-muted transition-colors hover:bg-slate-surface hover:text-slate-text"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-700/50" />

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-light/20 text-sm font-medium text-forest-light">
            FM
          </div>
          <span className="hidden text-sm font-medium text-slate-text md:block">
            Admin
          </span>
        </div>
      </div>
    </header>
  )
}
