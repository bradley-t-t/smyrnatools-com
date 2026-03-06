import React, { useEffect, useRef, useState } from 'react'

import LoadingScreen from '../../app/components/common/LoadingScreen'
import RegionsAddView from '../../app/components/regions/RegionsAddView'
import RegionsDetailView from '../../app/components/regions/RegionsDetailView'
import TopSection from '../../app/components/sections/TopSection'
import { RegionService } from '../../services/RegionService'

/**
 * List view for all regions. Supports search by name/code/type, type filter
 * (Concrete/Aggregate/Office), and drill-down into RegionsDetailView for
 * editing region properties and managing assigned plants.
 */
function RegionsView({ title = 'Regions' }) {
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
        const region = regions.find((r) => (r.region_code || r.regionCode) === regionCode)
        setSelectedRegion(region)
    }

    function handleRegionAdded(newRegion) {
        setRegions((prev) => [...prev, newRegion])
    }

    async function handleRegionDeleted(regionCode) {
        setRegions((prev) => prev.filter((r) => (r.region_code || r.regionCode) !== regionCode))
        setSelectedRegion(null)
    }

    async function handleRegionUpdated(regionCode) {
        const updatedRegions = await RegionService.fetchRegions()
        setRegions(updatedRegions)
        setSelectedRegion(updatedRegions.find((r) => (r.region_code || r.regionCode) === regionCode) || null)
    }

    const filteredRegions = regions.filter((region) => {
        const normalizedSearch = searchText.trim().toLowerCase()
        const name = (region.region_name || region.regionName || '').toLowerCase()
        const code = (region.region_code || region.regionCode || '').toLowerCase()
        const type = (region.type || region.region_type || '').toLowerCase()
        const searchMatch =
            !normalizedSearch ||
            name.includes(normalizedSearch) ||
            code.includes(normalizedSearch) ||
            type.includes(normalizedSearch)
        const typeMatch = !selectedType || selectedType === 'All Types' || region.type === selectedType
        return searchMatch && typeMatch
    })

    const selectStyle = {
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

    const customFilters = (
        <select style={selectStyle} value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option value="">All Types</option>
            <option value="Concrete">Concrete</option>
            <option value="Aggregate">Aggregate</option>
            <option value="Office">Office</option>
        </select>
    )

    const showReset = !!(searchText || selectedType)
    const onReset = () => {
        setSearchText('')
        setSelectedType('')
    }

    return (
        <div className="min-h-screen bg-slate-50">
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
                        listLabels={['Region Code', 'Name', 'Type']}
                        colWidths={['25%', '50%', '25%']}
                        customFilters={customFilters}
                        showReset={showReset}
                        onReset={onReset}
                        hidePlantFilter={true}
                    />
                    <div className="px-6 py-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <LoadingScreen message="Loading regions..." inline={true} />
                            </div>
                        ) : filteredRegions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                    <i className="fas fa-map-marker-alt text-3xl text-slate-400"></i>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">No Regions Found</h3>
                                <p className="text-slate-500 mb-6 max-w-md">
                                    {searchText
                                        ? 'No regions match your search criteria.'
                                        : 'There are no regions in the system yet.'}
                                </p>
                                <button
                                    className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors"
                                    onClick={() => setShowAddSheet(true)}
                                >
                                    Add Region
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-200 overflow-hidden">
                                <table className="w-full">
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredRegions.map((region, index) => {
                                            const regionType = region.type || region.region_type || ''
                                            return (
                                                <tr
                                                    key={region.region_code || region.regionCode}
                                                    className={`cursor-pointer hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                                                    onClick={() =>
                                                        handleSelectRegion(region.region_code || region.regionCode)
                                                    }
                                                >
                                                    <td className="px-5 py-4 text-sm font-bold text-accent">
                                                        {region.region_code || region.regionCode}
                                                    </td>
                                                    <td className="px-5 py-4 text-sm font-medium text-slate-800">
                                                        {region.region_name || region.regionName}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span
                                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                                regionType === 'Concrete'
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : regionType === 'Aggregate'
                                                                      ? 'bg-amber-100 text-amber-700'
                                                                      : regionType === 'Office'
                                                                        ? 'bg-purple-100 text-purple-700'
                                                                        : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                        >
                                                            {regionType || 'N/A'}
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
                    {showAddSheet && (
                        <RegionsAddView onClose={() => setShowAddSheet(false)} onRegionAdded={handleRegionAdded} />
                    )}
                </>
            )}
        </div>
    )
}

export default RegionsView
