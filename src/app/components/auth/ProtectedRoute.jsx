import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { UserService } from '../../../services/UserService'
import { useAuth } from '../../context/AuthContext'

function ProtectedRoute({ children }) {
    const { user, loading, isAuthenticated } = useAuth()
    const location = useLocation()
    const [roles, setRoles] = useState(null)
    const [hasPlant, setHasPlant] = useState(null)

    useEffect(() => {
        let active = true

        async function loadRoles() {
            if (!user) return
            try {
                UserService.userRolesCache.delete(user.id)
                const r = await UserService.getUserRoles(user.id)
                if (active) setRoles(r || [])
            } catch {
                if (active) setRoles([])
            }
        }

        async function checkPlant() {
            if (!user) return
            try {
                const plant = await UserService.getUserPlant(user.id)
                const plantCode = (
                    typeof plant === 'string' ? plant : plant?.plant_code || plant?.plantCode || ''
                ).trim()
                if (active) setHasPlant(!!plantCode)
            } catch {
                if (active) setHasPlant(false)
            }
        }

        if (user && roles === null) loadRoles()
        if (user && hasPlant === null) checkPlant()
        return () => {
            active = false
        }
    }, [user, roles, hasPlant])

    if (loading) return null
    if (!isAuthenticated || !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
    if (roles === null || hasPlant === null) return null

    const isTerminated = roles.some((r) => (r?.name || '').toLowerCase() === 'terminated')
    if (isTerminated) return null

    const guestOnly = roles.length > 0 && roles.every((r) => (r?.name || '').toLowerCase() === 'guest')
    const onGuestRoute = location.pathname === '/guest'
    if (guestOnly && !onGuestRoute) {
        const reason = 'pending'
        return <Navigate to="/guest" replace state={{ reason }} />
    }
    if (!guestOnly && onGuestRoute) return <Navigate to="/" replace />
    return children
}

export default ProtectedRoute
