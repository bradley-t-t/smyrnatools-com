import React, {useEffect, useState} from 'react'
import {AppInstallPromptService} from '../../services/AppInstallPromptService'
import {UserService} from '../../services/UserService'
import './styles/AppInstallPromptModal.css'

function AppInstallPromptModal() {
    const [showModal, setShowModal] = useState(false)
    const [deviceType, setDeviceType] = useState('desktop')
    const [promptType, setPromptType] = useState('mobile_install')

    useEffect(() => {
        checkAndShowPrompt()
    }, [])

    const checkAndShowPrompt = async () => {
        const currentUser = await UserService.getCurrentUser()
        if (!currentUser || !currentUser.id) return

        const device = AppInstallPromptService.detectDeviceType()
        setDeviceType(device)

        if (!AppInstallPromptService.canShowInstallPrompt()) return

        let type = 'mobile_install'
        if (device === 'desktop') {
            type = 'desktop_tutorial'
        }
        setPromptType(type)

        const shouldShow = await AppInstallPromptService.shouldShowPrompt(currentUser.id, type)
        if (shouldShow) {
            setTimeout(() => setShowModal(true), 2000)
        }
    }

    const handleDismissForever = async () => {
        const currentUser = await UserService.getCurrentUser()
        if (currentUser && currentUser.id) {
            await AppInstallPromptService.dismissForever(currentUser.id, promptType, deviceType)
        }
        setShowModal(false)
    }

    const handleRemindLater = async () => {
        const currentUser = await UserService.getCurrentUser()
        if (currentUser && currentUser.id) {
            await AppInstallPromptService.remindLater(currentUser.id, promptType, deviceType)
        }
        setShowModal(false)
    }

    const handleInstalled = async () => {
        const currentUser = await UserService.getCurrentUser()
        if (currentUser && currentUser.id) {
            await AppInstallPromptService.markAsInstalled(currentUser.id, promptType, deviceType)
        }
        setShowModal(false)
    }

    if (!showModal) return null

    const renderMobileContent = () => {
        const isIOS = deviceType === 'ios'
        const isAndroid = deviceType === 'android'

        return (
            <div className="app-install-modal-content">
                <div className="app-install-icon">
                    <i className="fas fa-mobile-alt"></i>
                </div>
                <h2>Install Smyrna Tools</h2>
                <p className="app-install-description">
                    Add Smyrna Tools to your home screen for quick access and a better experience!
                </p>
                
                <div className="app-install-steps">
                    {isIOS && (
                        <>
                            <div className="app-install-step">
                                <div className="step-number">1</div>
                                <div className="step-content">
                                    <span>Tap the <strong>Share</strong> button <i className="fas fa-share"></i> at the bottom of Safari</span>
                                </div>
                            </div>
                            <div className="app-install-step">
                                <div className="step-number">2</div>
                                <div className="step-content">
                                    <span>Scroll down and tap <strong>Add to Home Screen</strong> <i className="fas fa-plus-square"></i></span>
                                </div>
                            </div>
                            <div className="app-install-step">
                                <div className="step-number">3</div>
                                <div className="step-content">
                                    <span>Tap <strong>Add</strong> in the top right corner</span>
                                </div>
                            </div>
                        </>
                    )}
                    {isAndroid && (
                        <>
                            <div className="app-install-step">
                                <div className="step-number">1</div>
                                <div className="step-content">
                                    <span>Tap the <strong>Menu</strong> button <i className="fas fa-ellipsis-v"></i> in Chrome</span>
                                </div>
                            </div>
                            <div className="app-install-step">
                                <div className="step-number">2</div>
                                <div className="step-content">
                                    <span>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong></span>
                                </div>
                            </div>
                            <div className="app-install-step">
                                <div className="step-number">3</div>
                                <div className="step-content">
                                    <span>Tap <strong>Add</strong> or <strong>Install</strong> to confirm</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="app-install-actions">
                    <button className="app-install-btn primary" onClick={handleInstalled}>
                        <i className="fas fa-check"></i> I Installed It
                    </button>
                    <button className="app-install-btn secondary" onClick={handleRemindLater}>
                        <i className="fas fa-clock"></i> Remind Me Later
                    </button>
                    <button className="app-install-btn text" onClick={handleDismissForever}>
                        Do Not Show This Again
                    </button>
                </div>
            </div>
        )
    }

    const renderDesktopContent = () => {
        return (
            <div className="app-install-modal-content">
                <div className="app-install-header">
                    <div className="app-install-icon">
                        <i className="fas fa-mobile-screen-button"></i>
                    </div>
                    <h2>Install on Your Phone</h2>
                    <p className="app-install-description">
                        Get the best experience by installing Smyrna Tools on your mobile device
                    </p>
                </div>

                <div className="desktop-tutorial-tabs">
                    <div className="tutorial-section">
                        <div className="tutorial-header">
                            <i className="fab fa-apple"></i>
                            <h3>iPhone / iPad</h3>
                        </div>
                        <div className="tutorial-steps">
                            <div className="tutorial-step">
                                <span className="tutorial-step-number">1</span>
                                <span>Open <strong>Safari</strong> on your iPhone or iPad</span>
                            </div>
                            <div className="tutorial-step">
                                <span className="tutorial-step-number">2</span>
                                <span>Navigate to <strong>smyrnatools.com</strong></span>
                            </div>
                            <div className="tutorial-step">
                                <span className="tutorial-step-number">3</span>
                                <span>Tap the <strong>Share Button</strong> <i className="fas fa-share"></i></span>
                            </div>
                            <div className="tutorial-step">
                                <span className="tutorial-step-number">4</span>
                                <span>Select <strong>Add to Home Screen</strong></span>
                            </div>
                            <div className="tutorial-step">
                                <span className="tutorial-step-number">5</span>
                                <span>Tap <strong>Add</strong></span>
                            </div>
                        </div>
                    </div>

                    <div className="tutorial-section">
                        <div className="tutorial-header">
                            <i className="fab fa-android"></i>
                            <h3>Android</h3>
                        </div>
                        <div className="tutorial-steps">
                            <div className="tutorial-step">
                                <span className="tutorial-step-number">1</span>
                                <span>Open <strong>Chrome</strong> on your Android phone</span>
                            </div>
                            <div className="tutorial-step">
                                <span className="tutorial-step-number">2</span>
                                <span>Navigate to <strong>smyrnatools.com</strong></span>
                            </div>
                            <div className="tutorial-step">
                                <span className="tutorial-step-number">3</span>
                                <span>Tap the <strong>Menu</strong> <i className="fas fa-ellipsis-v"></i></span>
                            </div>
                            <div className="tutorial-step">
                                <span className="tutorial-step-number">4</span>
                                <span>Select <strong>Add to Home screen</strong></span>
                            </div>
                            <div className="tutorial-step">
                                <span className="tutorial-step-number">5</span>
                                <span>Tap <strong>Add</strong></span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="app-install-actions">
                    <button className="app-install-btn primary" onClick={handleInstalled}>
                        <i className="fas fa-check-circle"></i> Got It, Thanks!
                    </button>
                    <button className="app-install-btn secondary" onClick={handleRemindLater}>
                        <i className="fas fa-clock"></i> Remind Me Later
                    </button>
                    <button className="app-install-btn text" onClick={handleDismissForever}>
                        Do Not Show This Again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="app-install-modal-overlay" onClick={handleRemindLater}>
            <div className="app-install-modal" onClick={(e) => e.stopPropagation()}>
                <button className="app-install-close" onClick={handleRemindLater}>
                    <i className="fas fa-times"></i>
                </button>
                {deviceType === 'desktop' ? renderDesktopContent() : renderMobileContent()}
            </div>
        </div>
    )
}

export default AppInstallPromptModal
