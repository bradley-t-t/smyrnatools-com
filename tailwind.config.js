module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            colors: {
                accent: 'var(--accent)',
                'accent-hover': 'var(--accent-hover)',
                'accent-dark': 'var(--accent-dark)',
                'bg-primary': 'var(--bg-primary)',
                'bg-secondary': 'var(--bg-secondary)',
                'bg-tertiary': 'var(--bg-tertiary)',
                'text-primary': 'var(--text-primary)',
                'text-secondary': 'var(--text-secondary)',
                'text-tertiary': 'var(--text-tertiary)',
                'border-light': 'var(--border-light)',
                'border-medium': 'var(--border-medium)',
                'bg-hover': 'var(--bg-hover)',
                'status-active': 'var(--status-active)',
                'status-warning': 'var(--status-warning)',
                'status-danger': 'var(--status-danger)',
                'status-shop': 'var(--status-shop)',
                'status-spare': 'var(--status-spare)',
            },
            fontFamily: {
                sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
                heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
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
                'fade-in-fast': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.3s ease',
                'pulse-slow': 'pulse 2s ease-in-out infinite',
                'msg-in': 'msgIn 0.3s ease-out',
                'fade-in-up': 'fadeInUp 0.45s ease-out both',
                'reveal-left': 'revealFromLeft 0.5s ease-out both',
                'reveal-right': 'revealFromRight 0.5s ease-out both',
                'reveal-up': 'revealFromUp 0.5s ease-out both',
                'pop-in': 'popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                'slide-in-row': 'slideInRow 0.4s ease-out both',
                'comment-slide-in': 'commentSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                'comment-fade-in': 'fadeIn 0.2s ease',
                'progress-slide': 'progressSlide 1.5s ease-in-out infinite',
                'confirm-slide-in': 'confirmSlideIn 0.2s ease-out',
                'shimmer': 'shimmer 1.5s infinite',
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
                msgIn: {
                    '0%': {opacity: '0', transform: 'translateY(-8px)'},
                    '100%': {opacity: '1', transform: 'translateY(0)'},
                },
                fadeInUp: {
                    '0%': {opacity: '0', transform: 'translateY(16px)'},
                    '100%': {opacity: '1', transform: 'translateY(0)'},
                },
                revealFromLeft: {
                    '0%': {opacity: '0', transform: 'translateX(-18px)'},
                    '100%': {opacity: '1', transform: 'translateX(0)'},
                },
                revealFromRight: {
                    '0%': {opacity: '0', transform: 'translateX(18px)'},
                    '100%': {opacity: '1', transform: 'translateX(0)'},
                },
                revealFromUp: {
                    '0%': {opacity: '0', transform: 'translateY(14px)'},
                    '100%': {opacity: '1', transform: 'translateY(0)'},
                },
                popIn: {
                    '0%': {transform: 'scale(0.8)', opacity: '0'},
                    '100%': {transform: 'scale(1)', opacity: '1'},
                },
                slideInRow: {
                    '0%': {opacity: '0', transform: 'translateX(-20px)'},
                    '100%': {opacity: '1', transform: 'translateX(0)'},
                },
                commentSlideIn: {
                    '0%': {opacity: '0', transform: 'translateY(20px) scale(0.98)'},
                    '100%': {opacity: '1', transform: 'translateY(0) scale(1)'},
                },
                progressSlide: {
                    '0%': {transform: 'translateX(-100%)'},
                    '50%': {transform: 'translateX(250%)'},
                    '100%': {transform: 'translateX(450%)'},
                },
                confirmSlideIn: {
                    '0%': {opacity: '0', transform: 'scale(0.95) translateY(10px)'},
                    '100%': {opacity: '1', transform: 'scale(1) translateY(0)'},
                },
                shimmer: {
                    '0%': {backgroundPosition: '200% 0'},
                    '100%': {backgroundPosition: '-200% 0'},
                },
            },
        },
    },
    plugins: [],
}
