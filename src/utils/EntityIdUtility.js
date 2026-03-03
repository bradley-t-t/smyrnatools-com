/** Resolves an entity object or raw ID string to its `id` property. */
const resolveEntityId = (entityOrId) => (typeof entityOrId === 'object' && entityOrId?.id ? entityOrId.id : entityOrId)

/** Resolves an entity to its ID, throwing if falsy. */
export const requireEntityId = (entityOrId, label = 'ID') => {
    if (!entityOrId) throw new Error(`${label} is required`)
    return resolveEntityId(entityOrId)
}

export default resolveEntityId
