import React, {useState} from 'react'
import ReactDOM from 'react-dom'
import './styles/OfflineOverlay.css'

function OfflineOverlay({onRetry}) {
    const [isRetrying, setIsRetrying] = useState(false)

    if (typeof document === 'undefined' || !document.body) {
        return null;
    }

    const handleRetry = async () => {
        setIsRetrying(true)
        try {
            await onRetry()
        } finally {
            setIsRetrying(false)
        }
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
                        <button
                            className={`offline-button retry-button ${isRetrying ? 'retrying' : ''}`}
                            onClick={handleRetry}
                            disabled={isRetrying}
                        >
                            <i className={`fas fa-redo ${isRetrying ? 'spinning' : ''}`}></i>
                            {isRetrying ? 'Checking Connection...' : 'Retry Connection'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default OfflineOverlay
