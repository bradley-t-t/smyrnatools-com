import React from 'react'

/** Full-screen overlay modal for viewing an attached image at full resolution. */
export default function ImagePreviewModal({ imageUrl, onClose }) {
    if (!imageUrl) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
            <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                <button
                    className="absolute right-0 -top-12 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-800 text-lg shadow-md hover:bg-slate-100 transition-colors"
                    onClick={onClose}
                    type="button"
                >
                    <i className="fas fa-times" />
                </button>
                <img src={imageUrl} alt="Full preview" className="max-h-[90vh] max-w-full rounded-lg" />
            </div>
        </div>
    )
}
