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

    return (
        <div className="min-h-screen flex relative overflow-hidden">
            <VideoBackground />
            <VersionPopup version={version} />

            <div className="hidden lg:flex lg:w-1/2 relative z-10 items-center justify-center p-12">
                <div className="max-w-lg text-center">
                    <div className="mb-8 inline-flex items-center justify-center w-32 h-32 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl">
                        <img src={SrmLogo} alt="SRM" className="h-20 w-20 object-contain" />
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">Smyrna Tools</h1>
                    <p className="text-xl text-white/80 leading-relaxed">Concrete Region Management System</p>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-10">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                        <div className="lg:hidden bg-[#1e3a5f] p-6 text-center">
                            <img src={SrmLogo} alt="SRM" className="h-14 mx-auto mb-2" />
                            <h1 className="text-lg font-bold text-white">Smyrna Tools</h1>
                        </div>

                        <div className="p-8">
                            <div className="text-center mb-8 hidden lg:block">
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                    {isSignUp ? 'Create Account' : 'Welcome Back'}
                                </h2>
                                <p className="text-slate-500">
                                    {isSignUp ? 'Join the SRM team today' : 'Sign in to access your dashboard'}
                                </p>
                            </div>

                            <div className="relative flex bg-slate-100 rounded-xl p-1.5 mb-8">
                                <button
                                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 z-10 ${!isSignUp ? 'text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setIsSignUp(false)}
                                    type="button"
                                >
                                    Sign In
                                </button>
                                <button
                                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 z-10 ${isSignUp ? 'text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setIsSignUp(true)}
                                    type="button"
                                >
                                    Sign Up
                                </button>
                                <div
                                    className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-[#1e3a5f] rounded-lg transition-all duration-300 ease-out shadow-lg ${isSignUp ? 'left-[calc(50%+3px)]' : 'left-1.5'}`}
                                />
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                                {isSignUp && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                First Name
                                            </label>
                                            <div className="relative">
                                                <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="John"
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                Last Name
                                            </label>
                                            <div className="relative">
                                                <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Doe"
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            autoComplete="username"
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-sm font-medium text-slate-700">Password</label>
                                        {!isSignUp && (
                                            <button
                                                type="button"
                                                className="text-sm text-[#1e3a5f] hover:text-[#c41230] font-medium transition-colors"
                                                onClick={() => setShowRecovery(true)}
                                            >
                                                Forgot?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                            className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 transition-all"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                                        </button>
                                    </div>
                                </div>

                                {isSignUp && password && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 rounded-full ${
                                                    passwordStrength.value === 'Weak'
                                                        ? 'bg-red-500 w-1/3'
                                                        : passwordStrength.value === 'Medium'
                                                          ? 'bg-amber-500 w-2/3'
                                                          : passwordStrength.value === 'Strong'
                                                            ? 'bg-green-500 w-full'
                                                            : 'w-0'
                                                }`}
                                            />
                                        </div>
                                        <span
                                            className="text-xs font-semibold min-w-[60px]"
                                            style={{ color: passwordStrength.color }}
                                        >
                                            {passwordStrength.value}
                                        </span>
                                    </div>
                                )}

                                {isSignUp && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Confirm your password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                autoComplete="new-password"
                                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 transition-all"
                                                required
                                            />
                                            {confirmPassword && password === confirmPassword && (
                                                <i className="fas fa-check absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                                            )}
                                        </div>
                                    </div>
                                )}

                                {errorMessage && (
                                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                                        <i className="fas fa-exclamation-circle text-red-500 mt-0.5" />
                                        <span className="text-sm text-red-700">{errorMessage}</span>
                                    </div>
                                )}

                                {successMessage && (
                                    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
                                        <i className="fas fa-check-circle text-green-500 mt-0.5" />
                                        <span className="text-sm text-green-700">{successMessage}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full py-3.5 bg-[#1e3a5f] hover:bg-[#152d4a] text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1e3a5f]/25 hover:shadow-xl hover:shadow-[#1e3a5f]/30 hover:-translate-y-0.5 active:translate-y-0"
                                    disabled={isSubmitting || loading}
                                >
                                    {isSubmitting || loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                                            <i className="fas fa-arrow-right" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                                <span className="text-sm text-slate-500">
                                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                                </span>{' '}
                                <button
                                    type="button"
                                    className="text-sm text-[#1e3a5f] hover:text-[#c41230] font-semibold transition-colors"
                                    onClick={() => setIsSignUp(!isSignUp)}
                                >
                                    {isSignUp ? 'Sign In' : 'Sign Up'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-white/50 text-xs mt-6">Version {version} - SRM Concrete</p>
                </div>
            </div>
        </div>
    )
}

export default LoginView
