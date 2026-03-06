import React, { useEffect, useState } from 'react'

import { AppInstallPromptService } from '../../../services/AppInstallPromptService'
import { UserService } from '../../../services/UserService'
import { useAccentColor } from '../../hooks/useAccentColor'
/** Step-by-step PWA install instructions for iOS Safari. */
const IOS_STEPS = [
    {
        icon: 'fa-share',
        text: (
            <>
                Tap the <strong>Share</strong> button at the bottom of Safari
            </>
        )
    },
    {
        icon: 'fa-plus-square',
        text: (
            <>
                Scroll down and tap <strong>Add to Home Screen</strong>
            </>
        )
    },
    {
        text: (
            <>
                Tap <strong>Add</strong> in the top right corner
            </>
        )
    }
]
/** Step-by-step PWA install instructions for Android Chrome. */
const ANDROID_STEPS = [
    {
        icon: 'fa-ellipsis-v',
        text: (
            <>
                Tap the <strong>Menu</strong> button in Chrome
            </>
        )
    },
    {
        text: (
            <>
                Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>
            </>
        )
    },
    {
        text: (
            <>
                Tap <strong>Add</strong> or <strong>Install</strong> to confirm
            </>
        )
    }
]
/** Desktop-targeted instructions for installing on an iPhone/iPad. */
const DESKTOP_IOS_STEPS = [
    'Open **Safari** on your iPhone or iPad',
    'Navigate to **smyrnatools.com**',
    'Tap the **Share Button**',
    'Select **Add to Home Screen**',
    'Tap **Add**'
]
/** Desktop-targeted instructions for installing on Android. */
const DESKTOP_ANDROID_STEPS = [
    'Open **Chrome** on your Android phone',
    'Navigate to **smyrnatools.com**',
    'Tap the **Menu**',
    'Select **Add to Home screen**',
    'Tap **Add**'
]
/** Numbered circle badge used in mobile install step lists. */
function StepNumber({ number, accentColor }) {
    return (
        <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
            style={{ backgroundColor: accentColor }}
        >
            {number}
        </span>
    )
}
/** Compact numbered badge used in desktop tutorial step lists. */
function SmallStepNumber({ number, accentColor }) {
    return (
        <span
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{ backgroundColor: accentColor }}
        >
            {number}
        </span>
    )
}
/** Converts **bold** markdown segments to <strong> elements. */
function renderBold(text) {
    return text.split(/\*\*(.+?)\*\*/).map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))
}
/** Shared button group for install prompt actions (primary, remind later, dismiss forever). */
function ActionButtons({ onPrimary, primaryIcon, primaryLabel, onSecondary, onDismiss, accentColor }) {
    return (
        <div className="flex flex-col gap-3">
            <button
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border-none px-6 py-3.5 text-[15px] font-semibold text-white"
                style={{ backgroundColor: accentColor }}
                onClick={onPrimary}
            >
                <i className={`fas ${primaryIcon}`} /> {primaryLabel}
            </button>
            <button
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border-none bg-slate-100 px-6 py-3.5 text-[15px] font-medium text-gray-700"
                onClick={onSecondary}
            >
                <i className="fas fa-clock" /> Remind Me Later
            </button>
            <button
                className="mt-1 border-none bg-transparent p-2 text-[13px] text-slate-400 hover:text-slate-600"
                onClick={onDismiss}
            >
                Do Not Show This Again
            </button>
        </div>
    )
}
/** Mobile-specific install instructions panel with device-appropriate steps. */
function MobileContent({ deviceType, accentColor, onInstalled, onRemindLater, onDismissForever }) {
    const steps = deviceType === 'ios' ? IOS_STEPS : deviceType === 'android' ? ANDROID_STEPS : []
    return (
        <div className="px-8 pb-8 pt-10 text-center">
            <div
                className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[20px] text-4xl"
                style={{ backgroundColor: `${accentColor}12`, color: accentColor }}
            >
                <i className="fas fa-mobile-alt" />
            </div>
            <h2 className="mb-3 text-2xl font-bold" style={{ color: accentColor }}>
                Install Smyrna Tools
            </h2>
            <p className="mb-7 text-[15px] leading-relaxed text-slate-500">
                Add Smyrna Tools to your home screen for quick access and a better experience!
            </p>
            <div className="mb-7 text-left">
                {steps.map((step, index) => (
                    <div
                        key={index}
                        className={`flex items-start gap-3.5 py-3 ${index < steps.length - 1 ? 'border-b border-slate-100' : ''}`}
                    >
                        <StepNumber number={index + 1} accentColor={accentColor} />
                        <span className="pt-1 text-sm leading-normal text-gray-700">
                            {step.text} {step.icon && <i className={`fas ${step.icon}`} />}
                        </span>
                    </div>
                ))}
            </div>
            <ActionButtons
                accentColor={accentColor}
                onPrimary={onInstalled}
                primaryIcon="fa-check"
                primaryLabel="I Installed It"
                onSecondary={onRemindLater}
                onDismiss={onDismissForever}
            />
        </div>
    )
}
/** Tutorial section card for a single platform (iOS or Android) shown on desktop. */
function DesktopTutorialSection({ icon, title, steps, accentColor }) {
    return (
        <div className="rounded-xl bg-slate-50 p-5 text-left">
            <div className="mb-4 flex items-center gap-3">
                <i className={`${icon} text-2xl`} style={{ color: accentColor }} />
                <h3 className="m-0 text-base font-semibold" style={{ color: accentColor }}>
                    {title}
                </h3>
            </div>
            {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2.5 py-2 text-[13px] text-gray-700">
                    <SmallStepNumber number={index + 1} accentColor={accentColor} />
                    <span>{renderBold(step)}</span>
                </div>
            ))}
        </div>
    )
}
/** Desktop-specific content showing install tutorials for both iOS and Android. */
function DesktopContent({ accentColor, onInstalled, onRemindLater, onDismissForever }) {
    return (
        <div className="px-8 pb-8 pt-10 text-center">
            <div
                className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[20px] text-4xl"
                style={{ backgroundColor: `${accentColor}12`, color: accentColor }}
            >
                <i className="fas fa-mobile-screen-button" />
            </div>
            <h2 className="mb-3 text-2xl font-bold" style={{ color: accentColor }}>
                Install on Your Phone
            </h2>
            <p className="mb-7 text-[15px] leading-relaxed text-slate-500">
                Get the best experience by installing Smyrna Tools on your mobile device
            </p>
            <div className="mb-7 flex flex-col gap-5">
                <DesktopTutorialSection
                    icon="fab fa-apple"
                    title="iPhone / iPad"
                    steps={DESKTOP_IOS_STEPS}
                    accentColor={accentColor}
                />
                <DesktopTutorialSection
                    icon="fab fa-android"
                    title="Android"
                    steps={DESKTOP_ANDROID_STEPS}
                    accentColor={accentColor}
                />
            </div>
            <ActionButtons
                accentColor={accentColor}
                onPrimary={onInstalled}
                primaryIcon="fa-check-circle"
                primaryLabel="Got It, Thanks!"
                onSecondary={onRemindLater}
                onDismiss={onDismissForever}
            />
        </div>
    )
}
/**
 * Smart PWA install prompt modal that detects the user's device and shows
 * platform-appropriate installation instructions.
 * Respects user preferences (remind later, dismiss forever) and only appears
 * for non-guest users after a short delay.
 */
function AppInstallPromptModal() {
    const [showModal, setShowModal] = useState(false)
    const [deviceType, setDeviceType] = useState('desktop')
    const [promptType, setPromptType] = useState('mobile_install')
    const accentColor = useAccentColor()
    useEffect(() => {
        let timerId
        const checkAndShowPrompt = async () => {
            const currentUser = await UserService.getCurrentUser()
            if (!currentUser?.id) return
            const roles = await UserService.getUserRoles(currentUser.id)
            const isGuestOnly = roles.length > 0 && roles.every((r) => r?.name?.toLowerCase() === 'guest')
            if (isGuestOnly || roles.length === 0) return
            const device = AppInstallPromptService.detectDeviceType()
            setDeviceType(device)
            if (!AppInstallPromptService.canShowInstallPrompt()) return
            const type = device === 'desktop' ? 'desktop_tutorial' : 'mobile_install'
            setPromptType(type)
            const shouldShow = await AppInstallPromptService.shouldShowPrompt(currentUser.id, type)
            if (shouldShow) timerId = setTimeout(() => setShowModal(true), 2000)
        }
        checkAndShowPrompt()
        return () => clearTimeout(timerId)
    }, [])
    const withCurrentUser = async (action) => {
        const currentUser = await UserService.getCurrentUser()
        if (currentUser?.id) await action(currentUser.id)
        setShowModal(false)
    }
    const handleDismissForever = () =>
        withCurrentUser((id) => AppInstallPromptService.dismissForever(id, promptType, deviceType))
    const handleRemindLater = () =>
        withCurrentUser((id) => AppInstallPromptService.remindLater(id, promptType, deviceType))
    const handleInstalled = () =>
        withCurrentUser((id) => AppInstallPromptService.markAsInstalled(id, promptType, deviceType))
    if (!showModal) return null
    const ContentComponent = deviceType === 'desktop' ? DesktopContent : MobileContent
    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-5"
            onClick={handleRemindLater}
        >
            <div
                className="relative max-h-[90vh] w-full max-w-[480px] overflow-auto rounded-[20px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    className="absolute right-4 top-4 z-[1] flex h-9 w-9 items-center justify-center rounded-full border-none bg-slate-100 text-base text-slate-500 hover:bg-slate-200"
                    onClick={handleRemindLater}
                >
                    <i className="fas fa-times" />
                </button>
                <ContentComponent
                    deviceType={deviceType}
                    accentColor={accentColor}
                    onInstalled={handleInstalled}
                    onRemindLater={handleRemindLater}
                    onDismissForever={handleDismissForever}
                />
            </div>
        </div>
    )
}
export default AppInstallPromptModal
