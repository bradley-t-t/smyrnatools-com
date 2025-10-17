import React, {useEffect, useRef, useState} from 'react'
import {RegionService} from '../../services/RegionService'
import LoadingScreen from '../../components/common/LoadingScreen'
import '../../styles/FilterStyles.css'
import './styles/Regions.css'
import RegionsDetailView from './RegionsDetailView'
import RegionsAddView from './RegionsAddView'
import TopSection from '../../components/sections/TopSection'
import ListViewModeSection from '../../components/sections/ListViewModeSection'

function RegionsView({title = 'Regions'}) {
    const [regions, setRegions] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchText, setSearchText] = useState('')
    const [showAddSheet, setShowAddSheet] = useState(false)
    const [selectedRegion, setSelectedRegion] = useState(null)
    const [selectedType, setSelectedType] = useState('')
    const headerRef = useRef(null)

    useEffect(() => {
        async function fetchRegions() {
            setIsLoading(true)
            try {
                const data = await RegionService.fetchRegions()
                setRegions(data)
            } finally {
                setIsLoading(false)
            }
        }

        fetchRegions()
    }, [])

    function handleSelectRegion(regionCode) {
        const region = regions.find(r => (r.region_code || r.regionCode) === regionCode)
        setSelectedRegion(region)
    }

    function handleRegionAdded(newRegion) {
        setRegions(prev => [...prev, newRegion])
    }

    async function handleRegionDeleted(regionCode) {
        setRegions(prev => prev.filter(r => (r.region_code || r.regionCode) !== regionCode))
        setSelectedRegion(null)
    }

    async function handleRegionUpdated(regionCode) {
        const updatedRegions = await RegionService.fetchRegions()
        setRegions(updatedRegions)
        setSelectedRegion(updatedRegions.find(r => (r.region_code || r.regionCode) === regionCode) || null)
    }

    const filteredRegions = regions.filter(region => {
        const normalizedSearch = searchText.trim().toLowerCase()
        const name = (region.region_name || region.regionName || '').toLowerCase()
        const code = (region.region_code || region.regionCode || '').toLowerCase()
        const type = (region.type || region.region_type || '').toLowerCase()
        const searchMatch = !normalizedSearch || name.includes(normalizedSearch) || code.includes(normalizedSearch) || type.includes(normalizedSearch)
        const typeMatch = !selectedType || selectedType === 'All Types' || region.type === selectedType
        return searchMatch && typeMatch
    })

    const headerLabels = ['Region Code', 'Name', 'Type']
    const colWidths = ['25%', '50%', '25%']

    const customFilters = (
        <div className="filter-wrapper">
            <select
                className="ios-select"
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                aria-label="Filter by region type"
            >
                <option value="">All Types</option>
                <option value="Concrete">Concrete</option>
                <option value="Aggregate">Aggregate</option>
                <option value="Office">Office</option>
            </select>
        </div>
    )

    const showReset = !!(searchText || selectedType)
    const onReset = () => {
        setSearchText('')
        setSelectedType('')
    }

    return (
        <div className="global-dashboard-container dashboard-container regions-view">
            {selectedRegion ? (
                <RegionsDetailView
                    region={selectedRegion}
                    onClose={() => setSelectedRegion(null)}
                    onDelete={handleRegionDeleted}
                    onUpdate={handleRegionUpdated}
                />
            ) : (
                <>
                    <TopSection
                        title={title}
                        addButtonLabel="Add Region"
                        onAddClick={() => setShowAddSheet(true)}
                        searchInput={searchText}
                        onSearchInputChange={setSearchText}
                        onClearSearch={() => setSearchText('')}
                        searchPlaceholder="Search by region name, code, or type..."
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
                                <LoadingScreen message="Loading regions..." inline={true}/>
                            </div>
                        ) : filteredRegions.length === 0 ? (
                            <div className="global-no-results-container no-results-container">
                                <div className="no-results-icon">
                                    <i className="fas fa-globe"></i>
                                </div>
                                <h3>No Regions Found</h3>
                                <p>{searchText ? "No regions match your search criteria." : "There are no regions in the system yet."}</p>
                                <button className="global-primary-button primary-button"
                                        onClick={() => setShowAddSheet(true)}>Add Region
                                </button>
                            </div>
                        ) : (
                            <ListViewModeSection
                                filteredItems={filteredRegions}
                                handleSelectItem={handleSelectRegion}
                                headerLabels={headerLabels}
                                colWidths={colWidths}
                                renderRow={(region) => (
                                    <tr key={region.region_code || region.regionCode} style={{cursor: 'pointer'}}
                                        onClick={() => handleSelectRegion(region.region_code || region.regionCode)}>
                                        <td style={{width: '25%'}}>{region.region_code || region.regionCode}</td>
                                        <td style={{width: '50%'}}>{region.region_name || region.regionName}</td>
                                        <td style={{width: '25%'}}>{region.type || region.region_type || ''}</td>
                                    </tr>
                                )}
                                containerClassName="regions-list-table-container"
                                tableClassName="regions-list-table"
                            />
                        )}
                    </div>
                    {showAddSheet && (
                        <RegionsAddView
                            onClose={() => setShowAddSheet(false)}
                            onRegionAdded={handleRegionAdded}
                        />
                    )}
                </>
            )}
        </div>
    )
}

export default RegionsView
