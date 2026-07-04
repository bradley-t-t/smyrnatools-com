/**
 * Returns a display name for a tractor by id from the supplied list.
 *
 * @param {string|null|undefined} tractorId
 * @param {Array<{id: string, truckNumber?: string}>} tractors
 * @returns {string}
 */
export function getTractorName(tractorId, tractors) {
    if (!tractorId || tractorId === '0') return 'None'
    const tractor = tractors.find((t) => t.id === tractorId)
    return tractor && tractor.truckNumber ? `Tractor #${tractor.truckNumber}` : 'Unknown'
}

/**
 * Returns a plant display name by plant code; falls back to the code itself.
 *
 * @param {string} plantCode
 * @param {Array<{plantCode: string, plantName?: string}>} plants
 * @returns {string}
 */
export function getPlantName(plantCode, plants) {
    const plant = plants.find((p) => p.plantCode === plantCode)
    return plant ? plant.plantName : plantCode
}
