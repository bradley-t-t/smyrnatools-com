import React, {useState} from 'react';
import ReactDOM from 'react-dom';

function PlantDropdownModal({
                                isOpen,
                                onClose,
                                plants = [],
                                onSelect,
                                searchPlaceholder = "Search plants...",
                                showAllPlants = false,
                                allowMultiple = false,
                                selectedPlantCodes = []
                            }) {
    const [search, setSearch] = useState('');
    const [localSelectedCodes, setLocalSelectedCodes] = useState(selectedPlantCodes || []);

    const filteredPlants = plants.filter(plant => {
        const code = plant.plantCode || plant.plant_code || '';
        const name = plant.plantName || plant.plant_name || '';
        return code.toLowerCase().includes(search.toLowerCase()) || name.toLowerCase().includes(search.toLowerCase());
    });

    const handlePlantClick = (code) => {
        if (allowMultiple) {
            if (localSelectedCodes.includes(code)) {
                setLocalSelectedCodes(prev => prev.filter(c => c !== code));
            } else {
                setLocalSelectedCodes(prev => [...prev, code]);
            }
            onSelect(code);
        } else {
            onSelect(code);
            onClose();
        }
    };

    const handleDone = () => {
        onClose();
    };

    if (!isOpen) return null;

    if (typeof document === 'undefined' || !document.body) {
        return null;
    }

    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
    };

    const modalStyle = {
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '400px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden'
    };

    const headerStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f8fafc',
        borderRadius: '16px 16px 0 0'
    };

    const titleStyle = {
        fontSize: '18px',
        fontWeight: 600,
        color: '#1e3a5f',
        margin: 0
    };

    const closeButtonStyle = {
        width: '32px',
        height: '32px',
        border: 'none',
        background: 'transparent',
        color: '#64748b',
        cursor: 'pointer',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px'
    };

    const searchWrapperStyle = {
        position: 'relative',
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb'
    };

    const searchInputStyle = {
        width: '100%',
        padding: '12px 16px 12px 40px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box'
    };

    const searchIconStyle = {
        position: 'absolute',
        left: '28px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#94a3b8',
        fontSize: '14px'
    };

    const listStyle = {
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
        backgroundColor: 'white'
    };

    const optionStyle = (isSelected) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '10px',
        cursor: 'pointer',
        backgroundColor: isSelected ? '#f0f7ff' : 'transparent',
        color: '#374151',
        fontSize: '14px',
        fontWeight: isSelected ? 600 : 400,
        transition: 'background-color 0.15s'
    });

    const checkboxStyle = {
        width: '18px',
        height: '18px',
        accentColor: '#1e3a5f'
    };

    const footerStyle = {
        padding: '12px 16px',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#f8fafc'
    };

    const doneButtonStyle = {
        width: '100%',
        padding: '12px 20px',
        backgroundColor: '#1e3a5f',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer'
    };

    return ReactDOM.createPortal(
        <div style={overlayStyle} onClick={allowMultiple ? undefined : onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
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
                        onChange={e => setSearch(e.target.value)}
                        style={searchInputStyle}
                    />
                    <i className="fas fa-search" style={searchIconStyle} aria-hidden="true"></i>
                </div>
                <div style={listStyle}>
                    {showAllPlants && !allowMultiple && (
                        <div
                            style={optionStyle(false)}
                            onClick={() => {
                                onSelect('All');
                                onClose();
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <span style={{color: '#374151'}}>All Plants</span>
                        </div>
                    )}
                    {filteredPlants
                        .sort((a, b) => parseInt((a.plantCode || a.plant_code || '').replace(/\D/g, '') || '0') - parseInt((b.plantCode || b.plant_code || '').replace(/\D/g, '') || '0'))
                        .map(plant => {
                            const code = plant.plantCode || plant.plant_code;
                            const isSelected = allowMultiple && localSelectedCodes.includes(code);
                            return (
                                <div
                                    key={code}
                                    style={optionStyle(isSelected)}
                                    onClick={() => handlePlantClick(code)}
                                    onMouseEnter={e => {
                                        if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9'
                                    }}
                                    onMouseLeave={e => {
                                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                                    }}
                                >
                                    {allowMultiple && (
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {
                                            }}
                                            style={checkboxStyle}
                                        />
                                    )}
                                    <span
                                        style={{color: '#374151'}}>({code}) {plant.plantName || plant.plant_name}</span>
                                </div>
                            );
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
    );
}

export default PlantDropdownModal;