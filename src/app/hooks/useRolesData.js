import { useCallback, useState } from 'react'

import { supabase } from '../../services/DatabaseService'
import { UserService } from '../../services/UserService'

const PERMISSION_SEPARATOR = '\n'
const SUCCESS_MESSAGE_DURATION_MS = 3000
const EXTENDED_MESSAGE_DURATION_MS = 5000

const parsePermissionsText = (text) =>
    [
        ...new Set(
            text
                .split(PERMISSION_SEPARATOR)
                .map((p) => p.trim())
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b))

const getPluralized = (count, singular, plural) => (count === 1 ? singular : plural)

/**
 * Manages roles CRUD: fetching all roles with user counts, creating/updating/deleting roles,
 * assigning/removing role-user associations, and IT access permission checks.
 */
export function useRolesData() {
    const [roles, setRoles] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [hasITAccess, setHasITAccess] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const showMessage = useCallback((text, duration = SUCCESS_MESSAGE_DURATION_MS) => {
        setMessage(text)
        setTimeout(() => setMessage(''), duration)
    }, [])

    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError('')
        try {
            const user = await UserService.getCurrentUser()
            if (!user?.id) {
                setError('Unable to authenticate user')
                return
            }
            const userRoles = await UserService.getUserRoles(user.id)
            setHasITAccess(userRoles.some((role) => role.name === 'IT Access'))
            const allRoles = await UserService.getAllRoles()
            setRoles(allRoles.sort((a, b) => (b.weight || 0) - (a.weight || 0)))
        } catch (err) {
            setError('Failed to load roles. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [])

    const updateRolePermissions = useCallback(
        async (roleId, permissionsText) => {
            const sortedPermissions = parsePermissionsText(permissionsText)
            const { error: updateError } = await supabase
                .from('users_roles')
                .update({ permissions: sortedPermissions })
                .eq('id', roleId)
            if (updateError) throw updateError
            UserService.clearCache()
            await loadData()
            showMessage('Permissions updated successfully (duplicates removed, sorted alphabetically)')
        },
        [loadData, showMessage]
    )

    const updateRoleWeight = useCallback(
        async (roleId, weight) => {
            const { error: updateError } = await supabase.from('users_roles').update({ weight }).eq('id', roleId)
            if (updateError) throw updateError
            UserService.clearCache()
            await loadData()
            showMessage('Weight updated successfully')
        },
        [loadData, showMessage]
    )

    const createRole = useCallback(
        async (name, weight) => {
            const { error: createError } = await supabase
                .from('users_roles')
                .insert([{ name: name.trim(), permissions: [], weight }])
                .select()
            if (createError) throw createError
            UserService.clearCache()
            await loadData()
            showMessage(`Role "${name}" created successfully`)
        },
        [loadData, showMessage]
    )

    const bulkAddPermissions = useCallback(
        async (roleIds, permissionsText) => {
            const permissionsToAdd = parsePermissionsText(permissionsText)
            if (!permissionsToAdd.length) throw new Error('Please enter at least one permission node')

            let rolesModified = 0
            for (const roleId of roleIds) {
                const role = roles.find((r) => r.id === roleId)
                if (!role) continue
                const existingPermissions = Array.isArray(role.permissions) ? role.permissions : []
                const sortedPermissions = [...new Set([...existingPermissions, ...permissionsToAdd])].sort((a, b) =>
                    a.localeCompare(b)
                )
                if (JSON.stringify(existingPermissions.sort()) !== JSON.stringify(sortedPermissions)) {
                    const { error: updateError } = await supabase
                        .from('users_roles')
                        .update({ permissions: sortedPermissions })
                        .eq('id', roleId)
                    if (updateError) throw updateError
                    rolesModified++
                }
            }

            UserService.clearCache()
            await loadData()
            showMessage(
                `Successfully added ${permissionsToAdd.length} ${getPluralized(permissionsToAdd.length, 'permission', 'permissions')} to ${rolesModified} ${getPluralized(rolesModified, 'role', 'roles')}`,
                EXTENDED_MESSAGE_DURATION_MS
            )
        },
        [roles, loadData, showMessage]
    )

    const removePermissionFromRole = useCallback(
        async (permission, roleId) => {
            const role = roles.find((r) => r.id === roleId)
            if (!role) return
            const sortedPermissions = role.permissions
                .filter((p) => p !== permission)
                .sort((a, b) => a.localeCompare(b))
            const { error: updateError } = await supabase
                .from('users_roles')
                .update({ permissions: sortedPermissions })
                .eq('id', roleId)
            if (updateError) throw updateError
            UserService.clearCache()
            await loadData()
            showMessage(`Successfully removed "${permission}" from "${role.name}"`)
        },
        [roles, loadData, showMessage]
    )

    const removePermissionFromAllRoles = useCallback(
        async (permission, affectedRoles) => {
            let rolesModified = 0
            for (const { role } of affectedRoles) {
                if (!role.permissions.includes(permission)) continue
                const sortedPermissions = role.permissions
                    .filter((p) => p !== permission)
                    .sort((a, b) => a.localeCompare(b))
                const { error: updateError } = await supabase
                    .from('users_roles')
                    .update({ permissions: sortedPermissions })
                    .eq('id', role.id)
                if (updateError) throw updateError
                rolesModified++
            }
            UserService.clearCache()
            await loadData()
            showMessage(
                `Successfully removed "${permission}" from ${rolesModified} ${getPluralized(rolesModified, 'role', 'roles')}`,
                EXTENDED_MESSAGE_DURATION_MS
            )
        },
        [loadData, showMessage]
    )

    return {
        bulkAddPermissions,
        createRole,
        error,
        hasITAccess,
        isLoading,
        loadData,
        message,
        removePermissionFromAllRoles,
        removePermissionFromRole,
        roles,
        setError,
        updateRolePermissions,
        updateRoleWeight
    }
}
