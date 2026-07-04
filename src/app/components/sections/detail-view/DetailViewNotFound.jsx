/* eslint-disable react/forbid-dom-props */
import React from 'react'

export default function DetailViewNotFound({
    accent,
    className,
    notFoundDescription,
    notFoundMessage,
    onBack,
    onClose
}) {
    return (
        <div
            className={`${className} fixed top-16 left-0 right-0 bottom-0 z-40 flex flex-col items-center justify-center gap-5 bg-slate-50 p-10 text-center`}
        >
            <div
                className="flex h-20 w-20 items-center justify-center rounded-[20px]"
                style={{ background: `${accent}12` }}
            >
                <i className="fas fa-search text-[32px] text-text-primary"></i>
            </div>
            <div>
                <h2 className="m-0 mb-2 text-[22px] font-bold text-slate-800">{notFoundMessage}</h2>
                <p className="m-0 max-w-[300px] text-sm text-slate-500">{notFoundDescription}</p>
            </div>
            <button type="button"
                onClick={onClose || onBack}
                className="flex items-center gap-2 rounded-xl border-none text-sm font-semibold text-white cursor-pointer px-6 py-3"
                style={{ background: accent }}
            >
                <i className="fas fa-arrow-left"></i> Go Back
            </button>
        </div>
    )
}
