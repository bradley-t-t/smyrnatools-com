/* eslint-disable react/forbid-dom-props */
import React, { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react'

import VersionPopup from '../../../app/components/common/VersionPopup'
import { useVersion } from '../../../app/hooks/useVersion'
import SrmLogo from '../../../assets/images/srm-logo.svg'
import LoginForm from './LoginForm'
import PortalDestinationCard from './PortalDestinationCard'

const VideoBackground = lazy(() => import('../../../app/components/common/VideoBackground'))

/** Static gradient placeholder shown while the ambient video lazy-loads. */
const VideoFallback = memo(function VideoFallback() {
    return (
        <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #0a1929 0%, #1e3a5f 100%)' }}
        />
    )
})

const READY_MIX_URL = 'https://smyrnareadymix.com'
const SAMSARA_URL = 'https://samsara.com'
const FOCUS_AFTER_REVEAL_MS = 480
const VIDEO_LOAD_DELAY_MS = 100

/**
 * Public entry portal for Smyrna Tools. Mirrors the in-app design language —
 * slim app-bar header, flat 1px panels on theme-aware surfaces, monochrome
 * type rhythm — so the landing reads as the front door of the operations
 * product, not a marketing splash.
 *
 * The page gates entry behind a centered "Smyrna Tools" title. The portal
 * (destination cards + sign-in panel) is hidden until the title is clicked,
 * at which point it fades + slides into view. This keeps the initial render
 * intentional and quiet, instead of greeting unauthenticated visitors with a
 * full form on first paint.
 */
function LoginView() {
    const version = useVersion()
    const loginPanelRef = useRef(null)
    const gateButtonRef = useRef(null)
    const [isRevealed, setIsRevealed] = useState(false)
    const [videoLoaded, setVideoLoaded] = useState(false)

    useEffect(() => {
        const timer = window.setTimeout(() => setVideoLoaded(true), VIDEO_LOAD_DELAY_MS)
        return () => window.clearTimeout(timer)
    }, [])

    const focusEmailField = useCallback(() => {
        const node = loginPanelRef.current
        if (!node) return
        const emailInput = node.querySelector('input[type="email"]')
        if (emailInput) emailInput.focus({ preventScroll: true })
    }, [])

    const focusLoginPanel = useCallback(() => {
        const node = loginPanelRef.current
        if (!node) return
        node.scrollIntoView({ behavior: 'smooth', block: 'center' })
        window.setTimeout(focusEmailField, 350)
    }, [focusEmailField])

    const reveal = useCallback(() => {
        setIsRevealed(true)
        window.setTimeout(focusEmailField, FOCUS_AFTER_REVEAL_MS)
    }, [focusEmailField])

    const conceal = useCallback(() => {
        setIsRevealed(false)
        window.setTimeout(() => gateButtonRef.current?.focus({ preventScroll: true }), 0)
    }, [])

    const handleBrandClick = useCallback(() => {
        if (isRevealed) conceal()
        else reveal()
    }, [isRevealed, reveal, conceal])

    return (
        <div className="relative flex h-full min-h-screen w-full flex-col overflow-y-auto overflow-x-hidden bg-slate-950 text-text-primary">
            {/*
             * Full-bleed ambient video pinned to the viewport so the navy
             * underlay always covers the screen regardless of scroll
             * position or how tall the revealed portal grows. A dark
             * vignette sits on top to keep the form panel and gate copy
             * legible across the dark, light, and gray themes.
             */}
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
                {videoLoaded ? (
                    <Suspense fallback={<VideoFallback />}>
                        <VideoBackground />
                    </Suspense>
                ) : (
                    <VideoFallback />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/45 to-slate-950/90" />
            </div>
            <VersionPopup version={version} />
            <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-border-light bg-bg-primary px-4 py-2.5 sm:px-5">
                <button type="button"
                    onClick={handleBrandClick}
                    aria-expanded={isRevealed}
                    aria-controls="portal-landing"
                    aria-label={isRevealed ? 'Hide sign-in portal' : 'Reveal sign-in portal'}
                    className="group flex min-w-0 cursor-pointer items-center gap-3 rounded-md border-none bg-transparent p-0 text-left transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary motion-reduce:transition-none"
                >
                    <img src={SrmLogo} alt="Smyrna Ready Mix" className="h-7 w-7 shrink-0" loading="eager" />
                    <span className="flex min-w-0 flex-col leading-tight">
                        <span className="font-heading text-[15px] font-bold tracking-tight text-text-primary">
                            Smyrna Portal
                        </span>
                        <span className="hidden text-[9.5px] font-semibold uppercase tracking-[0.14em] text-text-tertiary sm:inline">
                            Operations · Fleet · Concrete
                        </span>
                    </span>
                </button>
                <div className="min-w-[8px] flex-1" />
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border-light bg-bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-text-secondary">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-active" aria-hidden="true" />
                    <span className="hidden sm:inline">System</span>
                    Online
                </span>
            </header>
            <main className="relative z-10 flex flex-1 flex-col">
                {isRevealed ? (
                    <div
                        id="portal-landing"
                        className="mx-auto my-auto w-full max-w-[1080px] px-4 py-8 sm:px-6 sm:py-10 lg:py-14 animate-fade-in-up motion-reduce:animate-none"
                    >
                        <section
                            aria-labelledby="portal-heading"
                            className="mb-7 flex flex-col gap-1.5"
                        >
                            <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">
                                <span className="h-px w-6 bg-border-medium" aria-hidden="true" />
                                Welcome
                            </span>
                            <h1
                                id="portal-heading"
                                className="m-0 font-heading text-[28px] font-bold leading-[1.05] tracking-tight text-text-primary sm:text-[34px]"
                            >
                                Smyrna at a glance.
                            </h1>
                            <p className="m-0 max-w-xl text-[13.5px] leading-relaxed text-text-secondary">
                                Visit the company site, hop into the fleet platform, or sign in to the operations
                                tool.
                            </p>
                        </section>
                        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-6">
                            <nav aria-label="Destinations" className="flex flex-col gap-2.5">
                                <div className="flex items-center gap-2 px-0.5">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-tertiary">
                                        Destinations
                                    </span>
                                    <span className="h-px flex-1 bg-border-light" aria-hidden="true" />
                                    <span className="text-[10px] font-bold tabular-nums text-text-tertiary">03</span>
                                </div>
                                <PortalDestinationCard
                                    title="Smyrna Ready Mix"
                                    description="Company site — services, plants, and ways to request concrete."
                                    href={READY_MIX_URL}
                                    icon="industry"
                                    meta="Corporate"
                                    tone="info"
                                />
                                <PortalDestinationCard
                                    title="Samsara"
                                    description="Fleet telematics, dash cams, and routing for drivers and dispatchers."
                                    href={SAMSARA_URL}
                                    icon="satellite-dish"
                                    meta="Fleet platform"
                                    tone="success"
                                />
                                <PortalDestinationCard
                                    title="Smyrna Tools"
                                    description="Internal operations — plants, fleet, people, and reporting."
                                    onClick={focusLoginPanel}
                                    icon="toolbox"
                                    meta="Internal · Sign-in required"
                                    tone="accent"
                                />
                            </nav>
                            <section
                                ref={loginPanelRef}
                                aria-label="Smyrna Tools sign in"
                                className="w-full"
                            >
                                <LoginForm />
                            </section>
                        </div>
                    </div>
                ) : (
                    <div className="m-auto flex w-full max-w-md flex-col items-center px-6 py-12 animate-fade-in motion-reduce:animate-none">
                        <button type="button"
                            ref={gateButtonRef}
                            onClick={reveal}
                            aria-expanded={isRevealed}
                            aria-controls="portal-landing"
                            className="group flex w-full cursor-pointer flex-col items-center gap-5 rounded-card border border-transparent bg-transparent px-6 py-8 text-center transition-[transform,border-color,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-border-light hover:bg-bg-primary focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                        >
                            <span className="relative inline-flex h-16 w-16 items-center justify-center">
                                <span
                                    aria-hidden="true"
                                    className="absolute inset-0 rounded-full bg-accent/10 transition-[transform,background-color] duration-300 ease-out group-hover:scale-110 group-hover:bg-accent/15 motion-reduce:transition-none"
                                />
                                <img
                                    src={SrmLogo}
                                    alt=""
                                    aria-hidden="true"
                                    className="relative h-12 w-12"
                                    loading="eager"
                                />
                            </span>
                            <span className="flex flex-col items-center gap-2.5">
                                <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">
                                    <span className="h-px w-6 bg-border-medium" aria-hidden="true" />
                                    Welcome
                                    <span className="h-px w-6 bg-border-medium" aria-hidden="true" />
                                </span>
                                <span className="font-heading text-[40px] font-bold leading-none tracking-tight text-text-primary sm:text-[48px]">
                                    Smyrna Tools
                                </span>
                                <span className="text-[12.5px] text-text-secondary">
                                    Click to sign in
                                </span>
                            </span>
                            <span
                                aria-hidden="true"
                                className="inline-flex items-center gap-1.5 rounded-md border border-border-light bg-bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary transition-[color,border-color,transform] duration-200 ease-out group-hover:translate-y-0.5 group-hover:border-accent group-hover:text-accent motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
                            >
                                <i className="fas fa-chevron-down text-[9px]" />
                                Enter
                            </span>
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}

export default LoginView
