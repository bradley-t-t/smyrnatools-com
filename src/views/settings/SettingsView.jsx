import React, {useState} from 'react'
import {usePreferences} from '../../app/context/PreferencesContext'
import './styles/Settings.css'
import VersionPopup from '../../components/common/VersionPopup'
import {useVersion} from '../../app/hooks/useVersion'

const ACCENT_OPTIONS = [
    {key: 'red', label: 'Red', className: 'red'},
    {key: 'blue', label: 'Blue', className: 'blue'},
    {key: 'grey', label: 'Grey', className: 'grey'}
]

function SettingsView() {
    const version = useVersion()
    const {
        preferences,
        toggleShowOnlineOverlay,
        toggleShowPodcastOverlay,
        setBackgroundMode,
        setBlurBgIntensity,
        setThemeMode,
        setAccentColor
    } = usePreferences()
    const [showFeedback, setShowFeedback] = useState(false)

    const save = (fn, ...args) => {
        fn(...args)
        setShowFeedback(true)
        setTimeout(() => setShowFeedback(false), 1200)
    }

    return (
        <div className="settings-container">
            <VersionPopup version={version}/>
            {showFeedback && (
                <div className="settings-feedback">
                    <i className="fas fa-check-circle"></i> Saved
                </div>
            )}
            <div className="settings-header settings-slide-in">
                <h1>Settings</h1>
                <p>Adjust your setting how you would like.</p>
            </div>
            <div className="settings-content">
                <div className="settings-card settings-slide-in" style={{animationDelay: '0.1s'}}>
                    <div className="settings-card-header">
                        <h2>
                            <i className="fas fa-palette"></i> Appearance
                        </h2>
                        <p>Make it feel right for you</p>
                    </div>
                    <div className="settings-section">
                        <h3>Theme</h3>
                        <div className="theme-selector">
                            <div className={`theme-option ${preferences.themeMode === 'old-dark' ? 'active' : ''}`}
                                 onClick={() => save(setThemeMode, 'old-dark')}>
                                <div className="theme-preview old-dark-preview">
                                    <div className="preview-navbar"></div>
                                    <div className="preview-content">
                                        <div className="preview-item"></div>
                                        <div className="preview-item"></div>
                                    </div>
                                </div>
                                <span>Dark</span>
                            </div>
                            <div className={`theme-option ${preferences.themeMode === 'dark' ? 'active' : ''}`}
                                 onClick={() => save(setThemeMode, 'dark')}>
                                <div className="theme-preview dark-preview">
                                    <div className="preview-navbar"></div>
                                    <div className="preview-content">
                                        <div className="preview-item"></div>
                                        <div className="preview-item"></div>
                                    </div>
                                </div>
                                <span>Blue Dark</span>
                            </div>
                            <div className={`theme-option ${preferences.themeMode === 'red-dark' ? 'active' : ''}`}
                                 onClick={() => save(setThemeMode, 'red-dark')}>
                                <div className="theme-preview red-dark-preview">
                                    <div className="preview-navbar"></div>
                                    <div className="preview-content">
                                        <div className="preview-item"></div>
                                        <div className="preview-item"></div>
                                    </div>
                                </div>
                                <span>Red Dark</span>
                            </div>
                            <div className={`theme-option ${preferences.themeMode === 'light' ? 'active' : ''}`}
                                 onClick={() => save(setThemeMode, 'light')}>
                                <div className="theme-preview light-preview">
                                    <div className="preview-navbar"></div>
                                    <div className="preview-content">
                                        <div className="preview-item"></div>
                                        <div className="preview-item"></div>
                                    </div>
                                </div>
                                <span>Light</span>
                            </div>
                            <div className={`theme-option ${preferences.themeMode === 'blue-light' ? 'active' : ''}`}
                                 onClick={() => save(setThemeMode, 'blue-light')}>
                                <div className="theme-preview blue-light-preview">
                                    <div className="preview-navbar"></div>
                                    <div className="preview-content">
                                        <div className="preview-item"></div>
                                        <div className="preview-item"></div>
                                    </div>
                                </div>
                                <span>Blue Light</span>
                            </div>
                            <div className={`theme-option ${preferences.themeMode === 'red-light' ? 'active' : ''}`}
                                 onClick={() => save(setThemeMode, 'red-light')}>
                                <div className="theme-preview red-light-preview">
                                    <div className="preview-navbar"></div>
                                    <div className="preview-content">
                                        <div className="preview-item"></div>
                                        <div className="preview-item"></div>
                                    </div>
                                </div>
                                <span>Red Light</span>
                            </div>
                        </div>
                    </div>
                    <div className="settings-section">
                        <h3>Accent Color</h3>
                        <div className="color-selector">
                            {ACCENT_OPTIONS.map(opt => (
                                <div key={opt.key}
                                     className={`color-option ${opt.className} ${preferences.accentColor === opt.key ? 'active' : ''}`}
                                     onClick={() => save(setAccentColor, opt.key)}>
                                    <div className={`color-preview ${opt.className}`}></div>
                                    <span>{opt.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="settings-card settings-slide-in" style={{animationDelay: '0.2s'}}>
                    <div className="settings-card-header">
                        <h2>
                            <i className="fas fa-desktop"></i> Interface
                        </h2>
                        <p>Customize your interface preferences</p>
                    </div>
                    <div className="settings-section">
                        <h3>Display Options</h3>
                        <div className="toggle-setting">
                            <span className="toggle-label">Online Users List</span>
                            <label className="switch">
                                <input type="checkbox" checked={preferences.showOnlineOverlay}
                                       onChange={() => save(toggleShowOnlineOverlay)}/>
                                <span className="slider round"></span>
                            </label>
                            <span className="toggle-state">{preferences.showOnlineOverlay ? 'Visible' : 'Hidden'}</span>
                        </div>
                        <div className="toggle-setting">
                            <span className="toggle-label">Podcast Overlay</span>
                            <label className="switch">
                                <input type="checkbox" checked={preferences.showPodcastOverlay}
                                       onChange={() => save(toggleShowPodcastOverlay)}/>
                                <span className="slider round"></span>
                            </label>
                            <span
                                className="toggle-state">{preferences.showPodcastOverlay ? 'Visible' : 'Hidden'}</span>
                        </div>
                    </div>
                    <div className="settings-section">
                        <h3>Background</h3>
                        <div className="background-selector">
                            <div 
                                className={`background-option ${!preferences.blurBg && !preferences.solidBg ? 'active' : ''}`}
                                onClick={() => save(setBackgroundMode, 'video')}
                            >
                                <i className="fas fa-video"></i>
                                <span>Video</span>
                            </div>
                            <div 
                                className={`background-option ${preferences.blurBg && !preferences.solidBg ? 'active' : ''}`}
                                onClick={() => save(setBackgroundMode, 'blurred')}
                            >
                                <i className="fas fa-eye-slash"></i>
                                <span>Blurred</span>
                            </div>
                            {!['light', 'blue-light', 'red-light'].includes(preferences.themeMode) && (
                                <div 
                                    className={`background-option ${preferences.solidBg ? 'active' : ''}`}
                                    onClick={() => save(setBackgroundMode, 'solid')}
                                >
                                    <i className="fas fa-square"></i>
                                    <span>Solid</span>
                                </div>
                            )}
                        </div>
                        {preferences.blurBg && !preferences.solidBg && (
                            <div className="blur-intensity-slider">
                                <label>Blur Intensity</label>
                                <div className="slider-container">
                                    <span className="slider-label">Low</span>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={Math.round(preferences.blurBgIntensity / 5)}
                                        onChange={(e) => save(setBlurBgIntensity, e.target.value * 5)}
                                    />
                                    <span className="slider-label">High</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SettingsView