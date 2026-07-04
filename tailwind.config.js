module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
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
                'status-spare': 'var(--status-spare)'
            },
            fontFamily: {
                sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
                heading: ['var(--font-heading)', 'system-ui', 'sans-serif']
            },
            boxShadow: {
                card: '0 2px 4px rgba(0, 0, 0, 0.1)',
                modal: '0 20px 60px rgba(0, 0, 0, 0.3)'
            },
            borderRadius: {
                card: '12px',
                modal: '16px'
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease',
                'fade-in-fast': 'fadeIn 0.2s ease-out',
                'fade-out': 'fadeOut 0.3s ease',
                'fade-slide-in': 'fadeSlideIn 0.2s ease-out',
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
                'confirm-slide-in': 'confirmSlideIn 0.2s ease-out',
                shimmer: 'shimmer 1.5s infinite',
                'plan-overbook-glow': 'planOverbookGlow 2.4s ease-in-out infinite',
                'plan-overbook-wobble': 'planOverbookWobble 2.4s ease-in-out infinite',
                'filter-fade': 'filterFadeIn 0.15s ease-out',
                'fuse-shimmer': 'fuseShimmer 2.2s ease-in-out infinite',
                'fuse-pulse': 'fusePulse 1.6s ease-in-out infinite',
                'tutorial-pulse': 'tutorialPulse 2s ease-in-out infinite',
                'dv-spin': 'dvSpin 0.7s linear infinite',
                'dv-fade-in': 'dvFadeIn 0.3s ease-out',
                'dv-slide-up': 'dvSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                'dv-scale-in': 'dvScaleIn 0.2s ease-out'
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' }
                },
                fadeOut: {
                    '0%': { opacity: '1' },
                    '100%': { opacity: '0' }
                },
                fadeSlideIn: {
                    '0%': { opacity: '0', transform: 'translateY(-8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                pulse: {
                    '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
                    '40%': { transform: 'scale(1)', opacity: '1' }
                },
                planOverbookGlow: {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.55)' },
                    '50%': { boxShadow: '0 0 0 6px rgba(220, 38, 38, 0)' }
                },
                planOverbookWobble: {
                    '0%, 100%': { transform: 'rotate(0deg)' },
                    '25%': { transform: 'rotate(-7deg)' },
                    '75%': { transform: 'rotate(7deg)' }
                },
                filterFadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(-4px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                fuseShimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(250%)' }
                },
                fusePulse: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.55' }
                },
                /* Reads --tutorial-accent set inline by the consumer so the
                   pulse colour can match the user's accent at runtime. */
                tutorialPulse: {
                    '0%, 100%': {
                        boxShadow: '0 0 0 0 color-mix(in srgb, var(--tutorial-accent, #1e3a5f) 40%, transparent)'
                    },
                    '50%': { boxShadow: '0 0 0 8px transparent' }
                },
                dvSpin: {
                    to: { transform: 'rotate(360deg)' }
                },
                dvFadeIn: {
                    from: { opacity: '0', transform: 'translateY(8px)' },
                    to: { opacity: '1', transform: 'translateY(0)' }
                },
                dvSlideUp: {
                    from: { transform: 'translateY(100%)' },
                    to: { transform: 'translateY(0)' }
                },
                dvScaleIn: {
                    from: { opacity: '0', transform: 'translateY(-50%) scaleY(0)' },
                    to: { opacity: '1', transform: 'translateY(-50%) scaleY(1)' }
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                msgIn: {
                    '0%': { opacity: '0', transform: 'translateY(-8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                revealFromLeft: {
                    '0%': { opacity: '0', transform: 'translateX(-18px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' }
                },
                revealFromRight: {
                    '0%': { opacity: '0', transform: 'translateX(18px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' }
                },
                revealFromUp: {
                    '0%': { opacity: '0', transform: 'translateY(14px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                popIn: {
                    '0%': { transform: 'scale(0.8)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' }
                },
                slideInRow: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' }
                },
                commentSlideIn: {
                    '0%': { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
                },
                confirmSlideIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
                    '100%': { opacity: '1', transform: 'scale(1) translateY(0)' }
                },
                shimmer: {
                    '0%': { backgroundPosition: '200% 0' },
                    '100%': { backgroundPosition: '-200% 0' }
                }
            }
        }
    },
    plugins: []
}
