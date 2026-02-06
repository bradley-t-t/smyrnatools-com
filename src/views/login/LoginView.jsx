import React, { useEffect, useRef, useState } from 'react'

import { useAuth } from '../../app/context/AuthContext'
import { useVersion } from '../../app/hooks/useVersion'
import SrmLogo from '../../assets/images/srm-logo.svg'
import VersionPopup from '../../components/common/VersionPopup'
import VideoBackground from '../../components/common/VideoBackground'
import { supabase } from '../../services/DatabaseService'
import { AuthUtility } from '../../utils/AuthUtility'
import PasswordRecoveryView from './PasswordRecoveryView'

function LoginView() {
    const version = useVersion()
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
    const [focusedField, setFocusedField] = useState(null)
    const [animatedStats, setAnimatedStats] = useState({ assets: 0, operators: 0, plants: 0 })
    const [targetStats, setTargetStats] = useState({ assets: 0, operators: 0, plants: 0 })

    useEffect(() => {
        async function fetchStats() {
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

                const totalAssets =
                    (mixersRes.count || 0) +
                    (tractorsRes.count || 0) +
                    (trailersRes.count || 0) +
                    (equipmentRes.count || 0)
                const totalOperators = operatorsRes.count || 0
                const totalPlants = plantsRes.count || 0

                setTargetStats({ assets: totalAssets, operators: totalOperators, plants: totalPlants })
            } catch {
                setTargetStats({ assets: 0, operators: 0, plants: 0 })
            }
        }
        fetchStats()
    }, [])

    useEffect(() => {
        if (targetStats.assets === 0 && targetStats.operators === 0 && targetStats.plants === 0) return

        const duration = 2000
        const steps = 60
        const interval = duration / steps
        let step = 0

        const timer = setInterval(() => {
            step++
            const progress = step / steps
            const eased = 1 - Math.pow(1 - progress, 3)

            setAnimatedStats({
                assets: Math.round(targetStats.assets * eased),
                operators: Math.round(targetStats.operators * eased),
                plants: Math.round(targetStats.plants * eased)
            })

            if (step >= steps) {
                clearInterval(timer)
                setAnimatedStats(targetStats)
            }
        }, interval)

        return () => clearInterval(timer)
    }, [targetStats])

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    useEffect(() => {
        const updateStrength = async () => {
            if (password && isSignUp) {
                const strengthValue = await AuthUtility.passwordStrength(password)
                let color = ''
                if (strengthValue === 'weak') color = '#ef4444'
                else if (strengthValue === 'medium') color = '#f59e0b'
                else if (strengthValue === 'strong') color = '#22c55e'
                const capitalizedValue = strengthValue.charAt(0).toUpperCase() + strengthValue.slice(1)
                setPasswordStrength({ color, value: capitalizedValue })
            } else {
                setPasswordStrength({ color: '', value: '' })
            }
        }
        updateStrength()
    }, [password, isSignUp])

    const [isSubmitting, setIsSubmitting] = useState(false)

    const getBrowserInfo = (userAgent) => {
        if (userAgent.includes('Firefox')) return 'Firefox'
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome'
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
        if (userAgent.includes('Edg')) return 'Edge'
        if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera'
        return 'Unknown Browser'
    }

    const getOSInfo = (userAgent) => {
        if (userAgent.includes('Windows')) return 'Windows'
        if (userAgent.includes('Mac')) return 'macOS'
        if (userAgent.includes('Linux')) return 'Linux'
        if (userAgent.includes('Android')) return 'Android'
        if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS'
        return 'Unknown OS'
    }

    const getDeviceInfo = (userAgent) => {
        if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone'))
            return 'Mobile'
        if (userAgent.includes('iPad') || userAgent.includes('Tablet')) return 'Tablet'
        return 'Desktop'
    }

    const createSession = async (userId) => {
        try {
            const userAgent = navigator.userAgent
            const sessionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            sessionStorage.setItem('sessionId', sessionId)

            await supabase.from('users_sessions').upsert(
                {
                    browser: getBrowserInfo(userAgent),
                    created_at: new Date().toISOString(),
                    device: getDeviceInfo(userAgent),
                    id: sessionId,
                    last_active: new Date().toISOString(),
                    os: getOSInfo(userAgent),
                    user_agent: userAgent,
                    user_id: userId
                },
                { onConflict: 'id' }
            )
        } catch (error) {}
    }

    useEffect(() => {
        if (error) {
            setErrorMessage(error)
            setSuccessMessage('')
        }
    }, [error])

    const handleSubmit = async (e) => {
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
                    setSuccessMessage('')
                    if (timeoutRef.current) clearTimeout(timeoutRef.current)
                    setIsSubmitting(false)
                    return
                }
                if (password !== confirmPassword) {
                    setErrorMessage('Passwords do not match.')
                    setSuccessMessage('')
                    if (timeoutRef.current) clearTimeout(timeoutRef.current)
                    setIsSubmitting(false)
                    return
                }
                const normFirst = await AuthUtility.normalizeName(firstName)
                const normLast = await AuthUtility.normalizeName(lastName)
                if (typeof normFirst !== 'string' || typeof normLast !== 'string') {
                    throw new Error('First and last name must be strings after normalization')
                }
                await signUp(email, password, normFirst, normLast)

                const userId = sessionStorage.getItem('userId')
                if (userId) {
                    await createSession(userId)
                }

                if (timeoutRef.current) clearTimeout(timeoutRef.current)
                setErrorMessage('')
                setSuccessMessage('Account created successfully. Redirecting...')
                setTimeout(() => (window.location.href = '/'), 1000)
            } else {
                if (!email || !password) {
                    setErrorMessage('Please enter your email and password.')
                    setSuccessMessage('')
                    if (timeoutRef.current) clearTimeout(timeoutRef.current)
                    setIsSubmitting(false)
                    return
                }

                const result = await signIn(email, password)

                if (!result || !result.id) {
                    throw new Error('Sign in failed - no user data returned')
                }

                const userId = sessionStorage.getItem('userId')
                if (!userId) {
                    throw new Error('Sign in failed - session not created')
                }

                if (userId) {
                    await createSession(userId)
                }

                if (timeoutRef.current) clearTimeout(timeoutRef.current)
                setErrorMessage('')
                setSuccessMessage('Signed in successfully. Redirecting...')
                setTimeout(() => (window.location.href = '/'), 1000)
            }
        } catch (err) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }
            const errorMsg = err?.message || err?.error || 'An authentication error occurred. Please try again.'
            setErrorMessage(errorMsg)
            setSuccessMessage('')
            setIsSubmitting(false)
        }
    }

    if (showRecovery) {
        return <PasswordRecoveryView onBackToLogin={() => setShowRecovery(false)} />
    }

    const inputStyle = (isFocused) => ({
        background: '#fff',
        border: 'none',
        borderBottom: `2px solid ${isFocused ? '#1e3a5f' : '#e2e8f0'}`,
        borderRadius: 0,
        color: '#1e293b',
        fontSize: '1rem',
        outline: 'none',
        padding: '1rem 0 0.75rem 0',
        transition: 'border-color 0.2s',
        width: '100%'
    })

    const labelStyle = (isFocused, hasValue) => ({
        color: isFocused ? '#1e3a5f' : '#94a3b8',
        fontSize: isFocused || hasValue ? '0.7rem' : '0.9rem',
        fontWeight: 500,
        left: 0,
        pointerEvents: 'none',
        position: 'absolute',
        top: isFocused || hasValue ? '0' : '1rem',
        transition: 'all 0.2s'
    })

    return (
        <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
            <VideoBackground />
            <VersionPopup version={version} />

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
                <div
                    style={{
                        alignItems: 'center',
                        display: 'none',
                        flex: 1,
                        justifyContent: 'center',
                        padding: '3rem',
                        position: 'relative'
                    }}
                    className="lg-show"
                >
                    <div style={{ maxWidth: '480px', position: 'relative', zIndex: 2 }}>
                        <div
                            style={{
                                alignItems: 'center',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '16px',
                                display: 'inline-flex',
                                height: '72px',
                                justifyContent: 'center',
                                marginBottom: '2rem',
                                width: '72px'
                            }}
                        >
                            <img src={SrmLogo} alt="SRM" style={{ height: '44px', width: '44px' }} />
                        </div>
                        <h1
                            style={{
                                color: '#fff',
                                fontSize: '3rem',
                                fontWeight: 800,
                                letterSpacing: '-0.03em',
                                lineHeight: 1.1,
                                margin: '0 0 1rem 0'
                            }}
                        >
                            Smyrna
                            <br />
                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Ready Mix</span>
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.125rem', lineHeight: 1.6, margin: 0 }}>
                            Fleet management and operations platform for concrete delivery excellence.
                        </p>
                        <div
                            style={{
                                borderTop: '1px solid rgba(255,255,255,0.15)',
                                display: 'flex',
                                gap: '2rem',
                                marginTop: '3rem',
                                paddingTop: '2rem'
                            }}
                        >
                            <div>
                                <div style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700 }}>
                                    {animatedStats.assets > 0 ? animatedStats.assets : '-'}
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Fleet Assets</div>
                            </div>
                            <div>
                                <div style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700 }}>
                                    {animatedStats.plants > 0 ? animatedStats.plants : '-'}
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Plants</div>
                            </div>
                            <div>
                                <div style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700 }}>
                                    {animatedStats.operators > 0 ? animatedStats.operators : '-'}
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Operators</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        alignItems: 'center',
                        background: '#fff',
                        backgroundImage: `
                            linear-gradient(rgba(30, 58, 95, 0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(30, 58, 95, 0.03) 1px, transparent 1px)
                        `,
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
                        <div className="lg-hide" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                            <img src={SrmLogo} alt="SRM" style={{ height: '48px', marginBottom: '0.5rem' }} />
                            <div style={{ color: '#1e3a5f', fontSize: '1.25rem', fontWeight: 700 }}>Smyrna Tools</div>
                        </div>

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
                                        <label style={labelStyle(focusedField === 'firstName', firstName)}>
                                            First name
                                        </label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            onFocus={() => setFocusedField('firstName')}
                                            onBlur={() => setFocusedField(null)}
                                            style={inputStyle(focusedField === 'firstName')}
                                            required
                                        />
                                    </div>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <label style={labelStyle(focusedField === 'lastName', lastName)}>
                                            Last name
                                        </label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            onFocus={() => setFocusedField('lastName')}
                                            onBlur={() => setFocusedField(null)}
                                            style={inputStyle(focusedField === 'lastName')}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                <label style={labelStyle(focusedField === 'email', email)}>Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    autoComplete="username"
                                    style={inputStyle(focusedField === 'email')}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle(focusedField === 'password', password)}>Password</label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setFocusedField('password')}
                                        onBlur={() => setFocusedField(null)}
                                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                        style={{ ...inputStyle(focusedField === 'password'), paddingRight: '2.5rem' }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
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

                            {isSignUp && password && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
                                        <div
                                            style={{
                                                background: '#e2e8f0',
                                                borderRadius: '2px',
                                                flex: 1,
                                                height: '3px'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    background: passwordStrength.color,
                                                    borderRadius: '2px',
                                                    height: '100%',
                                                    transition: 'width 0.3s',
                                                    width:
                                                        passwordStrength.value === 'Weak'
                                                            ? '33%'
                                                            : passwordStrength.value === 'Medium'
                                                              ? '66%'
                                                              : passwordStrength.value === 'Strong'
                                                                ? '100%'
                                                                : '0%'
                                                }}
                                            />
                                        </div>
                                        <span
                                            style={{
                                                color: passwordStrength.color,
                                                fontSize: '0.7rem',
                                                fontWeight: 600
                                            }}
                                        >
                                            {passwordStrength.value}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {isSignUp && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        <label style={labelStyle(focusedField === 'confirmPassword', confirmPassword)}>
                                            Confirm password
                                        </label>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            onFocus={() => setFocusedField('confirmPassword')}
                                            onBlur={() => setFocusedField(null)}
                                            autoComplete="new-password"
                                            style={inputStyle(focusedField === 'confirmPassword')}
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
                                        onClick={() => setShowRecovery(true)}
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

                            <button
                                type="submit"
                                disabled={isSubmitting || loading}
                                style={{
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
                                }}
                            >
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
                                onClick={() => setIsSignUp(!isSignUp)}
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
                @media (min-width: 1024px) {
                    .lg-show { display: flex !important; }
                    .lg-hide { display: none !important; }
                }
                @media (max-width: 1023px) {
                    .login-panel { 
                        width: 100% !important; 
                        min-width: unset !important;
                        padding: 1.5rem !important;
                    }
                }
                @media (max-width: 480px) {
                    .login-panel {
                        padding: 0.75rem !important;
                    }
                    .name-fields {
                        flex-direction: column !important;
                        gap: 1rem !important;
                    }
                }
                input::placeholder { color: transparent; }
            `}</style>
        </div>
    )
}

export default LoginView
