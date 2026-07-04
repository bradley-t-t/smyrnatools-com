import { useEffect, useState } from 'react'

import { UserPreferencesService } from '../../services/UserPreferencesService'

/** Fetches the current app version string on mount. */
export function useVersion() {
    const [version, setVersion] = useState('')
    useEffect(() => {
        let mounted = true
        UserPreferencesService.getVersion().then((v) => {
            if (mounted) setVersion(v || '')
        })
        return () => {
            mounted = false
        }
    }, [])
    return version
}
export default useVersion
