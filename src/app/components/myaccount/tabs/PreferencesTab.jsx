import React from 'react'

import {
    ACCENT_PRESETS,
    clampColorToMaxBrightness,
    FIELD_LABEL_CLASS,
    FieldStyle,
    MAX_BRIGHTNESS_HEX
} from '../../../constants/myAccountConstants'
import { Card, CardHeader, SegmentedControl, SubtleButton, Toggle } from '../MyAccountAtoms'
import StartPageDropdown from '../StartPageDropdown'

/** Preferences tab body — start page, appearance (accent + theme), nav style,
 *  tutorials toggle, cache reset. */
export default function PreferencesTab({
    accentColor,
    cacheClearing,
    isMobile,
    onClearCache,
    onResetTutorials,
    preferences,
    themeMode,
    updatePreferences
}) {
    return (
        <>
            <section id="startpage" className="scroll-mt-4">
                <Card>
                    <CardHeader
                        accentColor={accentColor}
                        icon="fa-rocket"
                        title="Start Page"
                        description="Choose which page loads when you open the app"
                    />
                    <div className="px-5 py-5">
                        <StartPageDropdown
                            value={preferences.startPage || 'Dashboard'}
                            accentColor={accentColor}
                            onChange={(id) => updatePreferences('startPage', id)}
                        />
                    </div>
                </Card>
            </section>

            <section id="appearance" className="scroll-mt-4">
                <Card>
                    <CardHeader
                        accentColor={accentColor}
                        icon="fa-palette"
                        title="Appearance"
                        description="Customize the look of the application"
                    />
                    <div className="px-5 py-5 grid gap-5 md:grid-cols-2">
                        <div>
                            <div className={FIELD_LABEL_CLASS} style={{ color: 'var(--text-secondary)' }}>
                                Accent Color
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                {ACCENT_PRESETS.map(({ color, name }) => {
                                    const isActive = (preferences.accentColor || '#2A3163') === color
                                    return (
                                        <button type="button"
                                            key={color}
                                            onClick={() => updatePreferences('accentColor', color)}
                                            className="relative h-10 w-10 rounded-lg transition-transform duration-150 ease-out motion-reduce:transition-none hover:scale-105 active:scale-[0.97]"
                                            style={{
                                                background: color,
                                                boxShadow: isActive
                                                    ? `0 0 0 2px var(--bg-primary), 0 0 0 4px ${color}`
                                                    : 'none'
                                            }}
                                            title={name}
                                            aria-label={`Set accent color to ${name}`}
                                        >
                                            {isActive && (
                                                <i className="fas fa-check text-white text-[13px] absolute inset-0 flex items-center justify-center" />
                                            )}
                                        </button>
                                    )
                                })}
                                <div className="relative">
                                    <input
                                        type="color"
                                        value={preferences.accentColor || '#2A3163'}
                                        onChange={(e) => {
                                            const clampedColor = clampColorToMaxBrightness(e.target.value)
                                            updatePreferences('accentColor', clampedColor)
                                        }}
                                        className="absolute inset-0 h-10 w-10 cursor-pointer opacity-0"
                                        aria-label="Custom accent color"
                                    />
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-secondary border border-border-light text-text-tertiary">
                                        <i className="fas fa-eyedropper text-[13px]" />
                                    </div>
                                </div>
                            </div>
                            <p className="mt-2.5 text-[11px] text-text-tertiary">
                                Very light colors will be clamped for readability (max {MAX_BRIGHTNESS_HEX})
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2.5">
                                <div className="flex items-center gap-3 rounded-lg px-3 py-2" style={FieldStyle}>
                                    <div className="h-7 w-7 rounded-md" style={{ background: accentColor }} />
                                    <div>
                                        <div className="text-[10.5px] font-semibold uppercase tracking-wider text-text-tertiary">
                                            Current
                                        </div>
                                        <div className="font-mono text-[14px] font-semibold tabular-nums text-text-primary">
                                            {(preferences.accentColor || '#2A3163').toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                                {preferences.accentColor && preferences.accentColor !== '#2A3163' && (
                                    <SubtleButton
                                        icon="fa-undo"
                                        onClick={() => updatePreferences('accentColor', '#2A3163')}
                                    >
                                        Reset
                                    </SubtleButton>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className={FIELD_LABEL_CLASS} style={{ color: 'var(--text-secondary)' }}>
                                Theme
                            </div>
                            <SegmentedControl
                                accentColor={accentColor}
                                options={[
                                    { icon: 'fa-sun', label: 'Light', value: 'light' },
                                    { icon: 'fa-circle-half-stroke', label: 'Grayed Out', value: 'grayed' },
                                    { icon: 'fa-moon', label: 'Dark', value: 'dark' }
                                ]}
                                value={themeMode}
                                onChange={(v) => updatePreferences('themeMode', v)}
                            />
                        </div>
                    </div>
                </Card>
            </section>

            <section id="navigation" className="scroll-mt-4">
                <Card>
                    <CardHeader
                        accentColor={accentColor}
                        icon="fa-bars"
                        title="Navigation Style"
                        description="Choose your preferred navigation layout"
                    />
                    <div className="px-5 py-5">
                        <SegmentedControl
                            accentColor={accentColor}
                            options={[
                                { icon: 'fa-bars', label: 'Top Bar', value: 'top_bar_basic' },
                                { icon: 'fa-layer-group', label: 'Two-Level Tabs', value: 'two_level_tabs' }
                            ]}
                            value={preferences.navStyle || 'top_bar_basic'}
                            onChange={(v) => updatePreferences('navStyle', v)}
                        />
                    </div>
                </Card>
            </section>

            {!isMobile && (
                <section id="tutorials" className="scroll-mt-4">
                    <Card>
                        <CardHeader
                            accentColor={accentColor}
                            icon="fa-graduation-cap"
                            title="Tutorials"
                            description="Manage tutorial hints and guides"
                        />
                        <div className="px-5 py-5 flex flex-col gap-3">
                            <div
                                className="flex items-center justify-between gap-3 rounded-lg px-4 py-3"
                                style={FieldStyle}
                            >
                                <div className="min-w-0">
                                    <div className="text-[14px] font-semibold text-text-primary">Enable Tutorials</div>
                                    <div className="text-[12px] mt-0.5 text-text-secondary">
                                        Show helpful tips and guides throughout the app
                                    </div>
                                </div>
                                <Toggle
                                    accentColor={accentColor}
                                    ariaLabel="Toggle tutorials"
                                    checked={!!preferences.tutorials}
                                    onChange={() => updatePreferences('tutorials', !preferences.tutorials)}
                                />
                            </div>
                            <SubtleButton icon="fa-redo" onClick={onResetTutorials}>
                                Reset All Tutorials
                            </SubtleButton>
                        </div>
                    </Card>
                </section>
            )}

            <section id="cache" className="scroll-mt-4">
                <Card>
                    <CardHeader
                        accentColor={accentColor}
                        icon="fa-database"
                        title="Cache"
                        description="Clear cached data to free up space and fix stale content"
                    />
                    <div className="px-5 py-5">
                        <SubtleButton
                            disabled={cacheClearing}
                            icon={cacheClearing ? 'fa-spinner animate-dv-spin' : 'fa-broom'}
                            onClick={onClearCache}
                        >
                            {cacheClearing ? 'Clearing…' : 'Clear All Caches'}
                        </SubtleButton>
                    </div>
                </Card>
            </section>
        </>
    )
}
