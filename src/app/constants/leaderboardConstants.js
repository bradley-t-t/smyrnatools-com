export const LEADERBOARD_CATEGORIES = [
    { group: 'Performance', icon: 'fa-chart-line', id: 'efficiency', label: 'Efficiency' },
    { group: 'Performance', icon: 'fa-tachometer-alt', id: 'yph', label: 'YPH' },
    { group: 'Production', icon: 'fa-mountain', id: 'production', label: 'Total Yards' },
    { group: 'Production', icon: 'fa-calendar-alt', id: 'monthly-yardage', label: 'Monthly Yards' },
    { group: 'Production', icon: 'fa-calendar-week', id: 'weekly-yardage', label: 'Weekly Yards' },
    { group: 'Production', icon: 'fa-calendar-day', id: 'daily-yardage', label: 'Daily Yards' },
    { group: 'Hours', icon: 'fa-clock', id: 'monthly-hours', label: 'Monthly Hours' },
    { group: 'Hours', icon: 'fa-hourglass-half', id: 'weekly-hours', label: 'Weekly Hours' },
    { group: 'Hours', icon: 'fa-stopwatch', id: 'daily-hours', label: 'Daily Hours' },
    { group: 'Teamwork', icon: 'fa-hand-holding-heart', id: 'help-given', label: 'Help Given' },
    { group: 'Teamwork', icon: 'fa-hands-helping', id: 'help-received', label: 'Help Received' }
]

export const CATEGORY_GROUPS = ['Performance', 'Production', 'Hours', 'Teamwork']

export const DEFAULT_FLEET_DATA = {
    avgFleetCleanliness: 0,
    avgFleetCleanlinessForEfficiency: 0,
    equipment: 0,
    mixerOperators: 1,
    mixers: 0,
    operators: 0,
    totalAssets: 0,
    tractors: 0,
    trailers: 0
}
