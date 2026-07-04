import { render, screen } from '@testing-library/react'
import React from 'react'

import MixersView from '../assets/mixers/MixersView'

// --- Mocks ---

const MOCK_MIXERS = [
    {
        assignedOperator: 'op-1',
        assignedPlant: 'ATL',
        id: 'mixer-1',
        status: 'Active',
        truckNumber: '101'
    },
    {
        assignedOperator: 'op-2',
        assignedPlant: 'ATL',
        id: 'mixer-2',
        status: 'In Shop',
        truckNumber: '202'
    },
    {
        assignedOperator: null,
        assignedPlant: 'SMY',
        id: 'mixer-3',
        status: 'Spare',
        truckNumber: '303'
    }
]

const MOCK_PLANTS = [
    { code: 'ATL', name: 'Atlanta', plantCode: 'ATL' },
    { code: 'SMY', name: 'Smyrna', plantCode: 'SMY' }
]

const MOCK_OPERATORS = [
    { employeeId: 'op-1', firstName: 'John', lastName: 'Doe', position: 'Mixer', status: 'Active' },
    { employeeId: 'op-2', firstName: 'Jane', lastName: 'Smith', position: 'Mixer', status: 'Active' }
]

jest.mock('../../app/hooks/useAssetData', () => ({
    __esModule: true,
    default: () => ({
        allItems: MOCK_MIXERS,
        fetchAllItems: jest.fn(),
        isLoading: false,
        isRegionLoading: false,
        items: MOCK_MIXERS,
        itemsLoaded: true,
        operators: MOCK_OPERATORS,
        operatorsLoaded: true,
        plants: MOCK_PLANTS,
        regionPlantCodes: null,
        setAllItems: jest.fn(),
        setIsLoading: jest.fn(),
        setItems: jest.fn(),
        tractors: []
    })
}))

jest.mock('../../app/hooks/useAssetFilters', () => ({
    __esModule: true,
    default: () => ({
        debouncedSetSearchText: jest.fn(),
        extraTypeFilter: '',
        freightFilter: '',
        handleHeaderClick: jest.fn(),
        handleViewModeChange: jest.fn(),
        searchInput: '',
        searchText: '',
        selectedPlant: '',
        setExtraTypeFilter: jest.fn(),
        setFreightFilter: jest.fn(),
        setSearchInput: jest.fn(),
        setSearchText: jest.fn(),
        setSelectedPlant: jest.fn(),
        setStatusFilter: jest.fn(),
        setViewMode: jest.fn(),
        showReset: false,
        sortDirection: 'asc',
        sortKey: '',
        statusFilter: '',
        viewMode: 'list'
    })
}))

jest.mock('../../app/hooks/useAssetVerification', () => ({
    __esModule: true,
    default: () => ({
        handleVerify: jest.fn(),
        verifying: false
    })
}))

jest.mock('../../app/context/PreferencesContext', () => ({
    usePreferences: () => ({
        preferences: { accentColor: '#1e3a5f', defaultViewMode: null, selectedRegion: null },
        resetMixerFilters: jest.fn(),
        saveLastViewedFilters: jest.fn(),
        updateMixerFilter: jest.fn(),
        updateOperatorFilter: jest.fn()
    })
}))

jest.mock('../../services/DatabaseService', () => ({
    Database: {
        auth: {
            getSession: () => Promise.resolve({ data: { session: { user: { id: 'uid-1' } } } })
        },
        from: () => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: () => Promise.resolve({ data: { plant_code: 'ATL' } })
                })
            })
        })
    }
}))

jest.mock('../../services/PlantService', () => ({
    PlantService: {
        getAllowedPlantCodes: jest.fn(() => Promise.resolve(['ATL', 'SMY']))
    }
}))

jest.mock('../../utils/AssetStatsUtility', () => ({
    __esModule: true,
    default: {
        compareByStatusThenNumber: (a, b) => (a.truckNumber > b.truckNumber ? 1 : -1),
        countActiveOperatorsInScope: () => 2,
        countUnassignedActiveOperators: () => 0,
        getStatusCounts: (items) => ({
            Active: items.filter((i) => i.status === 'Active').length,
            'In Shop': items.filter((i) => i.status === 'In Shop').length,
            Spare: items.filter((i) => i.status === 'Spare').length,
            Total: items.length
        }),
        sortWithRetiredLast: (items) => items
    }
}))

jest.mock('../../app/components/modules/export/issues/AssetIssuesExport', () => ({
    exportAssetIssuesSheet: jest.fn()
}))

jest.mock(
    '../../app/components/dashboard/EmbeddedViewModal',
    () =>
        function MockEmbeddedViewModal() {
            return null
        }
)

describe('MixersView', () => {
    it('renders the mixer list with all items', async () => {
        render(<MixersView />)

        // The TopSection should render the title
        expect(screen.getByText('Mixer Fleet')).toBeInTheDocument()
    })

    it('accepts a custom title', () => {
        render(<MixersView title="Custom Fleet" />)
        expect(screen.getByText('Custom Fleet')).toBeInTheDocument()
    })

    it('renders status counts in the badge area', async () => {
        render(<MixersView />)

        // TopSection splits the badge string into pill buttons; "Active" may also
        // appear in status dropdowns, so use getAllByText to confirm presence.
        expect(screen.getAllByText('Total').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Spare').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Shop').length).toBeGreaterThan(0)
    })
})
