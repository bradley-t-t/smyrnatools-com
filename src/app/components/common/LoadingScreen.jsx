import React from 'react'

import SrmLogo from '../../../assets/images/srm-logo.svg'
import { useAccentColor } from '../../hooks/useAccentColor'
/**
 * Branded loading indicator with animated progress bar and SRM logo.
 * Supports full-page overlay, inline, and default container modes.
 * @param {Object} props
 * @param {string} [props.message='Loading...'] - Text displayed below the logo.
 * @param {boolean} [props.fullPage=false] - Renders as a fixed full-screen overlay with backdrop blur.
 * @param {boolean} [props.inline=false] - Renders with compact padding for embedding within sections.
 */
function LoadingScreen({ message = 'Loading...', fullPage = false, inline = false }) {
    const accentColor = useAccentColor()
    const containerClass = fullPage
        ? 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/85 backdrop-blur-sm'
        : inline
          ? 'flex items-center justify-center bg-transparent px-5 py-10'
          : 'flex items-center justify-center bg-transparent px-10 py-[60px]'
    return (
        <>
            <style>{`
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(250%); }
                    100% { transform: translateX(450%); }
                }
            `}</style>
            <div className={containerClass}>
                <div
                    className="flex flex-col items-center justify-center gap-7 rounded-[20px] border-2 border-white/15 px-[70px] py-[50px]"
                    style={{
                        backgroundColor: accentColor,
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                >
                    <img src={SrmLogo} alt="Loading" className="h-[100px] w-[100px]" />
                    <div className="flex flex-col items-center gap-4">
                        <p className="m-0 text-base font-semibold tracking-wider text-white">{message}</p>
                        <div className="h-1 w-[200px] overflow-hidden rounded-sm bg-white/20">
                            <div
                                className="h-full w-[30%] rounded-sm bg-white"
                                style={{ animation: 'progress 1.5s ease-in-out infinite' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
export default LoadingScreen
