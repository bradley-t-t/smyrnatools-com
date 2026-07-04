import PlantDropdownModal from '../../../app/components/common/PlantDropdownModal'
import CommentModalSection from '../../../app/components/sections/CommentModalSection'
import DetailViewSection from '../../../app/components/sections/DetailViewSection'
import { usePreferences } from '../../../app/context/PreferencesContext'
import { useOperatorDetail } from '../../../app/hooks/useOperatorDetail'
import { OperatorService } from '../../../services/OperatorService'
import AssignmentSection from './detail/AssignmentSection'
import BasicInfoSection from './detail/BasicInfoSection'
import TrainingSection from './detail/TrainingSection'
import OperatorHistoryView from './OperatorHistoryView'

/**
 * Full detail/edit view for a single operator. Supports editing name, Smyrna ID,
 * status, plant (with region-scoped picker), position, trainer assignment,
 * rating, phone, CDL restriction, and pending start date. Automatically
 * unassigns the operator from active mixers/tractors when their plant changes
 * or status moves to non-Active. Also supports cross-region transfer and
 * sub-modals for comments and history.
 *
 * @param {string} operatorId - Employee ID of the operator to display.
 * @param {Function} onClose - Callback to return to the list view.
 * @param {Set<string>} [allowedPlantCodes] - Region-scoped plant codes for the plant picker.
 */
function OperatorDetailView({ operatorId, onClose, allowedPlantCodes }) {
    const { preferences: _preferences } = usePreferences()
    const {
        _showDeleteConfirmation,
        assignedTrainer,
        automaticRestriction,
        canDeleteOperator,
        canEditOperator,
        currentRegion,
        filteredPlants,
        handleBackClick,
        handleDelete,
        handleRegionTransfer,
        handleSave,
        hasTrainingPermission,
        isLoading,
        isSaving,
        isTrainer,
        message,
        name,
        operator,
        pendingStartDate,
        phone,
        plantDisplayText,
        position,
        rating,
        setAssignedPlant,
        setAssignedTrainer,
        setAutomaticRestriction,
        setCanEditOperator,
        setIsTrainer,
        setName,
        setPendingStartDate,
        setPhone,
        setPosition,
        setRating,
        setShowComments,
        setShowDeleteConfirmation,
        setShowHistory,
        setShowPlantModal,
        setSmyrnaId,
        setStatus,
        showComments,
        showHistory,
        showPlantModal,
        smyrnaId,
        status,
        trainers
    } = useOperatorDetail({ allowedPlantCodes, onClose, operatorId })

    return (
        <DetailViewSection
            title={operator && operator.name ? operator.name : 'Operator Details'}
            onClose={onClose}
            onBack={handleBackClick}
            headerActions={
                <>
                    <button type="button" className="global-button-secondary" onClick={() => setShowComments(true)}>
                        <i className="fas fa-comments"></i>
                        <span>Comments</span>
                    </button>
                    <button type="button" className="global-button-secondary" onClick={() => setShowHistory(true)}>
                        <i className="fas fa-history"></i>
                        <span>History</span>
                    </button>
                </>
            }
            isSaving={isSaving}
            message={message}
            itemAssignedPlant={operator?.plant_code}
            onCanEditChange={setCanEditOperator}
            isLoading={isLoading}
            loadingMessage="Loading operator details..."
            notFound={!operator && !isLoading}
            currentRegion={currentRegion}
            assetType="operator"
            onRegionTransfer={handleRegionTransfer}
            notFoundMessage="Operator Not Found"
            notFoundDescription="Could not find the requested operator."
            footerActions={
                <>
                    {canEditOperator ? (
                        <>
                            <button type="button"
                                className="global-button-secondary flex-1 justify-center"
                                onClick={handleSave}
                                disabled={isSaving || !canEditOperator}
                            >
                                <i className="fas fa-save"></i>
                                <span>{isSaving ? 'Saving...' : 'Save'}</span>
                            </button>
                            {canDeleteOperator && (
                                <button type="button"
                                    className="global-button-secondary flex-1 justify-center"
                                    onClick={() => setShowDeleteConfirmation(true)}
                                    disabled={isSaving || !canEditOperator}
                                >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>Delete</span>
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center gap-1.5 text-text-secondary text-[12px] font-medium">
                            <i className="fas fa-lock text-[11px]"></i>
                            <span>View-Only Mode</span>
                        </div>
                    )}
                </>
            }
            showDeleteConfirmation={_showDeleteConfirmation}
            onDeleteConfirm={handleDelete}
            onDeleteCancel={() => setShowDeleteConfirmation(false)}
            deleteTitle="Confirm Delete"
            deleteMessage={`Are you sure you want to delete ${operator && operator.name}? This action cannot be undone.`}
            modals={
                <>
                    {showPlantModal && (
                        <PlantDropdownModal
                            isOpen={showPlantModal}
                            onClose={() => setShowPlantModal(false)}
                            plants={filteredPlants}
                            onSelect={setAssignedPlant}
                            searchPlaceholder="Search plants..."
                        />
                    )}
                    {showHistory && <OperatorHistoryView operator={operator} onClose={() => setShowHistory(false)} />}
                    {showComments && operator && (
                        <CommentModalSection
                            itemId={operatorId}
                            itemNumber={operator.name}
                            itemType="Operator"
                            onClose={() => setShowComments(false)}
                            service={OperatorService}
                        />
                    )}
                </>
            }
        >
            <BasicInfoSection
                automaticRestriction={automaticRestriction}
                canEditOperator={canEditOperator}
                name={name}
                phone={phone}
                rating={rating}
                setAutomaticRestriction={setAutomaticRestriction}
                setName={setName}
                setPhone={setPhone}
                setRating={setRating}
                setSmyrnaId={setSmyrnaId}
                smyrnaId={smyrnaId}
            />
            <AssignmentSection
                canEditOperator={canEditOperator}
                hasTrainingPermission={hasTrainingPermission}
                pendingStartDate={pendingStartDate}
                plantDisplayText={plantDisplayText}
                position={position}
                setAssignedTrainer={setAssignedTrainer}
                setPendingStartDate={setPendingStartDate}
                setPosition={setPosition}
                setShowPlantModal={setShowPlantModal}
                setStatus={setStatus}
                status={status}
            />
            {hasTrainingPermission && (
                <TrainingSection
                    assignedTrainer={assignedTrainer}
                    canEditOperator={canEditOperator}
                    isTrainer={isTrainer}
                    setAssignedTrainer={setAssignedTrainer}
                    setIsTrainer={setIsTrainer}
                    status={status}
                    trainers={trainers}
                />
            )}
        </DetailViewSection>
    )
}

export default OperatorDetailView
