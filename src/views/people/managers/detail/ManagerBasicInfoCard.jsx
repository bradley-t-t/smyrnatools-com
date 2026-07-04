import React from 'react'

import DetailViewSection from '../../../../app/components/sections/DetailViewSection'

/**
 * "Basic Information" card for the manager detail view — first name, last
 * name, and email. Pure presentational, state lives in the parent.
 */
export default function ManagerBasicInfoCard({
    firstName,
    onFirstNameChange,
    lastName,
    onLastNameChange,
    email,
    onEmailChange,
    isReadOnly,
    canEditManager
}) {
    const readOnly = isReadOnly || !canEditManager
    return (
        <DetailViewSection.Card title="Basic Information" icon="fas fa-id-card">
            <div className="form-group">
                <label>First Name</label>
                <input
                    type="text"
                    value={firstName}
                    onChange={(e) => onFirstNameChange(e.target.value)}
                    className="form-control"
                    readOnly={readOnly}
                />
            </div>
            <div className="form-group">
                <label>Last Name</label>
                <input
                    type="text"
                    value={lastName}
                    onChange={(e) => onLastNameChange(e.target.value)}
                    className="form-control"
                    readOnly={readOnly}
                />
            </div>
            <div className="form-group">
                <label>Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    className="form-control"
                    readOnly={readOnly}
                />
            </div>
        </DetailViewSection.Card>
    )
}
