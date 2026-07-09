/* eslint-disable react/forbid-dom-props */
import React, { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react'

import { SESSION_STORAGE_KEYS } from '../../../app/constants/authConstants'
import { useAuth } from '../../../app/context/AuthContext'
import ValidationUtility from '../../../utils/ValidationUtility'

const PasswordRecoveryView = lazy(() => import('./PasswordRecoveryView'))

const STRENGTH_TONE_CLS = {
    Medium: 'text-status-warning',
    Strong: 'text-status-active',
    Weak: 'text-status-danger'
}

/** Horizontal bar that fills to 33/66/100% based on Weak/Medium/Strong password strength. */
const PasswordStrengthBar = memo(function PasswordStrengthBar({ strength }) {
    if (!strength.value) return null
    const widthMap = { Medium: '66%', Strong: '100%', Weak: '33%' }
    return (
        <div className="mb-4 -mt-2">
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1 rounded-sm bg-white/10">
                    <div
                        className="h-full rounded-sm transition-[width] duration-300"
                        style={{ background: strength.color, width: widthMap[strength.value] || '0%' }}
                    />
                </div>
                <span
                    className={`text-[10px] font-bold uppercase tracking-[0.08em] ${STRENGTH_TONE_CLS[strength.value] || 'text-white/70'}`}
                >
                    {strength.value}
                </span>
            </div>
        </div>
    )
})

/** Constant-time string comparison to prevent timing attacks on password matching. */
const constantTimeEqual = (a, b) => {
    if (a.length !== b.length) return false
    let mismatch = 0
    for (let i = 0; i < a.length; i++) {
        mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return mismatch === 0
}

const INPUT_CLS =
    'w-full rounded-md border border-white/15 bg-white/[0.06] text-white text-[13.5px] ' +
    'px-3 py-2.5 outline-none transition-[border-color,background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none ' +
    'placeholder:text-white/40 hover:border-white/25 ' +
    'focus:border-white/50 focus:bg-white/[0.1] ' +
    'focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)]'

const LABEL_CLS = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/60'

const ALERT_BASE_CLS =
    'mb-5 flex items-start gap-2 rounded-md border px-3 py-2 text-[12.5px] leading-snug animate-msg-in motion-reduce:animate-none'

/**
 * Sign-in / sign-up form panel for Smyrna Tools. Hosts the full authentication
 * flow (preserved verbatim from the legacy LoginView) inside a flat, theme-
 * aware product panel that matches the rest of the app's surface language.
 * Lazy-loads password recovery on demand.
 */
function LoginForm() {
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [passwordStrength, setPasswordStrength] = useState({ color: '', value: '' })
    const { signIn, signUp, loading, error } = useAuth()
    const timeoutRef = useRef(null)
    const [showRecovery, setShowRecovery] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    // One-shot notice when the user lands here because their session expired
    // mid-use (not because they clicked Sign Out). Flag is set by useAuthSession
    // on SESSION_INVALID_EVENT and cleared the moment LoginForm mounts.
    const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false)
    const strengthCheckRef = useRef(null)

    useEffect(() => {
        try {
            if (sessionStorage.getItem(SESSION_STORAGE_KEYS.SESSION_EXPIRED_BANNER) === '1') {
                setSessionExpiredNotice(true)
                sessionStorage.removeItem(SESSION_STORAGE_KEYS.SESSION_EXPIRED_BANNER)
            }
        } catch {}
    }, [])

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            if (strengthCheckRef.current) clearTimeout(strengthCheckRef.current)
        }
    }, [])

    useEffect(() => {
        if (strengthCheckRef.current) clearTimeout(strengthCheckRef.current)
        if (password && isSignUp) {
            strengthCheckRef.current = setTimeout(async () => {
                const strengthValue = await ValidationUtility.passwordStrength(password)
                const colorMap = { medium: '#f59e0b', strong: '#22c55e', weak: '#ef4444' }
                setPasswordStrength({
                    color: colorMap[strengthValue] || '',
                    value: strengthValue ? strengthValue.charAt(0).toUpperCase() + strengthValue.slice(1) : ''
                })
            }, 300)
        } else {
            setPasswordStrength({ color: '', value: '' })
        }
    }, [password, isSignUp])

    useEffect(() => {
        if (error) {
            setErrorMessage(error)
            setSuccessMessage('')
        }
    }, [error])

    /** Handles sign-in or sign-up with a 10s safety timeout to prevent infinite loading state. */
    const handleSubmit = useCallback(
        async (e) => {
            e.preventDefault()
            if (isSubmitting || loading) return
            setErrorMessage('')
            setSuccessMessage('')
            setIsSubmitting(true)
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            timeoutRef.current = setTimeout(() => {
                setIsSubmitting(false)
                setErrorMessage('The operation timed out. Please try again.')
            }, 10000)
            try {
                if (isSignUp) {
                    if (!email || !password || !confirmPassword || !firstName || !lastName) {
                        setErrorMessage('Please complete all fields.')
                        if (timeoutRef.current) clearTimeout(timeoutRef.current)
                        setIsSubmitting(false)
                        return
                    }
                    if (!constantTimeEqual(password, confirmPassword)) {
                        setErrorMessage('Passwords do not match.')
                        if (timeoutRef.current) clearTimeout(timeoutRef.current)
                        setIsSubmitting(false)
                        return
                    }
                    const normFirst = await ValidationUtility.normalizeName(firstName)
                    const normLast = await ValidationUtility.normalizeName(lastName)
                    await signUp(email, password, normFirst, normLast)
                    if (timeoutRef.current) clearTimeout(timeoutRef.current)
                    setSuccessMessage('Account created successfully.')
                } else {
                    if (!email || !password) {
                        setErrorMessage('Please enter your email and password.')
                        if (timeoutRef.current) clearTimeout(timeoutRef.current)
                        setIsSubmitting(false)
                        return
                    }
                    const result = await signIn(email, password)
                    if (!result?.id) throw new Error('Sign in failed - no user data returned')
                    if (timeoutRef.current) clearTimeout(timeoutRef.current)
                    setSuccessMessage('Signed in successfully.')
                }
            } catch (err) {
                if (timeoutRef.current) clearTimeout(timeoutRef.current)
                setErrorMessage(err?.message || 'An authentication error occurred. Please try again.')
                setIsSubmitting(false)
            }
        },
        [isSubmitting, loading, isSignUp, email, password, confirmPassword, firstName, lastName, signIn, signUp]
    )

    const toggleSignUp = useCallback(() => setIsSignUp((prev) => !prev), [])
    const togglePassword = useCallback(() => setShowPassword((prev) => !prev), [])
    const openRecovery = useCallback(() => setShowRecovery(true), [])
    const closeRecovery = useCallback(() => setShowRecovery(false), [])

    if (showRecovery) {
        return (
            <Suspense
                fallback={
                    <div className="flex h-screen items-center justify-center bg-slate-950/40 backdrop-blur-xl">
                        <i className="fas fa-spinner fa-spin text-2xl text-white" />
                    </div>
                }
            >
                <PasswordRecoveryView onBackToLogin={closeRecovery} />
            </Suspense>
        )
    }

    return (
        <div className="w-full rounded-card border border-white/10 bg-slate-950/45 p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-6">
            <div className="mb-5 flex flex-col gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_6px_rgba(125,180,224,0.6)]" aria-hidden="true" />
                    Smyrna Tools
                </span>
                <h2 className="m-0 font-heading text-[22px] font-bold leading-tight tracking-tight text-white">
                    {isSignUp ? 'Create account' : 'Sign in to Smyrna Tools'}
                </h2>
                <p className="m-0 text-[12.5px] text-white/70">
                    {isSignUp
                        ? 'Fill in your details to request access.'
                        : 'Enter your credentials to continue.'}
                </p>
            </div>
            <form onSubmit={handleSubmit} noValidate>
                {isSignUp && (
                    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="login-first-name" className={LABEL_CLS}>
                                First name
                            </label>
                            <input
                                id="login-first-name"
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className={INPUT_CLS}
                                autoComplete="given-name"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="login-last-name" className={LABEL_CLS}>
                                Last name
                            </label>
                            <input
                                id="login-last-name"
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className={INPUT_CLS}
                                autoComplete="family-name"
                                required
                            />
                        </div>
                    </div>
                )}
                <div className="mb-4">
                    <label htmlFor="login-email" className={LABEL_CLS}>
                        Email address
                    </label>
                    <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        className={INPUT_CLS}
                        required
                    />
                </div>
                <div className="mb-4">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                        <label htmlFor="login-password" className={`${LABEL_CLS} mb-0`}>
                            Password
                        </label>
                        {!isSignUp && (
                            <button type="button"
                                onClick={openRecovery}
                                className="cursor-pointer border-none bg-transparent p-0 text-[11px] font-semibold text-sky-300 transition-colors duration-150 ease-out hover:text-sky-200 hover:underline focus-visible:underline focus-visible:outline-none motion-reduce:transition-none"
                            >
                                Forgot password?
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete={isSignUp ? 'new-password' : 'current-password'}
                            className={`${INPUT_CLS} pr-10`}
                            required
                        />
                        <button type="button"
                            onClick={togglePassword}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            aria-pressed={showPassword}
                            className="absolute inset-y-0 right-0 inline-flex w-9 cursor-pointer items-center justify-center border-none bg-transparent text-sm text-white/50 transition-colors duration-150 ease-out hover:text-white focus-visible:rounded-md focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 motion-reduce:transition-none"
                        >
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                        </button>
                    </div>
                </div>
                {isSignUp && password && <PasswordStrengthBar strength={passwordStrength} />}
                {isSignUp && (
                    <div className="mb-4">
                        <label htmlFor="login-confirm-password" className={LABEL_CLS}>
                            Confirm password
                        </label>
                        <div className="relative">
                            <input
                                id="login-confirm-password"
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                className={`${INPUT_CLS} pr-9`}
                                required
                            />
                            {confirmPassword && password === confirmPassword && (
                                <i
                                    className="fas fa-check absolute right-3 top-1/2 -translate-y-1/2 text-status-active"
                                    aria-hidden="true"
                                />
                            )}
                        </div>
                    </div>
                )}
                {sessionExpiredNotice && !errorMessage && !successMessage && (
                    <div
                        role="status"
                        aria-live="polite"
                        className={`${ALERT_BASE_CLS} border-amber-400/40 bg-amber-400/10 text-white`}
                    >
                        <i
                            className="fas fa-info-circle mt-0.5 shrink-0 text-amber-300"
                            aria-hidden="true"
                        />
                        <span>Your session expired. Please sign in again.</span>
                    </div>
                )}
                {errorMessage && (
                    <div
                        role="alert"
                        className={`${ALERT_BASE_CLS} border-rose-400/40 bg-rose-400/10 text-white`}
                    >
                        <i
                            className="fas fa-exclamation-circle mt-0.5 shrink-0 text-rose-300"
                            aria-hidden="true"
                        />
                        <span>{errorMessage}</span>
                    </div>
                )}
                {successMessage && (
                    <div
                        role="status"
                        aria-live="polite"
                        className={`${ALERT_BASE_CLS} border-emerald-400/40 bg-emerald-400/10 text-white`}
                    >
                        <i
                            className="fas fa-check-circle mt-0.5 shrink-0 text-emerald-300"
                            aria-hidden="true"
                        />
                        <span>{successMessage}</span>
                    </div>
                )}
                <button
                    type="submit"
                    disabled={isSubmitting || loading}
                    className={`mt-1 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-white/20 bg-white px-4 py-2.5 text-[13px] font-bold tracking-tight text-slate-950 transition-[filter,transform,opacity,background-color] duration-150 ease-out hover:bg-white/95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none ${isSubmitting || loading ? 'cursor-not-allowed opacity-70' : ''}`}
                >
                    {isSubmitting || loading ? (
                        <>
                            <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />
                            Processing…
                        </>
                    ) : (
                        <>
                            <i
                                className={`fas ${isSignUp ? 'fa-user-plus' : 'fa-arrow-right-to-bracket'} text-[11px]`}
                                aria-hidden="true"
                            />
                            {isSignUp ? 'Create account' : 'Sign in'}
                        </>
                    )}
                </button>
            </form>
            <div className="mt-5 flex items-center justify-center gap-1.5 border-t border-white/10 pt-4 text-[12px]">
                <span className="text-white/70">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                </span>
                <button type="button"
                    onClick={toggleSignUp}
                    className="cursor-pointer border-none bg-transparent p-0 font-bold text-sky-300 transition-colors duration-150 ease-out hover:text-sky-200 hover:underline focus-visible:underline focus-visible:outline-none motion-reduce:transition-none"
                >
                    {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
            </div>
        </div>
    )
}

export default LoginForm
