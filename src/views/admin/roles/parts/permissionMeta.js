/** Returns the namespace prefix of a permission node (e.g. "reports.qc" → "reports"). */
export const getNamespace = (perm) => {
    const dot = perm.indexOf('.')
    return dot > 0 ? perm.substring(0, dot) : perm
}

export const NAMESPACE_ICONS = {
    dashboard: 'fa-tachometer-alt',
    equipment: 'fa-truck',
    managers: 'fa-user-tie',
    mixers: 'fa-blender',
    operators: 'fa-hard-hat',
    plants: 'fa-industry',
    regions: 'fa-map-marked-alt',
    reports: 'fa-chart-bar',
    roles: 'fa-shield-alt',
    system: 'fa-cog',
    tractors: 'fa-truck-monster',
    trailers: 'fa-trailer',
    users: 'fa-users'
}

export const NAMESPACE_COLORS = {
    dashboard: 'bg-blue-600',
    equipment: 'bg-slate-600',
    managers: 'bg-purple-600',
    mixers: 'bg-teal-600',
    operators: 'bg-orange-500',
    plants: 'bg-emerald-600',
    regions: 'bg-cyan-600',
    reports: 'bg-indigo-600',
    roles: 'bg-red-600',
    system: 'bg-slate-700',
    tractors: 'bg-amber-600',
    trailers: 'bg-lime-600',
    users: 'bg-violet-600'
}
