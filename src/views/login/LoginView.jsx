import React, {useEffect, useRef, useState} from 'react';
import {useAuth} from '../../app/context/AuthContext';
import {AuthUtility} from '../../utils/AuthUtility';
import {supabase} from '../../services/DatabaseService';
import SrmLogo from '../../assets/images/srm-logo.svg';
import VersionPopup from '../../components/common/VersionPopup';
import {useVersion} from '../../app/hooks/useVersion';
import PasswordRecoveryView from './PasswordRecoveryView';
import VideoBackground from '../../components/common/VideoBackground';

function LoginView() {
    const version = useVersion();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [passwordStrength, setPasswordStrength] = useState({value: '', color: ''});
    const {signIn, signUp, loading, error} = useAuth();
    const timeoutRef = useRef(null);
    const [showRecovery, setShowRecovery] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    useEffect(() => {
        const updateStrength = async () => {
            if (password && isSignUp) {
                const strengthValue = await AuthUtility.passwordStrength(password);
                let color = '';
                if (strengthValue === 'weak') color = '#ef4444';
                else if (strengthValue === 'medium') color = '#f59e0b';
                else if (strengthValue === 'strong') color = '#22c55e';
                const capitalizedValue = strengthValue.charAt(0).toUpperCase() + strengthValue.slice(1);
                setPasswordStrength({value: capitalizedValue, color});
            } else {
                setPasswordStrength({value: '', color: ''});
            }
        };
        updateStrength();
    }, [password, isSignUp]);

    const [isSubmitting, setIsSubmitting] = useState(false);

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
        if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) return 'Mobile'
        if (userAgent.includes('iPad') || userAgent.includes('Tablet')) return 'Tablet'
        return 'Desktop'
    }

    const createSession = async (userId) => {
        try {
            const userAgent = navigator.userAgent
            const sessionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            sessionStorage.setItem('sessionId', sessionId)

            await supabase.from('users_sessions').upsert({
                id: sessionId,
                user_id: userId,
                browser: getBrowserInfo(userAgent),
                os: getOSInfo(userAgent),
                device: getDeviceInfo(userAgent),
                user_agent: userAgent,
                last_active: new Date().toISOString(),
                created_at: new Date().toISOString()
            }, {onConflict: 'id'})
        } catch (error) {
        }
    }

    useEffect(() => {
        if (error) {
            setErrorMessage(error);
            setSuccessMessage('');
        }
    }, [error]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting || loading) return;
        setErrorMessage('');
        setSuccessMessage('');
        setIsSubmitting(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setIsSubmitting(false);
            setErrorMessage('The operation timed out. Please try again.');
        }, 10000);
        try {
            if (isSignUp) {
                if (!email || !password || !confirmPassword || !firstName || !lastName) {
                    setErrorMessage('Please complete all fields.');
                    setSuccessMessage('');
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    setIsSubmitting(false);
                    return;
                }
                if (password !== confirmPassword) {
                    setErrorMessage('Passwords do not match.');
                    setSuccessMessage('');
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    setIsSubmitting(false);
                    return;
                }
                const normFirst = await AuthUtility.normalizeName(firstName);
                const normLast = await AuthUtility.normalizeName(lastName);
                if (typeof normFirst !== 'string' || typeof normLast !== 'string') {
                    throw new Error('First and last name must be strings after normalization');
                }
                await signUp(email, password, normFirst, normLast);

                const userId = sessionStorage.getItem('userId')
                if (userId) {
                    await createSession(userId)
                }

                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                setErrorMessage('');
                setSuccessMessage('Account created successfully. Redirecting...');
                setTimeout(() => window.location.href = '/', 1000);
            } else {
                if (!email || !password) {
                    setErrorMessage('Please enter your email and password.');
                    setSuccessMessage('');
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    setIsSubmitting(false);
                    return;
                }

                const result = await signIn(email, password);

                if (!result || !result.id) {
                    throw new Error('Sign in failed - no user data returned');
                }

                const userId = sessionStorage.getItem('userId')
                if (!userId) {
                    throw new Error('Sign in failed - session not created');
                }

                if (userId) {
                    await createSession(userId)
                }

                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                setErrorMessage('');
                setSuccessMessage('Signed in successfully. Redirecting...');
                setTimeout(() => window.location.href = '/', 1000);
            }
        } catch (err) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            const errorMsg = err?.message || err?.error || 'An authentication error occurred. Please try again.';
            setErrorMessage(errorMsg);
            setSuccessMessage('');
            setIsSubmitting(false);
        }
    };

    if (showRecovery) {
        return <PasswordRecoveryView onBackToLogin={() => setShowRecovery(false)}/>;
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-[#1e3a5f] p-4">
            <VideoBackground/>
            <VersionPopup version={version}/>

            <div className="w-full max-w-md relative z-10">
                <div
                    className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20">
                    <div className="bg-[#1e3a5f] p-6 text-center">
                        <img src={SrmLogo} alt="SRM" className="h-16 mx-auto mb-3"/>
                        <h1 className="text-xl font-bold text-white">Smyrna Tools</h1>
                        <p className="text-slate-300 text-sm">Concrete Region Management System</p>
                    </div>

                    <div className="p-6">
                        <div className="relative flex bg-slate-100 rounded-lg p-1 mb-6">
                            <button
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all z-10 ${!isSignUp ? 'text-white' : 'text-slate-600'}`}
                                onClick={() => setIsSignUp(false)}
                                type="button"
                            >
                                Sign In
                            </button>
                            <button
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all z-10 ${isSignUp ? 'text-white' : 'text-slate-600'}`}
                                onClick={() => setIsSignUp(true)}
                                type="button"
                            >
                                Sign Up
                            </button>
                            <div
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#1e3a5f] rounded-md transition-all duration-300 ${isSignUp ? 'left-[calc(50%+2px)]' : 'left-1'}`}
                            />
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                            {isSignUp && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"/>
                                        <input
                                            type="text"
                                            placeholder="First Name"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"/>
                                        <input
                                            type="text"
                                            placeholder="Last Name"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="relative">
                                <i className="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"/>
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="username"
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
                                    required
                                />
                            </div>

                            <div className="relative">
                                <i className="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"/>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                    className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}/>
                                </button>
                            </div>

                            {isSignUp && password && (
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-300 ${
                                                passwordStrength.value === 'Weak' ? 'bg-red-500 w-1/3' :
                                                    passwordStrength.value === 'Medium' ? 'bg-amber-500 w-2/3' :
                                                        passwordStrength.value === 'Strong' ? 'bg-green-500 w-full' : 'w-0'
                                            }`}
                                        />
                                    </div>
                                    <span className="text-xs font-medium" style={{color: passwordStrength.color}}>
                                        {passwordStrength.value}
                                    </span>
                                </div>
                            )}

                            {isSignUp && (
                                <div className="relative">
                                    <i className="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"/>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Confirm Password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        autoComplete="new-password"
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
                                        required
                                    />
                                </div>
                            )}

                            {!isSignUp && (
                                <div className="text-right">
                                    <button
                                        type="button"
                                        className="text-sm text-[#1e3a5f] hover:underline font-medium"
                                        onClick={() => setShowRecovery(true)}
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}

                            {errorMessage && (
                                <div
                                    className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    <i className="fas fa-exclamation-circle"/>
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {successMessage && (
                                <div
                                    className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                                    <i className="fas fa-check-circle"/>
                                    <span>{successMessage}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-3 bg-[#1e3a5f] hover:bg-[#15304f] text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isSubmitting || loading}
                            >
                                {isSubmitting || loading ? (
                                    <div
                                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                ) : (
                                    <>
                                        <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                                        <i className="fas fa-arrow-right"/>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 text-center text-sm text-slate-600">
                            <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
                            {' '}
                            <button
                                type="button"
                                className="text-[#1e3a5f] hover:underline font-semibold"
                                onClick={() => setIsSignUp(!isSignUp)}
                            >
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginView;
