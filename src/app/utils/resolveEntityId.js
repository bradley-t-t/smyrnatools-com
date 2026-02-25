const resolveEntityId = (entityOrId) => (typeof entityOrId === 'object' && entityOrId?.id ? entityOrId.id : entityOrId)

export const requireEntityId = (entityOrId, label = 'ID') => {
    if (!entityOrId) throw new Error(`${label} is required`)
    return resolveEntityId(entityOrId)
}

export default resolveEntityId
