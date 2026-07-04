import { useEffect, useState } from 'react'

import { UserService } from '../../services/UserService'

export function useRegionTransfer({ assetType, onRegionTransfer }) {
    const [showTransfer, setShowTransfer] = useState(false)
    const [hasTransferPerm, setHasTransferPerm] = useState(false)
    const [regions, setRegions] = useState([])
    const [targetRegion, setTargetRegion] = useState('')
    const [targetPlant, setTargetPlant] = useState('')
    const [plants, setPlants] = useState([])
    const [transferring, setTransferring] = useState(false)
    const [transferErr, setTransferErr] = useState('')
    useEffect(() => {
        const checkTransferPerm = async () => {
            try {
                const user = await UserService.getCurrentUser()
                const uid = user?.id || user
                if (!uid) return setHasTransferPerm(false)
                const has = await UserService.hasPermission(uid, 'detailview.regiontransfer')
                setHasTransferPerm(!!has)
            } catch {
                setHasTransferPerm(false)
            }
        }
        checkTransferPerm()
    }, [])
    useEffect(() => {
        if (!showTransfer || !hasTransferPerm) return
        const loadRegions = async () => {
            try {
                const { PlantService } = await import('../../services/PlantService')
                setRegions((await PlantService.fetchRegions()) || [])
            } catch {
                setTransferErr('Failed to load regions')
            }
        }
        loadRegions()
    }, [showTransfer, hasTransferPerm])
    useEffect(() => {
        if (!targetRegion) {
            setPlants([])
            return
        }
        const loadPlants = async () => {
            try {
                const { PlantService } = await import('../../services/PlantService')
                setPlants((await PlantService.fetchRegionPlants(targetRegion)) || [])
                setTargetPlant('')
            } catch {
                setPlants([])
            }
        }
        loadPlants()
    }, [targetRegion])
    const openTransfer = () => {
        setShowTransfer(true)
        setTargetRegion('')
        setTargetPlant('')
        setPlants([])
        setTransferErr('')
    }
    const closeTransfer = () => {
        setShowTransfer(false)
        setTargetRegion('')
        setTargetPlant('')
        setPlants([])
        setTransferErr('')
    }
    const doTransfer = async () => {
        if (!targetRegion) return setTransferErr('Select a region')
        if (!targetPlant) return setTransferErr('Select a plant')
        const reg = regions.find((r) => r.regionCode === targetRegion)
        if (!reg) return setTransferErr('Invalid region')
        if (assetType === 'mixer' && reg.type === 'Aggregate')
            return setTransferErr('Cannot transfer mixers to Aggregate')
        if (reg.type === 'Office') return setTransferErr('Cannot transfer to Office')
        setTransferring(true)
        setTransferErr('')
        try {
            await onRegionTransfer?.(targetRegion, targetPlant)
            closeTransfer()
        } catch (e) {
            setTransferErr(e.message || 'Transfer failed')
        } finally {
            setTransferring(false)
        }
    }
    return {
        closeTransfer,
        doTransfer,
        hasTransferPerm,
        openTransfer,
        plants,
        regions,
        setTargetPlant,
        setTargetRegion,
        showTransfer,
        targetPlant,
        targetRegion,
        transferErr,
        transferring
    }
}
