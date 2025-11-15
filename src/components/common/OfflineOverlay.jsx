import React from 'react'
import ReactDOM from 'react-dom'
import './styles/OfflineOverlay.css'

function OfflineOverlay({onRetry, onReload}) {
    if (typeof document === 'undefined' || !document.body) {
        return null;
    }

    return ReactDOM.createPortal(
        <div className="offline-overlay-backdrop">
            <div className="offline-overlay-modal">
                <div className="offline-overlay-content">
                    <h1>Connection Lost</h1>
                    <p className="offline-message">
                        Your connection appears to be offline or unstable. Please check your network and try again.
                    </p>
                    <div className="offline-actions">
                        <button className="offline-button retry-button" onClick={onRetry}>
                            <i className="fas fa-redo"></i>
                            Retry Connection
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default OfflineOverlay
