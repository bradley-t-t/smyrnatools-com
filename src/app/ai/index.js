import context from './context.json'

export const PROMPTS = context.prompts

export const PLANT_SUMMARY_BASE = context.prompts.plantSummary

export const FAVORITE_PLANTS = context.favoritePlants

export function getRoleContext(roleName, isOwnPlant, assignedPlant) {
    const r = context.roles
    const role = roleName?.toLowerCase() || ''

    if (role.includes('plant manager')) {
        return isOwnPlant ? r.plantManager.ownPlant : r.plantManager.otherPlant
    }

    if (role.includes('district manager')) {
        return r.districtManager.template.replace('{assignedPlant}', assignedPlant || 'their assigned plant')
    }

    if (role.includes('general manager')) {
        return r.generalManager.template
    }

    return r.default.template.replace('{roleName}', roleName || 'user')
}

export function getToneModifier(plantCode) {
    if (FAVORITE_PLANTS.includes(String(plantCode))) {
        return context.toneModifiers.favoritePlant
    }
    return context.toneModifiers.regularPlant
}
