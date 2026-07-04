import React, { useState } from 'react'

import RoleModal, {
    RoleFormField,
    RoleModalBody,
    RoleModalFooter,
    RoleTextInput
} from '../../../../app/components/ui/RoleModal'

/** Modal for editing role weight. */
const EditWeightModal = ({ role, onClose, onSave }) => {
    const [weight, setWeight] = useState(role?.weight || 0)
    if (!role) return null
    return (
        <RoleModal isOpen={true} onClose={onClose} title={`Edit Weight — ${role.name}`}>
            <RoleModalBody>
                <RoleFormField label="Weight" hint="Roles with weight > 75 are elevated (admin)">
                    <RoleTextInput value={weight} onChange={(v) => setWeight(Number(v) || 0)} type="number" autoFocus />
                </RoleFormField>
            </RoleModalBody>
            <RoleModalFooter
                onCancel={onClose}
                onSubmit={() => {
                    onSave(role.id, weight)
                    onClose()
                }}
                submitText="Save"
            />
        </RoleModal>
    )
}

export default EditWeightModal
