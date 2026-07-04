import { useEffect, useState } from 'react'

import { UserService } from '../../services/UserService'

export function usePlantPermissions({ itemAssignedPlant, canEdit, restrictionWarning, onCanEditChange }) {
    const [_canEdit, setCanEdit] = useState(canEdit)
    const [warning, setWarning] = useState(restrictionWarning)
    useEffect(() => {
        if (itemAssignedPlant === undefined) {
            setCanEdit(canEdit)
            setWarning(restrictionWarning)
            onCanEditChange?.(canEdit)
            return
        }
        const checkPlantPermission = async () => {
            try {
                const user = await UserService.getCurrentUser()
                const uid = user?.id || user
                if (!uid || uid === '0' || uid === 0) {
                    setCanEdit(true)
                    setWarning(null)
                    onCanEditChange?.(true)
                    return
                }
                const bypass = await UserService.hasPermission(uid, 'detailview.bypass.plantrestriction')
                if (bypass) {
                    setCanEdit(true)
                    setWarning(null)
                    onCanEditChange?.(true)
                    return
                }
                const profile = await UserService.getUserPlant(uid)
                const code = typeof profile === 'string' ? profile : profile?.plant_code || profile?.plantCode
                if (code && itemAssignedPlant) {
                    const same = code === itemAssignedPlant
                    setCanEdit(same)
                    setWarning(same ? null : `This item belongs to plant ${itemAssignedPlant}.`)
                    onCanEditChange?.(same)
                } else {
                    setCanEdit(true)
                    setWarning(null)
                    onCanEditChange?.(true)
                }
            } catch {
                setCanEdit(true)
                setWarning(null)
                onCanEditChange?.(true)
            }
        }
        checkPlantPermission()
    }, [itemAssignedPlant, canEdit, restrictionWarning, onCanEditChange])
    return { canEdit: _canEdit, warning }
}
