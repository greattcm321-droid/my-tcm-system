import type { Config } from 'tailwindcss'

const config: Config = {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                // CSS 變數橋接 — 讓 Tailwind 可用 bg-theme-bg, text-theme-text 等
                theme: {
                    primary: 'var(--primary)',
                    'primary-light': 'var(--primary-light)',
                    'primary-muted': 'var(--primary-muted)',
                    bg: 'var(--bg)',
                    surface: 'var(--surface)',
                    'surface-alt': 'var(--surface-alt)',
                    border: 'var(--border)',
                    text: 'var(--text)',
                    'text-muted': 'var(--text-muted)',
                },
            },
            animation: {
                'fade-in': 'fadeIn 0.25s ease-out',
                'slide-in': 'slideIn 0.25s ease-out',
            },
            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                slideIn: {
                    from: { transform: 'translateX(-8px)', opacity: '0' },
                    to: { transform: 'translateX(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}

export default config
