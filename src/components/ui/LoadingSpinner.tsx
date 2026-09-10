interface Props {
    fullScreen?: boolean
    size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }

export default function LoadingSpinner({ fullScreen, size = 'md' }: Props) {
    const spinner = (
        <div
            className={`${sizes[size]} border-2 border-theme-border border-t-theme-primary rounded-full animate-spin`}
        />
    )

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-theme-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <span className="text-3xl">🌿</span>
                    {spinner}
                    <p className="text-theme-text-muted text-sm font-medium">載入中…</p>
                </div>
            </div>
        )
    }

    return spinner
}
