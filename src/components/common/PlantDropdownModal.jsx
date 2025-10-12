import React, {useState} from 'react';
import './styles/PlantDropdownModal.css';

function PlantDropdownModal({isOpen, onClose, plants, onSelect, searchPlaceholder = "Search plants...", showAllPlants = false}) {
    const [search, setSearch] = useState('');

    const filteredPlants = plants.filter(plant => {
        const code = plant.plantCode || plant.plant_code || '';
        const name = plant.plantName || plant.plant_name || '';
        return code.toLowerCase().includes(search.toLowerCase()) || name.toLowerCase().includes(search.toLowerCase());
    });

    if (!isOpen) return null;

    return (
        <div className="plant-dropdown-modal-overlay" onClick={onClose}>
            <div className="plant-dropdown-modal" onClick={e => e.stopPropagation()}>
                <div className="plant-dropdown-modal-header">
                    <h2>Select Plant</h2>
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
                    {showAllPlants && (
                        <div className="plant-option" onClick={() => {
                            onSelect('');
                            onClose();
                        }}>All Plants
                        </div>
                    )}
                    {filteredPlants
                        .sort((a, b) => parseInt((a.plantCode || a.plant_code || '').replace(/\D/g, '') || '0') - parseInt((b.plantCode || b.plant_code || '').replace(/\D/g, '') || '0'))
                        .map(plant => (
                            <div key={plant.plantCode || plant.plant_code} className="plant-option" onClick={() => {
                                onSelect(plant.plantCode || plant.plant_code);
                                onClose();
                            }}>
                                ({plant.plantCode || plant.plant_code}) {plant.plantName || plant.plant_name}
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}

export default PlantDropdownModal;
