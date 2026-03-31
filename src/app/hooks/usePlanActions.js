import { useCallback, useState } from 'react'

import { PlanService } from '../../services/PlanService'
import {
    addMinutesToTime,
    BUFFER_MINUTES,
    createEmptyAssignment,
    DEFAULT_STAGGER_MINUTES,
    ensureUniqueIds,
    formatTime,
    parseTime,
    PRE_TRIP_MINUTES
} from '../../utils/PlanUtility'

const DEFAULT_SHIFT_HOURS = 14

const buildCustomTimes = (baseTime, leaveTime, count, stagger) =>
    Array.from({ length: count }, (_, i) => ({
        leaveTime: leaveTime || '',
        time: baseTime ? addMinutesToTime(baseTime, i * (stagger || DEFAULT_STAGGER_MINUTES)) || '' : ''
    }))

export function usePlanActions({
    assignments,
    getTravelTime,
    notes,
    planDate,
    refreshTravelTimes,
    setAssignments,
    setNotes,
    setPlantProduction,
    userId
}) {
    const [copied, setCopied] = useState(false)
    const [templates, setTemplates] = useState([])
    const [showTemplateModal, setShowTemplateModal] = useState(false)
    const [templateName, setTemplateName] = useState('')
    const [showSettings, setShowSettings] = useState(false)
    const [newTravelTime, setNewTravelTime] = useState({ from: '', minutes: '', to: '' })
    const [activeRowId, setActiveRowId] = useState(null)

    const calcClockIn = (arrivalTime, fromPlant, toPlant) => {
        if (!arrivalTime || !fromPlant || !toPlant) return null
        const travelTime = getTravelTime(fromPlant, toPlant)
        if (travelTime === null) return null
        const [hours, minutes] = parseTime(arrivalTime)
        const date = new Date()
        date.setHours(hours, minutes, 0, 0)
        date.setMinutes(date.getMinutes() - travelTime - BUFFER_MINUTES - PRE_TRIP_MINUTES)
        return formatTime(date.getHours(), date.getMinutes())
    }

    const updatePlantProduction = (plantCode, field, value) => {
        setPlantProduction((prev) => ({
            ...prev,
            [plantCode]: { ...prev[plantCode], [field]: value }
        }))
    }

    const importDailyOrderHtml = (file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const parser = new DOMParser()
            const doc = parser.parseFromString(e.target.result, 'text/html')
            const allDivs = [...doc.querySelectorAll('div')]

            // Find plant headers — any element matching "###" or "### - Name" pattern
            const plantHeaders = allDivs.filter((d) => {
                const text = d.textContent.trim()
                return /^\d{3}\s*-\s*.+/.test(text) || /^\d{3}\s*$/.test(text)
            })

            // Deduplicate — sometimes multiple nested divs match the same header
            const seenCodes = new Set()
            const uniqueHeaders = plantHeaders.filter((h) => {
                const code = h.textContent.trim().match(/^(\d{3})/)?.[1]
                if (!code || seenCodes.has(code)) return false
                seenCodes.add(code)
                return true
            })

            const production = {}
            uniqueHeaders.forEach((header, idx) => {
                const text = header.textContent.trim()
                const code = text.match(/^(\d{3})/)?.[1]
                if (!code) return

                const headerIndex = allDivs.indexOf(header)
                const nextHeaderIndex =
                    idx < uniqueHeaders.length - 1 ? allDivs.indexOf(uniqueHeaders[idx + 1]) : allDivs.length

                // Collect all HH:MM times in the plant section
                const startTimes = []
                for (let i = headerIndex + 1; i < nextHeaderIndex; i++) {
                    const d = allDivs[i]
                    const time = d.textContent.trim()
                    // Match HH:MM patterns (start times) — check by class or by position/style
                    if (/^\d{1,2}:\d{2}$/.test(time)) {
                        const style = d.getAttribute('style') || ''
                        // Accept times at the known position OR from known time classes
                        if (
                            style.includes('left:307') ||
                            style.includes('left:308') ||
                            d.classList.contains('s48') ||
                            d.classList.contains('s49') ||
                            d.classList.contains('s50')
                        ) {
                            startTimes.push(time.padStart(5, '0'))
                        }
                    }
                }

                // Find total yardage — look for "Plant Total:" then search nearby for a number
                let totalYardage = ''
                for (let i = headerIndex + 1; i < nextHeaderIndex; i++) {
                    const d = allDivs[i]
                    const dt = d.textContent.trim()
                    if (dt === 'Plant Total:' || dt === 'Plant Total') {
                        // Search backward and forward for a numeric value
                        for (let offset = 1; offset <= 10; offset++) {
                            for (const j of [i - offset, i + offset]) {
                                if (j > headerIndex && j < nextHeaderIndex) {
                                    const val = allDivs[j].textContent.trim().replace(/,/g, '')
                                    if (/^\d+(\.\d+)?$/.test(val) && parseFloat(val) > 0) {
                                        totalYardage = val
                                        break
                                    }
                                }
                            }
                            if (totalYardage) break
                        }
                        break
                    }
                }

                // Fallback: if no "Plant Total:" found, sum all numeric values that look like yardage
                if (!totalYardage) {
                    let maxVal = 0
                    for (let i = headerIndex + 1; i < nextHeaderIndex; i++) {
                        const d = allDivs[i]
                        const dt = d.textContent.trim()
                        if (dt.toLowerCase().includes('total')) {
                            // Look for the nearest number
                            for (let j = i - 1; j > Math.max(headerIndex, i - 5); j--) {
                                const val = allDivs[j].textContent.trim().replace(/,/g, '')
                                if (/^\d+(\.\d+)?$/.test(val)) {
                                    const num = parseFloat(val)
                                    if (num > maxVal) maxVal = num
                                    break
                                }
                            }
                        }
                    }
                    if (maxVal > 0) totalYardage = String(maxVal)
                }

                const sorted = startTimes.sort()
                production[code] = {
                    firstJobTime: sorted[0] || '',
                    lastJobTime: sorted[sorted.length - 1] || '',
                    totalYardage
                }
            })

            setPlantProduction(production)
        }
        reader.readAsText(file)
    }

    const clearPlantProduction = () => {
        setPlantProduction({})
    }

    const updateAssignment = (id, field, value) => {
        setAssignments((prev) =>
            prev.map((a) => {
                if (a.id !== id) return a
                const updated = { ...a, [field]: value }
                if (field === 'time' && value?.length === 5 && !a.leaveTime) {
                    updated.leaveTime = addMinutesToTime(value, DEFAULT_SHIFT_HOURS * 60) || ''
                }
                if (field === 'timeMode' && value === 'custom') {
                    updated.customTimes = buildCustomTimes(
                        a.time,
                        a.leaveTime,
                        parseInt(a.driverCount) || 1,
                        a.staggerMinutes
                    )
                }
                if (field === 'driverCount' && a.timeMode === 'custom') {
                    updated.customTimes = buildCustomTimes(a.time, a.leaveTime, parseInt(value) || 1, a.staggerMinutes)
                }
                return updated
            })
        )
    }

    const updateCustomTime = (assignmentId, idx, field, value) => {
        setAssignments((prev) =>
            prev.map((a) => {
                if (a.id !== assignmentId) return a
                const customTimes = [...(a.customTimes || [])]
                while (customTimes.length <= idx) customTimes.push({ leaveTime: '', time: '' })
                customTimes[idx] = { ...customTimes[idx], [field]: value }
                return { ...a, customTimes }
            })
        )
    }

    const switchToCustom = (id) => {
        setAssignments((prev) =>
            prev.map((a) => {
                if (a.id !== id) return a
                const customTimes = buildCustomTimes(
                    a.time,
                    a.leaveTime,
                    parseInt(a.driverCount) || 1,
                    a.staggerMinutes
                )
                return { ...a, customTimes, timeMode: 'custom' }
            })
        )
    }

    const toggleRowExpanded = (id) => {
        setActiveRowId((prev) => (prev === id ? null : id))
    }

    const buildPlanMessage = () => {
        const validAssignments = assignments.filter((a) => a.fromPlant && a.toPlant && a.driverCount > 0)
        if (!validAssignments.length) return null
        const dateStr = new Date(planDate + 'T00:00:00').toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long'
        })
        const operatorWord = (count) => (count === 1 ? 'operator' : 'operators')
        const loadNote = (a) => (a.loadFromPlant ? ' [Load from Plant]' : '')
        const header = (a) =>
            `${a.fromPlant} \u2192 ${a.toPlant} (${a.driverCount} ${operatorWord(a.driverCount)}${a.timeMode !== 'custom' && a.driverCount > 1 ? `, ${a.staggerMinutes}min stagger` : ''})${loadNote(a)}\n`
        let msg = `Plan - ${dateStr}\n`
        validAssignments.forEach((a, i) => {
            if (i > 0) msg += '\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n'
            msg += '\n' + header(a)
            if (a.driverCount > 1 && a.timeMode === 'custom' && a.customTimes?.length) {
                a.customTimes.slice(0, a.driverCount).forEach((ct, idx) => {
                    const clockIn = ct.time ? calcClockIn(ct.time, a.fromPlant, a.toPlant) : null
                    msg += `  Op ${idx + 1}:${clockIn ? ` In ${clockIn}` : ''}${ct.time ? ` | Arrive ${ct.time}` : ''}${ct.leaveTime ? ` | Leave ${ct.leaveTime}` : ''}\n`
                })
            } else if (a.driverCount > 1) {
                for (let j = 0; j < a.driverCount; j++) {
                    const arr = a.time
                        ? addMinutesToTime(a.time, j * (a.staggerMinutes || DEFAULT_STAGGER_MINUTES))
                        : null
                    const clockIn = arr ? calcClockIn(arr, a.fromPlant, a.toPlant) : null
                    msg += `  Op ${j + 1}: In ${clockIn || '--:--'} | Arrive ${arr || '--:--'}\n`
                }
                if (a.leaveTime) msg += `  Leave by: ${a.leaveTime}\n`
            } else {
                const clockIn = a.time ? calcClockIn(a.time, a.fromPlant, a.toPlant) : null
                if (clockIn) msg += `  Clock in: ${clockIn}\n`
                if (a.time) msg += `  Arrive: ${a.time}\n`
                if (a.leaveTime) msg += `  Leave: ${a.leaveTime}\n`
            }
        })
        if (notes)
            msg += `\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\nNotes: ${notes}\n`
        return msg.trim()
    }

    const copyToClipboard = async () => {
        const msg = buildPlanMessage()
        if (!msg) return
        await navigator.clipboard.writeText(msg)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const addTravelTime = async () => {
        const { from, to, minutes } = newTravelTime
        if (!from || !to || !minutes || from === to) return
        const mins = parseInt(minutes)
        await PlanService.upsertTravelTime(from, to, mins)
        await PlanService.upsertTravelTime(to, from, mins)
        await refreshTravelTimes()
        setNewTravelTime({ from: '', minutes: '', to: '' })
    }

    const removeTravelTime = async (key) => {
        const [from, to] = key.split('->')
        await PlanService.deleteTravelTime(from, to)
        await PlanService.deleteTravelTime(to, from)
        await refreshTravelTimes()
    }

    const moveAssignment = useCallback((id, direction) => {
        setAssignments((prev) => {
            const idx = prev.findIndex((a) => a.id === id)
            if (idx < 0) return prev
            const targetIdx = idx + direction
            if (targetIdx < 0 || targetIdx >= prev.length) return prev
            const next = [...prev]
            ;[next[idx], next[targetIdx]] = [next[targetIdx], next[idx]]
            return next
        })
    }, [])

    // Template management
    const loadTemplates = useCallback(async () => {
        if (!userId) return
        const data = await PlanService.fetchTemplates(userId)
        setTemplates(data)
    }, [userId])

    const saveAsTemplate = useCallback(async () => {
        if (!userId || !templateName.trim()) return
        await PlanService.saveTemplate(userId, templateName.trim(), assignments, notes)
        setTemplateName('')
        await loadTemplates()
    }, [userId, templateName, assignments, notes, loadTemplates])

    const loadTemplate = useCallback((template) => {
        setAssignments(ensureUniqueIds(template.assignments || [createEmptyAssignment()]))
        setNotes(template.notes || '')
        setShowTemplateModal(false)
    }, [])

    const deleteTemplate = useCallback(
        async (templateId) => {
            await PlanService.deleteTemplate(templateId)
            await loadTemplates()
        },
        [loadTemplates]
    )

    return {
        activeRowId,
        addTravelTime,
        calcClockIn,
        clearPlantProduction,
        copied,
        copyToClipboard,
        deleteTemplate,
        importDailyOrderHtml,
        loadTemplate,
        loadTemplates,
        moveAssignment,
        newTravelTime,
        removeTravelTime,
        saveAsTemplate,
        setNewTravelTime,
        setShowSettings,
        setShowTemplateModal,
        setTemplateName,
        showSettings,
        showTemplateModal,
        switchToCustom,
        templateName,
        templates,
        toggleRowExpanded,
        updateAssignment,
        updateCustomTime,
        updatePlantProduction
    }
}
