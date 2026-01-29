module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            colors: {
                accent: 'var(--accent)',
                'bg-primary': 'var(--bg-primary)',
                'bg-secondary': 'var(--bg-secondary)',
                'bg-tertiary': 'var(--bg-tertiary)',
                'text-primary': 'var(--text-primary)',
                'text-secondary': 'var(--text-secondary)',
                'text-tertiary': 'var(--text-tertiary)',
                'border-light': 'var(--border-light)',
                'border-medium': 'var(--border-medium)',
                'status-active': 'var(--status-active)',
                'status-warning': 'var(--status-warning)',
                'status-danger': 'var(--status-danger)',
                'status-shop': 'var(--status-shop)',
                'status-spare': 'var(--status-spare)',
            },
            fontFamily: {
                sans: ['var(--font-family)', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'card': '0 2px 4px rgba(0, 0, 0, 0.1)',
                'modal': '0 20px 60px rgba(0, 0, 0, 0.3)',
            },
            borderRadius: {
                'card': '12px',
                'modal': '16px',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease',
                'slide-up': 'slideUp 0.3s ease',
                'pulse-slow': 'pulse 2s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': {opacity: '0'},
                    '100%': {opacity: '1'},
                },
                slideUp: {
                    '0%': {opacity: '0', transform: 'translateY(20px)'},
                    '100%': {opacity: '1', transform: 'translateY(0)'},
                },
            },
        },
    },
    plugins: [],
}
