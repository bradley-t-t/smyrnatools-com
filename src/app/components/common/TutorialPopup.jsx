import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { useTutorial } from '../../context/TutorialContext'
import { useAccentColor } from '../../hooks/useAccentColor'

/**
 * Registry of all available tutorial definitions.
 * Each key maps to positioning, target selector, and content for the popup.
 */
const TUTORIALS = {
    'account-nav-hint': {
        arrowPosition: 'top-right',
        message: 'Click on your profile to access account settings and customize your preferences.',
        position: 'bottom-left',
        targetSelector: '[data-tutorial-target="account-nav"]',
        title: 'Customize Your Experience'
    },
    'preferences-tab-hint': {
        arrowPosition: 'left',
        message: 'Check out the Preferences tab to customize your accent color and other settings.',
        position: 'right',
        targetSelector: '[data-tutorial-target="preferences-tab"]',
        title: 'Preferences Tab'
    }
}

/**
 * Positioned popup overlay that highlights a target DOM element and displays
 * contextual guidance. Uses an SVG mask to create a spotlight effect around the target,
 * with a pulsing border and directional arrow.
 * @param {Object} props
 * @param {string} props.tutorialId - Key into the TUTORIALS registry.
 * @param {Function} props.onDismiss - Callback invoked when the user clicks "Got it".
 */
function TutorialPopup({ tutorialId, onDismiss }) {
    const accentColor = useAccentColor()
    const [position, setPosition] = useState(null)
    const [targetRect, setTargetRect] = useState(null)
    const [isReady, setIsReady] = useState(false)
    const popupRef = useRef(null)
    const tutorial = TUTORIALS[tutorialId]

    useEffect(() => {
        if (!tutorial) return

        let attempts = 0
        const maxAttempts = 20

        const tryCalculatePosition = () => {
            const target = document.querySelector(tutorial.targetSelector)
            const popupEl = popupRef.current

            if (!target || !popupEl) {
                attempts++
                if (attempts < maxAttempts) {
                    setTimeout(tryCalculatePosition, 100)
                }
                return
            }

            const tRect = target.getBoundingClientRect()
            if (tRect.width === 0 || tRect.height === 0) {
                attempts++
                if (attempts < maxAttempts) {
                    setTimeout(tryCalculatePosition, 100)
                }
                return
            }

            const popupRect = popupEl.getBoundingClientRect()
            const padding = 12

            const newTargetRect = {
                bottom: tRect.bottom,
                height: tRect.height,
                left: tRect.left,
                right: tRect.right,
                top: tRect.top,
                width: tRect.width
            }

            let top, left

            switch (tutorial.position) {
                case 'bottom':
                    top = tRect.bottom + padding
                    left = tRect.left + tRect.width / 2 - popupRect.width / 2
                    break
                case 'bottom-left':
                    top = tRect.bottom + padding
                    left = tRect.right - popupRect.width
                    break
                case 'bottom-right':
                    top = tRect.bottom + padding
                    left = tRect.left
                    break
                case 'top':
                    top = tRect.top - popupRect.height - padding
                    left = tRect.left + tRect.width / 2 - popupRect.width / 2
                    break
                case 'left':
                    top = tRect.top + tRect.height / 2 - popupRect.height / 2
                    left = tRect.left - popupRect.width - padding
                    break
                case 'right':
                    top = tRect.top + tRect.height / 2 - popupRect.height / 2
                    left = tRect.right + padding
                    break
                default:
                    top = tRect.bottom + padding
                    left = tRect.left
            }

            left = Math.max(12, Math.min(left, window.innerWidth - popupRect.width - 12))
            top = Math.max(12, Math.min(top, window.innerHeight - popupRect.height - 12))

            setTargetRect(newTargetRect)
            setPosition({ left, top })
            setIsReady(true)
        }

        const timer = setTimeout(tryCalculatePosition, 200)

        const handleUpdate = () => {
            if (isReady) {
                const target = document.querySelector(tutorial.targetSelector)
                if (target) {
                    const tRect = target.getBoundingClientRect()
                    setTargetRect({
                        bottom: tRect.bottom,
                        height: tRect.height,
                        left: tRect.left,
                        right: tRect.right,
                        top: tRect.top,
                        width: tRect.width
                    })
                }
            }
        }

        window.addEventListener('resize', handleUpdate)
        window.addEventListener('scroll', handleUpdate, true)

        return () => {
            clearTimeout(timer)
            window.removeEventListener('resize', handleUpdate)
            window.removeEventListener('scroll', handleUpdate, true)
        }
    }, [tutorial, tutorialId, isReady])

    if (!tutorial) return null

    const getArrowStyle = () => {
        const base = {
            borderStyle: 'solid',
            height: 0,
            position: 'absolute',
            width: 0
        }

        switch (tutorial.arrowPosition) {
            case 'top':
                return {
                    ...base,
                    borderColor: `transparent transparent ${accentColor} transparent`,
                    borderWidth: '0 8px 8px 8px',
                    left: '50%',
                    top: -8,
                    transform: 'translateX(-50%)'
                }
            case 'top-right':
                return {
                    ...base,
                    borderColor: `transparent transparent ${accentColor} transparent`,
                    borderWidth: '0 8px 8px 8px',
                    right: 16,
                    top: -8
                }
            case 'top-left':
                return {
                    ...base,
                    borderColor: `transparent transparent ${accentColor} transparent`,
                    borderWidth: '0 8px 8px 8px',
                    left: 16,
                    top: -8
                }
            case 'bottom':
                return {
                    ...base,
                    borderColor: `white transparent transparent transparent`,
                    borderWidth: '8px 8px 0 8px',
                    bottom: -8,
                    left: '50%',
                    transform: 'translateX(-50%)'
                }
            case 'left':
                return {
                    ...base,
                    borderColor: `transparent ${accentColor} transparent transparent`,
                    borderWidth: '8px 8px 8px 0',
                    left: -8,
                    top: '50%',
                    transform: 'translateY(-50%)'
                }
            case 'right':
                return {
                    ...base,
                    borderColor: `transparent transparent transparent white`,
                    borderWidth: '8px 0 8px 8px',
                    right: -8,
                    top: '50%',
                    transform: 'translateY(-50%)'
                }
            default:
                return base
        }
    }

    return ReactDOM.createPortal(
        <>
            {isReady && (
                <>
                    <style>{`
                        @keyframes tutorial-pulse {
                            0%, 100% { box-shadow: 0 0 0 0 ${accentColor}66; }
                            50% { box-shadow: 0 0 0 8px ${accentColor}00; }
                        }
                    `}</style>
                    <svg
                        style={{
                            height: '100%',
                            left: 0,
                            pointerEvents: 'none',
                            position: 'fixed',
                            top: 0,
                            width: '100%',
                            zIndex: 9997
                        }}
                    >
                        <defs>
                            <mask id="tutorial-mask">
                                <rect fill="white" height="100%" width="100%" x="0" y="0" />
                                {targetRect && (
                                    <rect
                                        fill="black"
                                        height={targetRect.height + 16}
                                        rx="10"
                                        width={targetRect.width + 16}
                                        x={targetRect.left - 8}
                                        y={targetRect.top - 8}
                                    />
                                )}
                            </mask>
                        </defs>
                        <rect
                            fill="rgba(0,0,0,0.6)"
                            height="100%"
                            mask="url(#tutorial-mask)"
                            width="100%"
                            x="0"
                            y="0"
                        />
                    </svg>
                    {targetRect && (
                        <div
                            style={{
                                animation: 'tutorial-pulse 2s ease-in-out infinite',
                                border: `3px solid ${accentColor}`,
                                borderRadius: 12,
                                boxSizing: 'border-box',
                                height: targetRect.height + 16,
                                left: targetRect.left - 8,
                                pointerEvents: 'none',
                                position: 'fixed',
                                top: targetRect.top - 8,
                                width: targetRect.width + 16,
                                zIndex: 9998
                            }}
                        />
                    )}
                </>
            )}
            <div
                ref={popupRef}
                style={{
                    background: 'white',
                    borderRadius: 12,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    left: position ? position.left : -9999,
                    opacity: isReady ? 1 : 0,
                    overflow: 'hidden',
                    position: 'fixed',
                    top: position ? position.top : -9999,
                    transform: isReady ? 'scale(1)' : 'scale(0.95)',
                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                    visibility: isReady ? 'visible' : 'hidden',
                    width: 280,
                    zIndex: 9999
                }}
            >
                <div style={getArrowStyle()} />
                <div
                    style={{
                        alignItems: 'center',
                        background: accentColor,
                        display: 'flex',
                        gap: 10,
                        padding: '14px 16px'
                    }}
                >
                    <div
                        style={{
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: 8,
                            display: 'flex',
                            height: 28,
                            justifyContent: 'center',
                            width: 28
                        }}
                    >
                        <i className="fas fa-lightbulb" style={{ color: 'white', fontSize: 14 }}></i>
                    </div>
                    <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>{tutorial.title}</span>
                </div>
                <div style={{ padding: 16 }}>
                    <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px 0' }}>
                        {tutorial.message}
                    </p>
                    <button
                        onClick={onDismiss}
                        style={{
                            alignItems: 'center',
                            background: accentColor,
                            border: 'none',
                            borderRadius: 8,
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            fontSize: 13,
                            fontWeight: 600,
                            gap: 8,
                            justifyContent: 'center',
                            padding: '10px 16px',
                            width: '100%'
                        }}
                    >
                        <span>Got it</span>
                        <i className="fas fa-check"></i>
                    </button>
                </div>
            </div>
        </>,
        document.body
    )
}

/**
 * Context-driven manager that renders the currently active tutorial popup.
 * Consumes TutorialContext to determine which tutorial (if any) to display.
 */
function TutorialManager() {
    const { activeTutorial, dismissTutorial } = useTutorial()

    if (!activeTutorial) return null

    return <TutorialPopup tutorialId={activeTutorial} onDismiss={() => dismissTutorial(activeTutorial)} />
}

export { TutorialManager, TutorialPopup, TUTORIALS }
export default TutorialManager
