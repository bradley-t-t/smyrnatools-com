import React, {useState} from 'react';
import ReactDOM from 'react-dom';
import './styles/PlantDropdownModal.css';

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

    return ReactDOM.createPortal(
        <div className="plant-dropdown-modal-overlay" onClick={allowMultiple ? undefined : onClose}>
            <div className="plant-dropdown-modal" onClick={e => e.stopPropagation()}>
                <div className="plant-dropdown-modal-header">
                    <h2>{allowMultiple ? 'Select Plants' : 'Select Plant'}</h2>
                    <button onClick={onClose} className="plant-dropdown-modal-close">
                        <i className="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
                <div className="plant-dropdown-modal-search-wrapper">
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="plant-dropdown-modal-search"
                    />
                    <i className="fas fa-search plant-dropdown-modal-search-icon" aria-hidden="true"></i>
                </div>
                <div className="plant-dropdown-modal-list">
                    {showAllPlants && !allowMultiple && (
                        <div className="plant-option" onClick={() => {
                            onSelect('');
                            onClose();
                        }}>All Plants
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
                                    className={`plant-option ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handlePlantClick(code)}
                                >
                                    {allowMultiple && (
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {
                                            }}
                                            className="plant-checkbox"
                                        />
                                    )}
                                    <span>({code}) {plant.plantName || plant.plant_name}</span>
                                </div>
                            );
                        })}
                </div>
                {allowMultiple && (
                    <div className="plant-dropdown-modal-footer">
                        <button onClick={handleDone} className="plant-done-button">
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
