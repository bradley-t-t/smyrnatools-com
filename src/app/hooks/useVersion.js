import { useEffect, useState } from 'react'

import { AppService } from '../../services/AppService'
/** Fetches the current app version string from AppService on mount. */
export function useVersion() {
    const [version, setVersion] = useState('')
    useEffect(() => {
        let mounted = true
        AppService.getVersion().then((v) => {
            if (mounted) setVersion(v || '')
        })
        return () => {
            mounted = false
        }
    }, [])
    return version
}
export default useVersion
