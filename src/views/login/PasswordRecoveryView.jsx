import { useState } from 'react'

import VideoBackground from '../../app/components/common/VideoBackground'
import SrmLogo from '../../assets/images/srm-logo.svg'
import APIUtility from '../../utils/APIUtility'
/**
 * Password recovery form. Sends the user's email to the backend which
 * generates and emails a new password if the account exists. Uses a
 * deliberately vague success message to avoid leaking account existence.
 *
 * @param {Function} onBackToLogin - Callback to return to the login screen.
 */
function PasswordRecoveryView({ onBackToLogin }) {
    const [email, setEmail] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    async function handleSubmit(e) {
        e.preventDefault()
        if (submitting) return
        setMessage('')
        setError('')
        if (!email) {
            setError('Enter your email.')
            return
        }
        setSubmitting(true)
        try {
            const { res } = await APIUtility.post('/auth-service/reset-password', { email })
            if (res.ok) {
                setMessage('If an account exists for this email, a new password has been sent.')
            } else {
                setError('An error occurred. Please try again.')
            }
        } catch (err) {
            setError('An error occurred. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-[#1e3a5f] p-4">
            <VideoBackground />
            <div className="w-full max-w-md relative z-10">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20">
                    <div className="bg-[#1e3a5f] p-6 text-center">
                        <img src={SrmLogo} alt="SRM" className="h-16 mx-auto mb-3" />
                        <h1 className="text-xl font-bold text-white">Password Recovery</h1>
                        <p className="text-slate-300 text-sm">Enter your email to receive a new password</p>
                    </div>
                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                            <div className="relative">
                                <i className="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    autoFocus
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
                                    required
                                />
                            </div>
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    <i className="fas fa-exclamation-circle" />
                                    <span>{error}</span>
                                </div>
                            )}
                            {message && (
                                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                                    <i className="fas fa-check-circle" />
                                    <span>{message}</span>
                                </div>
                            )}
                            <button
                                type="submit"
                                className="w-full py-3 bg-[#1e3a5f] hover:bg-[#15304f] text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Send New Password</span>
                                        <i className="fas fa-paper-plane" />
                                    </>
                                )}
                            </button>
                        </form>
                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                className="text-[#1e3a5f] hover:underline font-semibold text-sm inline-flex items-center gap-2"
                                onClick={onBackToLogin}
                            >
                                <i className="fas fa-arrow-left" />
                                Back to Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default PasswordRecoveryView
