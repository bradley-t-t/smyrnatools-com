import {
    addDataRow,
    addReportHeader,
    addSectionTitle,
    addTableHeaders,
    COLORS
} from '../../../../../utils/ExportUtility'
import { createSheet, exportWorkbook, finalizeSheet, initExport } from '../ExportModule'

const RATING_LABELS = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent']

function formatPhone(phone) {
    if (!phone) return ''
    const digits = String(phone).replace(/\D/g, '')
    if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    return String(phone)
}

function getRatingDisplay(rating) {
    const num = Math.round(Number(rating) || 0)
    if (num <= 0 || num > 5) return { label: 'Not Rated', stars: '', value: 0 }
    return { label: RATING_LABELS[num] || '', stars: '\u2605'.repeat(num) + '\u2606'.repeat(5 - num), value: num }
}

function getRatingColor(value) {
    if (value >= 5) return COLORS.success
    if (value >= 4) return COLORS.brand
    if (value >= 3) return COLORS.accent
    if (value >= 2) return COLORS.warning
    if (value >= 1) return COLORS.danger
    return COLORS.slate500
}

function groupByPlant(operators, plants) {
    const plantNameMap = {}
    plants.forEach((p) => {
        const code = p.plantCode || p.plant_code || ''
        plantNameMap[code] = p.plantName || p.plant_name || code
    })

    const groups = {}
    operators.forEach((op) => {
        const code = op.plantCode || op.plant_code || 'Unassigned'
        if (!groups[code]) groups[code] = { name: plantNameMap[code] || code, operators: [] }
        groups[code].operators.push(op)
    })

    return Object.entries(groups)
        .sort(([a], [b]) => {
            if (a === 'Unassigned') return 1
            if (b === 'Unassigned') return -1
            const numA = parseInt(a.replace(/\D/g, '') || '999')
            const numB = parseInt(b.replace(/\D/g, '') || '999')
            return numA - numB
        })
        .map(([code, group]) => ({ code, name: group.name, operators: group.operators }))
}

export async function exportOperatorRatingsSheet({ operators, plants }) {
    if (!operators?.length) return

    const { wb, logoBase64 } = await initExport({ subject: 'Operator Ratings Sheet' })
    const ws = createSheet(wb, 'Operator Ratings', {
        columns: [
            { width: 3 },
            { width: 6 },
            { width: 28 },
            { width: 18 },
            { width: 12 },
            { width: 16 },
            { width: 14 },
            { width: 16 }
        ]
    })

    const dateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    let r = addReportHeader(ws, wb, {
        logoBase64,
        subtitle: dateStr,
        title: 'Operator Ratings Sheet'
    })

    r++

    const activeOperators = operators.filter((op) => (op.status || '').toLowerCase() === 'active')
    const plantGroups = groupByPlant(activeOperators, plants)

    const ratedOperators = activeOperators.filter((op) => Math.round(Number(op.rating) || 0) > 0)
    const avgRating =
        ratedOperators.length > 0
            ? (ratedOperators.reduce((sum, op) => sum + (Number(op.rating) || 0), 0) / ratedOperators.length).toFixed(1)
            : 'N/A'

    addSectionTitle(
        ws,
        r,
        `Summary  |  ${activeOperators.length} Active Operators  |  ${ratedOperators.length} Rated  |  Avg Rating: ${avgRating}`
    )
    r += 2

    for (const group of plantGroups) {
        const sortedOps = [...group.operators].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))

        ws.mergeCells(r, 2, r, 7)
        const plantCell = ws.getCell(r, 2)
        plantCell.value = `${group.name} (${group.code})`
        plantCell.font = { bold: true, color: { argb: COLORS.white }, name: 'Calibri', size: 12 }
        plantCell.fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
        plantCell.alignment = { horizontal: 'left', vertical: 'middle' }
        for (let c = 3; c <= 7; c++) {
            ws.getCell(r, c).fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
        }
        ws.getRow(r).height = 26
        r++

        addTableHeaders(ws, r, ['#', 'Name', 'Phone', 'Rating', 'Stars', 'Status'], 2)
        r++

        sortedOps.forEach((op, idx) => {
            const { label, stars, value } = getRatingDisplay(op.rating)
            const isAlt = idx % 2 === 1

            addDataRow(
                ws,
                r,
                [
                    { align: 'center', value: idx + 1 },
                    op.name || 'Unknown',
                    formatPhone(op.phone),
                    {
                        align: 'center',
                        bold: true,
                        color: getRatingColor(value),
                        value: value > 0 ? `${value}/5` : 'N/A'
                    },
                    { align: 'center', value: stars },
                    { align: 'center', value: label }
                ],
                2,
                isAlt
            )
            r++
        })

        r++
    }

    r++
    ws.mergeCells(r, 2, r, 7)
    const footerCell = ws.getCell(r, 2)
    footerCell.value = `Generated by Smyrna Tools on ${dateStr}`
    footerCell.font = { color: { argb: COLORS.slate500 }, italic: true, name: 'Calibri', size: 9 }
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' }

    finalizeSheet(ws, { maxCol: 16, maxRow: r + 5 })
    await exportWorkbook(wb, `Operator Ratings Sheet ${new Date().toISOString().slice(0, 10)}.xlsx`)
}
