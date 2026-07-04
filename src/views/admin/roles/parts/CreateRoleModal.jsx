import React, { useState } from 'react'

import RoleModal, {
    RoleFormField,
    RoleModalBody,
    RoleModalFooter,
    RoleTextInput
} from '../../../../app/components/ui/RoleModal'

const DEFAULT_WEIGHT = 10

/** Modal for creating a new role. */
const CreateRoleModal = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('')
    const [weight, setWeight] = useState(DEFAULT_WEIGHT)
    if (!isOpen) return null
    return (
        <RoleModal isOpen={isOpen} onClose={onClose} title="Create Role">
            <RoleModalBody>
                <RoleFormField label="Role Name">
                    <RoleTextInput value={name} onChange={setName} placeholder="e.g. Plant Manager" autoFocus />
                </RoleFormField>
                <RoleFormField label="Weight">
                    <RoleTextInput value={weight} onChange={(v) => setWeight(Number(v) || 0)} type="number" />
                </RoleFormField>
            </RoleModalBody>
            <RoleModalFooter
                onCancel={onClose}
                onSubmit={() => {
                    if (!name.trim()) return
                    onCreate(name.trim(), weight)
                    setName('')
                    setWeight(DEFAULT_WEIGHT)
                    onClose()
                }}
                submitText="Create"
                disabled={!name.trim()}
            />
        </RoleModal>
    )
}

export default CreateRoleModal
