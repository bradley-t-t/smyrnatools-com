import { useState } from 'react'

import VideoBackground from '../../../app/components/common/VideoBackground'
import SrmLogo from '../../../assets/images/srm-logo.svg'
import APIUtility from '../../../utils/APIUtility'

/**
 * Password recovery form. Sends the user's email to the backend which
 * generates and emails a new password if the account exists. Uses a
 * deliberately vague success message to avoid leaking account existence.
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
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
            <VideoBackground />
            <div aria-hidden="true" className="absolute inset-0 z-[4] bg-gradient-to-b from-slate-950/75 via-slate-950/55 to-slate-950/90" />
            <div className="w-full max-w-md relative z-10 animate-fade-slide-in motion-reduce:animate-none">
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-950/45 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
                    <div className="border-b border-white/10 bg-white/[0.03] p-6 text-center">
                        <img src={SrmLogo} alt="SRM" className="h-16 mx-auto mb-3" />
                        <h1 className="font-heading text-xl font-bold tracking-tight text-white">Password Recovery</h1>
                        <p className="text-white/70 text-sm">Enter your email to receive a new password</p>
                    </div>
                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                            <div className="relative">
                                <i
                                    className="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm pointer-events-none"
                                    aria-hidden="true"
                                />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    autoFocus
                                    className="w-full pl-10 pr-4 py-3 border border-white/15 bg-white/[0.06] text-white rounded-lg text-sm focus:outline-none focus:border-white/50 focus:bg-white/[0.1] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)] transition-[border-color,background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none placeholder:text-white/40"
                                    required
                                />
                            </div>
                            {error && (
                                <div
                                    role="alert"
                                    className="flex items-start gap-2 p-3 bg-rose-400/10 border border-rose-400/40 rounded-lg text-white text-sm animate-msg-in motion-reduce:animate-none"
                                >
                                    <i className="fas fa-exclamation-circle mt-0.5 text-rose-300" aria-hidden="true" />
                                    <span>{error}</span>
                                </div>
                            )}
                            {message && (
                                <div
                                    role="status"
                                    aria-live="polite"
                                    className="flex items-start gap-2 p-3 bg-emerald-400/10 border border-emerald-400/40 rounded-lg text-white text-sm animate-msg-in motion-reduce:animate-none"
                                >
                                    <i className="fas fa-check-circle mt-0.5 text-emerald-300" aria-hidden="true" />
                                    <span>{message}</span>
                                </div>
                            )}
                            <button
                                type="submit"
                                className="w-full py-3 bg-white text-slate-950 font-semibold rounded-lg transition-[filter,transform,opacity,background-color] duration-150 ease-out motion-reduce:transition-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Send New Password</span>
                                        <i className="fas fa-paper-plane" aria-hidden="true" />
                                    </>
                                )}
                            </button>
                        </form>
                        <div className="mt-6 text-center">
                            <button type="button"
                                className="text-sky-300 font-semibold text-sm inline-flex items-center gap-2 transition-colors duration-150 ease-out motion-reduce:transition-none hover:text-sky-200 hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-white/60 rounded"
                                onClick={onBackToLogin}
                            >
                                <i className="fas fa-arrow-left" aria-hidden="true" />
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
