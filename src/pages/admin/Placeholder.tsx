import { Construction } from 'lucide-react'

export default function Placeholder({ title }: { title: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
            <div className="w-16 h-16 rounded-sm bg-theme-bg flex items-center justify-center">
                <Construction size={28} className="text-theme-text-muted" />
            </div>
            <div>
                <h2 className="text-theme-text font-semibold text-lg">{title}</h2>
                <p className="text-theme-text-muted text-sm mt-1">此功能正在開發中，敬請期待。</p>
            </div>
        </div>
    )
}
