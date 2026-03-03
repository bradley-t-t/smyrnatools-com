import context from './context.json'

/** All registered AI prompt templates keyed by use case. */
export const PROMPTS = context.prompts

/** Base system prompt for plant-level performance summaries. */
export const PLANT_SUMMARY_BASE = context.prompts.plantSummary

/** Plant codes that receive slightly more encouraging AI tone. */
export const FAVORITE_PLANTS = context.favoritePlants

/**
 * Resolves a role-aware system prompt prefix based on the user's role and
 * whether they are viewing their own plant vs. another plant's data.
 */
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

/**
 * Returns a tone modifier suffix for the AI prompt.
 * Favorite plants receive a slightly more encouraging tone.
 */
export function getToneModifier(plantCode) {
    if (FAVORITE_PLANTS.includes(String(plantCode))) {
        return context.toneModifiers.favoritePlant
    }
    return context.toneModifiers.regularPlant
}
