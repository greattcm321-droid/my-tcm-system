import { Bell, Menu, Search } from 'lucide-react'

interface Props {
    onMenuToggle: () => void
    title?: string
}

export default function Topbar({ onMenuToggle, title }: Props) {
    return (
        <header className="h-14 bg-theme-surface/80 backdrop-blur-sm border-b border-theme-border flex items-center gap-3 px-4 sticky top-0 z-10 shrink-0">
            <button
                onClick={onMenuToggle}
                className="lg:hidden p-2 text-theme-text-muted hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition"
            >
                <Menu size={18} />
            </button>

            {title && (
                <h1 className="text-theme-text font-bold text-sm hidden sm:block">{title}</h1>
            )}

            <div className="flex-1" />

            {/* Quick search hint */}
            <button className="hidden md:flex items-center gap-2 bg-theme-bg text-theme-text-muted text-xs px-3 py-1.5 rounded-lg border border-theme-border hover:border-theme-primary transition-colors">
                <Search size={13} />
                <span>快速搜尋</span>
                <kbd className="bg-theme-surface px-1 py-0.5 rounded text-theme-text-muted border border-theme-border">⌘K</kbd>
            </button>

            {/* Notification bell */}
            <button className="relative p-2 text-theme-text-muted hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition">
                <Bell size={17} />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-theme-primary rounded-full ring-1 ring-theme-surface" />
            </button>
        </header>
    )
}
