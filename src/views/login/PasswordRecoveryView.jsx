import React, {useState} from 'react';
import SrmLogo from '../../assets/images/srm-logo.svg';
import './styles/PasswordRecoveryView.css';
import APIUtility from '../../utils/APIUtility';
import VideoBackground from '../../components/common/VideoBackground';

function PasswordRecoveryView({onBackToLogin}) {
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        if (submitting) return;
        setMessage('');
        setError('');
        if (!email) {
            setError('Enter your email.');
            return;
        }
        setSubmitting(true);
        try {
            const {res} = await APIUtility.post('/auth-context/reset-password', {email});
            if (res.ok) {
                setMessage('If an account exists for this email, a new password has been sent.');
            } else {
                setError('An error occurred. Please try again.');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="auth-page">
            <VideoBackground/>

            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-logo-section">
                        <img src={SrmLogo} alt="SRM" className="auth-logo"/>
                        <div className="auth-brand">
                            <span className="auth-brand-name">Password Recovery</span>
                            <span className="auth-brand-tagline">Enter your email to receive a new password</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form" noValidate>
                        <div className="auth-field">
                            <i className="fas fa-envelope auth-field-icon"/>
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                autoFocus
                                required
                            />
                        </div>

                        {error && (
                            <div className="auth-message auth-error">
                                <i className="fas fa-exclamation-circle"/>
                                <span>{error}</span>
                            </div>
                        )}

                        {message && (
                            <div className="auth-message auth-success">
                                <i className="fas fa-check-circle"/>
                                <span>{message}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="auth-submit-btn"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <div className="auth-spinner"/>
                            ) : (
                                <>
                                    <span>Send New Password</span>
                                    <i className="fas fa-paper-plane"/>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <button
                            type="button"
                            className="auth-switch-btn"
                            onClick={onBackToLogin}
                        >
                            <i className="fas fa-arrow-left" style={{marginRight: '8px'}}/>
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PasswordRecoveryView;
