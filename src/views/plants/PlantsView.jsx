import React, { useEffect, useRef, useState } from 'react'

import LoadingScreen from '../../components/common/LoadingScreen'
import TopSection from '../../components/sections/TopSection'
import { PlantService } from '../../services/PlantService'
import { RegionService } from '../../services/RegionService'
import PlantsAddView from './PlantsAddView'
import PlantsDetailView from './PlantsDetailView'

const REGION_TYPE_TO_PLANT_TYPE = {
    Aggregate: 'Aggregate Location',
    Concrete: 'Concrete Plant',
    Office: 'Office Location'
}

const PLANT_TYPE_OPTIONS = ['Concrete Plant', 'Aggregate Location', 'Office Location']

const getPlantCode = (plant) => plant?.plant_code || plant?.plantCode || ''
const getPlantName = (plant) => plant?.plant_name || plant?.plantName || ''
const getPlantType = (region) => REGION_TYPE_TO_PLANT_TYPE[region?.type] || 'N/A'

const PLANT_TYPE_BADGE_CLASSES = {
    'Aggregate Location': 'bg-amber-100 text-amber-700',
    'Concrete Plant': 'bg-blue-100 text-blue-700',
    'Office Location': 'bg-purple-100 text-purple-700'
}

const SELECT_STYLE = {
    appearance: 'none',
    backgroundColor: '#f8fafc',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundPosition: 'right 12px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '18px',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    color: '#1e293b',
    cursor: 'pointer',
    fontSize: '14px',
    minWidth: '140px',
    padding: '12px 40px 12px 16px'
}

function PlantsView({ title = 'Plants' }) {
    const [plants, setPlants] = useState([])
    const [regions, setRegions] = useState([])
    const [plantRegionMap, setPlantRegionMap] = useState({})
    const [isLoading, setIsLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [selectedPlant, setSelectedPlant] = useState(null)
    const [selectedRegion, setSelectedRegion] = useState('')
    const [selectedPlantType, setSelectedPlantType] = useState('')
    const headerRef = useRef(null)

    useEffect(() => {
        ;(async () => {
            setIsLoading(true)
            try {
                const [plantsData, regionsData] = await Promise.all([
                    PlantService.fetchPlants(),
                    RegionService.fetchRegions()
                ])
                setPlants(plantsData)
                setRegions(regionsData)

                const regionPlantsResults = await Promise.all(
                    regionsData.map((r) => RegionService.fetchRegionPlants(r.regionCode).catch(() => []))
                )
                const map = {}
                regionsData.forEach((region, index) => {
                    ;(regionPlantsResults[index] || []).forEach((p) => {
                        map[p.plantCode] = region
                    })
                })
                setPlantRegionMap(map)
            } finally {
                setIsLoading(false)
            }
        })()
    }, [])

    const handleSelectPlant = (plantCode) => setSelectedPlant(plants.find((p) => getPlantCode(p) === plantCode))

    const handlePlantAdded = (newPlant) => setPlants((prev) => [...prev, newPlant])

    const handlePlantDeleted = (plantCode) => {
        setPlants((prev) => prev.filter((p) => getPlantCode(p) !== plantCode))
        setSelectedPlant(null)
    }

    const handlePlantUpdated = async (plantCode) => {
        const updatedPlants = await PlantService.fetchPlants()
        setPlants(updatedPlants)
        setSelectedPlant(updatedPlants.find((p) => getPlantCode(p) === plantCode) || null)
    }

    const filteredPlants = plants.filter((plant) => {
        const normalizedSearch = searchText.trim().toLowerCase()
        const code = getPlantCode(plant)
        const name = getPlantName(plant)
        const searchMatch =
            !normalizedSearch ||
            name.toLowerCase().includes(normalizedSearch) ||
            code.toLowerCase().includes(normalizedSearch)
        const region = plantRegionMap[code]
        const regionMatch = !selectedRegion || selectedRegion === 'All Regions' || region?.regionCode === selectedRegion
        const plantType = getPlantType(region)
        const plantTypeMatch =
            !selectedPlantType || selectedPlantType === 'All Types' || plantType === selectedPlantType
        return searchMatch && regionMatch && plantTypeMatch
    })

    const resetFilters = () => {
        setSearchText('')
        setSelectedRegion('')
        setSelectedPlantType('')
    }

    const customFilters = (
        <>
            <select style={SELECT_STYLE} value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
                <option value="">All Regions</option>
                {regions.map((r) => (
                    <option key={r.regionCode} value={r.regionCode}>
                        {r.regionName}
                    </option>
                ))}
            </select>
            <select
                style={SELECT_STYLE}
                value={selectedPlantType}
                onChange={(e) => setSelectedPlantType(e.target.value)}
            >
                <option value="">All Location Types</option>
                {PLANT_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                        {type}
                    </option>
                ))}
            </select>
        </>
    )

    if (selectedPlant) {
        return (
            <div className="min-h-screen bg-slate-50">
                <PlantsDetailView
                    plant={selectedPlant}
                    onClose={() => setSelectedPlant(null)}
                    onDelete={handlePlantDeleted}
                    onUpdate={handlePlantUpdated}
                />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <TopSection
                title={title}
                addButtonLabel="Add Plant"
                onAddClick={() => setShowAddSheet(true)}
                searchInput={searchText}
                onSearchInputChange={setSearchText}
                onClearSearch={() => setSearchText('')}
                searchPlaceholder="Search by plant name or code..."
                forwardedRef={headerRef}
                hideViewModeToggle={true}
                viewMode="list"
                listLabels={['Plant Code', 'Name', 'Region', 'Type']}
                colWidths={['20%', '30%', '25%', '25%']}
                customFilters={customFilters}
                showReset={!!(searchText || selectedRegion || selectedPlantType)}
                onReset={resetFilters}
                hidePlantFilter={true}
            />
            <div className="px-6 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <LoadingScreen message="Loading plants..." inline={true} />
                    </div>
                ) : !filteredPlants.length ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <i className="fas fa-industry text-3xl text-slate-400"></i>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No Plants Found</h3>
                        <p className="text-slate-500 mb-6 max-w-md">
                            {searchText
                                ? 'No plants match your search criteria.'
                                : 'There are no plants in the system yet.'}
                        </p>
                        <button
                            className="px-5 py-2.5 bg-[#1e3a5f] hover:bg-[#152d4a] text-white font-semibold rounded-lg transition-colors"
                            onClick={() => setShowAddSheet(true)}
                        >
                            Add Plant
                        </button>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 overflow-hidden">
                        <table className="w-full">
                            <tbody className="divide-y divide-slate-100">
                                {filteredPlants.map((plant, index) => {
                                    const code = getPlantCode(plant)
                                    const region = plantRegionMap[code]
                                    const plantType = getPlantType(region)
                                    const badgeClass =
                                        PLANT_TYPE_BADGE_CLASSES[plantType] || 'bg-slate-100 text-slate-600'
                                    return (
                                        <tr
                                            key={code}
                                            className={`cursor-pointer hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                                            onClick={() => handleSelectPlant(code)}
                                        >
                                            <td className="px-5 py-4 text-sm font-bold text-[#1e3a5f]">{code}</td>
                                            <td className="px-5 py-4 text-sm font-medium text-slate-800">
                                                {getPlantName(plant)}
                                            </td>
                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {region?.regionName || 'N/A'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`}
                                                >
                                                    {plantType}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {showAddSheet && <PlantsAddView onClose={() => setShowAddSheet(false)} onPlantAdded={handlePlantAdded} />}
        </div>
    )
}

export default PlantsView
