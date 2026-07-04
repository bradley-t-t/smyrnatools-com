import React from 'react'

import { TractorService } from '../../../services/TractorService'
import { DETAIL_SELECT_CLS } from '../../constants/detailFormClasses'
import { TRACTOR_FREIGHT_TYPES, TRACTOR_STATUSES_FORCING_UNASSIGN } from '../../constants/tractorDetailConstants'
import DetailViewSection from '../sections/DetailViewSection'
import TractorOperatorAssignmentField from './TractorOperatorAssignmentField'

/**
 * "Basic Information" tab on the tractor detail view: identification,
 * status, freight type, plant + operator assignment, and VIN/make/model/year.
 */
function TractorBasicInfoSection({
    assignedOperator,
    canEditTractor,
    fetchOperatorsForModal,
    freight,
    getOperatorName,
    handleSave,
    lastUnassignedOperatorId,
    make,
    model,
    operators,
    originalValues,
    plantDisplayText,
    refreshOperators,
    setAssignedOperator,
    setFreight,
    setLastUnassignedOperatorId,
    setMake,
    setMessage,
    setModel,
    setShowOperatorModal,
    setShowPlantModal,
    setStatus,
    setTractor,
    setTruckNumber,
    setVin,
    setYear,
    showOperatorModal,
    status,
    tractorId,
    truckNumber,
    vin,
    year
}) {
    async function handleStatusChange(event) {
        const newStatus = event.target.value
        const isForcedUnassignTransition =
            assignedOperator &&
            originalValues.status === 'Active' &&
            TRACTOR_STATUSES_FORCING_UNASSIGN.includes(newStatus)

        if (!isForcedUnassignTransition) {
            setStatus(newStatus)
            return
        }
        await handleSave({ assignedOperator: null, status: newStatus })
        setStatus(newStatus)
        setAssignedOperator(null)
        setLastUnassignedOperatorId(assignedOperator)
        setMessage('Status changed and operator unassigned')
        setTimeout(() => setMessage(''), 3000)
        await refreshOperators()
        await fetchOperatorsForModal()
        const updatedTractor = await TractorService.fetchTractorById(tractorId)
        setTractor(updatedTractor)
    }

    return (
        <DetailViewSection.Section id="basic" title="Basic Information" icon="fas fa-truck">
            <DetailViewSection.Card title="Truck Details" icon="fas fa-info-circle">
                <div className="form-group">
                    <label>Truck Number</label>
                    <input
                        type="text"
                        value={truckNumber}
                        onChange={(e) => setTruckNumber(e.target.value)}
                        className="form-control"
                        readOnly={!canEditTractor}
                    />
                </div>
                <div className="form-group">
                    <label>Status</label>
                    <select
                        value={status}
                        onChange={handleStatusChange}
                        disabled={!canEditTractor}
                        className={DETAIL_SELECT_CLS}
                    >
                        <option value="">Select Status</option>
                        <option value="Active" disabled={!assignedOperator}>
                            Active{!assignedOperator ? ' (Cannot set without an operator assigned)' : ''}
                        </option>
                        <option value="Spare">Spare</option>
                        <option value="In Shop">In Shop</option>
                        <option value="Retired">Retired</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Freight</label>
                    <select
                        value={freight}
                        onChange={(e) => setFreight(e.target.value)}
                        disabled={!canEditTractor}
                        className={DETAIL_SELECT_CLS}
                    >
                        <option value="">Select Freight</option>
                        {TRACTOR_FREIGHT_TYPES.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>
            </DetailViewSection.Card>
            <DetailViewSection.Card title="Assignment" icon="fas fa-user-tag">
                <TractorOperatorAssignmentField
                    assignedOperator={assignedOperator}
                    canEditTractor={canEditTractor}
                    fetchOperatorsForModal={fetchOperatorsForModal}
                    getOperatorName={getOperatorName}
                    handleSave={handleSave}
                    lastUnassignedOperatorId={lastUnassignedOperatorId}
                    operators={operators}
                    plantDisplayText={plantDisplayText}
                    refreshOperators={refreshOperators}
                    setAssignedOperator={setAssignedOperator}
                    setLastUnassignedOperatorId={setLastUnassignedOperatorId}
                    setMessage={setMessage}
                    setShowOperatorModal={setShowOperatorModal}
                    setShowPlantModal={setShowPlantModal}
                    setStatus={setStatus}
                    setTractor={setTractor}
                    showOperatorModal={showOperatorModal}
                    tractorId={tractorId}
                />
            </DetailViewSection.Card>
            <DetailViewSection.Card title="Vehicle Information" icon="fas fa-car">
                <div className="form-group">
                    <label>VIN</label>
                    <input
                        type="text"
                        value={vin}
                        onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[IOQ]/g, ''))}
                        className="form-control"
                        readOnly={!canEditTractor}
                    />
                </div>
                <div className="form-row-2">
                    <div className="form-group">
                        <label>Make</label>
                        <input
                            type="text"
                            value={make}
                            onChange={(e) => setMake(e.target.value)}
                            className="form-control"
                            readOnly={!canEditTractor}
                        />
                    </div>
                    <div className="form-group">
                        <label>Model</label>
                        <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="form-control"
                            readOnly={!canEditTractor}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label>Year</label>
                    <input
                        type="text"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="form-control"
                        readOnly={!canEditTractor}
                    />
                </div>
            </DetailViewSection.Card>
        </DetailViewSection.Section>
    )
}

export default TractorBasicInfoSection
