import React, { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import VersionPopup from '../../app/components/common/VersionPopup'
import { useAuth } from '../../app/context/AuthContext'
import { useIsMobile } from '../../app/hooks/useIsMobile'
import { useVersion } from '../../app/hooks/useVersion'
import SrmLogo from '../../assets/images/srm-logo.svg'
import { supabase } from '../../services/DatabaseService'
import AuthUtility from '../../utils/AuthUtility'

const ChangelogView = lazy(() => import('./ChangelogView'))
const PasswordRecoveryView = lazy(() => import('./PasswordRecoveryView'))
const VideoBackground = lazy(() => import('../../app/components/common/VideoBackground'))

/** Static gradient placeholder shown while the video background lazy-loads. */
const VideoFallback = memo(function VideoFallback() {
    return (
        <div
            style={{
                background: 'linear-gradient(135deg, #0a1929 0%, #1e3a5f 100%)',
                height: '100%',
                left: 0,
                position: 'absolute',
                top: 0,
                width: '100%',
                zIndex: 0
            }}
        />
    )
})

/** Animated fleet/plant/operator stat counters shown on the login hero panel. */
const StatsDisplay = memo(function StatsDisplay({ stats }) {
    return (
        <div className="flex justify-center gap-10 border-t border-white/15 pt-8 w-full">
            <div className="text-center">
                <div className="text-white text-3xl font-bold">{stats.assets > 0 ? stats.assets : '-'}</div>
                <div className="text-white/50 text-xs mt-1">Fleet Assets</div>
            </div>
            <div className="text-center">
                <div className="text-white text-3xl font-bold">{stats.plants > 0 ? stats.plants : '-'}</div>
                <div className="text-white/50 text-xs mt-1">Plants</div>
            </div>
            <div className="text-center">
                <div className="text-white text-3xl font-bold">{stats.operators > 0 ? stats.operators : '-'}</div>
                <div className="text-white/50 text-xs mt-1">Operators</div>
            </div>
        </div>
    )
})

/** Horizontal bar that fills to 33/66/100% based on Weak/Medium/Strong password strength. */
const PasswordStrengthBar = memo(function PasswordStrengthBar({ strength }) {
    if (!strength.value) return null
    const widthMap = { Medium: '66%', Strong: '100%', Weak: '33%' }
    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
                <div style={{ background: '#e2e8f0', borderRadius: '2px', flex: 1, height: '3px' }}>
                    <div
                        style={{
                            background: strength.color,
                            borderRadius: '2px',
                            height: '100%',
                            transition: 'width 0.3s',
                            width: widthMap[strength.value] || '0%'
                        }}
                    />
                </div>
                <span style={{ color: strength.color, fontSize: '0.7rem', fontWeight: 600 }}>{strength.value}</span>
            </div>
        </div>
    )
})

const inputBaseStyle = {
    background: '#fff',
    border: 'none',
    borderRadius: 0,
    color: '#1e293b',
    fontSize: '1rem',
    outline: 'none',
    padding: '1rem 0 0.75rem 0',
    transition: 'border-color 0.2s',
    width: '100%'
}

/**
 * Full-screen login/signup view with a lazy-loaded video background,
 * animated fleet stats, password strength indicator, and links to
 * password recovery and the changelog. Creates a browser session
 * record in Supabase on successful authentication.
 */
function LoginView() {
    const version = useVersion()
    const isMobile = useIsMobile()
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
    const [showChangelog, setShowChangelog] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [focusedField, setFocusedField] = useState(null)
    const [animatedStats, setAnimatedStats] = useState({ assets: 0, operators: 0, plants: 0 })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [videoLoaded, setVideoLoaded] = useState(false)
    const strengthCheckRef = useRef(null)

    useEffect(() => {
        const timer = setTimeout(() => setVideoLoaded(true), 100)
        return () => clearTimeout(timer)
    }, [])

    // Fetch aggregate fleet counts after a 1s delay (so the UI paints first),
    // then animate them with a cubic ease-out over 1.5s.
    useEffect(() => {
        let cancelled = false
        const fetchStats = async () => {
            if (cancelled) return
            try {
                const [mixersRes, tractorsRes, trailersRes, equipmentRes, operatorsRes, plantsRes] = await Promise.all([
                    supabase.from('mixers').select('*', { count: 'exact', head: true }).neq('status', 'Retired'),
                    supabase.from('tractors').select('*', { count: 'exact', head: true }).neq('status', 'Retired'),
                    supabase.from('trailers').select('*', { count: 'exact', head: true }).neq('status', 'Retired'),
                    supabase
                        .from('heavy_equipment')
                        .select('*', { count: 'exact', head: true })
                        .neq('status', 'Retired'),
                    supabase
                        .from('operators')
                        .select('*', { count: 'exact', head: true })
                        .in('status', ['Active', 'Training', 'Light Duty']),
                    supabase.from('plants').select('*', { count: 'exact', head: true })
                ])
                if (cancelled) return
                const totalAssets =
                    (mixersRes.count || 0) +
                    (tractorsRes.count || 0) +
                    (trailersRes.count || 0) +
                    (equipmentRes.count || 0)
                const targetStats = {
                    assets: totalAssets,
                    operators: operatorsRes.count || 0,
                    plants: plantsRes.count || 0
                }

                const duration = 1500
                const startTime = performance.now()
                const animate = (currentTime) => {
                    if (cancelled) return
                    const elapsed = currentTime - startTime
                    const progress = Math.min(elapsed / duration, 1)
                    const eased = 1 - Math.pow(1 - progress, 3)
                    setAnimatedStats({
                        assets: Math.round(targetStats.assets * eased),
                        operators: Math.round(targetStats.operators * eased),
                        plants: Math.round(targetStats.plants * eased)
                    })
                    if (progress < 1) requestAnimationFrame(animate)
                }
                requestAnimationFrame(animate)
            } catch {
                if (!cancelled) setAnimatedStats({ assets: 0, operators: 0, plants: 0 })
            }
        }
        fetchStats()
        return () => {
            cancelled = true
        }
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
                const strengthValue = await AuthUtility.passwordStrength(password)
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
                    if (password !== confirmPassword) {
                        setErrorMessage('Passwords do not match.')
                        if (timeoutRef.current) clearTimeout(timeoutRef.current)
                        setIsSubmitting(false)
                        return
                    }
                    const normFirst = await AuthUtility.normalizeName(firstName)
                    const normLast = await AuthUtility.normalizeName(lastName)
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
    const openChangelog = useCallback(() => setShowChangelog(true), [])
    const closeChangelog = useCallback(() => setShowChangelog(false), [])

    const getInputStyle = useCallback(
        (isFocused) => ({
            ...inputBaseStyle,
            borderBottom: `2px solid ${isFocused ? '#1e3a5f' : '#e2e8f0'}`
        }),
        []
    )

    const getLabelStyle = useCallback(
        (isFocused, hasValue) => ({
            color: isFocused ? '#1e3a5f' : '#94a3b8',
            fontSize: isFocused || hasValue ? '0.7rem' : '0.9rem',
            fontWeight: 500,
            left: 0,
            pointerEvents: 'none',
            position: 'absolute',
            top: isFocused || hasValue ? '0' : '1rem',
            transition: 'all 0.2s'
        }),
        []
    )

    const submitButtonStyle = useMemo(
        () => ({
            background: '#1e3a5f',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            cursor: isSubmitting || loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            opacity: isSubmitting || loading ? 0.7 : 1,
            padding: '0.875rem 1.5rem',
            transition: 'all 0.15s',
            width: '100%'
        }),
        [isSubmitting, loading]
    )

    if (showChangelog) {
        return (
            <Suspense
                fallback={
                    <div
                        style={{
                            alignItems: 'center',
                            background: '#fff',
                            display: 'flex',
                            height: '100vh',
                            justifyContent: 'center'
                        }}
                    >
                        <i className="fas fa-spinner fa-spin" style={{ color: '#1e3a5f', fontSize: '2rem' }} />
                    </div>
                }
            >
                <ChangelogView onBack={closeChangelog} />
            </Suspense>
        )
    }

    if (showRecovery) {
        return (
            <Suspense
                fallback={
                    <div
                        style={{
                            alignItems: 'center',
                            background: '#fff',
                            display: 'flex',
                            height: '100vh',
                            justifyContent: 'center'
                        }}
                    >
                        <i className="fas fa-spinner fa-spin" style={{ color: '#1e3a5f', fontSize: '2rem' }} />
                    </div>
                }
            >
                <PasswordRecoveryView onBackToLogin={closeRecovery} />
            </Suspense>
        )
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
            {videoLoaded ? (
                <Suspense fallback={<VideoFallback />}>
                    <VideoBackground />
                </Suspense>
            ) : (
                <VideoFallback />
            )}
            <VersionPopup version={version} onClick={openChangelog} />

            <div
                style={{
                    alignItems: 'stretch',
                    display: 'flex',
                    height: '100vh',
                    position: 'relative',
                    width: '100%',
                    zIndex: 10
                }}
            >
                <div className="lg-show hidden flex-1 items-center justify-center relative p-12">
                    <div className="relative z-[2] flex flex-col items-center text-center max-w-lg">
                        <img src={SrmLogo} alt="SRM" className="h-32 w-32 mb-8 drop-shadow-2xl" loading="eager" />
                        <h1 className="text-white text-5xl font-extrabold tracking-tight leading-tight mb-3">
                            Smyrna <span className="text-white/70">Tools</span>
                        </h1>
                        <p className="text-white/50 text-lg leading-relaxed mb-10 max-w-sm">
                            Fleet management and operations platform for concrete delivery excellence.
                        </p>
                        <StatsDisplay stats={animatedStats} />
                    </div>
                </div>

                <div
                    style={{
                        alignItems: 'center',
                        background: '#fff',
                        backgroundImage:
                            'linear-gradient(rgba(30, 58, 95, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 58, 95, 0.03) 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                        display: 'flex',
                        justifyContent: 'center',
                        minWidth: '480px',
                        padding: '3rem',
                        width: '480px'
                    }}
                    className="login-panel"
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: '16px',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                            maxWidth: '380px',
                            padding: '2.5rem',
                            width: '100%'
                        }}
                    >
                        {!isMobile && (
                            <div className="lg-hide" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                                <img
                                    src={SrmLogo}
                                    alt="SRM"
                                    style={{ height: '48px', marginBottom: '0.5rem' }}
                                    loading="eager"
                                />
                                <div style={{ color: '#1e3a5f', fontSize: '1.25rem', fontWeight: 700 }}>
                                    Smyrna Tools
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: '2.5rem' }}>
                            <h2
                                style={{
                                    color: '#1e293b',
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    margin: '0 0 0.5rem 0'
                                }}
                            >
                                {isSignUp ? 'Create account' : 'Welcome back'}
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                                {isSignUp ? 'Join the team' : 'Enter your credentials to continue'}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate>
                            {isSignUp && (
                                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <label style={getLabelStyle(focusedField === 'firstName', firstName)}>
                                            First name
                                        </label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            onFocus={() => setFocusedField('firstName')}
                                            onBlur={() => setFocusedField(null)}
                                            style={getInputStyle(focusedField === 'firstName')}
                                            required
                                        />
                                    </div>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <label style={getLabelStyle(focusedField === 'lastName', lastName)}>
                                            Last name
                                        </label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            onFocus={() => setFocusedField('lastName')}
                                            onBlur={() => setFocusedField(null)}
                                            style={getInputStyle(focusedField === 'lastName')}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                <label style={getLabelStyle(focusedField === 'email', email)}>Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    autoComplete="username"
                                    style={getInputStyle(focusedField === 'email')}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ position: 'relative' }}>
                                    <label style={getLabelStyle(focusedField === 'password', password)}>Password</label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setFocusedField('password')}
                                        onBlur={() => setFocusedField(null)}
                                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                        style={{
                                            ...getInputStyle(focusedField === 'password'),
                                            paddingRight: '2.5rem'
                                        }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={togglePassword}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            bottom: '0.75rem',
                                            color: '#94a3b8',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                            padding: 0,
                                            position: 'absolute',
                                            right: 0
                                        }}
                                    >
                                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                                    </button>
                                </div>
                            </div>

                            {isSignUp && password && <PasswordStrengthBar strength={passwordStrength} />}

                            {isSignUp && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        <label
                                            style={getLabelStyle(focusedField === 'confirmPassword', confirmPassword)}
                                        >
                                            Confirm password
                                        </label>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            onFocus={() => setFocusedField('confirmPassword')}
                                            onBlur={() => setFocusedField(null)}
                                            autoComplete="new-password"
                                            style={getInputStyle(focusedField === 'confirmPassword')}
                                            required
                                        />
                                        {confirmPassword && password === confirmPassword && (
                                            <i
                                                className="fas fa-check"
                                                style={{
                                                    bottom: '0.75rem',
                                                    color: '#22c55e',
                                                    position: 'absolute',
                                                    right: 0
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {!isSignUp && (
                                <div style={{ marginBottom: '1.5rem', textAlign: 'right' }}>
                                    <button
                                        type="button"
                                        onClick={openRecovery}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#1e3a5f',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            padding: 0
                                        }}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            )}

                            {errorMessage && (
                                <div
                                    style={{
                                        background: '#fef2f2',
                                        borderLeft: '3px solid #ef4444',
                                        color: '#dc2626',
                                        fontSize: '0.85rem',
                                        marginBottom: '1.5rem',
                                        padding: '0.75rem 1rem'
                                    }}
                                >
                                    {errorMessage}
                                </div>
                            )}
                            {successMessage && (
                                <div
                                    style={{
                                        background: '#f0fdf4',
                                        borderLeft: '3px solid #22c55e',
                                        color: '#16a34a',
                                        fontSize: '0.85rem',
                                        marginBottom: '1.5rem',
                                        padding: '0.75rem 1rem'
                                    }}
                                >
                                    {successMessage}
                                </div>
                            )}

                            <button type="submit" disabled={isSubmitting || loading} style={submitButtonStyle}>
                                {isSubmitting || loading ? (
                                    <span style={{ alignItems: 'center', display: 'inline-flex', gap: '0.5rem' }}>
                                        <i className="fas fa-circle-notch fa-spin" />
                                        Processing...
                                    </span>
                                ) : isSignUp ? (
                                    'Create account'
                                ) : (
                                    'Sign in'
                                )}
                            </button>
                        </form>

                        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                            </span>{' '}
                            <button
                                type="button"
                                onClick={toggleSignUp}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#1e3a5f',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    padding: 0
                                }}
                            >
                                {isSignUp ? 'Sign in' : 'Sign up'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media (min-width: 1024px) { .lg-show { display: flex !important; } .lg-hide { display: none !important; } }
                @media (max-width: 1023px) { .login-panel { width: 100% !important; min-width: unset !important; padding: 1.5rem !important; } }
                @media (max-width: 480px) { .login-panel { padding: 0.75rem !important; } }
                input::placeholder { color: transparent; }
            `}</style>
        </div>
    )
}

export default LoginView
