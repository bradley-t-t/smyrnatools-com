import React, {useEffect, useRef, useState} from 'react'
import {PlantService} from '../../services/PlantService'
import {RegionService} from '../../services/RegionService'
import LoadingScreen from '../../components/common/LoadingScreen'
import '../../styles/FilterStyles.css'
import './styles/Plants.css'
import PlantsDetailView from './PlantsDetailView'
import PlantsAddView from './PlantsAddView'
import TopSection from '../../components/sections/TopSection'
import ListViewModeSection from '../../components/sections/ListViewModeSection'

function PlantsView({title = 'Plants'}) {
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
        async function fetchData() {
            setIsLoading(true)
            try {
                const [plantsData, regionsData] = await Promise.all([
                    PlantService.fetchPlants(),
                    RegionService.fetchRegions()
                ])
                setPlants(plantsData)
                setRegions(regionsData)

                const regionPlantsPromises = regionsData.map(r => RegionService.fetchRegionPlants(r.regionCode).catch(() => []))
                const regionPlantsResults = await Promise.all(regionPlantsPromises)
                const map = {}
                regionsData.forEach((region, index) => {
                    const plantsForRegion = regionPlantsResults[index] || []
                    plantsForRegion.forEach(p => {
                        map[p.plantCode] = region
                    })
                })
                setPlantRegionMap(map)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [])

    function handleSelectPlant(plantCode) {
        const plant = plants.find(p => (p.plant_code || p.plantCode) === plantCode)
        setSelectedPlant(plant)
    }

    function handlePlantAdded(newPlant) {
        setPlants(prev => [...prev, newPlant])
    }

    async function handlePlantDeleted(plantCode) {
        setPlants(prev => prev.filter(p => (p.plant_code || p.plantCode) !== plantCode))
        setSelectedPlant(null)
    }

    async function handlePlantUpdated(plantCode) {
        const updatedPlants = await PlantService.fetchPlants()
        setPlants(updatedPlants)
        setSelectedPlant(updatedPlants.find(p => (p.plant_code || p.plantCode) === plantCode) || null)
    }

    const filteredPlants = plants.filter(plant => {
        const normalizedSearch = searchText.trim().toLowerCase()
        const searchMatch = !normalizedSearch ||
            (plant.plant_name || plant.plantName || '').toLowerCase().includes(normalizedSearch) ||
            (plant.plant_code || plant.plantCode || '').toLowerCase().includes(normalizedSearch)
        const region = plantRegionMap[plant.plant_code || plant.plantCode]
        const regionMatch = !selectedRegion || selectedRegion === 'All Regions' || region?.regionCode === selectedRegion
        const plantType = region?.type === 'Concrete' ? 'Concrete Plant' : region?.type === 'Aggregate' ? 'Aggregate Location' : region?.type === 'Office' ? 'Office Location' : 'N/A'
        const plantTypeMatch = !selectedPlantType || selectedPlantType === 'All Types' || plantType === selectedPlantType
        return searchMatch && regionMatch && plantTypeMatch
    })

    const headerLabels = ['Plant Code', 'Name', 'Region', 'Plant Type']
    const colWidths = ['20%', '30%', '25%', '25%']

    const customFilters = (
        <>
            <div className="filter-wrapper">
                <select
                    className="ios-select"
                    value={selectedRegion}
                    onChange={e => setSelectedRegion(e.target.value)}
                    aria-label="Filter by region"
                >
                    <option value="">All Regions</option>
                    {regions.map(r => (
                        <option key={r.regionCode} value={r.regionCode}>
                            {r.regionName}
                        </option>
                    ))}
                </select>
            </div>
            <div className="filter-wrapper">
                <select
                    className="ios-select"
                    value={selectedPlantType}
                    onChange={e => setSelectedPlantType(e.target.value)}
                    aria-label="Filter by Location Type"
                >
                    <option value="">All Location Types</option>
                    <option value="Concrete Plant">Concrete Plant</option>
                    <option value="Aggregate Location">Aggregate Location</option>
                    <option value="Office Location">Office Location</option>
                </select>
            </div>
        </>
    )

    const showReset = !!(searchText || selectedRegion || selectedPlantType)
    const onReset = () => {
        setSearchText('')
        setSelectedRegion('')
        setSelectedPlantType('')
    }

    return (
        <div className="global-dashboard-container dashboard-container plants-view">
            {selectedPlant ? (
                <PlantsDetailView
                    plant={selectedPlant}
                    onClose={() => setSelectedPlant(null)}
                    onDelete={handlePlantDeleted}
                    onUpdate={handlePlantUpdated}
                />
            ) : (
                <>
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
                        listLabels={headerLabels}
                        colWidths={colWidths}
                        customFilters={customFilters}
                        showReset={showReset}
                        onReset={onReset}
                        hidePlantFilter={true}
                    />
                    <div className="global-content-container content-container">
                        {isLoading ? (
                            <div className="global-loading-container loading-container">
                                <LoadingScreen message="Loading plants..." inline={true}/>
                            </div>
                        ) : filteredPlants.length === 0 ? (
                            <div className="global-no-results-container no-results-container">
                                <div className="no-results-icon">
                                    <i className="fas fa-seedling"></i>
                                </div>
                                <h3>No Plants Found</h3>
                                <p>{searchText ? "No plants match your search criteria." : "There are no plants in the system yet."}</p>
                                <button className="global-primary-button primary-button"
                                        onClick={() => setShowAddSheet(true)}>Add Plant
                                </button>
                            </div>
                        ) : (
                            <ListViewModeSection
                                filteredItems={filteredPlants}
                                handleSelectItem={handleSelectPlant}
                                headerLabels={headerLabels}
                                colWidths={colWidths}
                                renderRow={(plant) => {
                                    const region = plantRegionMap[plant.plant_code || plant.plantCode]
                                    const regionName = region?.regionName || 'N/A'
                                    const plantType = region?.type === 'Concrete' ? 'Concrete Plant' : region?.type === 'Aggregate' ? 'Aggregate Location' : region?.type === 'Office' ? 'Office Location' : 'N/A'
                                    return (
                                        <tr key={plant.plant_code || plant.plantCode} style={{cursor: 'pointer'}}
                                            onClick={() => handleSelectPlant(plant.plant_code || plant.plantCode)}>
                                            <td style={{width: '20%'}}>{plant.plant_code || plant.plantCode}</td>
                                            <td style={{width: '30%'}}>{plant.plant_name || plant.plantName}</td>
                                            <td style={{width: '25%'}}>{regionName}</td>
                                            <td style={{width: '25%'}}>{plantType}</td>
                                        </tr>
                                    )
                                }}
                                containerClassName="plants-list-table-container"
                                tableClassName="plants-list-table"
                            />
                        )}
                    </div>
                    {showAddSheet && (
                        <PlantsAddView
                            onClose={() => setShowAddSheet(false)}
                            onPlantAdded={handlePlantAdded}
                        />
                    )}
                </>
            )}
        </div>
    )
}

export default PlantsView
