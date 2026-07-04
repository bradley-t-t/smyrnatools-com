import { useCallback, useState } from 'react'

/**
 * Manages the in-flight saving cell set + add/remove/paste callbacks for a
 * role permission grid. Centralizes the cellKey lifecycle so the view stays
 * focused on rendering.
 */
export const useRolePermissionHandlers = ({ hasITAccess, roles, updateRolePermissions, setError }) => {
    const [savingPerms, setSavingPerms] = useState(new Set())

    const markSaving = useCallback((cellKey) => {
        setSavingPerms((prev) => new Set(prev).add(cellKey))
    }, [])

    const clearSaving = useCallback((cellKey) => {
        setSavingPerms((prev) => {
            const next = new Set(prev)
            next.delete(cellKey)
            return next
        })
    }, [])

    const handleRemovePermission = useCallback(
        async (roleId, permission) => {
            if (!hasITAccess) return
            const cellKey = `${roleId}:${permission}`
            markSaving(cellKey)
            try {
                const role = roles.find((r) => r.id === roleId)
                if (!role) return
                const currentPerms = Array.isArray(role.permissions) ? role.permissions : []
                const newPerms = currentPerms.filter((p) => p !== permission)
                await updateRolePermissions(roleId, newPerms.join('\n'))
            } catch (err) {
                setError(`Failed to remove: ${err.message}`)
            } finally {
                clearSaving(cellKey)
            }
        },
        [hasITAccess, roles, updateRolePermissions, setError, markSaving, clearSaving]
    )

    const handleAddPermission = useCallback(
        async (roleId, permission) => {
            if (!hasITAccess) return
            const cellKey = `${roleId}:${permission}`
            markSaving(cellKey)
            try {
                const role = roles.find((r) => r.id === roleId)
                if (!role) return
                const currentPerms = Array.isArray(role.permissions) ? role.permissions : []
                if (currentPerms.includes(permission)) return
                const newPerms = [...currentPerms, permission]
                await updateRolePermissions(roleId, newPerms.join('\n'))
            } catch (err) {
                setError(`Failed to add: ${err.message}`)
            } finally {
                clearSaving(cellKey)
            }
        },
        [hasITAccess, roles, updateRolePermissions, setError, markSaving, clearSaving]
    )

    const handlePastePermissions = useCallback(
        async (roleId, mergedPermissions) => {
            if (!hasITAccess) return
            try {
                await updateRolePermissions(roleId, mergedPermissions.join('\n'))
            } catch (err) {
                setError(`Failed to paste permissions: ${err.message}`)
                throw err
            }
        },
        [hasITAccess, updateRolePermissions, setError]
    )

    return { handleAddPermission, handlePastePermissions, handleRemovePermission, savingPerms }
}
