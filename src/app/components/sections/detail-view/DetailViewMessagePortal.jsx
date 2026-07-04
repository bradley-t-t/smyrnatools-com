import React from 'react'
import ReactDOM from 'react-dom'

export default function DetailViewMessagePortal({ message, warning }) {
    if (!message && !warning) return null
    const text = message || warning || ''
    const isError = text.toLowerCase().includes('error') || text.toLowerCase().includes('cannot')
    return ReactDOM.createPortal(
        <div
            className={`fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2.5 rounded-[10px] px-[18px] py-3 text-[13px] font-medium text-white shadow-[0_8px_30px_rgba(0,0,0,0.2)] ${
                isError ? 'bg-red-600' : 'bg-green-600'
            }`}
        >
            <i className={`fas ${isError ? 'fa-times-circle' : 'fa-check-circle'}`}></i>
            {message || warning}
        </div>,
        document.body
    )
}
