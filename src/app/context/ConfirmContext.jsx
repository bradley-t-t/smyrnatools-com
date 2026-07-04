import React, { createContext, useCallback, useContext, useRef, useState } from 'react'

import ConfirmDialog from '../components/common/ConfirmDialog'

const ConfirmContext = createContext(null)

/**
 * Provides an imperative `confirm()` API for showing a themed confirmation
 * dialog. Replaces native `window.confirm()` so destructive prompts honor
 * the app's dark/light theme, accent color, and PWA presentation.
 *
 * Mount once near the root, then call `useConfirm()` inside any component
 * to obtain a function that returns a Promise<boolean> indicating whether
 * the user confirmed or cancelled.
 */
export function ConfirmProvider({ children }) {
    const [dialog, setDialog] = useState(null)
    const resolverRef = useRef(null)

    const confirm = useCallback((options = {}) => {
        return new Promise((resolve) => {
            resolverRef.current = resolve
            setDialog({
                cancelLabel: options.cancelLabel || 'Cancel',
                confirmLabel: options.confirmLabel || 'Confirm',
                message: options.message,
                title: options.title || 'Are you sure?',
                variant: options.variant || 'danger'
            })
        })
    }, [])

    const handleConfirm = useCallback(() => {
        const resolve = resolverRef.current
        resolverRef.current = null
        setDialog(null)
        if (resolve) resolve(true)
    }, [])

    const handleCancel = useCallback(() => {
        const resolve = resolverRef.current
        resolverRef.current = null
        setDialog(null)
        if (resolve) resolve(false)
    }, [])

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <ConfirmDialog
                isOpen={!!dialog}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                title={dialog?.title}
                message={dialog?.message}
                confirmLabel={dialog?.confirmLabel}
                cancelLabel={dialog?.cancelLabel}
                variant={dialog?.variant}
            />
        </ConfirmContext.Provider>
    )
}

/**
 * Returns a function that opens the confirmation dialog and resolves to
 * `true` when the user confirms or `false` when they cancel.
 *
 * @example
 *   const confirm = useConfirm()
 *   if (!(await confirm({ title: 'Delete report?', variant: 'danger' }))) return
 */
export function useConfirm() {
    const ctx = useContext(ConfirmContext)
    if (!ctx) {
        throw new Error('useConfirm must be used inside <ConfirmProvider>')
    }
    return ctx
}
