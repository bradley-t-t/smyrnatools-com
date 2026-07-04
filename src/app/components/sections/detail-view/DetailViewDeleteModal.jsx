import React from 'react'
import ReactDOM from 'react-dom'

export default function DetailViewDeleteModal({ deleteMessage, deleteTitle, onDeleteCancel, onDeleteConfirm, show }) {
    if (!show) return null
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-5">
            <div className="w-full max-w-[360px] overflow-hidden rounded bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded bg-red-50">
                        <i className="fas fa-trash-alt text-2xl text-text-primary"></i>
                    </div>
                    <h3 className="m-0 mb-1.5 text-lg font-bold text-slate-800">{deleteTitle}</h3>
                    <p className="m-0 text-[13px] text-slate-500">{deleteMessage}</p>
                </div>
                <div className="flex gap-2.5 border-t border-border-light bg-slate-50 px-5 py-3.5">
                    <button type="button"
                        className="dv-btn flex-1 rounded-[10px] border-none bg-slate-100 px-4 py-2.5 text-[13px] font-semibold text-slate-600 cursor-pointer"
                        onClick={onDeleteCancel}
                    >
                        Cancel
                    </button>
                    <button type="button"
                        className="dv-btn flex-1 rounded-[10px] border-none bg-red-600 px-4 py-2.5 text-[13px] font-semibold text-white cursor-pointer"
                        onClick={onDeleteConfirm}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
