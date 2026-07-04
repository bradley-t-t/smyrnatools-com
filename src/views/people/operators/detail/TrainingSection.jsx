import DetailViewSection from '../../../../app/components/sections/DetailViewSection'
import { DETAIL_SELECT_CLS } from '../../../../app/constants/detailFormClasses'

/**
 * Training section: trainer-status selector and (when status is Training or
 * Pending Start) the assigned-trainer dropdown.
 */
function TrainingSection({
    assignedTrainer,
    canEditOperator,
    isTrainer,
    setAssignedTrainer,
    setIsTrainer,
    status,
    trainers
}) {
    return (
        <DetailViewSection.Section id="training" title="Training" icon="fas fa-graduation-cap">
            <DetailViewSection.Card title="Training Details" icon="fas fa-chalkboard-teacher">
                <div className="form-group">
                    <label>Trainer Status</label>
                    <select
                        id="trainer-status"
                        className={DETAIL_SELECT_CLS}
                        value={isTrainer ? 'true' : 'false'}
                        onChange={(e) => {
                            const isTrainerValue = e.target.value === 'true'
                            setIsTrainer(isTrainerValue)
                            if (isTrainerValue) {
                                setAssignedTrainer(null)
                            }
                        }}
                        disabled={!canEditOperator}
                    >
                        <option value="false">Not a Trainer</option>
                        <option value="true">Trainer</option>
                    </select>
                </div>
                {(status === 'Training' || status === 'Pending Start') && (
                    <div className="form-group">
                        <label>Assigned Trainer</label>
                        <select
                            value={assignedTrainer}
                            onChange={(e) => setAssignedTrainer(e.target.value)}
                            className={DETAIL_SELECT_CLS}
                            disabled={isTrainer || !canEditOperator}
                        >
                            <option value="">None</option>
                            {trainers.map((trainer) => (
                                <option key={trainer.employeeId} value={trainer.employeeId}>
                                    {trainer.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </DetailViewSection.Card>
        </DetailViewSection.Section>
    )
}

export default TrainingSection
