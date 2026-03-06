import { UserService } from '../../services/UserService'
import context from './context.json'
/** All registered AI prompt templates keyed by use case. */
export const PROMPTS = context.prompts
/** Base system prompt for plant-level performance summaries. */
export const PLANT_SUMMARY_BASE = context.prompts.plantSummary
/** Plant codes that receive slightly more encouraging AI tone. */
export const FAVORITE_PLANTS = context.favoritePlants
const HIGH_LEVEL_WEIGHT_THRESHOLD = 50
/** Replaces {roleName} and {assignedPlant} placeholders in a template string. */
const fillTemplate = (template, roleName, assignedPlant) =>
    (template || '')
        .replace(/\{roleName}/g, roleName || 'user')
        .replace(/\{assignedPlant}/g, assignedPlant || 'their assigned plant')
/**
 * Fetches all roles from the database, sorts by weight descending,
 * and formats them as a seniority-ordered list string for AI context.
 */
async function buildRolesListContext() {
    try {
        const allRoles = await UserService.getAllRoles()
        if (!allRoles?.length) return ''
        const sorted = [...allRoles].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
        const rolesList = sorted.map((r) => `${r.name} (weight: ${r.weight ?? 0})`).join(', ')
        return rolesList
    } catch {
        return ''
    }
}
/**
 * Resolves a role-aware system prompt prefix by fetching all roles from the
 * database, injecting organizational hierarchy context, and selecting the
 * appropriate tone template based on the user's role weight and plant ownership.
 */
export async function getRoleContext(roleName, isOwnPlant, assignedPlant, roleWeight = 0) {
    const prompts = context.rolePrompt
    const rolesList = await buildRolesListContext()
    const rolesContext = rolesList
        ? fillTemplate(prompts.rolesContext, roleName, assignedPlant).replace('{rolesList}', rolesList)
        : ''
    const isHighLevel = roleWeight >= HIGH_LEVEL_WEIGHT_THRESHOLD
    let tonePrompt
    if (isHighLevel) {
        tonePrompt = fillTemplate(prompts.highLevel, roleName, assignedPlant)
    } else if (isOwnPlant) {
        tonePrompt = fillTemplate(prompts.ownPlant, roleName, assignedPlant)
    } else {
        tonePrompt = fillTemplate(prompts.otherPlant, roleName, assignedPlant)
    }
    return [rolesContext, tonePrompt].filter(Boolean).join(' ')
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
