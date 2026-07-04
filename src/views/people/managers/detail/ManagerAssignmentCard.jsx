import React from 'react'

import Badge from '../../../../app/components/common/Badge'
import DetailViewSection from '../../../../app/components/sections/DetailViewSection'
import { DETAIL_SELECT_CLS } from '../../../../app/constants/detailFormClasses'

/**
 * "Assignment" card — primary plant, additional plants (multi-select chips),
 * and role dropdown. Pure presentational; all state lives in the parent.
 */
export default function ManagerAssignmentCard({
    plantDisplayText,
    onOpenPlantModal,
    additionalPlants,
    onOpenAdditionalPlantsModal,
    onRemoveAdditionalPlant,
    plants,
    roleName,
    onRoleNameChange,
    availableRoles,
    isReadOnly,
    canEditManager
}) {
    const readOnly = isReadOnly || !canEditManager
    return (
        <DetailViewSection.Card title="Assignment" icon="fas fa-building">
            <div className="form-group">
                <label>Plant</label>
                <button type="button"
                    className={`operator-select-button form-control text-left ${readOnly ? 'bg-bg-secondary opacity-80 cursor-not-allowed' : ''}`}
                    onClick={() => !readOnly && onOpenPlantModal()}
                    disabled={readOnly}
                >
                    <span className="block overflow-hidden text-ellipsis">{plantDisplayText}</span>
                </button>
            </div>
            <div className="form-group">
                <label>Additional Plants</label>
                <button type="button"
                    className={`operator-select-button form-control text-left ${readOnly ? 'bg-bg-secondary opacity-80 cursor-not-allowed' : ''}`}
                    onClick={() => !readOnly && onOpenAdditionalPlantsModal()}
                    disabled={readOnly}
                >
                    <span className="block overflow-hidden text-ellipsis">
                        {additionalPlants.length
                            ? additionalPlants
                                  .map((code) => {
                                      const p = plants.find((pl) => pl.plant_code === code)
                                      return `(${code}) ${p?.plant_name || ''}`
                                  })
                                  .join(', ')
                            : 'No additional plants'}
                    </span>
                </button>
                {additionalPlants.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {additionalPlants.map((code) => {
                            const p = plants.find((pl) => pl.plant_code === code)
                            return (
                                <Badge
                                    key={code}
                                    tone="accent"
                                    size="md"
                                    shape="pill"
                                    weight="medium"
                                    uppercase={false}
                                    removable={!readOnly}
                                    onRemove={() => onRemoveAdditionalPlant(code)}
                                >
                                    ({code}) {p?.plant_name || ''}
                                </Badge>
                            )
                        })}
                    </div>
                )}
            </div>
            <div className="form-group">
                <label>Role</label>
                <select
                    value={roleName}
                    onChange={(e) => onRoleNameChange(e.target.value)}
                    className={DETAIL_SELECT_CLS}
                    disabled={readOnly || !availableRoles.length || !roleName}
                >
                    {!availableRoles.length || !roleName ? (
                        <option value={roleName}>{roleName || 'Loading...'}</option>
                    ) : (
                        availableRoles.map((role) => (
                            <option key={role.id} value={role.name}>
                                {role.name}
                            </option>
                        ))
                    )}
                </select>
            </div>
        </DetailViewSection.Card>
    )
}
