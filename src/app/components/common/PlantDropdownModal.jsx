import React, { useState } from 'react'
import ReactDOM from 'react-dom'

function PlantDropdownModal({
    isOpen,
    onClose,
    plants = [],
    onSelect,
    searchPlaceholder = 'Search plants...',
    showAllPlants = false,
    allowMultiple = false,
    selectedPlantCodes = []
}) {
    const [search, setSearch] = useState('')
    const [localSelectedCodes, setLocalSelectedCodes] = useState(selectedPlantCodes || [])

    const filteredPlants = plants.filter((plant) => {
        const code = plant.plantCode || plant.plant_code || ''
        const name = plant.plantName || plant.plant_name || ''
        return code.toLowerCase().includes(search.toLowerCase()) || name.toLowerCase().includes(search.toLowerCase())
    })

    const handlePlantClick = (code) => {
        if (allowMultiple) {
            if (localSelectedCodes.includes(code)) {
                setLocalSelectedCodes((prev) => prev.filter((c) => c !== code))
            } else {
                setLocalSelectedCodes((prev) => [...prev, code])
            }
            onSelect(code)
        } else {
            onSelect(code)
            onClose()
        }
    }

    const handleDone = () => {
        onClose()
    }

    if (!isOpen) return null

    if (typeof document === 'undefined' || !document.body) {
        return null
    }

    const overlayStyle = {
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        left: 0,
        position: 'fixed',
        right: 0,
        top: 0,
        zIndex: 10000
    }

    const modalStyle = {
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '80vh',
        maxWidth: '400px',
        overflow: 'hidden',
        width: '90%'
    }

    const headerStyle = {
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e5e7eb',
        borderRadius: '16px 16px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        padding: '16px 20px'
    }

    const titleStyle = {
        color: '#1e3a5f',
        fontSize: '18px',
        fontWeight: 600,
        margin: 0
    }

    const closeButtonStyle = {
        alignItems: 'center',
        background: 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: '#64748b',
        cursor: 'pointer',
        display: 'flex',
        fontSize: '16px',
        height: '32px',
        justifyContent: 'center',
        width: '32px'
    }

    const searchWrapperStyle = {
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 16px',
        position: 'relative'
    }

    const searchInputStyle = {
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        boxSizing: 'border-box',
        fontSize: '14px',
        outline: 'none',
        padding: '12px 16px 12px 40px',
        width: '100%'
    }

    const searchIconStyle = {
        color: '#94a3b8',
        fontSize: '14px',
        left: '28px',
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)'
    }

    const listStyle = {
        backgroundColor: 'white',
        flex: 1,
        overflowY: 'auto',
        padding: '8px'
    }

    const optionStyle = (isSelected) => ({
        alignItems: 'center',
        backgroundColor: isSelected ? '#f0f7ff' : 'transparent',
        borderRadius: '10px',
        color: '#374151',
        cursor: 'pointer',
        display: 'flex',
        fontSize: '14px',
        fontWeight: isSelected ? 600 : 400,
        gap: '12px',
        padding: '12px 16px',
        transition: 'background-color 0.15s'
    })

    const checkboxStyle = {
        accentColor: '#1e3a5f',
        height: '18px',
        width: '18px'
    }

    const footerStyle = {
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e5e7eb',
        padding: '12px 16px'
    }

    const doneButtonStyle = {
        backgroundColor: '#1e3a5f',
        border: 'none',
        borderRadius: '10px',
        color: 'white',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 600,
        padding: '12px 20px',
        width: '100%'
    }

    return ReactDOM.createPortal(
        <div style={overlayStyle} onClick={allowMultiple ? undefined : onClose}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                <div style={headerStyle}>
                    <h2 style={titleStyle}>{allowMultiple ? 'Select Plants' : 'Select Plant'}</h2>
                    <button onClick={onClose} style={closeButtonStyle}>
                        <i className="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
                <div style={searchWrapperStyle}>
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={searchInputStyle}
                    />
                    <i className="fas fa-search" style={searchIconStyle} aria-hidden="true"></i>
                </div>
                <div style={listStyle}>
                    {showAllPlants && !allowMultiple && (
                        <div
                            style={optionStyle(false)}
                            onClick={() => {
                                onSelect('All')
                                onClose()
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                            <span style={{ color: '#374151' }}>All Plants</span>
                        </div>
                    )}
                    {filteredPlants
                        .sort(
                            (a, b) =>
                                parseInt((a.plantCode || a.plant_code || '').replace(/\D/g, '') || '0') -
                                parseInt((b.plantCode || b.plant_code || '').replace(/\D/g, '') || '0')
                        )
                        .map((plant) => {
                            const code = plant.plantCode || plant.plant_code
                            const isSelected = allowMultiple && localSelectedCodes.includes(code)
                            return (
                                <div
                                    key={code}
                                    style={optionStyle(isSelected)}
                                    onClick={() => handlePlantClick(code)}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9'
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                                    }}
                                >
                                    {allowMultiple && (
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}}
                                            style={checkboxStyle}
                                        />
                                    )}
                                    <span style={{ color: '#374151' }}>
                                        ({code}) {plant.plantName || plant.plant_name}
                                    </span>
                                </div>
                            )
                        })}
                </div>
                {allowMultiple && (
                    <div style={footerStyle}>
                        <button onClick={handleDone} style={doneButtonStyle}>
                            Done ({localSelectedCodes.length} selected)
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}

export default PlantDropdownModal
