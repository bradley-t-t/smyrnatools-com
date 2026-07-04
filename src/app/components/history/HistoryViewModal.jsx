import React from 'react'
import ReactDOM from 'react-dom'

import TabButton from '../ui/TabButton'

/**
 * Portal-mounted full-screen modal shell that hosts the change history UI. Owns
 * the header, tab strip, scroll body, and footer chrome; child content is
 * supplied by the caller and renders inside the scrollable body.
 *
 * Polish notes:
 *   - Backdrop fades in, modal uses `animate-pop-in` spring curve.
 *   - Close + footer buttons use Tailwind hover/focus tokens — no JS hover handlers.
 *   - All chrome reads from semantic tokens (`bg-bg-secondary`, `border-border-light`).
 */
export default function HistoryViewModal({
    activeTab,
    children,
    itemName,
    onClose,
    scrollContainerRef,
    setActiveTab,
    tabs
}) {
    if (typeof document === 'undefined' || !document.body) return null
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[rgba(15,23,42,0.65)] animate-fade-in motion-reduce:animate-none">
            <div className="flex flex-col w-full max-w-[900px] max-h-[85vh] overflow-hidden rounded-modal border border-border-light bg-bg-primary shadow-modal animate-pop-in motion-reduce:animate-none">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-light bg-bg-secondary">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-bg-tertiary text-text-secondary">
                            <i className="fas fa-history text-[12px]" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                                Change History
                            </div>
                            <h2 className="m-0 truncate font-heading text-[14px] font-semibold text-text-primary">
                                {itemName}
                            </h2>
                        </div>
                    </div>
                    <button type="button"
                        onClick={onClose}
                        aria-label="Close history"
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-text-secondary transition-colors duration-150 ease-out hover:bg-bg-hover hover:text-text-primary active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none"
                    >
                        <i className="fas fa-times text-[12px]" />
                    </button>
                </div>
                <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 py-2 border-b border-border-light bg-bg-secondary">
                    {tabs.map((tab) => (
                        <TabButton
                            key={tab.id}
                            label={tab.label}
                            isActive={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                        />
                    ))}
                </div>
                <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto bg-bg-primary px-4 py-3">
                    {children}
                </div>
                <div className="flex justify-end gap-2 border-t border-border-light bg-bg-secondary px-4 py-2.5">
                    <button type="button"
                        onClick={onClose}
                        className="inline-flex items-center rounded-md border border-border-light bg-bg-primary px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-text-primary transition-colors duration-150 ease-out hover:bg-bg-hover hover:border-border-medium active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
