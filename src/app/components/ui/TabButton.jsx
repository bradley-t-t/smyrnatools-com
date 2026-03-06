import React from 'react'

/** Rounded tab button with active/inactive styling, used in history and filter panels. */
export default function TabButton({ label, isActive, onClick }) {
    return (
        <button
            className={`px-4 py-2.5 border-none text-sm font-semibold cursor-pointer whitespace-nowrap rounded-md flex-shrink-0 transition-all ${
                isActive
                    ? 'bg-white text-accent shadow-sm'
                    : 'bg-transparent text-slate-500 hover:bg-gray-200 hover:text-slate-800'
            }`}
            onClick={onClick}
        >
            {label}
        </button>
    )
}
