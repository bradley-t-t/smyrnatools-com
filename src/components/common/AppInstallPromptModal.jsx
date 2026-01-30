import React, { useEffect, useState } from 'react'

import { AppInstallPromptService } from '../../services/AppInstallPromptService'
import { UserService } from '../../services/UserService'

function AppInstallPromptModal() {
    const [showModal, setShowModal] = useState(false)
    const [deviceType, setDeviceType] = useState('desktop')
    const [promptType, setPromptType] = useState('mobile_install')

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

    useEffect(() => {
        checkAndShowPrompt()
    }, [])

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

    const overlayStyle = {
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        left: 0,
        padding: '20px',
        position: 'fixed',
        right: 0,
        top: 0,
        zIndex: 10000
    }

    const modalStyle = {
        backgroundColor: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        maxHeight: '90vh',
        maxWidth: '480px',
        overflow: 'auto',
        position: 'relative',
        width: '100%'
    }

    const closeButtonStyle = {
        alignItems: 'center',
        background: '#f1f5f9',
        border: 'none',
        borderRadius: '50%',
        color: '#64748b',
        cursor: 'pointer',
        display: 'flex',
        fontSize: '16px',
        height: '36px',
        justifyContent: 'center',
        position: 'absolute',
        right: '16px',
        top: '16px',
        width: '36px',
        zIndex: 1
    }

    const contentStyle = {
        padding: '40px 32px 32px',
        textAlign: 'center'
    }

    const iconStyle = {
        alignItems: 'center',
        backgroundColor: '#f0f7ff',
        borderRadius: '20px',
        color: '#1e3a5f',
        display: 'flex',
        fontSize: '36px',
        height: '80px',
        justifyContent: 'center',
        margin: '0 auto 20px',
        width: '80px'
    }

    const titleStyle = {
        color: '#1e3a5f',
        fontSize: '24px',
        fontWeight: 700,
        margin: '0 0 12px'
    }

    const descriptionStyle = {
        color: '#64748b',
        fontSize: '15px',
        lineHeight: 1.6,
        margin: '0 0 28px'
    }

    const stepsContainerStyle = {
        marginBottom: '28px',
        textAlign: 'left'
    }

    const stepStyle = {
        alignItems: 'flex-start',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        gap: '14px',
        padding: '12px 0'
    }

    const stepNumberStyle = {
        alignItems: 'center',
        backgroundColor: '#1e3a5f',
        borderRadius: '50%',
        color: 'white',
        display: 'flex',
        flexShrink: 0,
        fontSize: '13px',
        fontWeight: 600,
        height: '28px',
        justifyContent: 'center',
        width: '28px'
    }

    const stepContentStyle = {
        color: '#374151',
        fontSize: '14px',
        lineHeight: 1.5,
        paddingTop: '4px'
    }

    const actionsStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    }

    const primaryButtonStyle = {
        alignItems: 'center',
        backgroundColor: '#1e3a5f',
        border: 'none',
        borderRadius: '12px',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        fontSize: '15px',
        fontWeight: 600,
        gap: '10px',
        justifyContent: 'center',
        padding: '14px 24px',
        width: '100%'
    }

    const secondaryButtonStyle = {
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        border: 'none',
        borderRadius: '12px',
        color: '#374151',
        cursor: 'pointer',
        display: 'flex',
        fontSize: '15px',
        fontWeight: 500,
        gap: '10px',
        justifyContent: 'center',
        padding: '14px 24px',
        width: '100%'
    }

    const textButtonStyle = {
        background: 'none',
        border: 'none',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '13px',
        marginTop: '4px',
        padding: '8px'
    }

    const tutorialTabsStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginBottom: '28px'
    }

    const tutorialSectionStyle = {
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'left'
    }

    const tutorialHeaderStyle = {
        alignItems: 'center',
        display: 'flex',
        gap: '12px',
        marginBottom: '16px'
    }

    const tutorialIconStyle = {
        color: '#1e3a5f',
        fontSize: '24px'
    }

    const tutorialTitleStyle = {
        color: '#1e3a5f',
        fontSize: '16px',
        fontWeight: 600,
        margin: 0
    }

    const tutorialStepStyle = {
        alignItems: 'center',
        color: '#374151',
        display: 'flex',
        fontSize: '13px',
        gap: '10px',
        padding: '8px 0'
    }

    const tutorialStepNumberStyle = {
        alignItems: 'center',
        backgroundColor: '#1e3a5f',
        borderRadius: '50%',
        color: 'white',
        display: 'flex',
        flexShrink: 0,
        fontSize: '11px',
        fontWeight: 600,
        height: '22px',
        justifyContent: 'center',
        width: '22px'
    }

    const renderMobileContent = () => {
        const isIOS = deviceType === 'ios'
        const isAndroid = deviceType === 'android'

        return (
            <div style={contentStyle}>
                <div style={iconStyle}>
                    <i className="fas fa-mobile-alt"></i>
                </div>
                <h2 style={titleStyle}>Install Smyrna Tools</h2>
                <p style={descriptionStyle}>
                    Add Smyrna Tools to your home screen for quick access and a better experience!
                </p>

                <div style={stepsContainerStyle}>
                    {isIOS && (
                        <>
                            <div style={stepStyle}>
                                <div style={stepNumberStyle}>1</div>
                                <div style={stepContentStyle}>
                                    <span>
                                        Tap the <strong>Share</strong> button <i className="fas fa-share"></i> at the
                                        bottom of Safari
                                    </span>
                                </div>
                            </div>
                            <div style={stepStyle}>
                                <div style={stepNumberStyle}>2</div>
                                <div style={stepContentStyle}>
                                    <span>
                                        Scroll down and tap <strong>Add to Home Screen</strong>{' '}
                                        <i className="fas fa-plus-square"></i>
                                    </span>
                                </div>
                            </div>
                            <div style={{ ...stepStyle, borderBottom: 'none' }}>
                                <div style={stepNumberStyle}>3</div>
                                <div style={stepContentStyle}>
                                    <span>
                                        Tap <strong>Add</strong> in the top right corner
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                    {isAndroid && (
                        <>
                            <div style={stepStyle}>
                                <div style={stepNumberStyle}>1</div>
                                <div style={stepContentStyle}>
                                    <span>
                                        Tap the <strong>Menu</strong> button <i className="fas fa-ellipsis-v"></i> in
                                        Chrome
                                    </span>
                                </div>
                            </div>
                            <div style={stepStyle}>
                                <div style={stepNumberStyle}>2</div>
                                <div style={stepContentStyle}>
                                    <span>
                                        Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>
                                    </span>
                                </div>
                            </div>
                            <div style={{ ...stepStyle, borderBottom: 'none' }}>
                                <div style={stepNumberStyle}>3</div>
                                <div style={stepContentStyle}>
                                    <span>
                                        Tap <strong>Add</strong> or <strong>Install</strong> to confirm
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div style={actionsStyle}>
                    <button style={primaryButtonStyle} onClick={handleInstalled}>
                        <i className="fas fa-check"></i> I Installed It
                    </button>
                    <button style={secondaryButtonStyle} onClick={handleRemindLater}>
                        <i className="fas fa-clock"></i> Remind Me Later
                    </button>
                    <button style={textButtonStyle} onClick={handleDismissForever}>
                        Do Not Show This Again
                    </button>
                </div>
            </div>
        )
    }

    const renderDesktopContent = () => {
        return (
            <div style={contentStyle}>
                <div style={iconStyle}>
                    <i className="fas fa-mobile-screen-button"></i>
                </div>
                <h2 style={titleStyle}>Install on Your Phone</h2>
                <p style={descriptionStyle}>Get the best experience by installing Smyrna Tools on your mobile device</p>

                <div style={tutorialTabsStyle}>
                    <div style={tutorialSectionStyle}>
                        <div style={tutorialHeaderStyle}>
                            <i className="fab fa-apple" style={tutorialIconStyle}></i>
                            <h3 style={tutorialTitleStyle}>iPhone / iPad</h3>
                        </div>
                        <div>
                            <div style={tutorialStepStyle}>
                                <span style={tutorialStepNumberStyle}>1</span>
                                <span>
                                    Open <strong>Safari</strong> on your iPhone or iPad
                                </span>
                            </div>
                            <div style={tutorialStepStyle}>
                                <span style={tutorialStepNumberStyle}>2</span>
                                <span>
                                    Navigate to <strong>smyrnatools.com</strong>
                                </span>
                            </div>
                            <div style={tutorialStepStyle}>
                                <span style={tutorialStepNumberStyle}>3</span>
                                <span>
                                    Tap the <strong>Share Button</strong> <i className="fas fa-share"></i>
                                </span>
                            </div>
                            <div style={tutorialStepStyle}>
                                <span style={tutorialStepNumberStyle}>4</span>
                                <span>
                                    Select <strong>Add to Home Screen</strong>
                                </span>
                            </div>
                            <div style={tutorialStepStyle}>
                                <span style={tutorialStepNumberStyle}>5</span>
                                <span>
                                    Tap <strong>Add</strong>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style={tutorialSectionStyle}>
                        <div style={tutorialHeaderStyle}>
                            <i className="fab fa-android" style={tutorialIconStyle}></i>
                            <h3 style={tutorialTitleStyle}>Android</h3>
                        </div>
                        <div>
                            <div style={tutorialStepStyle}>
                                <span style={tutorialStepNumberStyle}>1</span>
                                <span>
                                    Open <strong>Chrome</strong> on your Android phone
                                </span>
                            </div>
                            <div style={tutorialStepStyle}>
                                <span style={tutorialStepNumberStyle}>2</span>
                                <span>
                                    Navigate to <strong>smyrnatools.com</strong>
                                </span>
                            </div>
                            <div style={tutorialStepStyle}>
                                <span style={tutorialStepNumberStyle}>3</span>
                                <span>
                                    Tap the <strong>Menu</strong> <i className="fas fa-ellipsis-v"></i>
                                </span>
                            </div>
                            <div style={tutorialStepStyle}>
                                <span style={tutorialStepNumberStyle}>4</span>
                                <span>
                                    Select <strong>Add to Home screen</strong>
                                </span>
                            </div>
                            <div style={tutorialStepStyle}>
                                <span style={tutorialStepNumberStyle}>5</span>
                                <span>
                                    Tap <strong>Add</strong>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={actionsStyle}>
                    <button style={primaryButtonStyle} onClick={handleInstalled}>
                        <i className="fas fa-check-circle"></i> Got It, Thanks!
                    </button>
                    <button style={secondaryButtonStyle} onClick={handleRemindLater}>
                        <i className="fas fa-clock"></i> Remind Me Later
                    </button>
                    <button style={textButtonStyle} onClick={handleDismissForever}>
                        Do Not Show This Again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div style={overlayStyle} onClick={handleRemindLater}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                <button style={closeButtonStyle} onClick={handleRemindLater}>
                    <i className="fas fa-times"></i>
                </button>
                {deviceType === 'desktop' ? renderDesktopContent() : renderMobileContent()}
            </div>
        </div>
    )
}

export default AppInstallPromptModal
