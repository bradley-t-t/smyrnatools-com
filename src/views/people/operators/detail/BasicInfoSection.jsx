import StarRating from '../../../../app/components/common/StarRating'
import DetailViewSection from '../../../../app/components/sections/DetailViewSection'
import { RATING_LABELS } from '../../../../app/constants/operatorDetailConstants'
import GrammarUtility from '../../../../utils/GrammarUtility'

/**
 * Basic information section: employee id / name / phone fields and the
 * rating star control + automatic-only CDL restriction toggle.
 */
function BasicInfoSection({
    automaticRestriction,
    canEditOperator,
    name,
    phone,
    rating,
    setAutomaticRestriction,
    setName,
    setPhone,
    setRating,
    setSmyrnaId,
    smyrnaId
}) {
    return (
        <DetailViewSection.Section id="basic" title="Basic Information" icon="fas fa-user">
            <DetailViewSection.Card title="Personal Details" icon="fas fa-id-card">
                <div className="form-group">
                    <label>Employee ID</label>
                    <input
                        type="text"
                        value={smyrnaId}
                        onChange={(e) => setSmyrnaId(e.target.value)}
                        className="form-control"
                        disabled={!canEditOperator}
                    />
                </div>
                <div className="form-group">
                    <label>Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="form-control"
                        disabled={!canEditOperator}
                    />
                </div>
                <div className="form-group">
                    <label>Phone</label>
                    <input
                        type="tel"
                        value={GrammarUtility.formatPhone(phone)}
                        onChange={(e) => setPhone(e.target.value)}
                        className="form-control"
                        placeholder="(555) 555-5555"
                        disabled={!canEditOperator}
                    />
                </div>
            </DetailViewSection.Card>
            <DetailViewSection.Card title="Rating" icon="fas fa-star">
                <div className="flex flex-col gap-1.5">
                    <label>Rating</label>
                    <div className="flex items-center gap-3">
                        <StarRating
                            value={rating}
                            onChange={canEditOperator ? setRating : undefined}
                            size="lg"
                            tone="warning"
                        />
                        {rating > 0 && (
                            <span className="text-sm font-medium text-text-secondary">{RATING_LABELS[rating]}</span>
                        )}
                    </div>
                </div>
                <div className="mt-2">
                    <label
                        className={`flex items-center gap-3 ${!canEditOperator ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <div className="relative inline-flex items-center">
                            <input
                                type="checkbox"
                                checked={automaticRestriction}
                                onChange={(e) => {
                                    if (canEditOperator) {
                                        setAutomaticRestriction(e.target.checked)
                                    }
                                }}
                                disabled={!canEditOperator}
                                className="sr-only peer"
                            />
                            <div className="h-6 w-11 rounded-full border border-border-light bg-bg-tertiary transition-colors duration-200 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-primary" />
                            <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5 motion-reduce:transition-none" />
                        </div>
                        <span className="text-sm font-medium text-text-primary">Automatic Only (CDL)</span>
                    </label>
                    <p className="text-xs text-text-secondary mt-2">
                        Enable this if the operator has a CDL restriction that only allows them to drive automatic
                        transmission trucks
                    </p>
                </div>
            </DetailViewSection.Card>
        </DetailViewSection.Section>
    )
}

export default BasicInfoSection
