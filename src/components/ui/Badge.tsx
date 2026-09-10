type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'teal' | 'neutral'

interface Props {
    children: React.ReactNode
    variant?: BadgeVariant
}

const variants: Record<BadgeVariant, string> = {
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    danger: 'bg-red-500/15 text-red-400 border-red-500/30',
    info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    teal: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    neutral: 'bg-slate-700/50 text-slate-400 border-slate-600/50',
}

export default function Badge({ children, variant = 'neutral' }: Props) {
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]}`}
        >
            {children}
        </span>
    )
}
