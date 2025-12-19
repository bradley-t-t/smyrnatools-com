import React, {useEffect, useRef, useState} from 'react';
import {useAuth} from '../../app/context/AuthContext';
import {AuthUtility} from '../../utils/AuthUtility';
import {supabase} from '../../services/DatabaseService';
import SrmLogo from '../../assets/images/srm-logo.svg';
import './styles/Login.css';
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
    const forceReload = () => {
        window.location.href = window.location.pathname
    };
    const [showRecovery, setShowRecovery] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const handleAuthSuccess = () => {
            setTimeout(forceReload, 500);
        };
        window.addEventListener('authSuccess', handleAuthSuccess);
        return () => {
            window.removeEventListener('authSuccess', handleAuthSuccess);
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
                setTimeout(() => forceReload(), 1000);
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
                setTimeout(() => forceReload(), 3500);
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
        <div className="auth-page">
            <VideoBackground/>
            <VersionPopup version={version}/>
            
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-logo-section">
                        <img src={SrmLogo} alt="SRM" className="auth-logo"/>
                        <div className="auth-brand">
                            <span className="auth-brand-name">Smyrna Tools</span>
                            <span className="auth-brand-tagline">Fleet Management System</span>
                        </div>
                    </div>

                    <div className="auth-mode-toggle">
                        <button 
                            className={`auth-mode-btn ${!isSignUp ? 'active' : ''}`}
                            onClick={() => setIsSignUp(false)}
                            type="button"
                        >
                            Sign In
                        </button>
                        <button 
                            className={`auth-mode-btn ${isSignUp ? 'active' : ''}`}
                            onClick={() => setIsSignUp(true)}
                            type="button"
                        >
                            Sign Up
                        </button>
                        <div className={`auth-mode-slider ${isSignUp ? 'right' : 'left'}`}/>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form" noValidate>
                        {isSignUp && (
                            <div className="auth-name-row">
                                <div className="auth-field">
                                    <i className="fas fa-user auth-field-icon"/>
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="auth-field">
                                    <i className="fas fa-user auth-field-icon"/>
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="auth-field">
                            <i className="fas fa-envelope auth-field-icon"/>
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="username"
                                required
                            />
                        </div>

                        <div className="auth-field">
                            <i className="fas fa-lock auth-field-icon"/>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                required
                            />
                            <button 
                                type="button" 
                                className="auth-password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}/>
                            </button>
                        </div>

                        {isSignUp && password && (
                            <div className="auth-password-strength">
                                <div className="strength-bar">
                                    <div 
                                        className={`strength-fill ${passwordStrength.value.toLowerCase()}`}
                                        style={{
                                            width: passwordStrength.value === 'Weak' ? '33%' : 
                                                   passwordStrength.value === 'Medium' ? '66%' : 
                                                   passwordStrength.value === 'Strong' ? '100%' : '0%'
                                        }}
                                    />
                                </div>
                                <span className="strength-text" style={{color: passwordStrength.color}}>
                                    {passwordStrength.value}
                                </span>
                            </div>
                        )}

                        {isSignUp && (
                            <div className="auth-field">
                                <i className="fas fa-lock auth-field-icon"/>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                        )}

                        {!isSignUp && (
                            <div className="auth-options">
                                <button 
                                    type="button" 
                                    className="auth-forgot-btn"
                                    onClick={() => setShowRecovery(true)}
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        )}

                        {errorMessage && (
                            <div className="auth-message auth-error">
                                <i className="fas fa-exclamation-circle"/>
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {successMessage && (
                            <div className="auth-message auth-success">
                                <i className="fas fa-check-circle"/>
                                <span>{successMessage}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="auth-submit-btn"
                            disabled={isSubmitting || loading}
                        >
                            {isSubmitting || loading ? (
                                <div className="auth-spinner"/>
                            ) : (
                                <>
                                    <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                                    <i className="fas fa-arrow-right"/>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
                        <button 
                            type="button"
                            className="auth-switch-btn"
                            onClick={() => setIsSignUp(!isSignUp)}
                        >
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginView;
