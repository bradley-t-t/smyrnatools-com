import React from 'react'

import { CATEGORY_GROUPS, LEADERBOARD_CATEGORIES } from '../../constants/leaderboardConstants'
/**
 * Individual category tab button with light/dark variant styling.
 * @param {Object} props
 * @param {Object} props.category - Category definition with id, icon, and label.
 * @param {boolean} props.isSelected - Whether this tab is currently active.
 * @param {Function} props.onSelect - Called with the category ID on click.
 * @param {'light'|'dark'} props.variant - Visual variant controlling unselected colors.
 * @param {string} props.accentColor - Theme accent color for the selected state.
 */
function CategoryTab({ category, isSelected, onSelect, variant, accentColor }) {
    const isDark = variant === 'dark'
    const baseClasses =
        'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all md:px-4'
    const unselectedClasses = isDark
        ? 'bg-white/10 text-white/90 hover:bg-white/20 hover:text-white'
        : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    return (
        <button
            type="button"
            onClick={() => onSelect(category.id)}
            className={`${baseClasses} ${isSelected ? '' : unselectedClasses}`}
            style={
                isSelected
                    ? isDark
                        ? { background: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#0f172a' }
                        : { background: accentColor, boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', color: '#fff' }
                    : {}
            }
        >
            <i className={`fas ${category.icon} text-xs`} />
            <span>{category.label}</span>
        </button>
    )
}
/**
 * Labeled group of category tabs under a section header.
 * @param {Object} props
 * @param {string} props.group - Group label text (e.g. "Production", "Labor").
 * @param {Array} props.categories - Category definitions belonging to this group.
 * @param {string} props.selectedId - Currently selected category ID.
 * @param {Function} props.onSelect - Called with the selected category ID.
 * @param {'light'|'dark'} props.variant - Visual variant.
 * @param {string} props.accentColor - Theme accent color.
 */
function CategoryGroup({ group, categories, selectedId, onSelect, variant, accentColor }) {
    const isDark = variant === 'dark'
    return (
        <div className="flex flex-col gap-2">
            <span
                className={`px-1 text-[0.625rem] font-semibold uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-slate-400'}`}
            >
                {group}
            </span>
            <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                    <CategoryTab
                        key={cat.id}
                        category={cat}
                        isSelected={selectedId === cat.id}
                        onSelect={onSelect}
                        variant={variant}
                        accentColor={accentColor}
                    />
                ))}
            </div>
        </div>
    )
}
/**
 * Category selector for leaderboard metrics.
 * Supports grouped mode (categories organized by group headers) or flat mode.
 * @param {Object} props
 * @param {string} props.selectedId - Currently selected category ID.
 * @param {Function} props.onSelect - Called with the selected category ID.
 * @param {boolean} [props.showGroups=true] - When true, renders categories under group headers.
 * @param {'light'|'dark'} [props.variant='light'] - Visual variant for the tabs.
 * @param {string} [props.accentColor='#1e3a5f'] - Theme accent color for selected state.
 */
export default function LeaderboardCategorySelector({
    selectedId,
    onSelect,
    showGroups = true,
    variant = 'light',
    accentColor = '#1e3a5f'
}) {
    if (showGroups) {
        return (
            <div className="flex flex-col gap-4 md:flex-row md:gap-8">
                {CATEGORY_GROUPS.map((group) => {
                    const groupCategories = LEADERBOARD_CATEGORIES.filter((c) => c.group === group)
                    return (
                        <CategoryGroup
                            key={group}
                            group={group}
                            categories={groupCategories}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            variant={variant}
                            accentColor={accentColor}
                        />
                    )
                })}
            </div>
        )
    }
    return (
        <div className="flex flex-wrap gap-2">
            {LEADERBOARD_CATEGORIES.map((cat) => (
                <CategoryTab
                    key={cat.id}
                    category={cat}
                    isSelected={selectedId === cat.id}
                    onSelect={onSelect}
                    variant={variant}
                    accentColor={accentColor}
                />
            ))}
        </div>
    )
}
