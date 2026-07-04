export const MIXER_SHOP_STATUS_OPTIONS = [
    { label: 'In Shop', value: 'in_shop' },
    { label: 'Waiting For Shop', value: 'waiting_for_shop' },
    { label: 'Down In Yard', value: 'down_in_yard' },
    { label: 'Third Party Work', value: 'third_party' },
    { label: 'Ready For Pickup', value: 'ready_for_pickup' }
]

export const MIXER_SHOP_STATUS_NOTES = {
    down_in_yard: 'The shop has to come fix it where it is - it cannot move.',
    in_shop: 'Currently at the shop being worked on.',
    ready_for_pickup: 'Repairs complete — ready to be picked up from the shop.',
    third_party: 'Being painted or at a third party shop.',
    waiting_for_shop: 'We need to move it to the shop for repairs.'
}

export const MIXER_STATUS_OPTIONS = [
    { label: 'Active', value: 'Active' },
    { label: 'Spare', value: 'Spare' },
    { label: 'In Shop', value: 'In Shop' },
    { label: 'Retired', value: 'Retired' }
]

export const MIXER_CLEANLINESS_LABELS = [null, 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

export const MIXER_CLEANLINESS_MIN_FOR_ACTIVE = 3

export const MIXER_CHIP_OVERDUE_DAYS = 90
